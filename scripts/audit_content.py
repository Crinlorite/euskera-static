#!/usr/bin/env python3
"""Auditoría de contenido de un nivel (más allá del schema zod del build).

Uso: python3 scripts/audit_content.py a2 [a1 ...]

Comprueba lo que el build NO puede: cobertura del temario, ambigüedades de
match-pairs, duplicados, respuestas regaladas, sesgo de respuestas, lados
eu/es intercambiados, teoría ausente y colisiones de ids entre niveles.
Salida: informe por consola; exit 1 si hay hallazgos de nivel ERROR."""
import re, sys, unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
C = ROOT / "src" / "content"

ERR, WARN, INFO = "ERROR", "AVISO", "info"
hallazgos = []

def add(nivel, donde, msg):
    hallazgos.append((nivel, donde, msg))

def cargar_leccion(p):
    txt = p.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", txt, re.S)
    if not m:
        add(ERR, p.name, "frontmatter ilegible")
        return None, ""
    try:
        fm = yaml.safe_load(m.group(1))
    except yaml.YAMLError:
        # PyYAML es más estricto que el parser del build (js-yaml) con los
        # «¿...?» sin comillas en flow mappings. Reintento entrecomillando
        # los valores de es:/eu: en mappings de una línea; si aun así falla,
        # ES un error de verdad.
        import re as _re
        arreglado = _re.sub(r"(\b(?:es|eu|prompt|explanation):\s)([^'\"{}\[\]][^,}]*?)(\s*[,}])",
                            lambda m2: f"{m2.group(1)}'{m2.group(2).strip()}'{m2.group(3)}", m.group(1))
        try:
            fm = yaml.safe_load(arreglado)
            add(WARN, p.name, "YAML no estricto (¿…? sin comillas): el build lo traga, PyYAML no")
        except yaml.YAMLError as e:
            add(ERR, p.name, f"YAML inválido: {e}")
            return None, ""
    return fm, m.group(2).strip()

def es_sospechoso_eu(s):
    """El euskera estándar no usa tildes ni ñ/¿/¡ — si aparecen en el lado eu,
    huele a lados intercambiados o a texto castellano colado."""
    return bool(re.search(r"[áéíóúÁÉÍÓÚñÑ¿¡]", s))

