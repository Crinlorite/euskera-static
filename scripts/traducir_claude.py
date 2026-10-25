#!/usr/bin/env python3
"""Traducción de un idioma nuevo con la API de Claude, sobre la jaula de idioma_nuevo.py.

idioma_nuevo.py extrae las plantillas (i18n-trabajo/es/…), valida y aplica; este
script solo rellena i18n-trabajo/<loc>/… llamando al modelo. Al modelo viajan los
campos vehiculares de cada fichero como JSON clave → texto, más la lista de
fragmentos en euskera que tienen que volver idénticos (el oráculo de
idioma_nuevo). Lo que es euskera puro (opciones, lado `eu` de tarjetas y parejas)
no sale nunca: se copia del original al montar.

La salida va forzada con un esquema JSON con EXACTAMENTE las claves de entrada.

Uso:
  traducir_claude.py coste <loc> [ruta…]           # tokens de entrada reales (count_tokens, gratis)
  traducir_claude.py directo <loc> [ruta…]          # llamada a llamada (prueba, reintentos)
  traducir_claude.py lote <loc> [ruta…]             # Batch API (mitad de precio); espera y escribe
  traducir_claude.py validar <loc> [ruta…]          # revalida lo traducido, sin API
  traducir_claude.py semilla <loc>                  # semillas del simulacro (luego idioma_nuevo.py semilla-aplicar)
  traducir_claude.py ui <loc>                       # claves de src/i18n/ui.ts → src/i18n/ui-tmp/<loc>.json (luego merge-ui.mjs)

La clave se lee de /root/.claude/kaixo-dariya.local.env (ANTHROPIC_API_KEY) y no
se escribe en ningún sitio.
"""
from __future__ import annotations

import json
import pathlib
import re
import subprocess
import sys
import time

import anthropic

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import idioma_nuevo as inu  # noqa: E402

ROOT = inu.ROOT
CLAVE = pathlib.Path("/root/.claude/kaixo-dariya.local.env")
MODELO = "claude-opus-5-5"
NIVELES = ["a1", "a2"]
REGISTRO = ROOT / "i18n-trabajo" / "uso-api.jsonl"

IDIOMAS = {
    "ary": {
        "nombre": "Moroccan Darija (الدارجة المغربية)",
        "guia": """\
TARGET LANGUAGE: Moroccan Darija, written in ARABIC SCRIPT.
- Write the Darija people actually speak and text in Morocco (e.g. كاين، ديال، واش، شنو، كيفاش، علاش، بزاف، دابا، غادي، باش، حيت، مزيان، كا/تا before present verbs). NOT Modern Standard Arabic, NOT arabizi (no Latin letters or digits for Arabic sounds), NOT Egyptian or Levantine.
- Grammar terms: use the words Moroccan learners know from school (فعل، اسم، ضمير، صفة، المفرد، الجمع، الماضي، الحاضر، السؤال…) — these MSA terms are normal inside Darija explanations.
- Address the learner in the singular, generic masculine (نتا، تقول، عندك), as Moroccan apps usually do.
- Use Western digits (1, 2, 3) like the source.
- The language being taught is Basque: call it «الباسكية» (the Basque language) — never «الإسبانية».
- Table column headers that name the teaching language («Castellano», «Español») become «الدارجة»; a header «Euskera» becomes «الباسكية».
- The reader is a Darija speaker, not a Spanish speaker. When the source compares Basque with Spanish for a Spanish speaker («como en castellano», «a diferencia del español»), rewrite the comparison so it makes sense for this reader (compare with Darija, or with French when that is the natural reference in Morocco), or drop it if it no longer says anything. Spanish words quoted only as glosses (e.g. "ser/estar") are glosses: give the Darija meaning instead.
- Basque inside Darija text stays in Latin script exactly as written; do not transliterate it into Arabic letters.""",
    },
}

