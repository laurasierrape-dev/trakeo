import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_CONTENT_CHARS = 200_000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  // Permite el fetch cuando el bookmarklet corre en un sitio público (ej. LinkedIn)
  // y el endpoint está en localhost — Chrome bloquea esto por defecto (Private
  // Network Access) salvo que el servidor lo autorice explícitamente.
  'Access-Control-Allow-Private-Network': 'true',
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
  descripcion?: string | null
}

async function extraerProspectos(contenido: string, pregunta: string): Promise<ProspectoExtraido[]> {
  const instruccionPregunta = pregunta.trim()
    ? `\n\nEl consultor busca específicamente lo siguiente en esta página: "${pregunta.trim()}". ` +
      'Prioriza y filtra los resultados según ese criterio — si un candidato no encaja con lo que pide, no lo incluyas.'
    : ''

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content:
            'Extrae de este texto (copiado de una página web, posiblemente de varias páginas de ' +
            'resultados concatenadas) una lista de empresas o personas candidatas a prospecto de ' +
            'negocio, con todo lo que encuentres de cada una: nombre, teléfono, email, ' +
            'representante legal / contacto principal, cualquier cifra de facturación, ingresos o ' +
            'ventas anuales que aparezca (cópiala tal cual aparece, con su moneda/unidad), y una ' +
            'breve descripción de a qué se dedica la empresa si aparece en el texto. Deja cada ' +
            'campo vacío si no aparece — no inventes datos. No repitas la misma empresa dos veces ' +
            'si aparece en más de una página. Si no hay ningún candidato claro, devuelve una lista vacía.' +
            instruccionPregunta +
            '\n\n' +
            contenido,
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'reportar_prospectos',
            description: 'Reporta los prospectos encontrados en el texto',
            parameters: {
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
                      descripcion: {
                        type: ['string', 'null'],
                        description: 'Breve descripción de a qué se dedica la empresa, si aparece en el texto',
                      },
                    },
                    required: ['nombre'],
                  },
                },
              },
              required: ['prospectos'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'reportar_prospectos' } },
    }),
  })

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) return []
  return JSON.parse(toolCall.function.arguments).prospectos ?? []
}

export async function POST(req: NextRequest) {
  const { token, url, contenido, pregunta } = await req.json()

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
    prospectos = await extraerProspectos(contenidoTruncado, String(pregunta ?? ''))
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Error extrayendo prospectos: ${e}` },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  if (prospectos.length > 0) {
    await supabase.from('hallazgos').insert(
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
          descripcion: p.descripcion ?? null,
          notas,
          consultor_id: tokenRow.consultor_id,
        }
      })
    )
  }

  return NextResponse.json({ ok: true, creados: prospectos.length }, { headers: CORS_HEADERS })
}
