import { NextResponse, type NextRequest } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { PDFParse } from 'pdf-parse'
import { createClient } from '@/lib/supabase/server'
import { extraerConReintentos } from '@/lib/extraccionIA'

// Archivos como el que trajo Andrés (~10,600 filas, hasta ~46,000 con una
// fila por participante) tardan varios segundos en parsear + varios lotes
// de upsert — 60s da margen razonable dentro de lo que Vercel permite.
export const maxDuration = 60

const TAMANO_LOTE = 1_000
// El texto de un PDF puede ser largo; extraerConReintentos ya recorta y
// reintenta si Groq lo rechaza por tamaño, así que este es solo el punto de
// partida (mismo criterio que MAX_CONTENT_CHARS en /api/bookmarklet).
const MAX_CHARS_PDF = 10_000

// Diccionario de sinónimos de encabezados — las bases reales (ej. la
// descarga de RUES que usó Andrés) no siempre usan los mismos nombres de
// columna que nuestro esquema.
const SINONIMOS: Record<string, string[]> = {
  razon_social: ['razon social', 'razón social', 'nombre', 'empresa', 'nombre empresa', 'nombre de la empresa', 'razonsocial'],
  nit: ['nit', 'identificacion', 'identificación', 'documento', 'numero de identificacion'],
  representante: ['representante', 'representante legal', 'rep legal'],
  telefono: ['telefono', 'teléfono', 'tel', 'celular', 'telefonos', 'teléfonos'],
  email: ['correo', 'email', 'e-mail', 'correo electronico', 'correo electrónico'],
  sector: ['sector', 'ciiu', 'actividad', 'actividad economica', 'actividad económica'],
  ingresos_miles: ['facturacion', 'facturación', 'ingresos', 'ventas', 'ventas anuales'],
  descripcion: ['descripcion', 'descripción', 'objeto social'],
}

function normalizar(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// La columna real es numeric — se extraen solo los dígitos (ignora
// separadores de miles/moneda como "$1.500.000"). Si no queda ningún
// dígito, el texto original se guarda en datos_extra en vez de perderse.
function parseIngresos(texto: string): number | null {
  const soloDigitos = texto.replace(/[^\d]/g, '')
  return soloDigitos ? Number(soloDigitos) : null
}

type FilaMapeada = {
  razon_social: string
  nit: string | null
  representante: string | null
  telefono: string | null
  email: string | null
  sector: string | null
  ingresos_miles: number | null
  descripcion: string | null
  fuente: string
  datos_extra: Record<string, string> | null
}

function mapearFila(fila: Record<string, unknown>): FilaMapeada | null {
  const mapeada: Record<string, string> = {}
  const extra: Record<string, string> = {}

  for (const [clave, valor] of Object.entries(fila)) {
    if (valor === null || valor === undefined || String(valor).trim() === '') continue
    const claveNorm = normalizar(String(clave))
    let campo: string | null = null
    for (const [destino, sinonimos] of Object.entries(SINONIMOS)) {
      if (sinonimos.some(s => claveNorm === normalizar(s))) {
        campo = destino
        break
      }
    }
    const valorTexto = String(valor).trim()
    if (campo) mapeada[campo] = valorTexto
    else extra[clave] = valorTexto
  }

  if (!mapeada.razon_social) return null

  const ingresosMiles = mapeada.ingresos_miles ? parseIngresos(mapeada.ingresos_miles) : null
  if (mapeada.ingresos_miles && ingresosMiles === null) {
    extra['ingresos (texto original)'] = mapeada.ingresos_miles
  }

  return {
    razon_social: mapeada.razon_social,
    nit: mapeada.nit ?? null,
    representante: mapeada.representante ?? null,
    telefono: mapeada.telefono ?? null,
    email: mapeada.email ?? null,
    sector: mapeada.sector ?? null,
    ingresos_miles: ingresosMiles,
    descripcion: mapeada.descripcion ?? null,
    fuente: 'importado',
    datos_extra: Object.keys(extra).length > 0 ? extra : null,
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  const form = await req.formData()
  const archivo = form.get('archivo')
  if (!(archivo instanceof File)) {
    return NextResponse.json({ ok: false, error: 'Falta el archivo' }, { status: 400 })
  }

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
  const candidatos = filasCrudas.map(mapearFila).filter((f): f is FilaMapeada => f !== null)
  const fallidos = filasLeidas - candidatos.length

  const conNit = candidatos.filter(c => c.nit)
  const sinNit = candidatos.filter(c => !c.nit)

  let nuevosConNit = 0
  for (let i = 0; i < conNit.length; i += TAMANO_LOTE) {
    const lote = conNit.slice(i, i + TAMANO_LOTE)
    const { data, error } = await supabase
      .from('prospectos')
      .upsert(lote, { onConflict: 'nit', ignoreDuplicates: true })
      .select('id')
    if (!error) nuevosConNit += data?.length ?? 0
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
    const vistosEnBD = new Set((existentes ?? []).map(p => p.razon_social.trim().toLowerCase()))

    const nuevosDelLote = lote.filter(c => {
      const clave = c.razon_social.trim().toLowerCase()
      if (vistosEnBD.has(clave) || vistosEnEsteImport.has(clave)) return false
      vistosEnEsteImport.add(clave)
      return true
    })
    duplicadosSinNit += lote.length - nuevosDelLote.length

    if (nuevosDelLote.length > 0) {
      const { error } = await supabase.from('prospectos').insert(nuevosDelLote)
      if (!error) nuevosSinNit += nuevosDelLote.length
    }
  }

  return NextResponse.json({
    ok: true,
    filasLeidas,
    nuevos: nuevosConNit + nuevosSinNit,
    duplicados: duplicadosConNit + duplicadosSinNit,
    fallidos,
  })
}
