import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// La cuenta de Groq usada aquí tiene un límite de 8,000 tokens/minuto para
// este modelo. Cuántos caracteres caben bajo eso depende de qué tan denso es
// el texto — prosa en español (RUES) tokeniza muy distinto a una tabla de
// datos densa en códigos/columnas (Orbis) — así que ningún tope fijo de
// caracteres es seguro para cualquier sitio futuro. Este número es solo el
// punto de partida antes de intentar; si Groq igual rechaza el tamaño,
// reintentarExtraccion() de abajo reduce el contenido según lo que Groq
// mismo reporta como límite real y vuelve a intentar (ver más abajo).
const MAX_CONTENT_CHARS = 10_000
// Groq responde 413 con un mensaje estilo OpenAI: "...Limit 8000, Used 0,
// Requested 12020...". "Limit" y "Requested" no siempre quedan adyacentes
// (puede haber "Used X" en medio), así que se buscan por separado en vez de
// con un solo patrón que asuma el orden exacto. Si el mensaje cambia de
// formato y no se puede parsear, se encoge a la mitad como respaldo.
const REGEX_LIMITE_GROQ = /Limit\s+(\d+)/i
const REGEX_SOLICITADO_GROQ = /Requested\s+(\d+)/i
const MAX_REINTENTOS = 3

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
    const cuerpo = await res.text()
    const error = new Error(`Groq API error: ${res.status} ${cuerpo}`) as Error & {
      status?: number
      cuerpo?: string
    }
    error.status = res.status
    error.cuerpo = cuerpo
    throw error
  }

  const data = await res.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) return []
  return JSON.parse(toolCall.function.arguments).prospectos ?? []
}

// Reintenta la extracción reduciendo el contenido cuando Groq rechaza el
// tamaño (413), en vez de depender de adivinar de antemano cuántos
// caracteres tokenizan seguro para un sitio que nunca hemos visto.
async function extraerConReintentos(contenido: string, pregunta: string): Promise<ProspectoExtraido[]> {
  let actual = contenido
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      return await extraerProspectos(actual, pregunta)
    } catch (e) {
      const err = e as Error & { status?: number; cuerpo?: string }
      const esUltimoIntento = intento === MAX_REINTENTOS
      if (err.status !== 413 || esUltimoIntento || actual.length < 500) throw err

      const limite = err.cuerpo?.match(REGEX_LIMITE_GROQ)?.[1]
      const solicitado = err.cuerpo?.match(REGEX_SOLICITADO_GROQ)?.[1]
      const proporcion =
        limite && solicitado
          ? Math.min(0.9, (Number(limite) / Number(solicitado)) * 0.9)
          : 0.5
      actual = actual.slice(0, Math.max(500, Math.floor(actual.length * proporcion)))
    }
  }
  return []
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
    prospectos = await extraerConReintentos(contenidoTruncado, String(pregunta ?? ''))
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `Error extrayendo prospectos: ${e}` },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  // Dedup: un hallazgo con este nombre ya visto para este consultor (en
  // cualquier estado — aprobado o descartado también cuenta como "ya visto")
  // no se vuelve a insertar. Esto cubre tanto repetir la misma búsqueda en
  // otro momento como las varias páginas de una misma corrida paginada.
  const { data: existentes } = await supabase
    .from('hallazgos')
    .select('nombre_empresa')
    .eq('consultor_id', tokenRow.consultor_id)

  const nombresVistos = new Set(
    (existentes ?? []).map(h => h.nombre_empresa.trim().toLowerCase())
  )

  const prospectosNuevos = prospectos.filter(p => {
    const clave = p.nombre.trim().toLowerCase()
    if (nombresVistos.has(clave)) return false
    nombresVistos.add(clave)
    return true
  })

  if (prospectosNuevos.length > 0) {
    await supabase.from('hallazgos').insert(
      prospectosNuevos.map(p => {
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

  return NextResponse.json({ ok: true, creados: prospectosNuevos.length }, { headers: CORS_HEADERS })
}
