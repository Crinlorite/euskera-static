"""One-shot refactor: añade IDs estables + renombra slugs Navarra-echo.

Ejecutar UNA SOLA VEZ desde la raíz del repo:
    python scripts/refactor-ids-and-slugs.py

Lo que hace:
1. Añade `id:` y `topic:` a cada unit/index.yaml.
2. Añade `id:` y `unitId:` a cada lesson .md.
3. Actualiza `code:` y `title:` en units que se renombran.
4. Actualiza `unit:` en frontmatter de cada lesson para que apunte al nuevo slug.
5. Hace `git mv` para los 11 folders que cambian de nombre (units + lessons).
"""
from __future__ import annotations
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNITS_DIR = ROOT / 'src' / 'content' / 'units' / 'es' / 'a1'
LESSONS_DIR = ROOT / 'src' / 'content' / 'lessons' / 'es' / 'a1'

# Mapeo: slug actual -> {id estable, nuevo slug, título nuevo (si cambia)}
UNIT_MAP = [
    ('01-saludos',             {'id': 'a1-greetings',    'slug': '01-saludos',         'title': None}),  # se mantiene
    ('02-familia',             {'id': 'a1-family',       'slug': '02-familia',         'title': None}),  # se mantiene
    ('03-nolakoa-zara',        {'id': 'a1-descriptions', 'slug': '03-descripciones',   'title': 'Descripciones físicas y de carácter'}),
    ('04-kafe-goxoa',          {'id': 'a1-bar-food',     'slug': '04-bar-y-comida',    'title': 'El bar y la comida'}),
    ('05-auzoko-euskaltegia',  {'id': 'a1-town',         'slug': '05-mi-pueblo',       'title': 'El pueblo y los lugares'}),
    ('06-maritxu-nora-zoaz',   {'id': 'a1-directions',   'slug': '06-direcciones',     'title': 'Direcciones y movimiento'}),
    ('07-bizimodua',           {'id': 'a1-routine',      'slug': '07-rutina-diaria',   'title': 'Rutina diaria y la hora'}),
    ('08-zer-egin-duzu',       {'id': 'a1-recent-past',  'slug': '08-pasado-reciente', 'title': 'El pasado reciente'}),
    ('09-etxean-jan-eta-lan',  {'id': 'a1-home',         'slug': '09-mi-casa',         'title': 'La casa'}),
    ('10-auzokideak',          {'id': 'a1-people',       'slug': '10-mi-gente',        'title': 'Vecinos y relaciones'}),
    ('11-erosi-eta-egin',      {'id': 'a1-shopping',     'slug': '11-comprar',         'title': 'Las compras'}),
    ('12-jatetxean',           {'id': 'a1-restaurant',   'slug': '12-restaurante',     'title': 'En el restaurante'}),
    ('13-asteko-agenda',       {'id': 'a1-week-plan',    'slug': '13-agenda',          'title': 'La agenda semanal'}),
]


def insert_or_update_yaml_field(text: str, key: str, value: str, after_key: str | None = None) -> str:
    """Inserta `key: value` justo después de `after_key:` (si se da y existe), o al inicio si no.
    Si la clave ya existe, actualiza el valor."""
    pattern_existing = re.compile(rf'^{re.escape(key)}:\s*.*$', re.MULTILINE)
    if pattern_existing.search(text):
        return pattern_existing.sub(f'{key}: {value}', text, count=1)
    if after_key:
        pattern_after = re.compile(rf'^({re.escape(after_key)}:\s*.*?)$', re.MULTILINE)
        m = pattern_after.search(text)
        if m:
            insert_pos = m.end()
            return text[:insert_pos] + f'\n{key}: {value}' + text[insert_pos:]
    # fallback: prepend
    return f'{key}: {value}\n' + text


def update_yaml_field(text: str, key: str, value: str) -> str:
    """Reemplaza el valor de `key:` (línea inicial). Si no existe, no hace nada."""
    pattern = re.compile(rf'^({re.escape(key)}:\s*).*$', re.MULTILINE)
    return pattern.sub(rf'\g<1>{value}', text, count=1)