SISTEMA = """You translate a Basque-language course whose teaching language is Spanish.
You receive a JSON object "segments" (key → Spanish text) and a JSON object "must_keep" (key → list of fragments).
Return the same keys with the text translated into the target language.

Hard rules:
- NEVER translate, transliterate or alter Basque (the language being taught): Basque words and sentences in quotes, *italics*, **bold**, `code`, table cells, suffixes like -rekin. Copy them byte for byte.
- Every fragment listed in must_keep[key] MUST appear verbatim in your value for that key.
- Keep the Markdown exactly: same headings and levels, same number of list items, same tables with the same number of rows and cells (| count per line), same blockquotes, links and HTML tags, ___ blanks and → arrows. Same line structure.
- Translate everything that is Spanish, including short options or card sides like «Hola» or «abuelo» when they are Spanish (a value that is entirely Basque stays as is).
- Natural, friendly, didactic tone for adult learners; as concise as the original.

{guia}"""


def cliente() -> anthropic.Anthropic:
    for linea in CLAVE.read_text().splitlines():
        m = re.match(r"^\s*(?:export\s+)?ANTHROPIC_API_KEY\s*=\s*['\"]?([^'\"\s]+)", linea)
        if m:
            return anthropic.Anthropic(api_key=m.group(1), max_retries=4)
    sys.exit(f"sin ANTHROPIC_API_KEY en {CLAVE}")


# ── trabajos ──

def items(rutas):
    its = [it for it in inu.inventario() if str(it[1]).split("/")[0] in NIVELES or str(it[1]) in {f"{n}.txt" for n in NIVELES}]
    return inu.filtra(its, rutas)


def trabajo_de(it) -> dict:
    tipo, rel, f_es, dest = it
    plantilla = inu.load_seg(inu.trabajo("es", tipo, rel).read_text(encoding="utf-8"))
    seg_es = inu.segmentos_de(tipo, f_es)
    keep = {k: v for k, v in inu.intocables(tipo, f_es, seg_es, dest).items() if k in plantilla}
    return {"id": f"{tipo}/{rel}", "tipo": tipo, "rel": rel, "segmentos": plantilla, "keep": keep}


def peticion(loc: str, tr: dict, errores: list[str] | None = None) -> dict:
    claves = list(tr["segmentos"])
    usuario = json.dumps({"segments": tr["segmentos"], "must_keep": tr["keep"]}, ensure_ascii=False, indent=1)
    if errores:
        usuario += "\n\nA previous attempt failed these checks; fix them:\n" + "\n".join(f"- {e}" for e in errores)
    return {
        "model": MODELO,
        "max_tokens": 32000,
        "output_config": {
            "effort": "low",
            "format": {"type": "json_schema", "schema": {
                "type": "object",
                "properties": {k: {"type": "string"} for k in claves},
                "required": claves,
                "additionalProperties": False,
            }},
        },
        "system": [{"type": "text", "text": SISTEMA.format(guia=IDIOMAS[loc]["guia"]), "cache_control": {"type": "ephemeral"}}],
        "messages": [{"role": "user", "content": usuario}],
    }


def pide(c, p):
    with c.messages.stream(**p) as s:
        return s.get_final_message()


def texto_de(msg) -> str:
    return "".join(b.text for b in msg.content if b.type == "text")


def apunta(loc, ident, usage, modo):
    REGISTRO.parent.mkdir(parents=True, exist_ok=True)
    u = usage.model_dump() if hasattr(usage, "model_dump") else dict(usage)
    with REGISTRO.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"t": time.strftime("%Y-%m-%dT%H:%M:%S"), "loc": loc, "id": ident, "modo": modo,
                             "in": u.get("input_tokens"), "out": u.get("output_tokens"),
                             "cache_w": u.get("cache_creation_input_tokens"), "cache_r": u.get("cache_read_input_tokens")}) + "\n")


