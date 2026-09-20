"""
Etapa 1 (descubrimiento) — vía Firecrawl (`firecrawl agent`) en vez de un
scraper hecho a mano. El agente navega la fuente indicada y extrae
candidatos con un schema fijo, sin selectores hardcodeados por sitio.

Por defecto la fuente es una búsqueda de Google Maps armada desde
--categoria/--ciudad. Con --url se puede apuntar a CUALQUIER página que el
consultor indique (un directorio gremial, páginas amarillas, etc.) — no hay
que escribir un parser nuevo por sitio.

Requiere el CLI de Firecrawl (se invoca vía `npx firecrawl-cli`) y
FIRECRAWL_API_KEY en el entorno — `agent` no funciona en el tier gratuito
sin key.

Uso:
    FIRECRAWL_API_KEY=... python discover_firecrawl.py \
        --categoria "consultor financiero independiente" --ciudad "Bogota" \
        --limit 20 --out candidatos.json

    # o contra una página que indique el consultor:
    FIRECRAWL_API_KEY=... python discover_firecrawl.py \
        --url "https://www.paginasamarillas.com.co/..." --limit 20 --out candidatos.json
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from urllib.parse import quote

SCHEMA = json.dumps(
    {
        "type": "object",
        "properties": {
            "candidatos": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "nombre": {"type": "string"},
                        "telefono": {"type": ["string", "null"]},
                        "categoria": {"type": ["string", "null"]},
                    },
                    "required": ["nombre"],
                },
            }
        },
        "required": ["candidatos"],
    }
)


def run_agent(url: str, prompt: str, max_credits: int) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = tmp.name

    cmd = [
        "npx",
        "-y",
        "firecrawl-cli@latest",
        "agent",
        prompt,
        "--urls",
        url,
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
        raise RuntimeError(f"firecrawl agent falló: {result.stderr.strip()}")

    with open(out_path, encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--categoria", help="Categoría de negocio (usa Google Maps por defecto)")
    parser.add_argument("--ciudad", help="Ciudad (con --categoria)")
    parser.add_argument("--url", help="URL de cualquier fuente indicada por el consultor")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--out", default="candidatos.json")
    parser.add_argument("--max-credits", type=int, default=50)
    args = parser.parse_args()

    if args.url:
        source_url = args.url
        prompt = (
            f"Extrae hasta {args.limit} negocios listados en esta página: nombre, "
            "teléfono (si está visible) y categoría/rubro del negocio."
        )
    elif args.categoria and args.ciudad:
        query = f"{args.categoria} {args.ciudad}"
        source_url = f"https://www.google.com/maps/search/{quote(query)}"
        prompt = (
            f"Extrae hasta {args.limit} negocios de esta búsqueda de Google Maps: "
            "nombre, teléfono y categoría de cada uno."
        )
    else:
        parser.error("Pasa --url, o --categoria + --ciudad")

    data = run_agent(source_url, prompt, args.max_credits)
    candidatos = data.get("candidatos") or data.get("data", {}).get("candidatos") or []

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(candidatos[: args.limit], f, ensure_ascii=False, indent=2)

    print(f"{len(candidatos[:args.limit])} candidatos escritos en {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
