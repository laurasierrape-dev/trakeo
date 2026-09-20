import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_CONTENT_CHARS = 60_000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

type ProspectoExtraido = {
  nombre: string
  telefono?: string | null
  email?: string | null
  representante?: string | null
  facturacion?: string | null
}

async function extraerProspectos(contenido: string): Promise<ProspectoExtraido[]> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content:
            'Extrae de este texto (copiado de una página web) una lista de empresas o personas ' +
            'candidatas a prospecto de negocio, con todo lo que encuentres de cada una: nombre, ' +
            'teléfono, email, representante legal / contacto principal, y cualquier cifra de ' +
            'facturación, ingresos o ventas anuales que aparezca (cópiala tal cual aparece, con ' +
            'su moneda/unidad). Deja cada campo vacío si no aparece — no inventes datos. ' +
            'Si no hay ningún candidato claro, devuelve una lista vacía.\n\n' +
            contenido,
        },
      ],
      tools: [
        {
          name: 'reportar_prospectos',
          description: 'Reporta los prospectos encontrados en el texto',
          input_schema: {
            type: 'object',
            properties: {
              prospectos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    nombre: { type: 'string' },
                    telefono: { type: ['string', 'null'] },
                    email: { type: ['string', 'null'] },
                    representante: { type: ['string', 'null'] },
                    facturacion: {
                      type: ['string', 'null'],
                      description: 'Cifra de facturación/ingresos/ventas anuales tal como aparece en el texto',
                    },
                  },
                  required: ['nombre'],
                },
              },
            },
            required: ['prospectos'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'reportar_prospectos' },
    }),
  })

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use')
  return toolUse?.input?.prospectos ?? []
}

export async function POST(req: NextRequest) {
  const { token, url, contenido } = await req.json()

  if (!token || !contenido) {
    return NextResponse.json(
      { ok: false, error: 'Falta token o contenido' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tokenRow, error: tokenError } = await supabase
    .from('bookmarklet_tokens')
    .select('consultor_id')
    .eq('token', token)
    .single()

  if (tokenError || !tokenRow) {
    return NextResponse.json(
      { ok: false, error: 'Token inválido — regenera el bookmarklet desde el dashboard' },
      { status: 401, headers: CORS_HEADERS }
    )
  }

  const contenidoTruncado = String(contenido).slice(0, MAX_CONTENT_CHARS)

  let prospectos: ProspectoExtraido[]
  try {
    prospectos = await extraerProspectos(contenidoTruncado)
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Error extrayendo prospectos: ${e}` },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  if (prospectos.length > 0) {
    await supabase.from('contactos').insert(
      prospectos.map(p => {
        const notas = [
          `Origen: ${url ?? 'desconocido'}`,
          p.facturacion ? `Facturación/ingresos: ${p.facturacion}` : null,
        ]
          .filter(Boolean)
          .join(' | ')

        return {
          nombre_empresa: p.nombre,
          telefono: p.telefono ?? null,
          email: p.email ?? null,
          representante: p.representante ?? null,
          temperatura: 'frio',
          notas,
          consultor_id: tokenRow.consultor_id,
        }
      })
    )
  }

  return NextResponse.json({ ok: true, creados: prospectos.length }, { headers: CORS_HEADERS })
}