# Letras de otros alfabetos colados (pasó: «باба» con б y а cirílicas) y palabras
# que mezclan letras árabes y latinas. El latín suelto es euskera y está bien.
AJENO = re.compile(r"[\u0370-\u03ff\u0400-\u052f\u0590-\u05ff\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]")
ARABE, LATIN = re.compile(r"[\u0600-\u06ff]"), re.compile(r"[A-Za-zÀ-ÿ]")
# Se admite un prefijo de una letra pegado al euskera («وNekatuta», «فـA1»), como se escribe en árabe.
# y el artículo «الـ» con o sin preposición delante («الـrepo», «فالـeuskaltegi»).
# También «لل» (ل + ال) y un sufijo citado tras el prefijo («بـ-k»).
PREFIJO = re.compile(r"^(?:[وفبلك]?الـ?|[وفبلك]?للـ?|[وفبلك]ـ?)-?[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9'-]*$")


def alfabeto(salida: dict) -> list[str]:
    errs = []
    for k, v in salida.items():
        m = AJENO.search(v)
        if m:
            errs.append(f"{k}: letra de otro alfabeto («…{v[max(0, m.start() - 15):m.end() + 15]}…»)")
        # Letra árabe pegada a un * o ** que abre ante un signo («و**(2)…**»): Markdown no lo
        # reconoce como énfasis y se ven los asteriscos.
        for linea in v.split("\n"):
            for n, m in enumerate(re.finditer(r"\*\*", linea)):
                antes, despues = linea[m.start() - 1:m.start()], linea[m.end():m.end() + 1]
                if n % 2 == 0 and re.match(r"[\u0600-\u06ff]", antes) and re.match(r"[^\w\s]", despues):
                    errs.append(f"{k}: énfasis pegado a letra árabe («…{linea[max(0, m.start() - 10):m.end() + 10]}…»)")
        for pal in re.findall(r"[^\s.,;:!?¿¡()\[\]{}«»\"*`|/=→…—–،؛؟]+", re.sub(r"<[^>]*>", " ", v)):
            if ARABE.search(pal) and LATIN.search(pal) and not PREFIJO.match(pal):
                errs.append(f"{k}: palabra mezcla árabe y latín («{pal}»)")
    return errs


def guarda(loc, tr, salida: dict) -> list[str]:
    p = inu.trabajo(loc, tr["tipo"], tr["rel"])
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(inu.dump_seg({k: salida[k] for k in tr["segmentos"]}), encoding="utf-8")
    it = next(i for i in inu.inventario() if i[0] == tr["tipo"] and i[1] == tr["rel"])
    return alfabeto(salida) + inu.validar_item(loc, *it)


# ── órdenes ──

def cmd_coste(loc, rutas):
    c = cliente()
    total = 0
    trs = [trabajo_de(it) for it in items(rutas)]
    for tr in trs:
        p = peticion(loc, tr)
        n = c.messages.count_tokens(model=p["model"], system=p["system"], messages=p["messages"]).input_tokens
        total += n
    sis = c.messages.count_tokens(model=MODELO, system=peticion(loc, trs[0])["system"],
                                  messages=[{"role": "user", "content": "x"}]).input_tokens
    es_tokens = total - sis * len(trs)
    print(f"{len(trs)} peticiones · entrada total {total:,} tokens (sistema ≈{sis:,} c/u; contenido ≈{es_tokens:,})")


def cmd_directo(loc, rutas, intentos=3):
    c = cliente()
    malos = []
    for it in items(rutas):
        tr = trabajo_de(it)
        errs = None
        for n in range(intentos):
            # Un esquema con muchas claves no compila («grammar is too large»): por tandas.
            claves, salida, fallo = list(tr["segmentos"]), {}, None
            for i in range(0, len(claves), 45):
                parte = {**tr, "segmentos": {k: tr["segmentos"][k] for k in claves[i:i + 45]},
                         "keep": {k: v for k, v in tr["keep"].items() if k in claves[i:i + 45]}}
                msg = pide(c, peticion(loc, parte, errs))
                apunta(loc, tr["id"], msg.usage, "directo")
                if msg.stop_reason != "end_turn":
                    fallo = msg.stop_reason
                    break
                salida.update(json.loads(texto_de(msg)))
            if fallo:
                errs = [f"stop_reason {fallo}"]
                print(f"  {tr['id']}: {fallo}")
                continue
            errs = guarda(loc, tr, salida)
            duros = [e for e in errs if "posible castellano" not in e]
            print(f"{'✓' if not duros else '✗'} {tr['id']} (intento {n + 1}){'' if not errs else ' · ' + '; '.join(errs)[:300]}")
            if not duros:
                break
        else:
            malos.append(tr["id"])
    print(f"hecho; sin pasar la validación: {malos or 'ninguno'}")


