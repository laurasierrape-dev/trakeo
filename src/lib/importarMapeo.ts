// Lógica de mapeo de columnas para la importación de bases (CSV/XLSX),
// compartida entre el cliente (preview + sugerencia de mapeo antes de subir)
// y el servidor (inserción final). Nada acá depende de Node ni del browser
// específicamente, así que puede importarse desde ambos lados.

export const CAMPOS_DESTINO = [
  { id: 'razon_social', label: 'Razón social', requerido: true },
  { id: 'nit', label: 'NIT', requerido: false },
  { id: 'representante', label: 'Representante', requerido: false },
  { id: 'telefono', label: 'Teléfono', requerido: false },
  { id: 'email', label: 'Email', requerido: false },
  { id: 'sector', label: 'Sector', requerido: false },
  { id: 'ingresos_miles', label: 'Ingresos (miles)', requerido: false },
  { id: 'descripcion', label: 'Descripción', requerido: false },
] as const

export type CampoDestino = (typeof CAMPOS_DESTINO)[number]['id']

// Sugerencias automáticas de mapeo — las bases reales (ej. la descarga de
// RUES, o exports de Orbis/Bureau van Dijk) casi nunca usan los mismos
// nombres de columna que nuestro esquema. Esto es solo el punto de partida:
// el usuario confirma o corrige cada columna antes de importar, así que no
// hace falta que adivine perfecto.
const SINONIMOS: Record<CampoDestino, string[]> = {
  razon_social: ['razon social', 'razón social', 'nombre', 'empresa', 'nombre empresa', 'nombre de la empresa', 'razonsocial'],
  nit: ['nit', 'identificacion', 'identificación', 'documento', 'numero de identificacion'],
  representante: ['representante', 'representante legal', 'rep legal'],
  telefono: ['telefono', 'teléfono', 'tel', 'celular', 'telefonos', 'teléfonos'],
  email: ['correo', 'email', 'e-mail', 'correo electronico', 'correo electrónico'],
  sector: ['sector', 'ciiu', 'actividad', 'actividad economica', 'actividad económica'],
  ingresos_miles: ['facturacion', 'facturación', 'ingresos', 'ventas', 'ventas anuales'],
  descripcion: ['descripcion', 'descripción', 'objeto social'],
}

export function normalizar(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// La columna real es numeric — se extraen solo los dígitos (ignora
// separadores de miles/moneda como "$1.500.000"). Si no queda ningún
// dígito, el texto original se guarda en datos_extra en vez de perderse.
export function parseIngresos(texto: string): number | null {
  const soloDigitos = texto.replace(/[^\d]/g, '')
  return soloDigitos ? Number(soloDigitos) : null
}

export type FilaMapeada = {
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

// Mapeo columna original -> campo destino (o null si la columna no se usa).
export type Mapeo = Record<string, CampoDestino | null>

// Para cada encabezado detectado, sugiere a qué campo mapearlo según el
// diccionario de sinónimos — ya no se evalúa fila por fila como antes
// (la columna se decide una sola vez, no 46,000 veces), y queda disponible
// como punto de partida editable en la UI de mapeo.
export function sugerirMapeo(headers: string[]): Mapeo {
  const mapeo: Mapeo = {}
  const usados = new Set<CampoDestino>()
  for (const header of headers) {
    const headerNorm = normalizar(String(header ?? ''))
    let campo: CampoDestino | null = null
    for (const [destino, sinonimos] of Object.entries(SINONIMOS) as [CampoDestino, string[]][]) {
      if (usados.has(destino)) continue
      if (sinonimos.some(s => headerNorm === normalizar(s))) {
        campo = destino
        break
      }
    }
    if (campo) usados.add(campo)
    mapeo[header] = campo
  }
  return mapeo
}

// Mapea una fila cruda (objeto columna original -> valor) usando un mapeo ya
// confirmado — a diferencia del mapeo automático por sinónimos, acá cada
// columna va exactamente a donde el usuario la puso, sin adivinar.
export function mapearFilaConMapeo(
  fila: Record<string, unknown>,
  mapeo: Mapeo
): FilaMapeada | null {
  const mapeada: Partial<Record<CampoDestino, string>> = {}
  const extra: Record<string, string> = {}

  for (const [header, valor] of Object.entries(fila)) {
    if (valor === null || valor === undefined || String(valor).trim() === '') continue
    const valorTexto = String(valor).trim()
    const campo = mapeo[header]
    if (campo) {
      if (!mapeada[campo]) mapeada[campo] = valorTexto
    } else if (campo === undefined) {
      // Columna que no apareció en el mapeo (no debería pasar si el mapeo
      // se construyó desde los mismos headers, pero por si acaso no se
      // pierde el dato).
      extra[header] = valorTexto
    }
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

// Mapeo 100% automático por sinónimos, evaluado fila por fila — se mantiene
// solo para el flujo de PDF (la IA ya devuelve columnas fijas conocidas,
// nunca pasa por la UI de mapeo porque no hay "hoja" ni "encabezados" que
// elegir).
export function mapearFilaAutomatico(fila: Record<string, unknown>): FilaMapeada | null {
  const headers = Object.keys(fila)
  const mapeo = sugerirMapeo(headers)
  return mapearFilaConMapeo(fila, mapeo)
}
