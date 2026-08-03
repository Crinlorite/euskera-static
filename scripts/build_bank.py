#!/usr/bin/env python3
"""Constructor del banco de items A1 para el generador de simulacros.

Fuente automática: frontmatter de src/content/lessons/es/a1/**/*.md
(contenido que ya pasó audit_content.py) — MC y fill sueltos, tarjetas
agrupadas en pool global (dedup por lado eu), sets de parejas ATÓMICOS
(nunca se mezclan parejas de lecciones distintas: mataría la coherencia
temática y reabriría la ambigüedad que el audit ya descartó por set).

Fuente manual (SEED, abajo): lecturas con texto (los items -ir* de la
unidad 14 dependen de un texto que vive en el cuerpo de la lección, así
que aquí van texto+preguntas juntos) y tareas de idazmena con modelo,
rúbrica de 5 checks y tipo.

Salida: src/data/bank/a1.es.json — COMMITEAR (CF Pages solo ejecuta
`astro build`; este script se corre a mano tras tocar lecciones A1):

    python3 scripts/build_bank.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
# Rutas por locale: la cosecha (items/cards/pairs/títulos) sale del content YA
# traducido de cada idioma; los SEED_* (solo-es) se localizan con el overlay
# scripts/seed_i18n/<loc>.json — el euskera jamás se toca (paridad por construcción).
LOCALES = ["es", "ca", "gl", "ast", "an", "oc", "en", "ar", "fr", "ro", "pt-BR",
           "de", "it", "ru", "pl", "zh-Hans", "ja", "ko"]
def lessons_dir(loc): return ROOT / f"src/content/lessons/{loc}/a1"
def units_dir(loc): return ROOT / f"src/content/units/{loc}/a1"
def out_path(loc): return ROOT / f"src/data/bank/a1.{loc}.json"
def overlay_path(loc): return ROOT / f"scripts/seed_i18n/{loc}.json"
LESSONS = lessons_dir("es")
UNITS = units_dir("es")
OUT = out_path("es")

# ── categorías de gramática por unidad (para las cuotas del blueprint) ──
UNIT_CAT = {
    "01-saludos": "aurkezpena",
    "02-familia": "aurkezpena",
    "03-descripciones": "aurkezpena",
    "10-mi-gente": "aurkezpena",
    "05-mi-pueblo": "lekuak",
    "06-direcciones": "lekuak",
    "09-mi-casa": "lekuak",
    "07-rutina-diaria": "eguneroko",
    "13-agenda": "eguneroko",
    "08-pasado-reciente": "iragana",
    "04-bar-y-comida": "erosketak",
    "11-comprar": "erosketak",
    "12-restaurante": "erosketak",
}

BLUEPRINT = {
    "entzumena": {"listenings": 1, "questionsPer": 4, "plays": 2},
    "irakurmena": {"readings": 2, "questionsPer": 3, "distinctKinds": True},
    "gramatika": {
        "total": 8,
        "minPerCat": {
            "aurkezpena": 1,
            "lekuak": 1,
            "eguneroko": 1,
            "iragana": 1,
            "erosketak": 1,
            "azterketa": 1,
        },
    },
    "hiztegia": {"cards": 16, "pairSets": 2, "pairsPerSet": 6},
    "idazmena": {"tasks": 2, "distinctKinds": True},
    # 4 + 6 + 8 + (1 + 2×0.5) + 2×5 = 30
    "scoring": {"entzumena": 4, "irakurmena": 6, "gramatika": 8, "hiztegia": 2,
                "idazmena": 10, "total": 30},
}


def lenient_yaml(raw: str):
    """safe_load con el mismo plan B que audit_content.py: PyYAML es más
    estricto que js-yaml con los «¿…?» sin comillas en flow mappings;
    recomillamos esos valores y reintentamos."""
    try:
        return yaml.safe_load(raw)
    except yaml.YAMLError:
        # ⚠️ el valor NO puede cruzar líneas ([^,}\n]): con [^,}] a secas el
        # match saltaba de un prompt de bloque a la coma de la línea siguiente
        # y sembraba comillas en medio de options (cazado con el content ro).
        fixed = re.sub(
            r"(\b(?:es|eu|prompt|explanation):\s)([^'\"{}\[\]\n][^,}\n]*?)(\s*[,}])",
            lambda m: f"{m.group(1)}'{m.group(2).strip()}'{m.group(3)}",
            raw,
        )
        return yaml.safe_load(fixed)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower().strip())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def collect(loc="es"):
    items, cards, pair_sets = [], [], []
    seen_eu = set()
    for f in sorted(lessons_dir(loc).rglob("*.md")):
        unit = f.parent.name
        m = re.match(r"^---\n(.*?)\n---\n", f.read_text(encoding="utf-8"), re.S)
        if not m:
            continue
        fm = lenient_yaml(m.group(1))
        cat = UNIT_CAT.get(unit)
        if not cat:
            sys.exit(f"✗ unidad sin categoría en UNIT_CAT: {unit}")
        for ex in fm.get("exercises") or []:
            t = ex.get("type")
            if t in ("multiple-choice", "fill-in-blank"):
                prompt = re.sub(r"^(IRAKURMENA|GRAMATIKA)[^·]*·\s*", "", ex["prompt"])
                item = {
                    "id": ex["id"],
                    "type": "mc" if t == "multiple-choice" else "fill",
                    "cat": cat,
                    "unit": unit,
                    "prompt": prompt,
                    "explanation": ex.get("explanation", ""),
                }
                if t == "multiple-choice":
                    item["options"] = ex["options"]
                    item["answer"] = ex["answer"]
                else:
                    item["answers"] = ex["answers"]
                items.append(item)
            elif t == "flashcards":
                for c in ex.get("cards", []):
                    k = norm(c["eu"])
                    if k not in seen_eu:
                        seen_eu.add(k)
                        cards.append({"eu": c["eu"], "es": c["es"], "unit": unit})
            elif t == "match-pairs":
                pair_sets.append({"id": ex["id"], "unit": unit, "pairs": ex["pairs"]})
    return items, cards, pair_sets


def unit_titles(loc="es"):
    out = {}
    for d in sorted(units_dir(loc).iterdir()):
        y = d / "index.yaml"
        if y.exists():
            fm = yaml.safe_load(y.read_text(encoding="utf-8"))
            out[fm["code"]] = fm["title"]
    return out


# ═══════════════════ SEED: lecturas (texto + preguntas) ═══════════════════
# HTML directo (contenido propio, sin entrada de usuario). kind ∈
# pertsona | mezua | iragarkia — el blueprint exige 2 kinds distintos.

SEED_READINGS = [
    {
        "id": "rd-ane",
        "kind": "pertsona",
        "title": "Ane",
        "html": (
            "<p>Kaixo! Ni Ane naiz, <strong>lekeitiarra</strong>, baina orain <strong>Bilbon bizi "
            "naiz</strong>, alde zaharrean, pisu txiki batean. <strong>28 urte ditut</strong>. "
            "<strong>Erizaina naiz</strong> eta ospitale batean egiten dut lan, <strong>gauez</strong>; "
            "horregatik goizetan lo egiten dut. Arratsaldeak niretzat dira: <strong>asteartetan eta "
            "ostegunetan pilotan jokatzen dut</strong> frontoian, asteazkenetan euskara-klasera joaten "
            "naiz, eta <strong>ostiraletan kuadrillarekin afaltzen dut</strong> Deustuko taberna batean.</p>"
            "<p>Familia txikia daukat: aita, ama eta <strong>ahizpa bat, 31 urtekoa</strong>. Gurasoak "
            "Lekeition bizi dira, itsaso ondoan; aita arrantzalea da. Asteburuetan haiengana joaten naiz: "
            "<strong>amaren tortilla asko gustatzen zait — munduko onena da!</strong> Ahizpa Gasteizen "
            "bizi da, eta hilean behin elkartzen gara.</p>"
        ),
        "questions": [
            {"id": "rd-ane-1", "prompt": "Según el texto, ¿de dónde es Ane?",
             "options": ["De Bilbao", "De Lekeitio", "De Iruñea", "De Donostia"], "answer": 1,
             "explanation": "\"Lekeitiarra naiz\" — soy de Lekeitio. En Bilbao VIVE (bizi naiz). Origen (nongoa) ≠ residencia (non bizi): distinción estrella del A1."},
            {"id": "rd-ane-2", "prompt": "¿Cuándo trabaja Ane?",
             "options": ["Por la mañana", "Por la tarde", "De noche", "Solo los fines de semana"], "answer": 2,
             "explanation": "\"Gauez egiten dut lan\" — trabajo de noche. Por eso duerme por las mañanas."},
            {"id": "rd-ane-3", "prompt": "¿Qué hace Ane los viernes?",
             "options": ["Juega a pelota", "Cena con la cuadrilla", "Va a Lekeitio", "Estudia inglés"], "answer": 1,
             "explanation": "\"Ostiraletan kuadrillarekin afaltzen dut\" — los viernes ceno con la cuadrilla. La pelota es martes y jueves."},
            {"id": "rd-ane-4", "prompt": "¿Cuántos años tiene su hermana?",
             "options": ["31", "25", "28", "No lo dice"], "answer": 0,
             "explanation": "\"Ahizpa bat daukat, 31 urtekoa\". Ane tiene 28; la hermana, 31. El examen SIEMPRE cruza datos para pillarte."},
            {"id": "rd-ane-5", "prompt": "¿Qué le gusta mucho a Ane?",
             "options": ["El pescado de su padre", "La tortilla de su madre", "El restaurante del puerto", "Cocinar con su hermana"], "answer": 1,
             "explanation": "\"Amaren tortilla asko gustatzen zait — munduko onena da!\" — la tortilla de su madre, la mejor del mundo."},
        ],
    },
    {
        "id": "rd-kiroldegia",
        "kind": "iragarkia",
        "title": "Iragarkia — kiroldegia",
        "html": (
            "<p><strong>HERRIKO KIROLDEGIA — IZENA EMAN!</strong></p>"
            "<p>Ordutegia: astelehenetik ostiralera, 8:00-21:00. Larunbatetan 9:00-14:00. "
            "<strong>Igandeetan itxita</strong>.</p>"
            "<p>Igerilekua: astelehenetik ostiralera, <strong>8:00-21:00</strong>. Gimnasioa eta "
            "pilotalekua: ordutegi osoan.</p>"
            "<p>Prezioak: <strong>25 euro hilean</strong>. <strong>Ikasleak: 18 euro hilean</strong>. "
            "65 urtetik gorakoak: doan!</p>"
            "<p>Izena emateko: <strong>NANa eta argazki bat ekarri</strong> harrerara. Informazio "
            "gehiago: 948 123 456.</p>"
        ),
        "questions": [
            {"id": "rd-kir-1", "prompt": "¿Qué día está cerrado el polideportivo?",
             "options": ["El sábado", "El viernes", "El domingo", "Nunca cierra"], "answer": 2,
             "explanation": "\"Igandeetan itxita\" — cerrado los domingos. *Itxita* (cerrado) ↔ *irekita* (abierto)."},
            {"id": "rd-kir-2", "prompt": "¿Cuánto pagan los estudiantes al mes?",
             "options": ["25 euro", "18 euro", "30 euro", "Es gratis"], "answer": 1,
             "explanation": "\"Ikasleak: 18 euro hilean\". Los 25 € son la tarifa normal. Leer precios con calma gana exámenes."},
            {"id": "rd-kir-3", "prompt": "Quieres nadar un martes. ¿A qué hora puedes?",
             "options": ["A las 7:00", "A las 22:30", "A las 8:00", "El martes no hay piscina"], "answer": 2,
             "explanation": "Piscina \"astelehenetik ostiralera, 8:00-21:00\" — el martes entra en \"de lunes a viernes\"; a las 8:00 sí, a las 7 aún no y a las 22:30 ya no."},
            {"id": "rd-kir-4", "prompt": "¿Qué hay que llevar para apuntarse?",
             "options": ["El DNI y una foto", "Solo dinero", "El bañador", "Nada"], "answer": 0,
             "explanation": "\"NANa eta argazki bat ekarri\" — traer el DNI y una foto. *Ekarri* = traer."},
            {"id": "rd-kir-5", "prompt": "¿Quién NO paga nada?",
             "options": ["Los estudiantes", "Los mayores de 65", "Los niños", "Los del pueblo"], "answer": 1,
             "explanation": "\"65 urtetik gorakoak: doan!\" — los mayores de 65, gratis. *Doan* = gratis, palabra de oro en cualquier cartel."},
        ],
    },
    {
        "id": "rd-jon",
        "kind": "mezua",
        "title": "Jonen mezua",
        "html": (
            "<p>Kaixo, Miren!</p>"
            "<p>Zer moduz? <strong>Larunbatean gure etxean bazkalduko dugu</strong>, familia osoa. "
            "Amak paella egingo du — bai, paella, gure amak! 😄 <strong>Etorri nahi duzu?</strong></p>"
            "<p><strong>Ordu batean</strong> gure etxean, Alde Zaharrean. <strong>Ardoa eta ogia guk "
            "jarriko ditugu.</strong> <strong>Ekarri zuk postrea, mesedez!</strong></p>"
            "<p><strong>Erantzun laster</strong>, mesedez. Ondo izan!</p>"
            "<p>Jon</p>"
        ),
        "questions": [
            {"id": "rd-jon-1", "prompt": "¿Para qué escribe Jon el mensaje?",
             "options": ["Para pedir dinero", "Para invitar a comer el sábado", "Para cancelar una cita", "Para pedir los deberes"], "answer": 1,
             "explanation": "\"Larunbatean gure etxean bazkalduko dugu… etorri nahi duzu?\" — invitación a comer el sábado."},
            {"id": "rd-jon-2", "prompt": "¿A qué hora quedan?",
             "options": ["A la una y media", "A las dos", "A las doce", "A la una"], "answer": 3,
             "explanation": "\"Ordu batean gure etxean\" — a la una. \"La una y media\" sería *ordu bat eta erdietan*."},
            {"id": "rd-jon-3", "prompt": "¿Qué pone la familia de Jon?",
             "options": ["El postre", "La paella, el vino y el pan", "Solo la casa", "Nada, lo trae todo Miren"], "answer": 1,
             "explanation": "La madre hace la paella y \"ardoa eta ogia guk jarriko ditugu\". A Miren solo le piden el postre."},
            {"id": "rd-jon-4", "prompt": "¿Qué tiene que hacer Miren \"laster\"?",
             "options": ["Llegar pronto el sábado", "Responder pronto al mensaje", "Hacer pronto la paella", "Comprar pronto el vino"], "answer": 1,
             "explanation": "\"Erantzun laster, mesedez\" — responde pronto. *Erantzun* = responder; *laster* = pronto."},
        ],
    },
    {
        "id": "rd-miren",
        "kind": "pertsona",
        "title": "Mirenen eguna",
        "html": (
            "<p>Nire egunak oso antzekoak dira. Lanegunetan <strong>seiak eta erdietan jaikitzen "
            "naiz</strong>. Dutxatu, gosaldu — kafea esnearekin eta ogi txigortua — eta zortziak laurden "
            "gutxitan etxetik ateratzen naiz. <strong>Oinez joaten naiz lanera; euria egiten badu, "
            "autobusez.</strong> Bulego batean egiten dut lan, bederatzietatik bostetara.</p>"
            "<p>Arratsaldean, astearteetan eta ostegunetan euskara-klasera joaten naiz. Zortzietan "
            "afaltzen dut, eta <strong>afaldu eta gero, telesail bat ikusten dut eta pixka bat "
            "irakurtzen dut</strong>. Hamaiketan ohera.</p>"
            "<p>Asteburuak beste kontu bat dira! <strong>Larunbat goizetan amarekin merkatura joaten "
            "naiz</strong>, eta larunbat gauetan lagunekin ateratzen naiz. Igandeetan, mendira — eta "
            "gero, siesta ederra. Zortzi eta erdietan jaikitzen naiz larunbatetan… luxu hutsa!</p>"
        ),
        "questions": [
            {"id": "rd-mir-1", "prompt": "¿A qué hora se levanta Miren los días de trabajo?",
             "options": ["A las 8:30", "A las 7:00", "A las 6:30", "A las 9:00"], "answer": 2,
             "explanation": "\"Seiak eta erdietan jaikitzen naiz\" — a las seis y media. Las 8:30 son del fin de semana."},
            {"id": "rd-mir-2", "prompt": "¿Cómo va Miren al trabajo?",
             "options": ["En coche", "Andando, y si llueve en autobús", "Siempre en autobús", "En bici"], "answer": 1,
             "explanation": "\"Oinez joaten naiz lanera; euria egiten badu, autobusez\" — andando; con lluvia, en bus."},
            {"id": "rd-mir-3", "prompt": "¿Qué hace Miren después de cenar?",
             "options": ["Ver una serie y leer", "Estudiar euskera", "Salir con amigos", "Trabajar un poco más"], "answer": 0,
             "explanation": "\"Afaldu eta gero, telesail bat ikusten dut eta pixka bat irakurtzen dut\" — serie y un poco de lectura."},
            {"id": "rd-mir-4", "prompt": "Los sábados por la mañana Miren…",
             "options": ["Trabaja", "Duerme hasta mediodía", "Va al mercado con su madre", "Juega a pelota"], "answer": 2,
             "explanation": "\"Larunbat goizetan amarekin merkatura joaten naiz\" — al mercado con su madre."},
        ],
    },
    {
        "id": "rd-jaiak",
        "kind": "iragarkia",
        "title": "Iragarkia — herriko jaiak",
        "html": (
            "<p><strong>HERRIKO JAIAK — EKAINAK 20-23</strong></p>"
            "<p><strong>Ostirala 20</strong>: 19:00etan txupinazoa plazan; 22:00etan kontzertua "
            "(<strong>doan</strong>).</p>"
            "<p><strong>Larunbata 21</strong>: 12:00etan herri-bazkaria frontoian (<strong>10 euro; "
            "umeak, doan</strong>); 18:00etan pilota-partida.</p>"
            "<p><strong>Igandea 22</strong>: 11:00etan mendi-martxa; 20:00etan su artifizialak.</p>"
            "<p><strong>Astelehena 23</strong>: 17:00etan umeentzako jolasak; 21:00etan azken "
            "kontzertua.</p>"
            "<p>Txartelak: <strong>herriko tabernan edo webgunean</strong>. <strong>Euria egiten badu, "
            "kontzertuak kiroldegian.</strong></p>"
        ),
        "questions": [
            {"id": "rd-jai-1", "prompt": "¿Cuánto cuesta el concierto del viernes?",
             "options": ["10 euro", "Es gratis", "5 euro", "No lo dice"], "answer": 1,
             "explanation": "\"22:00etan kontzertua (doan)\" — *doan* = gratis. Si un cartel vasco te gusta, casi seguro que pone *doan*."},
            {"id": "rd-jai-2", "prompt": "¿Dónde es la comida popular del sábado?",
             "options": ["En la plaza", "En el frontón", "En la taberna", "En el polideportivo"], "answer": 1,
             "explanation": "\"Herri-bazkaria frontoian\" — en el frontón (frontoiAN, el -n de lugar)."},
            {"id": "rd-jai-3", "prompt": "Si llueve, ¿dónde son los conciertos?",
             "options": ["Se cancelan", "En el frontón", "En el polideportivo", "En la iglesia"], "answer": 2,
             "explanation": "\"Euria egiten badu, kontzertuak kiroldegian\" — si llueve, al kiroldegi. *Badu* = si (condicional básico que el A1 lee, no produce)."},
            {"id": "rd-jai-4", "prompt": "¿Qué hay el domingo por la mañana?",
             "options": ["Su artifizialak", "Pilota-partida", "Mendi-martxa", "Txupinazoa"], "answer": 2,
             "explanation": "\"Igandea: 11:00etan mendi-martxa\" — marcha de monte. Los fuegos (su artifizialak) son por la noche."},
            {"id": "rd-jai-5", "prompt": "¿Dónde se compran las entradas?",
             "options": ["Solo en internet", "En la taberna del pueblo o en la web", "En el ayuntamiento", "En la plaza"], "answer": 1,
             "explanation": "\"Txartelak: herriko tabernan edo webgunean\" — *edo* = o. *Txartela* = entrada/ticket/tarjeta."},
        ],
    },
    {
        "id": "rd-postala",
        "kind": "mezua",
        "title": "Postala — oporretatik",
        "html": (
            "<p>Kaixo, amona!</p>"
            "<p>Zer moduz? Gu oso ondo! <strong>Donostian gaude</strong>, hondartza ondoko hotel txiki "
            "batean. <strong>Goizetan hondartzara joaten gara</strong> eta arratsaldetan alde zaharrean "
            "paseatzen dugu. <strong>Gaur goizean Aquariuma ikusi dugu</strong> — arrain pila bat!</p>"
            "<p>Eguraldi ona egiten du: <strong>eguzkia egunero</strong>! Pintxoak jaten ditugu gauero — "
            "garestiak, baina zoragarriak. <strong>Ostiralean etxera itzuliko gara.</strong></p>"
            "<p>Muxu handi bat,</p><p>Maite eta Ander</p>"
        ),
        "questions": [
            {"id": "rd-pos-1", "prompt": "¿Dónde están Maite y Ander?",
             "options": ["En Bilbao", "En Donostia, junto a la playa", "En Lekeitio", "En casa de la abuela"], "answer": 1,
             "explanation": "\"Donostian gaude, hondartza ondoko hotel txiki batean\" — *ondoko* = de al lado de."},
            {"id": "rd-pos-2", "prompt": "¿Qué hacen por las mañanas?",
             "options": ["Pasear por la parte vieja", "Ir a la playa", "Ver el Aquarium", "Comer pintxos"], "answer": 1,
             "explanation": "\"Goizetan hondartzara joaten gara\" — la parte vieja es por la tarde. Cruzan los momentos del día a propósito."},
            {"id": "rd-pos-3", "prompt": "¿Qué han hecho hoy?",
             "options": ["Han vuelto a casa", "Han ido al monte", "Han visto el Aquarium", "Han comprado regalos"], "answer": 2,
             "explanation": "\"Gaur goizean Aquariuma ikusi dugu\" — perfecto reciente (ikusi dugu): lo de HOY."},
            {"id": "rd-pos-4", "prompt": "¿Cuándo vuelven a casa?",
             "options": ["El domingo", "Mañana", "El viernes", "No lo dicen"], "answer": 2,
             "explanation": "\"Ostiralean etxera itzuliko gara\" — futuro -ko: volverEMOS el viernes."},
        ],
    },
]

# ═══════════════════ SEED: entzumena (audio + preguntas) ═══════════════════
# El audio se genera UNA vez con scripts/gen_listenings.py (TTS + verificación
# por transcripción) → public/audio/eu/ls-<id>.mp3. El transcriptEu se enseña
# SOLO tras responder las preguntas. kind ∈ elkarrizketa | iragarkia | mezua.
# speakers: None = una voz; [(nombre, voz), …] = diálogo multivoz.

SEED_LISTENINGS = [
    {
        "id": "ls-kafetegian", "kind": "elkarrizketa", "title": "Kafetegian",
        "speakers": [("Miren", "Kore"), ("Jon", "Puck")],
        "transcriptEu": (
            "Miren: Egun on! Zer nahi duzu?\n"
            "Jon: Kaixo! Kafe bat esnearekin, mesedez.\n"
            "Miren: Zerbait jateko?\n"
            "Jon: Bai, kruasan bat. Zenbat da?\n"
            "Miren: Hiru euro eta berrogeita hamar.\n"
            "Jon: Hartu, lau euro.\n"
            "Miren: Eskerrik asko! Berrogeita hamar zentimo zuretzat."
        ),
        "questions": [
            {"id": "ls-kaf-1", "prompt": "¿Qué pide Jon para beber?",
             "options": ["Un té", "Un café con leche", "Un café solo", "Un zumo"], "answer": 1,
             "explanation": "«Kafe bat esnearekin» — café con leche (esnea + -arekin)."},
            {"id": "ls-kaf-2", "prompt": "¿Qué pide para comer?",
             "options": ["Una tostada", "Un pintxo", "Un cruasán", "Nada"], "answer": 2,
             "explanation": "«Kruasan bat» — un cruasán."},
            {"id": "ls-kaf-3", "prompt": "¿Cuánto cuesta todo?",
             "options": ["3,50 €", "4 €", "3 €", "4,50 €"], "answer": 0,
             "explanation": "«Hiru euro eta berrogeita hamar» — tres euros y cincuenta."},
            {"id": "ls-kaf-4", "prompt": "¿Con cuánto paga Jon?",
             "options": ["Con 3,50 justos", "Con 5 euros", "Con 4 euros", "Con tarjeta"], "answer": 2,
             "explanation": "«Hartu, lau euro» — toma, cuatro euros. La vuelta: 50 céntimos."},
        ],
    },
    {
        "id": "ls-zermoduz", "kind": "elkarrizketa", "title": "Bi lagun kalean",
        "speakers": [("Ane", "Kore"), ("Mikel", "Puck")],
        "transcriptEu": (
            "Ane: Kaixo, Mikel! Zer moduz?\n"
            "Mikel: Oso ondo, eta zu?\n"
            "Ane: Ni ere ondo. Nora zoaz?\n"
            "Mikel: Lanera noa. Bulego batean egiten dut lan, Bilbon.\n"
            "Ane: Ni euskara-klasera noa, asteartero.\n"
            "Mikel: Oso ondo! Gero arte, Ane!\n"
            "Ane: Agur, Mikel!"
        ),
        "questions": [
            {"id": "ls-zer-1", "prompt": "¿Cómo está Mikel?",
             "options": ["Muy bien", "Cansado", "Regular", "No lo dice"], "answer": 0,
             "explanation": "«Oso ondo» — muy bien."},
            {"id": "ls-zer-2", "prompt": "¿A dónde va Mikel?",
             "options": ["A clase de euskera", "Al trabajo", "A casa", "Al bar"], "answer": 1,
             "explanation": "«Lanera noa» — voy al trabajo."},
            {"id": "ls-zer-3", "prompt": "¿Dónde trabaja Mikel?",
             "options": ["En una escuela", "En un hospital", "En una oficina en Bilbao", "En una tienda"], "answer": 2,
             "explanation": "«Bulego batean egiten dut lan, Bilbon» — en una oficina, en Bilbao."},
            {"id": "ls-zer-4", "prompt": "¿Cuándo va Ane a clase de euskera?",
             "options": ["Todos los días", "Los lunes", "Cada martes", "Los fines de semana"], "answer": 2,
             "explanation": "«Asteartero» — cada martes (astearte + -ro)."},
        ],
    },
    {
        "id": "ls-geltokia", "kind": "iragarkia", "title": "Tren-geltokian (megafonia)",
        "speakers": None,
        "transcriptEu": (
            "Arratsalde on. Donostiara doan trena laugarren bidetik aterako da, "
            "seiak eta erdietan. Trenak hamar minutuko atzerapena du. "
            "Txartelak leihatilan edo makinetan eros ditzakezue. Eskerrik asko."
        ),
        "questions": [
            {"id": "ls-gel-1", "prompt": "¿A dónde va el tren?",
             "options": ["A Bilbao", "A Donostia", "A Iruñea", "A Gasteiz"], "answer": 1,
             "explanation": "«Donostiara doan trena» — el tren que va a Donostia."},
            {"id": "ls-gel-2", "prompt": "¿De qué vía sale?",
             "options": ["De la segunda", "De la primera", "De la cuarta", "De la sexta"], "answer": 2,
             "explanation": "«Laugarren bidetik» — de la cuarta vía (lau → laugarren)."},
            {"id": "ls-gel-3", "prompt": "¿A qué hora sale?",
             "options": ["A las seis y media", "A las seis", "A las siete y media", "A las seis y cuarto"], "answer": 0,
             "explanation": "«Seiak eta erdietan» — a las seis y media."},
            {"id": "ls-gel-4", "prompt": "¿Qué pasa con el tren?",
             "options": ["Está cancelado", "Llega 10 minutos tarde", "Sale antes de hora", "Cambia de vía"], "answer": 1,
             "explanation": "«Hamar minutuko atzerapena du» — lleva diez minutos de retraso."},
        ],
    },
    {
        "id": "ls-denda", "kind": "iragarkia", "title": "Supermerkatuan (megafonia)",
        "speakers": None,
        "transcriptEu": (
            "Arratsalde on, bezero maiteok. Gaur sagarrak eskaintzan daude: "
            "kiloa euro batean. Fruta-saila bigarren solairuan dago. "
            "Gogoratu: denda zortzietan itxiko dugu. Eskerrik asko eta ongi etorri!"
        ),
        "questions": [
            {"id": "ls-den-1", "prompt": "¿Qué está de oferta hoy?",
             "options": ["Las naranjas", "Las manzanas", "El pan", "La leche"], "answer": 1,
             "explanation": "«Sagarrak eskaintzan daude» — las manzanas están de oferta."},
            {"id": "ls-den-2", "prompt": "¿Cuánto cuesta el kilo?",
             "options": ["Dos euros", "Un euro", "Un euro y medio", "Cincuenta céntimos"], "answer": 1,
             "explanation": "«Kiloa euro batean» — el kilo, a un euro."},
            {"id": "ls-den-3", "prompt": "¿Dónde está la sección de fruta?",
             "options": ["En la entrada", "En el sótano", "En la segunda planta", "Junto a la caja"], "answer": 2,
             "explanation": "«Bigarren solairuan» — en la segunda planta."},
            {"id": "ls-den-4", "prompt": "¿A qué hora cierra la tienda?",
             "options": ["A las siete", "A las nueve", "A las ocho y media", "A las ocho"], "answer": 3,
             "explanation": "«Zortzietan itxiko dugu» — cerraremos a las ocho."},
        ],
    },
    {
        "id": "ls-abisua", "kind": "mezua", "title": "Aitonaren mezua (erantzungailua)",
        "speakers": None,
        "transcriptEu": (
            "Kaixo, maitea! Aitona naiz. Bihar herrira etorriko naiz, "
            "eguerdian. Elkarrekin bazkalduko dugu, ados? Mesedez, "
            "erosi ogia eta gazta. Ondo izan, laster arte!"
        ),
        "questions": [
            {"id": "ls-abi-1", "prompt": "¿Quién deja el mensaje?",
             "options": ["El padre", "El abuelo", "Un amigo", "El profesor"], "answer": 1,
             "explanation": "«Aitona naiz» — soy el abuelo."},
            {"id": "ls-abi-2", "prompt": "¿Cuándo viene?",
             "options": ["Hoy por la tarde", "El domingo", "Mañana al mediodía", "Mañana por la noche"], "answer": 2,
             "explanation": "«Bihar… eguerdian» — mañana, al mediodía."},
            {"id": "ls-abi-3", "prompt": "¿Qué plan propone?",
             "options": ["Cenar juntos", "Ir al monte", "Comer juntos", "Ver un partido"], "answer": 2,
             "explanation": "«Elkarrekin bazkalduko dugu» — comeremos juntos (bazkaldu = comer a mediodía)."},
            {"id": "ls-abi-4", "prompt": "¿Qué hay que comprar?",
             "options": ["Pan y queso", "Vino y pan", "Fruta", "Pescado"], "answer": 0,
             "explanation": "«Erosi ogia eta gazta» — compra pan y queso."},
        ],
    },
    {
        "id": "ls-lagunmezua", "kind": "mezua", "title": "Lagunaren audio-mezua",
        "speakers": None,
        "transcriptEu": (
            "Aupa! Entzun: gaur ezin dugu zazpietan geratu. Nire anaia "
            "berandu aterako da lanetik. Zortzietan geratuko gara, ados? "
            "Eta plaza berrian, ez zaharrean — euria egingo du eta han "
            "aterpea dago. Erantzun, mesedez!"
        ),
        "questions": [
            {"id": "ls-lag-1", "prompt": "¿A qué hora quedan FINALMENTE?",
             "options": ["A las siete", "A las ocho", "A las nueve", "A las siete y media"], "answer": 1,
             "explanation": "«Zortzietan geratuko gara» — la nueva hora: las ocho. Las siete se cancelan."},
            {"id": "ls-lag-2", "prompt": "¿Por qué cambia el plan?",
             "options": ["Está enfermo", "Su hermano sale tarde del trabajo", "Llueve", "Ha perdido el bus"], "answer": 1,
             "explanation": "«Nire anaia berandu aterako da lanetik» — su hermano sale tarde de trabajar."},
            {"id": "ls-lag-3", "prompt": "¿Dónde quedan?",
             "options": ["En la plaza vieja", "En el bar", "En la plaza nueva", "En casa"], "answer": 2,
             "explanation": "«Plaza berrian, ez zaharrean» — en la plaza nueva, no en la vieja."},
            {"id": "ls-lag-4", "prompt": "¿Qué tiempo va a hacer?",
             "options": ["Sol", "Nieve", "Viento", "Lluvia"], "answer": 3,
             "explanation": "«Euria egingo du» — va a llover (por eso eligen sitio con aterpe/cubierto)."},
        ],
    },
]

# ═══════════════════ SEED: tareas de idazmena ═══════════════════
# 5 checks = 5 puntos por tarea, TODOS auto-corregibles en cliente. kind ∈
# aurkezpena | fitxa | mezua | deskribapena. Reglas (evalúa el generador):
#   sentences {n}  — ≥n frases/segmentos con ≥2 palabras
#   any {re,min?}  — ≥min (def. 1) de los patrones presentes (regex u, sobre minúsculas)
#   all {re}       — TODOS los patrones presentes
#   phoneWords {n} — ≥n números-palabra en euskera
#   noSpanish      — sin tildes/ñ ni palabras-función castellanas
RE_HABITUAL = r"\w+(?:tzen|ten) (?:dut|naiz|dugu|gara|du|da)\b"
RE_FUTURO = r"\w+[kg]o (?:naiz|dut|dugu|gara|da|du|zara|duzu)\b"
RE_INESIVO = r"\w{3,}(?:ean|ian|oan|uan|etan)\b"

SEED_WRITINGS = [
    {
        "id": "wr-aurkeztu", "kind": "aurkezpena", "title": "Zure burua aurkeztu",
        "task": "Preséntate en <strong>6-8 frases</strong>: quién eres, de dónde y dónde vives, edad, "
                "trabajo/estudios, dos cosas de tu semana, algo de tu familia y algo que te gusta. "
                "Escríbelo ANTES de mirar el modelo.",
        "model": "<p>Kaixo! Mikel naiz, iruindarra, eta Txantrean bizi naiz, Iruñean. 35 urte ditut. "
                 "Irakaslea naiz eta eskola batean egiten dut lan. Astelehenetan eta asteazkenetan "
                 "igerilekura joaten naiz, eta larunbatetan mendira. Emaztea eta bi seme ditut. Gurasoak "
                 "Lizarran bizi dira. Asteburuetan haiekin bazkaltzen dugu, eta amaren paella asko "
                 "gustatzen zait!</p>",
        "checks": [
            {"label": "Al menos 6 frases", "rule": {"kind": "sentences", "n": 6}},
            {"label": "naiz para presentarte (Ane naiz, iruindarra naiz…)",
             "rule": {"kind": "any", "re": [r"\bnaiz\b"]}},
            {"label": "dut / ditut (lo que tienes o haces)",
             "rule": {"kind": "any", "re": [r"\bdut\b", r"\bditut\b"]}},
            {"label": "Al menos dos casos distintos: -rekin, -ra, -n de lugar",
             "rule": {"kind": "any", "min": 2,
                      "re": [r"\w+rekin\b", r"(?!gara\b|zara\b)\w{3,}ra\b", RE_INESIVO]}},
            {"label": "Todo en euskera (sin castellano)", "rule": {"kind": "noSpanish"}},
        ],
    },
    {
        "id": "wr-fitxa", "kind": "fitxa", "title": "Fitxa bete",
        "task": "El polideportivo te da una ficha. Rellénala <strong>en euskera</strong> con TUS datos:"
                "<br><em>Izen-abizenak · Adina · Herria · Telefonoa (letraz, ej. «bederatzi-lau-zortzi…») "
                "· Zein kirol gustatzen zaizu?</em>",
        "model": "<p>Izen-abizenak: <em>Ane Etxeberria</em> · Adina: <em>28 urte</em> · Herria: "
                 "<em>Lekeitio</em> · Telefonoa: <em>sei-bat-zazpi-bederatzi-zero-bi-lau-hiru-zortzi</em> "
                 "· Kirola: <em>igeriketa gustatzen zait</em></p>",
        "checks": [
            {"label": "Los cinco campos rellenos", "rule": {"kind": "sentences", "n": 5}},
            {"label": "La edad con «urte»",
             "rule": {"kind": "any",
                      "re": [r"\d+ ?urte", r"(?:bat|bi|hiru|lau|bost|sei|zazpi|zortzi|bederatzi|hamar|hogei\w*|berrogei\w*)[\w ]{0,12}urte"]}},
            {"label": "El teléfono en palabras (seis números-palabra o más)",
             "rule": {"kind": "phoneWords", "n": 6}},
            {"label": "Un deporte en euskera",
             "rule": {"kind": "any",
                      "re": ["igeriketa", "igeri\\b", "pilota", "futbol", "saskibaloi",
                             "eskubaloi", "korrika", "mendi", "bizikleta", "txirrindu",
                             "tenis", "yoga", "eskalada", "surf"]}},
            {"label": "Todo en euskera (sin castellano)", "rule": {"kind": "noSpanish"}},
        ],
    },
    {
        "id": "wr-erantzun", "kind": "mezua", "title": "Erantzun gonbidapenari",
        "task": "Un amigo te invita a comer el sábado en su casa (a la una, trae tú el postre). "
                "Contesta en <strong>4-6 frases</strong>: saluda, acepta o rechaza con motivo, pregunta "
                "algo y despídete. Escríbelo antes de mirar los modelos.",
        "model": "<p><strong>Baietz:</strong> Kaixo, Jon! Bai, noski, joango naiz! Paella asko gustatzen "
                 "zait. Postrea nik ekarriko dut: amaren tarta. Ardo beltza ala zuria edango dugu? "
                 "Larunbatera arte!</p>"
                 "<p><strong>Ezetz:</strong> Kaixo, Jon! Mila esker, baina larunbatean ezin dut: lan "
                 "egiten dut. Hurrengoan bai, ados? Ondo pasa eta on egin!</p>",
        "checks": [
            {"label": "Saludo Y despedida (Kaixo… / agur, ondo izan, laster arte…)",
             "rule": {"kind": "all",
                      "re": [r"\bkaixo\b|\bepa\b|\baupa\b|egun on|arratsalde on",
                             r"\bagur\b|ondo izan|laster arte|ondo pasa|muxu|besarkada|arte!"]}},
            {"label": "El futuro -ko/-go (joango naiz, ekarriko dut…)",
             "rule": {"kind": "any", "re": [RE_FUTURO]}},
            {"label": "Una pregunta (con su «?»)", "rule": {"kind": "any", "re": [r"\?"]}},
            {"label": "4 frases o más", "rule": {"kind": "sentences", "n": 4}},
            {"label": "Todo en euskera (sin castellano)", "rule": {"kind": "noSpanish"}},
        ],
    },
    {
        "id": "wr-eguna", "kind": "deskribapena", "title": "Zure eguna",
        "task": "Describe TU día de trabajo o estudio en <strong>6-8 frases</strong>, con al menos: una "
                "hora exacta, un transporte, una comida y algo de la tarde.",
        "model": "<p>Lanegunetan zazpietan jaikitzen naiz. Kafea hartzen dut eta autobusez joaten naiz "
                 "lanera. Bulego batean egiten dut lan, zortzietatik hiruretara. Eguerdian etxean "
                 "bazkaltzen dut. Arratsaldean kirola egiten dut eta erosketak egiten ditut. Gauean "
                 "familiarekin afaltzen dut eta telesail bat ikusten dut.</p>",
        "checks": [
            {"label": "Una hora (zazpietan, ordu batean…)",
             "rule": {"kind": "any", "re": [r"\w+etan\b", r"\bordu\w*"]}},
            {"label": "Presente habitual (-tzen dut / joaten naiz…)",
             "rule": {"kind": "any", "re": [RE_HABITUAL]}},
            {"label": "Un transporte (oinez, autobusez, kotxez, bizikletaz…)",
             "rule": {"kind": "any",
                      "re": ["oinez", "autobusez", "autoz", "kotxez", "bizikletaz",
                             "trenez", "metroz", "motoz"]}},
            {"label": "6 frases o más", "rule": {"kind": "sentences", "n": 6}},
            {"label": "Todo en euskera (sin castellano)", "rule": {"kind": "noSpanish"}},
        ],
    },
    {
        "id": "wr-postala", "kind": "mezua", "title": "Postal batetik",
        "task": "Estás de vacaciones. Escribe una postal de <strong>5-6 frases</strong> a un amigo: "
                "dónde estás, qué haces cada día, una cosa que HAS HECHO hoy, qué tiempo hace y cuándo "
                "vuelves.",
        "model": "<p>Kaixo, Maddi! Donostian nago, lagunekin. Goizetan hondartzara joaten gara eta "
                 "arratsaldetan paseatzen dugu. Gaur Aquariuma ikusi dugu — zoragarria! Eguraldi ona "
                 "egiten du, eguzkia egunero. Igandean etxera itzuliko naiz. Muxu bat!</p>",
        "checks": [
            {"label": "Dónde estás: …-n nago / gaude (Donostian nago)",
             "rule": {"kind": "any", "re": [r"\w{3,}n (?:nago|gaude)\b"]}},
            {"label": "Lo de cada día en habitual (-tzen/-ten)",
             "rule": {"kind": "any", "re": [RE_HABITUAL]}},
            {"label": "Algo de HOY en perfecto (ikusi dut, jan dugu…)",
             "rule": {"kind": "any",
                      "re": [r"\b(?!nahi |behar |ezin )\w+(?:tu|du|i|n) (?:dut|dugu)\b"]}},
            {"label": "Cuándo vuelves, en futuro (itzuliko naiz…)",
             "rule": {"kind": "any", "re": [RE_FUTURO]}},
            {"label": "5 frases o más", "rule": {"kind": "sentences", "n": 5}},
        ],
    },
    {
        "id": "wr-etxea", "kind": "deskribapena", "title": "Zure etxea",
        "task": "Describe tu casa en <strong>6 frases</strong>: dónde vives, cuántas habitaciones tiene "
                "(zenbat logela), tu habitación favorita y por qué, qué hay en la cocina, y algo que NO "
                "hay.",
        "model": "<p>Iruñean bizi naiz, pisu batean. Etxeak hiru logela ditu eta bi komun. Nire logela "
                 "handia da eta leiho handi bat dauka — asko gustatzen zait. Sukaldean mahai bat, lau "
                 "aulki eta hozkailu zahar bat daude. Balkoirik ez daukagu, baina berdin da: etxe polita "
                 "da!</p>",
        "checks": [
            {"label": "dago / daude para lo que hay",
             "rule": {"kind": "any", "re": [r"\bdago\b", r"\bdaude\b"]}},
            {"label": "Un número + cosa (hiru logela, bi komun…)",
             "rule": {"kind": "any",
                      "re": [r"\b(?:bat|bi|hiru|lau|bost|sei|zazpi|zortzi|bederatzi|hamar) \w+"]}},
            {"label": "El -n de lugar (sukaldean, Iruñean…)",
             "rule": {"kind": "any", "re": [RE_INESIVO]}},
            {"label": "Algo que NO hay (ez dago / ez daukat / -rik)",
             "rule": {"kind": "any",
                      "re": [r"ez dago", r"ez daukat", r"ez dut", r"ez daukagu", r"\w+rik\b"]}},
            {"label": "6 frases o más", "rule": {"kind": "sentences", "n": 6}},
        ],
    },
]


# ═══════════════ SEED: items de examen (ex-simulacros estáticos) ═══════════════
# Los 2 simulacros fijos se retiraron como lecciones (solo existe el generador);
# su gramática vive aquí con cat=azterketa (la cuota del blueprint garantiza ≥1
# item transversal por examen) y unit= su unidad TEMÁTICA real, para que el
# veredicto de «unidades a repasar» apunte a donde de verdad se estudia eso.

SEED_GR = [
    {"id": "ex-a1p1-gr1", "type": "fill", "cat": "azterketa", "unit": "05-mi-pueblo",
     "prompt": "Nosotros vivimos en Pamplona = gu Iruñean bizi ___.", "answers": ["gara"],
     "explanation": "Bizi izan va con NOR: ni bizi naiz, gu bizi gara."},
    {"id": "ex-a1p1-gr2", "type": "fill", "cat": "azterketa", "unit": "02-familia",
     "prompt": "¿Tienes hermanos? = senide___ baduzu?", "answers": ["rik"],
     "explanation": "Partitivo -rik en preguntas: seniderik baduzu?, dirurik baduzu?"},
    {"id": "ex-a1p1-gr3", "type": "mc", "cat": "azterketa", "unit": "10-mi-gente",
     "prompt": '"Me gustan las manzanas" = …',
     "options": ["Sagarra gustatzen zait", "Sagarrak gustatzen zaizkit", "Sagarrak gustatzen dut", "Sagarra gustatzen naiz"],
     "answer": 1,
     "explanation": "Plural (sagarrak) → zaizkit. Jamás dut/naiz con gustatzen: el error que el examen busca con lupa."},
    {"id": "ex-a1p1-gr4", "type": "fill", "cat": "azterketa", "unit": "06-direcciones",
     "prompt": "Voy a casa en autobús = etxe___ noa autobusez.", "answers": ["ra"],
     "explanation": "Adlativo -ra (a/hacia): etxera noa. El instrumental -z (autobusez) ya te lo dan hecho."},
    {"id": "ex-a1p1-gr5", "type": "fill", "cat": "azterketa", "unit": "06-direcciones",
     "prompt": "Vengo de la playa = hondartza___ nator.", "answers": ["tik"],
     "explanation": "Ablativo -tik (desde/de): hondartzatik nator. La pareja de -ra: voy A / vengo DE."},
    {"id": "ex-a1p1-gr6", "type": "mc", "cat": "azterketa", "unit": "02-familia",
     "prompt": '"Trabajo con mi hermano" = …',
     "options": ["Anaiarentzat egiten dut lan", "Anaiarekin egiten dut lan", "Anaiaren egiten dut lan", "Anaiara egiten dut lan"],
     "answer": 1,
     "explanation": "Comitativo -rekin (con): anaiarekin. *-rentzat* sería PARA él; *-ren*, suyo; *-ra*, hacia él (!)."},
    {"id": "ex-a1p1-gr7", "type": "mc", "cat": "azterketa", "unit": "11-comprar",
     "prompt": "¿Cuál es la CORRECTA?",
     "options": ["Hiru liburuak ditut", "Hiru liburu ditut", "Liburu hirurak dut", "Hiru liburua ditut"],
     "answer": 1,
     "explanation": "Numeral + sustantivo DESNUDO: hiru liburu (tres libros), sin artículo. Y plural en el verbo: ditut."},
    {"id": "ex-a1p1-gr8", "type": "mc", "cat": "azterketa", "unit": "07-rutina-diaria",
     "prompt": '"Son las tres y media" = …',
     "options": ["Hirurak eta erdiak dira", "Hiru ordu dira", "Hirurak gutxi dira", "Erdiak eta hirurak dira"],
     "answer": 0,
     "explanation": "Hirurak eta erdiak dira. Las horas en plural: ordu batA es la excepción (singular)."},
    {"id": "ex-a1p1-gr9", "type": "fill", "cat": "azterketa", "unit": "02-familia",
     "prompt": "Este libro es de Ane (posesión) = liburu hau Ane___ da.", "answers": ["rena"],
     "explanation": "Genitivo -ren + artículo: Anerena (el de Ane). Con nombre: Aneren liburua."},
    {"id": "ex-a1p1-gr10", "type": "mc", "cat": "azterketa", "unit": "06-direcciones",
     "prompt": 'Pregunta bien formada para responder "Okindegian erosten dut ogia":',
     "options": ["Nora erosten duzu ogia?", "Non erosten duzu ogia?", "Nongoa da ogia?", "Norekin da okindegia?"],
     "answer": 1,
     "explanation": "Respuesta en -n (okindegiAN, lugar) → pregunta NON (dónde). Nora = a dónde (movimiento)."},
    {"id": "ex-a1p2-gr1", "type": "fill", "cat": "azterketa", "unit": "04-bar-y-comida",
     "prompt": "Quiero café con leche = kafea esne___ nahi dut.", "answers": ["arekin"],
     "explanation": "Comitativo con palabra en -e: esne + arekin = esnearekin."},
    {"id": "ex-a1p2-gr2", "type": "fill", "cat": "azterketa", "unit": "11-comprar",
     "prompt": "Vamos al mercado = merkatu___ goaz.", "answers": ["ra"],
     "explanation": "Adlativo -ra con goaz: merkatura goaz."},
    {"id": "ex-a1p2-gr3", "type": "mc", "cat": "azterketa", "unit": "13-agenda",
     "prompt": '"No tengo tiempo" = …',
     "options": ["Denborarik ez naiz", "Ez daukat denborarik", "Denbora ez dut nahi", "Ez nago denbora"],
     "answer": 1,
     "explanation": "Ez daukat denborarik: negación + partitivo. Naiz/nago no valen para TENER."},
    {"id": "ex-a1p2-gr4", "type": "mc", "cat": "azterketa", "unit": "13-agenda",
     "prompt": '"Mañana compraré pan" (futuro A1) = …',
     "options": ["Bihar ogia erosten dut", "Bihar ogia erosi dut", "Bihar ogia erosiko dut", "Atzo ogia erosiko dut"],
     "answer": 2,
     "explanation": 'Bihar + erosiKO dut (futuro -ko de la unidad 13). Con "erosi dut" sería ya comprado; "atzo" (ayer) + futuro es imposible.'},
    {"id": "ex-a1p2-gr5", "type": "fill", "cat": "azterketa", "unit": "11-comprar",
     "prompt": "¿Cuánto cuesta el queso? = zenbat ___ du gaztak?", "answers": ["balio"],
     "explanation": "Zenbat balio du? — la pregunta de precios. El NORK (gaztaK) te lo da hecho la frase."},
    {"id": "ex-a1p2-gr6", "type": "mc", "cat": "azterketa", "unit": "12-restaurante",
     "prompt": "En el restaurante, para pedir educadamente:",
     "options": ["Ekarri ura!", "Ura, mesedez", "Ura nahi duzu?", "Non dago ura?"],
     "answer": 1,
     "explanation": '"Ura, mesedez" — lo pedido + mesedez es la fórmula A1 perfecta. La primera es una orden seca; la tercera pregunta al revés.'},
    {"id": "ex-a1p2-gr7", "type": "fill", "cat": "azterketa", "unit": "13-agenda",
     "prompt": "Tengo que estudiar = ikasi ___ dut.", "answers": ["behar"],
     "explanation": "Behar dut = tengo que: ikasi behar dut, joan behar dut."},
    {"id": "ex-a1p2-gr8", "type": "mc", "cat": "azterketa", "unit": "12-restaurante",
     "prompt": '"¿Dónde está el baño?" = …',
     "options": ["Nora doa komuna?", "Non dago komuna?", "Nongoa da komuna?", "Zer da komuna?"],
     "answer": 1,
     "explanation": "Non dago…? — ubicación con egon. La pregunta de supervivencia número 1."},
    {"id": "ex-a1p2-gr9", "type": "mc", "cat": "azterketa", "unit": "10-mi-gente",
     "prompt": "Ordena la frase: [gustatzen / kafea / zait / asko]",
     "options": ["Kafea asko gustatzen zait", "Gustatzen kafea asko zait", "Zait gustatzen asko kafea", "Kafea zait asko gustatzen"],
     "answer": 0,
     "explanation": "Kafea asko gustatzen zait — el orden neutro: NOR + asko + gustatzen + NOR-NORI."},
    {"id": "ex-a1p2-gr10", "type": "fill", "cat": "azterketa", "unit": "07-rutina-diaria",
     "prompt": "Los lunes voy a clase de euskera = astelehen___ euskara-klasera joaten naiz.", "answers": ["etan"],
     "explanation": "Los días en plural habitual: astelehenETAN (los lunes), ostiraletan (los viernes)."},
]

SEED_CARDS = [
    {"eu": "nongoa zara?", "es": "¿de dónde eres?"}, {"eu": "non bizi zara?", "es": "¿dónde vives?"},
    {"eu": "zenbat urte dituzu?", "es": "¿cuántos años tienes?"},
    {"eu": "zertan egiten duzu lan?", "es": "¿en qué trabajas?"},
    {"eu": "seniderik baduzu?", "es": "¿tienes hermanos?"}, {"eu": "erizaina", "es": "enfermero/a"},
    {"eu": "irakaslea", "es": "profesor/a"}, {"eu": "ikaslea", "es": "estudiante"},
    {"eu": "ezkonduta", "es": "casado/a"}, {"eu": "ezkongabea", "es": "soltero/a"},
    {"eu": "itxita", "es": "cerrado"}, {"eu": "irekita", "es": "abierto"},
    {"eu": "doan", "es": "gratis"}, {"eu": "hilean", "es": "al mes"},
    {"eu": "ekarri", "es": "traer"}, {"eu": "izena eman", "es": "apuntarse / inscribirse"},
    {"eu": "zer ordutan?", "es": "¿a qué hora?"}, {"eu": "ordu batean", "es": "a la una"},
    {"eu": "jaiki", "es": "levantarse"}, {"eu": "gosaldu", "es": "desayunar"},
    {"eu": "bazkaldu", "es": "comer (mediodía)"}, {"eu": "afaldu", "es": "cenar"},
    {"eu": "etorri nahi duzu?", "es": "¿quieres venir?"}, {"eu": "eraman", "es": "llevar"},
    {"eu": "postrea", "es": "el postre"}, {"eu": "ezin dut joan", "es": "no puedo ir"},
    {"eu": "erantzun", "es": "responder"}, {"eu": "laster", "es": "pronto"},
    {"eu": "ondo pasa!", "es": "¡pásalo bien!"}, {"eu": "on egin!", "es": "¡buen provecho!"},
    {"eu": "merkatua", "es": "el mercado"},
]

SEED_PAIRSETS = [
    {"id": "ex-a1p1-mp1", "unit": "azterketa", "pairs": [
        {"eu": "Nongoa zara?", "es": "Gasteiztarra naiz"},
        {"eu": "Non bizi zara?", "es": "Bilbon, alde zaharrean"},
        {"eu": "Zenbat urte dituzu?", "es": "28 urte ditut"},
        {"eu": "Zertan egiten duzu lan?", "es": "Erizaina naiz ospitalean"},
        {"eu": "Seniderik baduzu?", "es": "Bai, ahizpa bat"},
        {"eu": "Zer gustatzen zaizu?", "es": "Amaren tortilla!"},
        {"eu": "Noiz jokatzen duzu pilotan?", "es": "Asteartetan eta ostegunetan"}]},
    {"id": "ex-a1p1-mp2", "unit": "azterketa", "pairs": [
        {"eu": "Ordu bata da", "es": "13:00"},
        {"eu": "Hirurak eta laurden", "es": "15:15"},
        {"eu": "Seiak eta erdiak", "es": "18:30"},
        {"eu": "Zortziak hamar gutxi", "es": "19:50"},
        {"eu": "Hamarrak puntuan", "es": "22:00 en punto"},
        {"eu": "Eguerdia", "es": "12:00 mediodía"}]},
    {"id": "ex-a1p2-mp1", "unit": "azterketa", "pairs": [
        {"eu": "Zer ordutan?", "es": "Ordu batean"},
        {"eu": "Non?", "es": "Gure etxean"},
        {"eu": "Norekin?", "es": "Familia osoarekin"},
        {"eu": "Zer ekarriko dut?", "es": "Postrea, mesedez"},
        {"eu": "Etorri nahi duzu?", "es": "Bai, noski!"},
        {"eu": "Zergatik ezin duzu?", "es": "Lan egiten dudalako"}]},
    {"id": "ex-a1p2-mp2", "unit": "azterketa", "pairs": [
        {"eu": "goizean", "es": "jaiki eta gosaldu"},
        {"eu": "eguerdian", "es": "bazkaldu"},
        {"eu": "arratsaldean", "es": "euskara-klasera joan"},
        {"eu": "gauean", "es": "afaldu eta telesaila ikusi"},
        {"eu": "larunbat goizean", "es": "merkatura joan"},
        {"eu": "igandean", "es": "mendira joan"}]},
]


def load_overlay(loc):
    """Traducciones de los SEED_* (que solo existen en es). es → sin overlay."""
    if loc == "es":
        return {}, []
    p = overlay_path(loc)
    if not p.exists():
        sys.exit(f"✗ falta el overlay de seeds: {p.relative_to(ROOT)}")
    return json.loads(p.read_text(encoding="utf-8")), []


def _ov(overlay, missing, key, fallback):
    if key in overlay:
        return overlay[key]
    missing.append(key)
    return fallback


def localized_seeds(loc):
    """Copias profundas de los SEED_* con lo vehicular sustituido por el overlay.
    El euskera (html de lecturas, transcriptEu, modelos, respuestas, reglas,
    ids, kinds) se copia tal cual del original: paridad por construcción."""
    overlay, missing = load_overlay(loc)
    if loc == "es":
        return SEED_GR, SEED_CARDS, SEED_PAIRSETS, SEED_READINGS, SEED_LISTENINGS, SEED_WRITINGS, []

    def q_loc(q, pref):
        out = dict(q)
        out["prompt"] = _ov(overlay, missing, f"{pref}:{q['id']}.prompt", q["prompt"])
        if "options" in q:
            out["options"] = [_ov(overlay, missing, f"{pref}:{q['id']}.opt{i}", o)
                              for i, o in enumerate(q["options"])]
        if q.get("explanation"):
            out["explanation"] = _ov(overlay, missing, f"{pref}:{q['id']}.expl", q["explanation"])
        return out

    gr = []
    for it in SEED_GR:
        o = dict(it)
        o["prompt"] = _ov(overlay, missing, f"it:{it['id']}.prompt", it["prompt"])
        if it.get("explanation"):
            o["explanation"] = _ov(overlay, missing, f"it:{it['id']}.expl", it["explanation"])
        if "options" in it:  # opciones eu se dejan tal cual salvo overlay explícito
            o["options"] = [overlay.get(f"it:{it['id']}.opt{i}", op)
                            for i, op in enumerate(it["options"])]
        gr.append(o)

    cards = [{**c, "es": _ov(overlay, missing, f"sc:{norm(c['eu'])}", c["es"])} for c in SEED_CARDS]
    pairs = [{**s, "pairs": [{**p, "es": _ov(overlay, missing, f"sp:{s['id']}.{i}", p["es"])}
                             for i, p in enumerate(s["pairs"])]} for s in SEED_PAIRSETS]
    readings = [{**r, "questions": [q_loc(q, "rq") for q in r["questions"]]} for r in SEED_READINGS]
    listenings = [{**l, "questions": [q_loc(q, "lq") for q in l["questions"]]} for l in SEED_LISTENINGS]
    writings = [{**w,
                 "task": _ov(overlay, missing, f"wr:{w['id']}.task", w["task"]),
                 "checks": [{**c, "label": _ov(overlay, missing, f"wr:{w['id']}.chk{i}", c["label"])}
                            for i, c in enumerate(w["checks"])]} for w in SEED_WRITINGS]
    return gr, cards, pairs, readings, listenings, writings, missing


def build_bank(loc):
    items, cards, pair_sets = collect(loc)
    gr, s_cards, s_pairs, s_readings, s_listenings, s_writings, missing = localized_seeds(loc)
    items = items + gr
    seen = {norm(c["eu"]) for c in cards}
    for c in s_cards:
        if norm(c["eu"]) not in seen:
            seen.add(norm(c["eu"]))
            cards.append({**c, "unit": "azterketa"})
    pair_sets = pair_sets + s_pairs
    bank = {
        "version": 1,
        "level": "a1",
        "locale": loc,
        "blueprint": BLUEPRINT,
        "items": items,
        "cards": cards,
        "pairSets": pair_sets,
        "readings": s_readings,
        # speakers no viaja al cliente (solo lo usa gen_listenings.py)
        "listenings": [{"id": l["id"], "kind": l["kind"], "title": l["title"],
                        "audio": f"{l['id']}.mp3", "transcriptEu": l["transcriptEu"],
                        "questions": l["questions"]}
                       for l in s_listenings],
        "writings": s_writings,
        "unitTitles": unit_titles(loc),
    }
    return bank, missing


def main():
    args = sys.argv[1:]
    locs = LOCALES if "--all" in args else (args or ["es"])
    for loc in locs:
        write_bank(loc)


def write_bank(loc):
    bank, missing = build_bank(loc)
    items, cards = bank["items"], bank["cards"]
    SEED_READINGS_L, SEED_LISTENINGS_L, SEED_WRITINGS_L = bank["readings"], bank["listenings"], bank["writings"]

    # ── sanity: las cuotas del blueprint caben en el banco ──
    from collections import Counter
    dist = Counter(i["cat"] for i in items)
    for cat, n in BLUEPRINT["gramatika"]["minPerCat"].items():
        assert dist.get(cat, 0) >= n * 3, f"[{loc}] categoría {cat} escasa: {dist.get(cat, 0)}"
    kinds_r = Counter(r["kind"] for r in SEED_READINGS_L)
    assert len(kinds_r) >= 2 and len(SEED_READINGS_L) >= 3
    assert len(SEED_LISTENINGS_L) >= 3 and len({l["kind"] for l in SEED_LISTENINGS_L}) >= 2
    for l in SEED_LISTENINGS_L:
        assert len(l["questions"]) >= BLUEPRINT["entzumena"]["questionsPer"], l["id"]
        for q in l["questions"]:
            assert 0 <= q["answer"] < len(q["options"]), q["id"]
    assert len({w["kind"] for w in SEED_WRITINGS_L}) >= 2
    for w in SEED_WRITINGS_L:
        assert len(w["checks"]) == 5, f"{w['id']}: {len(w['checks'])} checks (deben ser 5)"
    for r in SEED_READINGS_L:
        assert len(r["questions"]) >= BLUEPRINT["irakurmena"]["questionsPer"], r["id"]
        for q in r["questions"]:
            assert 0 <= q["answer"] < len(q["options"]), q["id"]
    ids = [i["id"] for i in items] + [q["id"] for r in SEED_READINGS_L for q in r["questions"]]
    assert len(ids) == len(set(ids)), "ids duplicados en el banco"

    out = out_path(loc)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n",
                   encoding="utf-8")

    kb = out.stat().st_size / 1024
    extra = f" · ⚠️ {len(missing)} claves seed SIN traducir (fallback es)" if missing else ""
    if loc == "es":
        print(f"✓ {out.relative_to(ROOT)} — {kb:.0f} KB")
        print(f"  items sueltos : {len(items)}  (mc {sum(1 for i in items if i['type']=='mc')} · "
              f"fill {sum(1 for i in items if i['type']=='fill')})")
        for cat in BLUEPRINT["gramatika"]["minPerCat"]:
            print(f"    {cat:<12} {dist.get(cat, 0)}")
        print(f"  tarjetas pool : {len(cards)} (dedup eu)")
        print(f"  sets parejas  : {len(bank['pairSets'])}")
        print(f"  lecturas      : {len(SEED_READINGS_L)} ({dict(kinds_r)})")
        print(f"  idazmenak     : {len(SEED_WRITINGS_L)}")
    else:
        print(f"✓ {out.relative_to(ROOT)} — {kb:.0f} KB · items {len(items)} · tarjetas {len(cards)}{extra}")
    if missing:
        for k in missing[:8]:
            print(f"    falta: {k}")


if __name__ == "__main__":
    main()