def cmd_lote(loc, rutas):
    c = cliente()
    trs = {f"r{i:03d}": trabajo_de(it) for i, it in enumerate(items(rutas))}
    lote = c.messages.batches.create(requests=[{"custom_id": k, "params": peticion(loc, tr)} for k, tr in trs.items()])
    print(f"lote {lote.id}: {len(trs)} peticiones", flush=True)
    while True:
        lote = c.messages.batches.retrieve(lote.id)
        if lote.processing_status == "ended":
            break
        print(f"  {time.strftime('%H:%M:%S')} {lote.request_counts}", flush=True)
        time.sleep(60)
    malos = []
    for r in c.messages.batches.results(lote.id):
        tr = trs[r.custom_id]
        if r.result.type != "succeeded":
            malos.append(tr["id"])
            print(f"✗ {tr['id']}: {r.result.type}")
            continue
        msg = r.result.message
        apunta(loc, tr["id"], msg.usage, "lote")
        try:
            errs = guarda(loc, tr, json.loads(texto_de(msg)))
        except Exception as e:  # noqa: BLE001
            errs = [f"no se puede leer la salida: {e}"]
        duros = [e for e in errs if "posible castellano" not in e]
        if duros:
            malos.append(tr["id"])
        print(f"{'✓' if not duros else '✗'} {tr['id']}{'' if not errs else ' · ' + '; '.join(errs)[:300]}")
    print(f"lote terminado; a repetir en directo: {malos or 'ninguno'}")


def cmd_validar(loc, rutas):
    """Revalida lo ya traducido (sin API): alfabeto + validar_item de idioma_nuevo."""
    malos = []
    for it in items(rutas):
        p = inu.trabajo(loc, it[0], it[1])
        if not p.exists():
            print(f"· {it[0]}/{it[1]}: sin traducir")
            malos.append(f"{it[0]}/{it[1]}")
            continue
        errs = alfabeto(inu.load_seg(p.read_text(encoding="utf-8"))) + inu.validar_item(loc, *it)
        duros = [e for e in errs if "posible castellano" not in e]
        if errs:
            print(f"{'✗' if duros else '~'} {it[0]}/{it[1]} · " + "; ".join(errs)[:400])
        if duros:
            malos.append(f"{it[0]}/{it[1]}")
    print(f"{loc}: a repetir: {malos or 'ninguno'}")