def auditar_nivel(code):
    base = C / "lessons" / "es" / code
    if not base.exists():
        print(f"✗ no existe {base}"); return {}
    files = sorted(base.rglob("*.md"))
    nivel_yaml = C / "levels" / "es" / f"{code}.yaml"
    temario = []
    if nivel_yaml.exists():
        lv = yaml.safe_load(nivel_yaml.read_text(encoding="utf-8"))
        temario = [it["id"] for it in lv.get("curriculum", [])]

    lecciones, covers_all = [], set()
    ids_leccion, ids_ej, prompts = Counter(), Counter(), defaultdict(list)
    respuestas_mc, cards_globales = Counter(), Counter()
    stats = Counter()

    for p in files:
        fm, body = cargar_leccion(p)
        if fm is None:
            continue
        rel = str(p.relative_to(base))
        lecciones.append((rel, fm, body))
        ids_leccion[fm.get("id", "?")] += 1
        covers_all.update(fm.get("covers", []))

        # teoría
        if len(body) < 400:
            add(WARN, rel, f"teoría muy corta ({len(body)} chars)")
        if "\ufffd" in body or "\ufffd" in str(fm):
            add(ERR, rel, "carácter de reemplazo (encoding roto)")
        est = fm.get("estimatedMinutes")
        if not isinstance(est, int) or not (5 <= est <= 30):
            add(WARN, rel, f"estimatedMinutes raro: {est}")

        tipos = Counter()
        for ex in fm.get("exercises", []):
            t = ex.get("type"); eid = ex.get("id", "?")
            ids_ej[eid] += 1; tipos[t] += 1; stats[t] += 1
            if t == "multiple-choice":
                ops = ex.get("options", [])
                if len(ops) != len(set(ops)):
                    add(ERR, rel, f"{eid}: opciones duplicadas")
                if not (3 <= len(ops) <= 5):
                    add(WARN, rel, f"{eid}: {len(ops)} opciones")
                if not ex.get("explanation"):
                    add(WARN, rel, f"{eid}: sin explicación")
                respuestas_mc[ex.get("answer")] += 1
                prompts[ex.get("prompt", "").strip().lower()].append(rel)
            elif t == "fill-in-blank":
                pr = ex.get("prompt", "")
                for a in ex.get("answers", []):
                    # respuesta regalada: aparece fuera del hueco (como palabra completa)
                    sin_hueco = re.sub(r"_{3,}", " ", pr)
                    if re.search(rf"\b{re.escape(a)}\b", sin_hueco, re.I):
                        add(ERR, rel, f"{eid}: la respuesta «{a}» aparece en el enunciado")
                if not ex.get("explanation"):
                    add(WARN, rel, f"{eid}: sin explicación")
                prompts[pr.strip().lower()].append(rel)
            elif t == "flashcards":
                cards = ex.get("cards", [])
                if len(cards) < 4:
                    add(WARN, rel, f"{eid}: solo {len(cards)} tarjetas")
                vistos = Counter(c.get("eu", "").strip().lower() for c in cards)
                for k, n in vistos.items():
                    if n > 1:
                        add(ERR, rel, f"{eid}: tarjeta repetida «{k}»")
                for c in cards:
                    eu, es_ = c.get("eu", ""), c.get("es", "")
                    if not eu.strip() or not es_.strip():
                        add(ERR, rel, f"{eid}: tarjeta con lado vacío")
                    if es_sospechoso_eu(eu):
                        add(WARN, rel, f"{eid}: lado eu con tildes/ñ: «{eu}» (¿intercambiado?)")
                    cards_globales[eu.strip().lower()] += 1
            elif t == "match-pairs":
                pares = ex.get("pairs", [])
                if not (3 <= len(pares) <= 8):
                    add(WARN, rel, f"{eid}: {len(pares)} pares")
                for lado, k in (("eu", "eu"), ("es", "es")):
                    c2 = Counter(pp.get(k, "").strip().lower() for pp in pares)
                    dup = [x for x, n in c2.items() if n > 1 and x]
                    if dup:
                        add(ERR, rel, f"{eid}: lado {lado} duplicado {dup} → emparejado ambiguo")
                for pp in pares:
                    if es_sospechoso_eu(pp.get("eu", "")):
                        add(WARN, rel, f"{eid}: par con eu sospechoso: «{pp.get('eu')}»")
            else:
                add(ERR, rel, f"{eid}: tipo desconocido {t}")
        if len(tipos) < 2 and fm.get("exercises"):
            add(WARN, rel, f"poca variedad: solo {dict(tipos)}")

    # ids duplicados
    for cid, n in ids_leccion.items():
        if n > 1: add(ERR, code, f"id de lección duplicado: {cid} ×{n}")
    for eid, n in ids_ej.items():
        if n > 1: add(ERR, code, f"id de ejercicio duplicado: {eid} ×{n}")
    for pr, sitios in prompts.items():
        if len(sitios) > 1 and pr:
            add(WARN, code, f"enunciado repetido en {sitios}: «{pr[:60]}…»")

    # orden por unidad
    por_unidad = defaultdict(list)
    for rel, fm, _ in lecciones:
        por_unidad[rel.split("/")[0]].append(fm.get("order"))
    for u, orden in sorted(por_unidad.items()):
        so = sorted(o for o in orden if isinstance(o, int))
        if so != list(range(1, len(so) + 1)):
            add(ERR, u, f"orden con huecos/duplicados: {sorted(orden)}")

    # cobertura del temario
    faltan = [t for t in temario if t not in covers_all]
    sobran = [c2 for c2 in covers_all if temario and c2 not in temario]
    if sobran:
        add(ERR, code, f"covers que NO están en el temario: {sobran}")

    # sesgo de respuestas mc
    total_mc = sum(respuestas_mc.values())
    if total_mc >= 20:
        top = respuestas_mc.most_common(1)[0]
        if top[1] / total_mc > 0.5:
            add(WARN, code, f"sesgo: la opción {top[0]} es correcta el {top[1]*100//total_mc}% de las veces")

    print(f"\n══════ {code.upper()} · {len(files)} lecciones · {sum(stats.values())} ejercicios {dict(stats)}")
    print(f"  temario: {len(temario)} items · cubiertos {len(covers_all & set(temario))} · SIN cubrir {len(faltan)}")
    if faltan:
        print("  faltan:", ", ".join(faltan))
    print(f"  distribución respuestas MC: {dict(sorted(respuestas_mc.items()))}")
    return {"faltan": faltan, "lecciones": len(files)}

if __name__ == "__main__":
    niveles = sys.argv[1:] or ["a2"]
    res = {}
    for n in niveles:
        res[n] = auditar_nivel(n)
    errores = [h for h in hallazgos if h[0] == ERR]
    avisos = [h for h in hallazgos if h[0] == WARN]
    print(f"\n──── {len(errores)} ERRORES · {len(avisos)} avisos ────")
    for nivel, donde, msg in errores + avisos[:40]:
        print(f"  [{nivel}] {donde}: {msg}")
    if len(avisos) > 40:
        print(f"  … y {len(avisos)-40} avisos más")
    sys.exit(1 if errores else 0)
