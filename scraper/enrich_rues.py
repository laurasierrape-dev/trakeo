"""
DEPRECADO — reemplazado por enrich_firecrawl.py (usa Firecrawl en vez de
Playwright a mano; misma extracción, más robusto, sin selectores/regex
frágiles). Se deja este archivo porque no se pudo borrar en la sesión que
lo reemplazó; bórralo cuando confirmes que ya no lo necesitas.

Etapa 2 (enriquecimiento): toma los candidatos de discover_google_maps.py y
busca cada nombre en el RUES (rues.org.co) para traer NIT, representante
legal y sector (actividad económica). Sube el resultado a la tabla
`prospectos` de Supabase vía upsert (on_conflict=nit).

`facturacion_est` NO se puebla aquí: el RUES público no expone ingresos ni
activos gratis, solo en el "Certificado" pagado por empresa (fuera de
alcance de esta fase — ver PRD y plan de implementación).

Uso:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    python enrich_rues.py --in candidatos.json [--headed]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys

from playwright.sync_api import sync_playwright
from supabase import create_client

NIT_RE = re.compile(r"NIT\s+([\d\-\s]+)")
# El RUES no formatea igual esta sección entre cámaras — dos formatos observados:
# (A, formato antiguo) "24575549 - ACOSTA GARCES ESPERANZA"
# (B, formato tabular) "Jackson Eduardo Farfan Gutierrez  C.C. No. 79716558"
REPRESENTANTE_RE_A = re.compile(r"\d{5,}\s*-\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{3,40})")
REPRESENTANTE_RE_B = re.compile(
    r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})\s+C\.C\.\s*No\."
)


def switch_tab(page, main, tab_name: str) -> str:
    """Cambia de tab en el detalle RUES y espera a que el contenido realmente
    cambie (cada tab carga su contenido vía fetch tras el click)."""
    before = main.inner_text()
    page.get_by_role("tab", name=tab_name).click()
    page.wait_for_function(
        """([before]) => {
            const t = document.querySelector('main').innerText;
            return t !== before && !t.includes('Loading...');
        }""",
        arg=[before],
        timeout=15_000,
    )
    return main.inner_text()


def buscar_en_rues(page, nombre: str) -> dict | None:
    page.goto(
        "https://www.rues.org.co/busqueda-avanzada", timeout=60_000, wait_until="networkidle"
    )
    page.get_by_role("tab", name="Nombre / Palabra Clave").click()

    campo = page.get_by_placeholder("Nombre /Razon Social")
    campo.fill(nombre)
    campo.press("Enter")

    resultado = page.get_by_role("link", name="Ver información").first
    try:
        resultado.wait_for(timeout=15_000)
    except Exception:
        return None  # sin resultados para este nombre

    resultado.click()
    main = page.locator("main")
    main.wait_for(timeout=15_000)
    # El detalle carga vía fetch tras la navegación — esperar a que salga el spinner.
    page.wait_for_function(
        "() => !document.querySelector('main').innerText.includes('Loading...')",
        timeout=15_000,
    )

    info_general = main.inner_text()
    razon_social = info_general.split("\n")[0].strip()

    nit_match = NIT_RE.search(info_general)
    nit = nit_match.group(1).replace(" ", "").strip() if nit_match else None
    if not nit:
        return None  # sin NIT público (ej. subtipo "Agencia") — se descarta

    actividad_text = switch_tab(page, main, "Actividad económica")
    sector = None
    lines = [l.strip() for l in actividad_text.split("\n") if l.strip()]
    for i, line in enumerate(lines):
        # El código CIIU (numérico) va seguido de su descripción — esa es la que queremos.
        if line.isdigit() and i + 1 < len(lines):
            sector = lines[i + 1]
            break

    rep_text = switch_tab(page, main, "Representante legal").replace("\xa0", " ")
    rep_text = re.sub(r" {2,}", " ", rep_text)
    rep_match = REPRESENTANTE_RE_A.search(rep_text) or REPRESENTANTE_RE_B.search(rep_text)
    representante = None
    if rep_match:
        representante = re.sub(r"\s+", " ", rep_match.group(1)).strip().title()
        # El formato tabular a veces arrastra el cargo ("Representante Legal") al nombre.
        for cargo in ("Representante", "Legal", "Gerente", "Suplente", "Principal"):
            representante = re.sub(rf"^{cargo}\s+", "", representante)

    return {
        "razon_social": razon_social,
        "nit": nit,
        "representante": representante,
        "sector": sector,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="infile", required=True)
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(supabase_url, supabase_key)

    with open(args.infile, encoding="utf-8") as f:
        candidatos = json.load(f)

    subidos = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        page = browser.new_page(
            locale="es-CO",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
        )

        for candidato in candidatos:
            nombre = candidato["nombre"]
            print(f"Buscando: {nombre}", file=sys.stderr)
            try:
                datos = buscar_en_rues(page, nombre)
            except Exception as e:
                print(f"  error con '{nombre}': {e}", file=sys.stderr)
                continue

            if not datos:
                print(f"  sin match en RUES, se descarta", file=sys.stderr)
                continue

            supabase.table("prospectos").upsert(
                {
                    "razon_social": datos["razon_social"],
                    "nit": datos["nit"],
                    "representante": datos["representante"],
                    "telefono": candidato.get("telefono"),
                    "sector": datos["sector"],
                    "zona": None,
                    "facturacion_est": None,
                    "fuente": "rues",
                    "estado": "sin_revisar",
                },
                on_conflict="nit",
            ).execute()
            subidos += 1
            print(f"  subido: {datos['razon_social']} (NIT {datos['nit']})", file=sys.stderr)

        browser.close()

    print(f"{subidos}/{len(candidatos)} prospectos subidos a Supabase", file=sys.stderr)


if __name__ == "__main__":
    main()
