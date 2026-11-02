// Parseo de archivos CSV/XLSX en el browser — se ejecuta client-side para
// que el usuario pueda elegir hoja y mapear columnas ANTES de que nada se
// suba al servidor. Dos beneficios sobre parsear en la API route: (1) un
// archivo de varias hojas (ej. exports de Orbis, que traen "Resumen de la
// búsqueda" como hoja 1 y los datos reales en la hoja 2) ya no asume
// ciegamente que la hoja 1 es la correcta, y (2) solo las filas que
// terminan mapeando a un prospecto válido viajan al servidor como JSON, en
// vez del archivo crudo completo — esto es lo que evita pegar contra el
// límite de tamaño de body de las funciones serverless de Vercel (~4.5MB)
// con archivos de varios MB que PostgREST/Vercel rechazaban con un 413 que
// el cliente ni siquiera lograba leer como error legible.
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export type HojaInfo = { nombre: string; filas: number }

export type ArchivoTabular = {
  tipo: 'csv' | 'xlsx'
  hojas: HojaInfo[]
  // Heurística simple: la hoja con más filas suele ser la de datos reales,
  // no una hoja de metadata/resumen que algunos exports ponen primero.
  hojaSugerida: string
  obtenerFilas: (hoja: string) => { headers: string[]; filas: Record<string, unknown>[] }
}

export async function leerArchivoTabular(archivo: File): Promise<ArchivoTabular> {
  const nombre = archivo.name.toLowerCase()

  if (nombre.endsWith('.csv')) {
    const texto = await archivo.text()
    const resultado = Papa.parse<Record<string, unknown>>(texto, { header: true, skipEmptyLines: true })
    const headers = resultado.meta.fields ?? []
    const filas = resultado.data
    return {
      tipo: 'csv',
      hojas: [{ nombre: 'CSV', filas: filas.length }],
      hojaSugerida: 'CSV',
      obtenerFilas: () => ({ headers, filas }),
    }
  }

  const buffer = await archivo.arrayBuffer()
  const libro = XLSX.read(buffer, { type: 'array' })
  const hojas: HojaInfo[] = libro.SheetNames.map(nombreHoja => {
    const ws = libro.Sheets[nombreHoja]
    const ref = ws['!ref']
    const filas = ref ? XLSX.utils.decode_range(ref).e.r : 0
    return { nombre: nombreHoja, filas }
  })
  const hojaSugerida = hojas.reduce((mejor, h) => (h.filas > mejor.filas ? h : mejor), hojas[0]).nombre

  return {
    tipo: 'xlsx',
    hojas,
    hojaSugerida,
    obtenerFilas: (hoja: string) => {
      const ws = libro.Sheets[hoja]
      const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null })
      const headerRow = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })[0] as unknown[] | undefined
      const headers = (headerRow ?? []).map(h => String(h ?? '')).filter(h => h !== '')
      return { headers, filas }
    },
  }
}
