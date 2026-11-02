import { NextResponse, type NextRequest } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { extraerConReintentos } from '@/lib/extraccionIA'
import { mapearFilaAutomatico, type FilaMapeada } from '@/lib/importarMapeo'

// Archivos como el que trajo Andrés (~10,600 filas, hasta ~46,000 con una
// fila por participante) tardan varios segundos en parsear + varios lotes
// de upsert — 60s da margen razonable dentro de lo que Vercel permite.
export const maxDuration = 60

const TAMANO_LOTE = 1_000
// El texto de un PDF puede ser largo; extraerConReintentos ya recorta y
// reintenta si Groq lo rechaza por tamaño, así que este es solo el punto de
// partida (mismo criterio que MAX_CONTENT_CHARS en /api/bookmarklet).
const MAX_CHARS_PDF = 10_000

// Crea (o reutiliza, si viene de un lote anterior del mismo archivo) la
// búsqueda que agrupa esta importación, e inserta los candidatos con el
// mismo patrón de dedup para ambos flujos (archivo crudo vía FormData, o
// filas ya mapeadas vía JSON).
async function insertarCandidatos(
  supabase: SupabaseClient,
  candidatos: FilaMapeada[],
  busquedaId: string
) {
  const conNit = candidatos.filter(c => c.nit)
  const sinNit = candidatos.filter(c => !c.nit)

  // Antes se usaba upsert(..., {onConflict:'nit', ignoreDuplicates:true}),
  // que en este entorno marcaba CADA fila como duplicada — incluso con un
  // NIT que nunca había existido — sin devolver ningún error explícito (un
  // insert SQL directo con el mismo NIT sí funcionaba, y la policy de
  // INSERT está abierta, así que no era RLS: algo en cómo PostgREST resolvía
  // el upsert con ignoreDuplicates se comportaba distinto a lo esperado).
  // Se reemplaza por el mismo patrón ya usado para sinNit: consultar qué
  // NITs de este lote ya existen e insertar solo los que no, con un INSERT
  // simple sin ON CONFLICT — predecible y ya probado en esta misma ruta.
  let nuevosConNit = 0
  for (let i = 0; i < conNit.length; i += TAMANO_LOTE) {
    const lote = conNit.slice(i, i + TAMANO_LOTE)
    const { data: existentes } = await supabase
      .from('prospectos')
      .select('nit')
      .in('nit', lote.map(c => c.nit as string))
    const nitsExistentes = new Set((existentes ?? []).map((p: { nit: string }) => p.nit))

    const nuevosDelLote = lote
      .filter(c => !nitsExistentes.has(c.nit as string))
      .map(f => ({ ...f, busqueda_id: busquedaId }))

    if (nuevosDelLote.length > 0) {
      const { error } = await supabase.from('prospectos').insert(nuevosDelLote)
      if (!error) nuevosConNit += nuevosDelLote.length
    }
  }
  const duplicadosConNit = conNit.length - nuevosConNit

  // Sin NIT no hay constraint de BD para dedup, así que se compara contra lo
  // ya existente por nombre — pero preguntando solo por los nombres de este
  // lote (no toda la tabla): un select sin filtro se corta en 1,000 filas
  // por defecto en Supabase/PostgREST, y prospectos puede tener miles de
  // filas reales, así que traer "todo" para comparar perdía coincidencias
  // reales y dejaba duplicar.
  let nuevosSinNit = 0
  let duplicadosSinNit = 0
  const vistosEnEsteImport = new Set<string>()
  const DEDUPE_LOTE = 200
  for (let i = 0; i < sinNit.length; i += DEDUPE_LOTE) {
    const lote = sinNit.slice(i, i + DEDUPE_LOTE)
    const filtroOr = lote
      .map(c => `razon_social.ilike.${c.razon_social.trim().replace(/[,()]/g, ' ')}`)
      .join(',')
    const { data: existentes } = await supabase.from('prospectos').select('razon_social').or(filtroOr)
    const vistosEnBD = new Set((existentes ?? []).map((p: { razon_social: string }) => p.razon_social.trim().toLowerCase()))

    const nuevosDelLote = lote.filter(c => {
      const clave = c.razon_social.trim().toLowerCase()
      if (vistosEnBD.has(clave) || vistosEnEsteImport.has(clave)) return false
      vistosEnEsteImport.add(clave)
      return true
    })
    duplicadosSinNit += lote.length - nuevosDelLote.length

    if (nuevosDelLote.length > 0) {
      const conBusqueda = nuevosDelLote.map(f => ({ ...f, busqueda_id: busquedaId }))
      const { error } = await supabase.from('prospectos').insert(conBusqueda)
      if (!error) nuevosSinNit += nuevosDelLote.length
    }
  }

  return {
    nuevos: nuevosConNit + nuevosSinNit,
    duplicados: duplicadosConNit + duplicadosSinNit,
  }
}

type FilaMapeadaEntrada = Partial<FilaMapeada> & { razon_social?: unknown }

// Valida/normaliza lo que mande el cliente para el flujo de filas ya
// mapeadas (ver ImportarBase) — no se confía en que el shape venga perfecto
// solo porque lo armó nuestro propio frontend.
function sanearFilaEntrada(f: FilaMapeadaEntrada): FilaMapeada | null {
  const razonSocial = typeof f.razon_social === 'string' ? f.razon_social.trim() : ''
  if (!razonSocial) return null
  const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return {
    razon_social: razonSocial,
    nit: texto(f.nit),
    representante: texto(f.representante),
    telefono: texto(f.telefono),
    email: texto(f.email),
    sector: texto(f.sector),
    ingresos_miles: numero(f.ingresos_miles),
    descripcion: texto(f.descripcion),
    fuente: 'importado',
    datos_extra: f.datos_extra && typeof f.datos_extra === 'object' ? f.datos_extra : null,
  }
}