def cmd_semilla(loc):
    """Semillas del simulacro (i18n-trabajo/es/semilla.txt) → i18n-trabajo/<loc>/semilla.txt; luego
    `idioma_nuevo.py semilla-aplicar <loc>`. Euskera intocable = palabras que siguen idénticas en
    los cuatro oráculos para esa misma clave."""
    claves = json.loads((ROOT / "i18n-trabajo/es/semilla-claves.json").read_text(encoding="utf-8"))
    plantilla = inu.load_seg((ROOT / "i18n-trabajo/es/semilla.txt").read_text(encoding="utf-8"))
    ors = [json.loads((inu.SEED / f"{o}.json").read_text(encoding="utf-8")) for o in inu.ORACULOS]
    palabras = lambda t: set(re.findall(r"[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*[A-Za-zÀ-ÿ]", t))
    keep = {}
    for k, v in plantilla.items():
        orig = claves[int(k[1:])]
        fijas = [w for w in palabras(v) if all(w in palabras(o.get(orig, "")) for o in ors)]
        if fijas:
            keep[k] = sorted(fijas)
    c = cliente()
    out_p = ROOT / "i18n-trabajo" / loc / "semilla.txt"
    hecho = inu.load_seg(out_p.read_text(encoding="utf-8")) if out_p.exists() else {}
    pend = [k for k in plantilla if k not in hecho]
    nota = ("These are short items of an A1 Basque exam simulator: Spanish prompts and grammar hints that "
            "contain Basque words and sentences without any marking. Translate the Spanish only.")
    for i in range(0, len(pend), 45):
        tanda = pend[i:i + 45]
        tr = {"id": f"semilla/{i}", "segmentos": {k: plantilla[k] for k in tanda}, "keep": {k: keep[k] for k in tanda if k in keep}}
        pet = peticion(loc, tr)
        pet["messages"][0]["content"] = nota + "\n\n" + pet["messages"][0]["content"]
        msg = pide(c, pet)
        apunta(loc, tr["id"], msg.usage, "semilla")
        hecho.update(json.loads(texto_de(msg)))
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(inu.dump_seg({k: hecho[k] for k in plantilla if k in hecho}), encoding="utf-8")
        print(f"semilla: {len(hecho)}/{len(plantilla)}", flush=True)
    errs = alfabeto(hecho)
    for k, frs in keep.items():
        falta = [w for w in frs if w not in palabras(hecho.get(k, ""))]
        if falta:
            errs.append(f"{k}: falta euskera {falta} · {hecho.get(k, '')[:80]}")
    print("\n".join(errs) or "semilla: validación limpia")


def cmd_ui(loc):
    """Todas las claves del bloque es de ui.ts → src/i18n/ui-tmp/<loc>.json (por tandas), para merge-ui.mjs."""
    js = subprocess.run(["npx", "--yes", "esbuild", "src/i18n/ui.ts", "--bundle", "--format=esm", "--platform=node", "--log-level=error"],
                        cwd=ROOT, capture_output=True, text=True, check=True).stdout
    es = json.loads(subprocess.run(["node", "--input-type=module"], input=js + "\nconsole.log(JSON.stringify(STRINGS.es))",
                                   cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    c = cliente()
    out_p = ROOT / "src/i18n/ui-tmp" / f"{loc}.json"
    hecho = json.loads(out_p.read_text(encoding="utf-8")) if out_p.exists() else {}
    claves = [k for k in es if k not in hecho]
    nota = ("These are UI strings of a website (Kaixo, a free Basque course). Values may contain HTML tags and "
            "placeholders like {0}: keep tags, attributes, hrefs and placeholders exactly. Keep brand names "
            "(Kaixo, Crintech, Hiztegia, Jolas) and Basque words as they are. "
            "Key beta.banner is special for this language: say that this Darija version is in beta and was made "
            "without a native reviewer, and that corrections from Darija speakers are very welcome.")
    for i in range(0, len(claves), 60):
        tanda = {k: es[k] for k in claves[i:i + 60]}
        tr = {"id": f"ui/{i}", "segmentos": tanda, "keep": {}}
        p = peticion(loc, tr)
        p["messages"][0]["content"] = nota + "\n\n" + p["messages"][0]["content"]
        msg = pide(c, p)
        apunta(loc, tr["id"], msg.usage, "ui")
        hecho.update(json.loads(texto_de(msg)))
        out_p.parent.mkdir(parents=True, exist_ok=True)
        out_p.write_text(json.dumps(hecho, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"ui: {len(hecho)}/{len(es)} ({msg.usage.output_tokens} tok salida)", flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2 or a[1] not in IDIOMAS:
        print(__doc__)
        sys.exit(1)
    ordenes = {"coste": cmd_coste, "directo": cmd_directo, "lote": cmd_lote, "validar": cmd_validar, "semilla": lambda loc, r: cmd_semilla(loc), "ui": lambda loc, r: cmd_ui(loc)}
    if a[0] not in ordenes:
        sys.exit(__doc__)
    ordenes[a[0]](a[1], a[2:])
