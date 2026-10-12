#!/usr/bin/env python3
"""Idioma nuevo para la web, traducido a mano (sin API): extraer → traducir → aplicar.

Misma jaula que translate_wave.py: el EUSKERA no se reescribe nunca. Del
original es solo salen los campos vehiculares (title, prompt, explanation,
hint, opciones vehiculares, lado `es` de tarjetas y parejas, cuerpo); todo lo
demás se COPIA del es al montar, así que la paridad es por construcción.

Formato de trabajo (texto plano, cómodo de traducir a mano):

    @@ title
    Kaixo!
    @@ body
    …markdown de varias líneas…

  i18n-trabajo/es/<tipo>/<ruta>.txt   ← plantilla extraída del es
  i18n-trabajo/<loc>/<tipo>/<ruta>.txt ← traducción (mismas claves)

Comprobación del euskera: un fragmento del original (negrita, cursiva, código,
comillas o celda de tabla) que sale IDÉNTICO en las traducciones ya revisadas
(en, de, pl, ru) es euskera o un nombre propio, y tiene que seguir idéntico en
la traducción nueva. Es un oráculo: no hace falta adivinar qué es euskera.

Uso:
  python3 scripts/idioma_nuevo.py extraer
  python3 scripts/idioma_nuevo.py validar <loc> [ruta…]
  python3 scripts/idioma_nuevo.py aplicar <loc>
  python3 scripts/idioma_nuevo.py estado <loc>
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

import yaml

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_bank import lenient_yaml  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
TRABAJO = ROOT / "i18n-trabajo"
CONTENT = ROOT / "src/content"
NIVELES = ["a1", "a2"]
ORACULOS = ["en", "de", "pl", "ru"]

ES_MARKERS = re.compile(r"[áéíóúü¿¡]|(?:\b(?:el|la|los|las|un|una|de|del|que|y|es|no|sí|con|para|por|se|me|te|lo)\b)", re.I)
# restos de castellano en la traducción (palabras que no existen en hu/bg)
RESTOS_ES = re.compile(r"\b(?:los|las|del|para|que|una|está|también|porque|cuando|pero|como)\b")


def is_vehicular(text: str) -> bool:
    return bool(ES_MARKERS.search(text))


# ── formato @@ ──

def dump_seg(seg: dict) -> str:
    partes = []
    for k, v in seg.items():
        v = str(v)
        if re.search(r"^@@ ", v, re.M):
            raise ValueError(f"segmento {k} contiene una línea '@@ '")
        partes.append(f"@@ {k}\n{v}")
    return "\n".join(partes) + "\n"


def load_seg(texto: str) -> dict:
    out, clave, buf = {}, None, []
    for linea in texto.split("\n"):
        m = re.match(r"^@@ (\S+)$", linea)
        if m:
            if clave is not None:
                out[clave] = "\n".join(buf)
            clave, buf = m.group(1), []
        else:
            buf.append(linea)
    if clave is not None:
        out[clave] = "\n".join(buf)
    # el volcado añade un \n final al último segmento
    if out:
        ult = list(out)[-1]
        if out[ult].endswith("\n") or out[ult] == "":
            out[ult] = out[ult][:-1] if out[ult].endswith("\n") else out[ult]
    return out


# ── segmentos (mismos criterios que translate_wave.py) ──

def parse_md(path: pathlib.Path):
    t = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", t, re.S)
    return lenient_yaml(m.group(1)), m.group(2)


def dump_md(fm: dict, body: str) -> str:
    y = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False, width=10000)
    return f"---\n{y}---\n{body}"


def seg_leccion(fm: dict, body: str) -> dict:
    seg = {"title": fm["title"]}
    for i, ex in enumerate(fm.get("exercises") or []):
        if "prompt" in ex:
            seg[f"x{i}.prompt"] = ex["prompt"]
        if ex.get("explanation"):
            seg[f"x{i}.explanation"] = ex["explanation"]
        if ex.get("hint"):
            seg[f"x{i}.hint"] = ex["hint"]
        # Todas las opciones y parejas: la heurística de translate_wave dejaba sin
        # traducir castellano sin tildes («Hola»). Las que están en euskera las
        # fija el oráculo (segmento idéntico en todas las traducciones revisadas).
        if ex.get("type") == "multiple-choice":
            for j, o in enumerate(ex["options"]):
                seg[f"x{i}.opt{j}"] = o
        for j, c in enumerate(ex.get("cards") or []):
            seg[f"x{i}.card{j}"] = c["es"]
        for j, p in enumerate(ex.get("pairs") or []):
            seg[f"x{i}.pair{j}"] = p["es"]
    seg["body"] = body
    return seg


def aplica_leccion(fm: dict, body: str, tr: dict) -> tuple[dict, str]:
    out = json.loads(json.dumps(fm))
    out["title"] = tr["title"]
    for i, ex in enumerate(out.get("exercises") or []):
        for campo in ("prompt", "explanation", "hint"):
            if f"x{i}.{campo}" in tr:
                ex[campo] = tr[f"x{i}.{campo}"]
        if ex.get("type") == "multiple-choice":
            for j in range(len(ex["options"])):
                if f"x{i}.opt{j}" in tr:
                    ex["options"][j] = tr[f"x{i}.opt{j}"]
        for j, c in enumerate(ex.get("cards") or []):
            if f"x{i}.card{j}" in tr:
                c["es"] = tr[f"x{i}.card{j}"]
        for j, p in enumerate(ex.get("pairs") or []):
            if f"x{i}.pair{j}" in tr:
                p["es"] = tr[f"x{i}.pair{j}"]
    return out, tr["body"]


def seg_unidad(u: dict) -> dict:
    return {"title": u["title"], "description": u["description"]}


def seg_nivel(lv: dict) -> dict:
    seg = {"name": lv["name"], "description": lv["description"]}
    for i, c in enumerate(lv.get("curriculum") or []):
        seg[f"c{i}"] = c["title"]
    return seg


# ── inventario: (tipo, ruta relativa de trabajo, fichero es, fichero destino(loc)) ──

def inventario():
    items = []
    for nv in NIVELES:
        for f in sorted((CONTENT / "lessons/es" / nv).rglob("*.md")):
            rel = f.relative_to(CONTENT / "lessons/es")
            items.append(("lessons", rel.with_suffix(".txt"), f, lambda loc, rel=rel: CONTENT / "lessons" / loc / rel))
        for f in sorted((CONTENT / "units/es" / nv).glob("*/index.yaml")):
            rel = f.relative_to(CONTENT / "units/es")
            items.append(("units", rel.parent.with_suffix(".txt"), f, lambda loc, rel=rel: CONTENT / "units" / loc / rel))
        f = CONTENT / "levels/es" / f"{nv}.yaml"
        items.append(("levels", pathlib.Path(f"{nv}.txt"), f, lambda loc, nv=nv: CONTENT / "levels" / loc / f"{nv}.yaml"))
    return items


def segmentos_de(tipo: str, f: pathlib.Path) -> dict:
    if tipo == "lessons":
        return seg_leccion(*parse_md(f))
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    return seg_unidad(d) if tipo == "units" else seg_nivel(d)


def trabajo(loc: str, tipo: str, rel: pathlib.Path) -> pathlib.Path:
    return TRABAJO / loc / tipo / rel


# ── oráculo del euskera ──

FRAG = [
    re.compile(r"\*\*([^*\n]+?)\*\*"),
    re.compile(r"(?<![*\w])\*([^*\n]+?)\*(?![*\w])"),
    re.compile(r"`([^`\n]+)`"),
    re.compile(r"«([^»\n]+)»"),
    re.compile(r"\"([^\"\n]+)\""),
]


def fragmentos(texto: str) -> list[str]:
    out = []
    for rx in FRAG:
        out += [m.group(1).strip() for m in rx.finditer(texto)]
    for linea in texto.split("\n"):
        if linea.lstrip().startswith("|") and not re.match(r"^\s*\|[\s:|-]+\|\s*$", linea):
            out += [c.strip().strip("*").strip() for c in linea.strip().strip("|").split("|")]
    return [x for x in out if x and len(x) > 1 and not re.fullmatch(r"[\d\s.,:;/()+%-]+", x)]


def intocables(tipo, f_es, seg_es: dict, f_dest) -> dict[str, list[str]]:
    """Por segmento: fragmentos del es que siguen idénticos en TODOS los oráculos."""
    segs_or = []
    for o in ORACULOS:
        p = f_dest(o)
        if not p.exists():
            continue
        try:
            segs_or.append(segmentos_de(tipo, p))
        except Exception:
            continue
    out = {}
    for k, v in seg_es.items():
        # segmento entero que ninguna traducción revisada cambió (p. ej. un
        # enunciado de hueco en euskera, «Ni Egoitz ___.») → se copia tal cual
        # (las parejas no: su lado `es` es SIEMPRE la traducción, y en los 17
        # idiomas quedan ~288 sin traducir, así que el oráculo ahí miente)
        if ".pair" not in k and v not in CASTELLANO_SIN_TRADUCIR and segs_or and all(s.get(k) == v for s in segs_or):
            out[k] = [v]
            continue
        frs = fragmentos(v)
        if not frs or not segs_or:
            continue
        textos = [s.get(k, "") for s in segs_or]
        keep = [fr for fr in dict.fromkeys(frs) if all(fr in t for t in textos)]
        if keep:
            out[k] = keep
    return out


# Opciones en CASTELLANO que translate_wave dejó sin traducir en los 17 idiomas
# (no llevan tildes ni palabras marcadoras). Revisadas a mano el 12-oct-2026
# sobre las 559 opciones idénticas en todos los oráculos; el resto es euskera.
CASTELLANO_SIN_TRADUCIR = {
    "abrir / cerrar", "abuelo", "aburrido", "alegre", "Aperitivo", "Bebida", "bocadillo",
    "callado", "coches", "cruzar", "Demasiado cara", "Demasiado grande", "Demasiado pequeña",
    "Empleado", "enfermos", "entrar / salir", "Estoy bien", "Estoy igual", "Estoy mejor",
    "Estoy peor", "girar", "hermano", "ir / venir", "Jefe", "libros", "Lluvia", "Muy bonita",
    "nervioso", "Niebla", "niños", "Pasado reciente (joan naiz)", "plato combinado",
    "Plato principal", "postre", "Postre", "Presente", "Primer plato", "primo", "seguir recto",
    "Segundo plato", "Sol", "subir", "subir / bajar", "suegro", "Sueldo", "Trabajo",
    "Tu hermano", "Tu jefe", "Tu profesor", "Tu vecino", "Viento fuerte", "pintxo",
}


def copias_enteras(tipo, f_es, seg_es, f_dest) -> set[str]:
    """Claves cuyo segmento ninguna traducción revisada cambió: se copian del es."""
    return {k for k, frs in intocables(tipo, f_es, seg_es, f_dest).items()
            if frs == [seg_es[k]] and seg_es[k] not in CASTELLANO_SIN_TRADUCIR}


def con_copias(loc, tipo, rel, f_es, f_dest) -> dict:
    """Traducción + segmentos copiados del es (la plantilla no los pide)."""
    seg_es = segmentos_de(tipo, f_es)
    tr = load_seg(trabajo(loc, tipo, rel).read_text(encoding="utf-8"))
    for k in copias_enteras(tipo, f_es, seg_es, f_dest):
        tr.setdefault(k, seg_es[k])
    return tr


# ── comprobaciones estructurales ──

def firma(texto: str) -> dict:
    lineas = texto.split("\n")
    tabla = [ln.count("|") for ln in lineas if ln.lstrip().startswith("|")]
    return {
        "cabeceras": [len(m.group(1)) for m in re.finditer(r"^(#+) ", texto, re.M)],
        "tabla": tabla,
        "huecos": texto.count("___"),
        "flechas": texto.count("→"),
        "enlaces": re.findall(r"\]\(([^)]+)\)", texto),
        "html": re.findall(r"</?[a-zA-Z][^>]*>", texto),
        "listas": len(re.findall(r"^\s*(?:[-*]|\d+\.) ", texto, re.M)),
        "citas": len(re.findall(r"^>", texto, re.M)),
    }


def validar_item(loc, tipo, rel, f_es, f_dest) -> list[str]:
    p = trabajo(loc, tipo, rel)
    if not p.exists():
        return ["(sin traducir)"]
    seg_es = segmentos_de(tipo, f_es)
    try:
        tr = con_copias(loc, tipo, rel, f_es, f_dest)
    except Exception as e:  # noqa: BLE001
        return [f"no se puede leer: {e}"]
    errs = []
    # @@ _ok: fragmentos «intocables» que se cambian A PROPÓSITO (uno por línea),
    # p. ej. un verbo castellano citado que en el idioma nuevo no dice nada
    permitidos = {x.strip() for x in tr.pop("_ok", "").split("\n") if x.strip()}
    falt = [k for k in seg_es if k not in tr]
    sobr = [k for k in tr if k not in seg_es]
    if falt:
        errs.append(f"faltan claves: {falt}")
    if sobr:
        errs.append(f"claves de más: {sobr}")
    for k, v in seg_es.items():
        t = tr.get(k)
        if t is None:
            continue
        if not t.strip() and v.strip():
            errs.append(f"{k}: vacío")
        fe, ft = firma(v), firma(t)
        for campo in fe:
            if campo == "html":
                if sorted(re.sub(r"\s.*", "", x) for x in fe[campo]) != sorted(re.sub(r"\s.*", "", x) for x in ft[campo]):
                    errs.append(f"{k}: etiquetas HTML distintas")
            elif fe[campo] != ft[campo]:
                errs.append(f"{k}: {campo} {fe[campo]} ≠ {ft[campo]}")
        if RESTOS_ES.search(t) and loc not in ("es",):
            m = RESTOS_ES.search(t)
            errs.append(f"{k}: posible castellano sin traducir («…{t[max(0, m.start()-20):m.end()+20]}…»)")
    for k, frs in intocables(tipo, f_es, seg_es, f_dest).items():
        t = tr.get(k, "")
        for fr in frs:
            if fr not in t and fr not in permitidos:
                errs.append(f"{k}: falta el fragmento intocable «{fr}»")
    return errs


def cmd_extraer():
    n = 0
    for tipo, rel, f, dest in inventario():
        p = trabajo("es", tipo, rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        seg = segmentos_de(tipo, f)
        fijos = copias_enteras(tipo, f, seg, dest)
        p.write_text(dump_seg({k: v for k, v in seg.items() if k not in fijos}), encoding="utf-8")
        n += 1
    print(f"extraídos {n} ficheros en {TRABAJO / 'es'}")


def filtra(items, rutas):
    if not rutas:
        return items
    return [it for it in items if any(str(it[0] + "/" + str(it[1])).startswith(r) or str(it[1]).startswith(r) for r in rutas)]


def cmd_validar(loc, rutas):
    total = mal = sin = 0
    for tipo, rel, f, dest in filtra(inventario(), rutas):
        errs = validar_item(loc, tipo, rel, f, dest)
        if errs == ["(sin traducir)"]:
            sin += 1
            if rutas:
                print(f"· {tipo}/{rel}: sin traducir")
            continue
        total += 1
        if errs:
            mal += 1
            print(f"✗ {tipo}/{rel}")
            for e in errs:
                print(f"    {e}")
    print(f"{loc}: {total} traducidos, {mal} con avisos, {sin} sin traducir")
    return mal


def cmd_aplicar(loc):
    hechos = 0
    for tipo, rel, f, dest in inventario():
        p = trabajo(loc, tipo, rel)
        if not p.exists():
            continue
        errs = validar_item(loc, tipo, rel, f, dest)
        duros = [e for e in errs if "posible castellano" not in e]
        if duros:
            print(f"✗ {tipo}/{rel}: no se aplica ({len(duros)} errores)")
            continue
        tr = con_copias(loc, tipo, rel, f, dest)
        tr.pop("_ok", None)
        out = dest(loc)
        out.parent.mkdir(parents=True, exist_ok=True)
        if tipo == "lessons":
            fm, body = parse_md(f)
            fm2, body2 = aplica_leccion(fm, body, tr)
            out.write_text(dump_md(fm2, body2), encoding="utf-8")
        elif tipo == "units":
            u = yaml.safe_load(f.read_text(encoding="utf-8"))
            u["title"], u["description"] = tr["title"], tr["description"]
            out.write_text(yaml.safe_dump(u, allow_unicode=True, sort_keys=False, width=10000), encoding="utf-8")
        else:
            lv = yaml.safe_load(f.read_text(encoding="utf-8"))
            lv["name"], lv["description"] = tr["name"], tr["description"]
            for i, c in enumerate(lv.get("curriculum") or []):
                c["title"] = tr[f"c{i}"]
            out.write_text(yaml.safe_dump(lv, allow_unicode=True, sort_keys=False, width=10000), encoding="utf-8")
        hechos += 1
    print(f"{loc}: aplicados {hechos} ficheros")


def cmd_estado(loc):
    items = inventario()
    hechos = [it for it in items if trabajo(loc, it[0], it[1]).exists()]
    pend = [f"{it[0]}/{it[1]}" for it in items if not trabajo(loc, it[0], it[1]).exists()]
    print(f"{loc}: {len(hechos)}/{len(items)} traducidos")
    for p in pend[:10]:
        print("  pendiente:", p)


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        print(__doc__)
        sys.exit(1)
    if a[0] == "extraer":
        cmd_extraer()
    elif a[0] == "validar":
        sys.exit(1 if cmd_validar(a[1], a[2:]) else 0)
    elif a[0] == "aplicar":
        cmd_aplicar(a[1])
    elif a[0] == "estado":
        cmd_estado(a[1])