async function manejarFilasJSON(req: NextRequest, supabase: SupabaseClient, userId: string) {
  const body = (await req.json()) as {
    nombreArchivo?: string
    filas?: FilaMapeadaEntrada[]
    busquedaId?: string
  }
  const filasEntrada = Array.isArray(body.filas) ? body.filas : []
  const nombreArchivo = typeof body.nombreArchivo === 'string' ? body.nombreArchivo : 'archivo importado'

  let busquedaId = typeof body.busquedaId === 'string' ? body.busquedaId : null
  if (!busquedaId) {
    const { data: busqueda, error: busquedaError } = await supabase
      .from('busquedas')
      .insert([{ consultor_id: userId, nombre: nombreArchivo, origen: 'csv' }])
      .select('id')
      .single()
    if (busquedaError || !busqueda) {
      return NextResponse.json(
        { ok: false, error: `No se pudo registrar la búsqueda: ${busquedaError?.message}` },
        { status: 500 }
      )
    }
    busquedaId = busqueda.id
  }

  const filasLeidas = filasEntrada.length
  const candidatos = filasEntrada.map(sanearFilaEntrada).filter((f): f is FilaMapeada => f !== null)
  const fallidos = filasLeidas - candidatos.length

  const { nuevos, duplicados } = await insertarCandidatos(supabase, candidatos, busquedaId as string)

  return NextResponse.json({ ok: true, filasLeidas, nuevos, duplicados, fallidos, busquedaId })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  // Flujo nuevo: el cliente ya parseó el archivo, eligió hoja y confirmó el
  // mapeo de columnas (ver ImportarBase/parsearTabular) — solo manda las
  // filas que efectivamente mapearon a un prospecto válido, como JSON. Esto
  // es lo que evita pegar contra el límite de tamaño de body de Vercel con
  // archivos de varios MB: lo que viaja es el resultado ya filtrado, no el
  // binario crudo.
  if (req.headers.get('content-type')?.includes('application/json')) {
    return manejarFilasJSON(req, supabase, user.id)
  }

  const form = await req.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 })
  }

  // Cada importación queda registrada como una búsqueda con el nombre del
  // archivo, para poder ver después "de qué importación vino esta empresa"
  // en la Bandeja — ver 0013_busquedas.sql.
  const { data: busqueda, error: busquedaError } = await supabase
    .from('busquedas')
    .insert([{ consultor_id: user.id, nombre: archivo.name, origen: 'csv' }])
    .select('id')
    .single()
  if (busquedaError || !busqueda) {
    return NextResponse.json(
      { ok: false, error: `No se pudo registrar la búsqueda: ${busquedaError?.message}` },
      { status: 500 }
    )
  }
  const busquedaId = busqueda.id

  const nombreArchivo = archivo.name.toLowerCase()
  const buffer = Buffer.from(await archivo.arrayBuffer())

  let filasCrudas: Record<string, unknown>[]

  if (nombreArchivo.endsWith('.csv')) {
    const texto = buffer.toString('utf-8')
    const resultado = Papa.parse<Record<string, unknown>>(texto, { header: true, skipEmptyLines: true })
    filasCrudas = resultado.data
  } else if (nombreArchivo.endsWith('.xlsx') || nombreArchivo.endsWith('.xls')) {
    const libro = XLSX.read(buffer, { type: 'buffer' })
    const hoja = libro.Sheets[libro.SheetNames[0]]
    filasCrudas = XLSX.utils.sheet_to_json(hoja, { defval: null })
  } else if (nombreArchivo.endsWith('.pdf')) {
    let texto: string
    try {
      // Import diferido a propósito: pdf-parse (vía pdfjs-dist) intenta usar
      // DOMMatrix/Path2D/ImageData, que no existen en el runtime de Node de
      // Vercel sin el paquete opcional @napi-rs/canvas — y falla al cargar el
      // módulo, no solo al usarlo. Con el import estático al tope del
      // archivo, ESE fallo rompía la ruta completa para CUALQUIER subida
      // (csv/xlsx incluidos, que nunca tocan este código). Cargar pdf-parse
      // solo acá adentro hace que ese fallo quede contenido al intentar
      // subir un PDF específicamente, en vez de tumbar todo el importador.
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      const resultado = await parser.getText()
      await parser.destroy()
      texto = resultado.text
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: `No se pudo leer el PDF: ${e}` },
        { status: 400 }
      )
    }
    let extraidos
    try {
      extraidos = await extraerConReintentos(texto.slice(0, MAX_CHARS_PDF), '')
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: `Error extrayendo prospectos del PDF: ${e}` },
        { status: 502 }
      )
    }
    filasCrudas = extraidos.map(p => ({
      nombre: p.nombre,
      telefono: p.telefono,
      email: p.email,
      representante: p.representante,
      facturacion: p.facturacion,
      descripcion: p.descripcion,
    }))
  } else {
    return NextResponse.json(
      { ok: false, error: 'Formato no soportado — usa .xlsx, .csv o .pdf' },
      { status: 400 }
    )
  }

  const filasLeidas = filasCrudas.length
  const candidatos = filasCrudas.map(mapearFilaAutomatico).filter((f): f is FilaMapeada => f !== null)
  const fallidos = filasLeidas - candidatos.length

  const { nuevos, duplicados } = await insertarCandidatos(supabase, candidatos, busquedaId)

  return NextResponse.json({ ok: true, filasLeidas, nuevos, duplicados, fallidos, busquedaId })
}
