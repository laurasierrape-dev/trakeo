"""
Etapa 2 (enriquecimiento) — vía Firecrawl (`firecrawl agent`) en vez de un
script de Playwright hecho a mano. Por cada candidato:
  1. Busca en rues.org.co por nombre → NIT, representante legal, sector.
  2. Con ese NIT, busca en el SIIS de la Superintendencia de Sociedades
     (siis.ia.supersociedades.gov.co) → ingresos de actividades ordinarias
     (ventas) del año más reciente disponible, si la empresa está vigilada.
Sube el resultado a `prospectos` en Supabase (upsert, on_conflict=nit).

`facturacion_est` solo se puebla si la empresa aparece en el SIIS — cubre
sociedades vigiladas por Supersociedades, no todas las pymes. Confirmado en
vivo: HYTSA (NIT 901326181) sí aparece con ingresos reales por año.

Requiere FIRECRAWL_API_KEY en el entorno (agent no corre en el tier gratuito).

Uso:
    FIRECRAWL_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
        python enrich_firecrawl.py --in candidatos.json
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile

from supabase import create_client

RUES_URL = "https://www.rues.org.co/busqueda-avanzada"
SIIS_URL = "https://siis.ia.supersociedades.gov.co/"

SIIS_SCHEMA = json.dumps(
    {
        "type": "object",
        "properties": {
            "encontrado": {"type": "boolean"},
            "ingresos": {
                "type": ["string", "null"],
                "description": "Ingresos de actividades ordinarias del año más reciente, tal cual aparece (con cifra y unidad, ej. '$1.372.345 M')",
            },
            "anio_corte": {"type": ["string", "null"], "description": "Año del corte de ese dato, ej. '2024-12-31'"},
        },
        "required": ["encontrado"],
    }
)

SIIS_PROMPT_TEMPLATE = """\
En esta página del SIIS de la Superintendencia de Sociedades, busca el NIT \
"{nit}" en el buscador de sociedades. Si aparece algún resultado, toma el \
de corte más reciente (la fecha "Corte" más nueva) y lee su cifra de \
"Ingresos de actividades ordinarias". Devuelve esa cifra tal cual aparece \
(con el símbolo de moneda y unidad) y el año de corte. Si el NIT no \
aparece en ningún resultado, marca encontrado=false — no inventes datos."""


def run_siis_agent(nit: str, max_credits: int) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = tmp.name

    cmd = [
        "npx",
        "-y",
        "firecrawl-cli@latest",
        "agent",
        SIIS_PROMPT_TEMPLATE.format(nit=nit),
        "--urls",
        SIIS_URL,
        "--schema",
        SIIS_SCHEMA,
        "--wait",
        "--json",
        "--max-credits",
        str(max_credits),
        "-o",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())

    with open(out_path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("data", data)


SCHEMA = json.dumps(
    {
        "type": "object",
        "properties": {
            "encontrado": {"type": "boolean"},
            "razon_social": {"type": ["string", "null"]},
            "nit": {"type": ["string", "null"]},
            "representante": {"type": ["string", "null"]},
            "sector": {"type": ["string", "null"]},
        },
        "required": ["encontrado"],
    }
)

PROMPT_TEMPLATE = """\
En esta página del RUES, usa la pestaña "Nombre / Palabra Clave" para \
buscar la empresa "{nombre}". Si hay resultados, abre el primero (link \
"Ver información"). En el detalle, revisa las pestañas "Información \
general" (para el NIT bajo "Identificación"), "Actividad económica" \
(código y descripción) y "Representante legal" (nombre de la persona). \
Devuelve razon_social, nit, representante y sector. Si la empresa no tiene \
NIT público (ej. es una "Agencia") o no hay resultados, marca \
encontrado=false."""


def run_agent(nombre: str, max_credits: int) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = tmp.name

    cmd = [
        "npx",
        "-y",
        "firecrawl-cli@latest",
        "agent",
        PROMPT_TEMPLATE.format(nombre=nombre),
        "--urls",
        RUES_URL,
        "--schema",
        SCHEMA,
        "--wait",
        "--json",
        "--max-credits",
        str(max_credits),
        "-o",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())

    with open(out_path, encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--in", dest="infile", required=True)
    parser.add_argument("--max-credits", type=int, default=30)
    args = parser.parse_args()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    with open(args.infile, encoding="utf-8") as f:
        candidatos = json.load(f)

    subidos = 0
    for candidato in candidatos:
        nombre = candidato["nombre"]
        print(f"Buscando: {nombre}", file=sys.stderr)
        try:
            resultado = run_agent(nombre, args.max_credits)
            datos = resultado.get("data", resultado)
        except Exception as e:
            print(f"  error con '{nombre}': {e}", file=sys.stderr)
            continue

        if not datos.get("encontrado") or not datos.get("nit"):
            print("  sin match en RUES, se descarta", file=sys.stderr)
            continue

        facturacion_est = None
        try:
            siis = run_siis_agent(datos["nit"], args.max_credits)
            if siis.get("encontrado") and siis.get("ingresos"):
                facturacion_est = siis["ingresos"]
                anio = siis.get("anio_corte")
                print(f"  SIIS: ingresos {facturacion_est}" + (f" (corte {anio})" if anio else ""), file=sys.stderr)
            else:
                print("  SIIS: no vigilada / sin datos, facturacion_est queda vacío", file=sys.stderr)
        except Exception as e:
            print(f"  SIIS: error consultando ({e}), facturacion_est queda vacío", file=sys.stderr)

        supabase.table("prospectos").upsert(
            {
                "razon_social": datos["razon_social"],
                "nit": datos["nit"],
                "representante": datos.get("representante"),
                "telefono": candidato.get("telefono"),
                "sector": datos.get("sector"),
                "zona": None,
                "facturacion_est": facturacion_est,
                "fuente": "rues",
                "estado": "sin_revisar",
            },
            on_conflict="nit",
        ).execute()
        subidos += 1
        print(f"  subido: {datos['razon_social']} (NIT {datos['nit']})", file=sys.stderr)

    print(f"{subidos}/{len(candidatos)} prospectos subidos a Supabase", file=sys.stderr)


if __name__ == "__main__":
    main()
