# Scraper de prospección — Firecrawl + RUES

Puebla la tabla `prospectos` de Supabase en dos etapas, usando el CLI de
Firecrawl (`firecrawl agent`) en vez de scrapers hechos a mano con
Playwright. Se corre a demanda (nunca automático).

## Etapas

1. **Descubrimiento** (`discover_firecrawl.py`) — un agente de Firecrawl
   navega la fuente y extrae candidatos (nombre/teléfono/categoría).
   - Por defecto: Google Maps, armado desde `--categoria` + `--ciudad`.
   - Con `--url "<página>"`: **cualquier página que el consultor indique**
     como fuente (un directorio gremial, páginas amarillas, etc.) — no hace
     falta escribir un parser nuevo por sitio, el agente se adapta.
2. **Enriquecimiento** (`enrich_firecrawl.py`) — por cada candidato, un
   agente busca en rues.org.co por nombre y trae NIT/representante
   legal/sector. Sube a `prospectos` vía upsert (`on_conflict=nit`, así que
   correrlo de nuevo no duplica).

`facturacion_est` queda vacío — el RUES no expone ingresos/activos gratis,
solo en el certificado pagado por empresa (fuera de alcance de esta fase).

## Fuentes con login del consultor (ej. Orbis)

**No implementado a propósito.** Automatizar el login a una base paga como
Orbis probablemente viola los términos de servicio del proveedor (son
licencias por usuario, no pensadas para scraping automatizado), y pone en
riesgo la cuenta del consultor. Alternativa recomendada: el consultor
exporta sus resultados desde la plataforma (usando su propio acceso
legítimo) y los sube como CSV/Excel — eso sí es seguro de construir, pero
es una feature de importación, no de scraping, y queda para otra fase.

## Uso local

```bash
pip install -r requirements.txt
```

Necesitas Node.js instalado (para `npx firecrawl-cli`) — ya lo tienes por
ser un proyecto Next.js.

```bash
# Descubrimiento — Google Maps
FIRECRAWL_API_KEY=... python discover_firecrawl.py \
  --categoria "consultor financiero independiente" --ciudad "Bogota" \
  --limit 20 --out candidatos.json

# Descubrimiento — página indicada por el consultor
FIRECRAWL_API_KEY=... python discover_firecrawl.py \
  --url "https://..." --limit 20 --out candidatos.json

# Enriquecimiento + carga a Supabase
FIRECRAWL_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  python enrich_firecrawl.py --in candidatos.json
```

`SUPABASE_SERVICE_ROLE_KEY`: usar el **JWT legacy** (Supabase → Settings →
API Keys → tab "Legacy anon, service_role API keys" → Reveal), no el nuevo
`sb_secret_...` — el SDK Python fijado (2.9.1) todavía no lo soporta.

`FIRECRAWL_API_KEY`: se saca de firecrawl.dev → API Keys. **`agent` no
corre en el tier gratuito sin key** — hace falta cuenta con créditos.

## Costo real (medido en esta sesión)

Cada llamada de `firecrawl agent` (un candidato en enriquecimiento, o una
tanda de descubrimiento) gastó **~50 créditos**. Con el plan de 1,000
créditos/mes, una corrida semanal de ~20 prospectos (descubrimiento +
enriquecimiento de cada uno) puede rondar 1,000-1,500 créditos — **puede
superar el plan mensual en una sola corrida**. Usa `--max-credits` para
poner un tope duro por llamada y revisa `firecrawl credit-usage` antes de
correr tandas grandes.

## Automatización (GitHub Actions, a demanda)

`.github/workflows/scrape-rues.yml` — solo `workflow_dispatch` (sin cron).
Acepta `categoria`+`ciudad` O `url` (fuente indicada por el consultor),
`limit` y `max_credits`. Requiere los secrets `FIRECRAWL_API_KEY`,
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el repo de GitHub
(Settings → Secrets and variables → Actions).

Para dispararlo: pestaña **Actions** → "Scraper de prospección (Firecrawl)"
→ **Run workflow**.

## Scripts anteriores (Playwright)

`discover_google_maps.py` y `enrich_rues.py` son la versión anterior
(Playwright a mano) — quedaron deprecados pero no se pudieron borrar en
esta sesión. Bórralos cuando confirmes que ya no los necesitas.
