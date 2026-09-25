// Extracción de prospectos por IA vía Groq, compartida entre /api/bookmarklet
// (contenido de páginas web) y la importación de PDF en Prospectos
// (contenido de un archivo). Misma cuenta de Groq, mismo límite de 8,000
// tokens/minuto — por eso el reintento-con-recorte vive aquí una sola vez.

export type ProspectoExtraido = {
  nombre: string
  telefono?: string | null
  email?: string | null
  representante?: string | null
  facturacion?: string | null
  descripcion?: string | null
}

// Groq responde 413 con un mensaje estilo OpenAI: "...Limit 8000, Used 0,
// Requested 12020...". "Limit" y "Requested" no siempre quedan adyacentes
// (puede haber "Used X" en medio), así que se buscan por separado en vez de
// con un solo patrón que asuma el orden exacto. Si el mensaje cambia de
// formato y no se puede parsear, se encoge a la mitad como respaldo.
const REGEX_LIMITE_GROQ = /Limit\s+(\d+)/i
const REGEX_SOLICITADO_GROQ = /Requested\s+(\d+)/i
const MAX_REINTENTOS = 3

async function extraerProspectos(contenido: string, instruccionExtra: string): Promise<ProspectoExtraido[]> {
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
            'resultados concatenadas, y a veces incluyendo bloques marcados "--- DETALLE: <url> ---" ' +
            'con el contenido de la ficha individual de cada resultado) una lista de empresas o ' +
            'personas candidatas a prospecto de negocio, con todo lo que encuentres de cada una: ' +
            'nombre, teléfono, email, representante legal / contacto principal, y cualquier cifra ' +
            'financiera que aparezca — facturación, ingresos, ventas anuales, utilidad, activos, ' +
            'pasivos o patrimonio (cópiala tal cual aparece, indicando de qué cifra se trata y con ' +
            'su moneda/unidad) — y una breve descripción de a qué se dedica la empresa si aparece en ' +
            'el texto. Si un bloque "--- DETALLE ---" corresponde a una empresa que ya aparece en el ' +
            'listado, une esa información en el mismo registro de esa empresa, no la reportes aparte. ' +
            'Deja cada campo vacío si no aparece — no inventes datos. No repitas la misma empresa dos ' +
            'veces si aparece en más de una página. Si no hay ningún candidato claro, devuelve una lista vacía.' +
            instruccionExtra +
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
                        description:
                          'Cifra financiera tal como aparece en el texto: facturación, ingresos, ventas ' +
                          'anuales, utilidad, activos, pasivos o patrimonio — indicando de cuál se trata',
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
// caracteres tokenizan seguro para una fuente que nunca hemos visto.
export async function extraerConReintentos(
  contenido: string,
  instruccionExtra: string
): Promise<ProspectoExtraido[]> {
  let actual = contenido
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      return await extraerProspectos(actual, instruccionExtra)
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
