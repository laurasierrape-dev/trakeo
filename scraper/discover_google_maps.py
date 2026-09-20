"""
DEPRECADO — reemplazado por discover_firecrawl.py (usa Firecrawl en vez de
Playwright a mano, y soporta cualquier URL, no solo Google Maps). Se deja
este archivo porque no se pudo borrar en la sesión que lo reemplazó;
bórralo cuando confirmes que ya no lo necesitas.

Etapa 1 (descubrimiento): busca negocios en Google Maps por categoría + ciudad
y escribe una lista de candidatos (nombre, teléfono, dirección) a un JSON.

Uso:
    python discover_google_maps.py --categoria "consultor financiero independiente" \
        --ciudad "Bogota" --limit 20 --out candidatos.json [--headed]

El resultado de este script alimenta enrich_rues.py, que busca cada nombre
candidato en el RUES para traer NIT/representante/sector.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from urllib.parse import quote

from playwright.sync_api import sync_playwright

PHONE_RE = re.compile(r"\b\d[\d\s]{6,}\d\b")


def parse_article(article) -> dict:
    text = article.inner_text()
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # La primera línea es el nombre del negocio (a veces duplicada en la segunda).
    name = lines[0] if lines else ""

    telefono = None
    for line in lines:
        m = PHONE_RE.search(line)
        if m:
            telefono = m.group(0).strip()
            break

    # La categoría suele ser la primera línea corta sin dígitos, sin contar el nombre.
    categoria = next(
        (l for l in lines if l != name and not any(c.isdigit() for c in l) and len(l) < 60),
        None,
    )

    return {"nombre": name, "categoria": categoria, "telefono": telefono, "raw": lines}


def discover(categoria: str, ciudad: str, limit: int, headed: bool) -> list[dict]:
    query = f"{categoria} {ciudad}"
    url = f"https://www.google.com/maps/search/{quote(query)}"

    resultados: list[dict] = []
    vistos: set[str] = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        page = browser.new_page(
            locale="es-CO",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
        )
        page.goto(url, timeout=60_000)
        page.get_by_role("feed").wait_for(timeout=30_000)
        feed = page.get_by_role("feed")

        # Google Maps carga más resultados al hacer scroll dentro del panel del feed.
        stale_rounds = 0
        while len(resultados) < limit and stale_rounds < 5:
            articles = feed.get_by_role("article").all()
            nuevos = 0
            for a in articles:
                data = parse_article(a)
                if data["nombre"] and data["nombre"] not in vistos:
                    vistos.add(data["nombre"])
                    resultados.append(data)
                    nuevos += 1
            if nuevos == 0:
                stale_rounds += 1
            else:
                stale_rounds = 0
            feed.evaluate("el => el.scrollBy(0, el.scrollHeight)")
            page.wait_for_timeout(1500)

        browser.close()

    return resultados[:limit]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--categoria", required=True)
    parser.add_argument("--ciudad", required=True)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--out", default="candidatos.json")
    parser.add_argument("--headed", action="store_true", help="Muestra el navegador (debug)")
    args = parser.parse_args()

    resultados = discover(args.categoria, args.ciudad, args.limit, args.headed)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)

    print(f"{len(resultados)} candidatos escritos en {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
