import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_ITEMS_CHARS = 40_000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  const { items, pregunta } = await req.json()

  if (!Array.isArray(items) || !pregunta) {
    return NextResponse.json({ ok: false, error: 'Falta items o pregunta' }, { status: 400 })
  }

  const itemsJson = JSON.stringify(items).slice(0, MAX_ITEMS_CHARS)

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY!}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content:
            'Estos son los registros visibles ahora mismo en una lista (formato JSON, cada uno con su "id"):\n\n' +
            itemsJson +
            '\n\nEl consultor pregunta/pide: "' +
            String(pregunta) +
            '"\n\nDevuelve los ids de los registros que cumplen con lo que pide, y una respuesta corta ' +
            '(1-2 frases) en español explicando el filtro aplicado o contestando la pregunta. Si ninguno ' +
            'cumple, devuelve una lista vacía de ids y explícalo en la respuesta. No inventes datos que no estén en los registros.',
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'reportar_filtro',
            description: 'Reporta los ids que cumplen el criterio y una respuesta corta',
            parameters: {
              type: 'object',
              properties: {
                ids: { type: 'array', items: { type: 'string' } },
                respuesta: { type: 'string' },
              },
              required: ['ids', 'respuesta'],
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'reportar_filtro' } },
    }),
  })

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `Error del asistente: ${res.status}` },
      { status: 502 }
    )
  }

  const data = await res.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  const args = toolCall ? JSON.parse(toolCall.function.arguments) : null

  return NextResponse.json({
    ok: true,
    ids: args?.ids ?? [],
    respuesta: args?.respuesta ?? '',
  })
}
