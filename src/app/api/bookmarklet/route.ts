import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extraerConReintentos } from '@/lib/extraccionIA'

// La cuenta de Groq usada aquí tiene un límite de 8,000 tokens/minuto para
// este modelo. Cuántos caracteres caben bajo eso depende de qué tan denso es
// el texto — prosa en español (RUES) tokeniza muy distinto a una tabla de
// datos densa en códigos/columnas (Orbis) — así que ningún tope fijo de
// caracteres es seguro para cualquier sitio futuro. Este número es solo el
// punto de partida antes de intentar; si Groq igual rechaza el tamaño,
// extraerConReintentos (src/lib/extraccionIA.ts) reduce el contenido según
// lo que Groq mismo reporta como límite real y vuelve a intentar.
const MAX_CONTENT_CHARS = 10_000

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
  const preguntaTexto = String(pregunta ?? '').trim()
  const instruccionPregunta = preguntaTexto
    ? `\n\nEl consultor busca específicamente lo siguiente en esta página: "${preguntaTexto}". ` +
      'Prioriza y filtra los resultados según ese criterio — si un candidato no encaja con lo que pide, no lo incluyas.'
    : ''

  let prospectos
  try {
    prospectos = await extraerConReintentos(contenidoTruncado, instruccionPregunta)
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