def process_unit_yaml(unit_dir: Path, unit_meta: dict, old_slug: str) -> None:
    yaml_path = unit_dir / 'index.yaml'
    text = yaml_path.read_text(encoding='utf-8')

    # 1) Inserta id como primera línea efectiva (antes de code:)
    text = insert_or_update_yaml_field(text, 'id', unit_meta['id'], after_key=None)
    if not text.startswith('id:'):
        # if was inserted somewhere else, force it to top
        lines = text.splitlines()
        id_line = f"id: {unit_meta['id']}"
        # remove any existing id line
        lines = [l for l in lines if not l.startswith('id:')]
        text = id_line + '\n' + '\n'.join(lines)
        if not text.endswith('\n'):
            text += '\n'

    # 2) Si el slug cambia, actualiza code: y title:
    if unit_meta['slug'] != old_slug:
        text = update_yaml_field(text, 'code', unit_meta['slug'])
        if unit_meta.get('title'):
            # title puede contener dos puntos → entre comillas dobles para seguridad
            safe_title = unit_meta['title'].replace('"', '\\"')
            text = update_yaml_field(text, 'title', f'"{safe_title}"')

    yaml_path.write_text(text, encoding='utf-8')
    print(f'  [unit] {old_slug}/index.yaml [OK]')


def process_lesson_md(md_path: Path, unit_meta: dict, old_slug: str) -> None:
    raw = md_path.read_text(encoding='utf-8')
    if not raw.startswith('---'):
        print(f'  [skip] {md_path.name}: no frontmatter')
        return

    # Split frontmatter / body
    parts = raw.split('---', 2)
    if len(parts) < 3:
        print(f'  [skip] {md_path.name}: malformed frontmatter')
        return
    _, fm, body = parts
    fm = fm.strip('\n')

    # Extract order
    m = re.search(r'^order:\s*(\d+)\s*$', fm, re.MULTILINE)
    order = int(m.group(1)) if m else 0
    lesson_id = f"{unit_meta['id']}-{order}"

    # Insert id (first), unitId (after id)
    fm = insert_or_update_yaml_field(fm, 'id', lesson_id, after_key=None)
    if not fm.startswith('id:'):
        lines = fm.splitlines()
        lines = [l for l in lines if not l.startswith('id:')]
        fm = f'id: {lesson_id}\n' + '\n'.join(lines)

    fm = insert_or_update_yaml_field(fm, 'unitId', unit_meta['id'], after_key='id')

    # Si el unit slug cambia, actualizar 'unit:' en el frontmatter
    if unit_meta['slug'] != old_slug:
        fm = update_yaml_field(fm, 'unit', unit_meta['slug'])

    new_raw = f'---\n{fm}\n---{body}'
    md_path.write_text(new_raw, encoding='utf-8')


def git_mv(src: Path, dst: Path) -> None:
    if src == dst:
        return
    rel_src = src.relative_to(ROOT).as_posix()
    rel_dst = dst.relative_to(ROOT).as_posix()
    print(f'  git mv {rel_src} -> {rel_dst}')
    subprocess.run(['git', 'mv', rel_src, rel_dst], check=True, cwd=ROOT)


def main():
    print('=== Step 1: backfill IDs en yamls + frontmatter ===')
    for old_slug, meta in UNIT_MAP:
        unit_dir = UNITS_DIR / old_slug
        if not unit_dir.exists():
            print(f'  [warn] no existe {unit_dir}, salto')
            continue
        process_unit_yaml(unit_dir, meta, old_slug)
        lessons_dir = LESSONS_DIR / old_slug
        if not lessons_dir.exists():
            print(f'  [warn] no existe {lessons_dir}, salto lecciones')
            continue
        for md in sorted(lessons_dir.glob('*.md')):
            process_lesson_md(md, meta, old_slug)
        print(f'  [unit] {old_slug}: {len(list(lessons_dir.glob("*.md")))} lecciones')

    print()
    print('=== Step 2: git mv para slugs renombrados ===')
    for old_slug, meta in UNIT_MAP:
        new_slug = meta['slug']
        if new_slug == old_slug:
            continue
        # rename units folder
        old_unit = UNITS_DIR / old_slug
        new_unit = UNITS_DIR / new_slug
        if old_unit.exists():
            git_mv(old_unit, new_unit)
        # rename lessons folder
        old_lessons = LESSONS_DIR / old_slug
        new_lessons = LESSONS_DIR / new_slug
        if old_lessons.exists():
            git_mv(old_lessons, new_lessons)

    print()
    print('Done. Revisa con `git status` y luego `npm run check && npm run build`.')


if __name__ == '__main__':
    main()
