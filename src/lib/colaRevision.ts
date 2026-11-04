// Prospectos y hallazgos "sin revisar" comparten paginación en Dashboard y
// en /dashboard/bandeja (ambas pantallas listan la misma cola) — centralizado
// acá para no duplicar la lógica de rango/conteo en dos server components.
//
// Por qué paginar solo prospectos y no hallazgos: prospectos es el pozo
// común de bases importadas, que puede llegar a miles de filas (una
// importación real trajo 10,666 de una sola vez). hallazgos viene del
// bookmarklet, que en la práctica trae decenas por corrida — no hay
// evidencia de que vaya a crecer al punto de necesitar su propia paginación,
// así que se sigue trayendo completo. Si eso cambia, esta misma función es
// el lugar para agregarle rango también.

import type { createClient } from '@/lib/supabase/server'
import type { CampoPersonalizado } from '@/lib/importarMapeo'
import type { Prospecto } from '@/lib/types'

export const TAMANOS_PAGINA = [15, 50, 100, 1000] as const
export type TamanoPagina = (typeof TAMANOS_PAGINA)[number]
const TAMANO_DEFAULT: TamanoPagina = 50

// Fase 3 de "Datos Desbloqueados": filtros reales sobre los campos fijos
// (sector, zona, teléfono, email) y sobre cualquier campo dinámico ya
// registrado (ver 0015_campos_personalizados.sql) — en vez de solo el
// buscador de texto que ya había, o preguntarle a la IA cada vez.
export type FiltroPresencia = 'con' | 'sin'
export type FiltrosFacetas = {
  sector?: string
  zona?: string
  telefono?: FiltroPresencia
  email?: FiltroPresencia
  dinamicos: Record<string, string>
}
type SearchParamValue = string | string[] | undefined
const CLAVES_FIJAS = ['sector', 'zona', 'telefono', 'email'] as const

// Cada filtro viaja en la URL como "f_<clave>=<valor>" (ej. "f_sector=..."),
// así el filtro sobrevive a recargas y se puede compartir por link — mismo
// patrón que pagina/tamano. Las claves fijas son sector/zona/telefono/email;
// cualquier otra "f_X" se trata como filtro sobre el campo dinámico "X" en
// datos_extra, sin necesidad de conocer de antemano qué campos existen.
export function parsearFiltrosFacetas(searchParams: Record<string, SearchParamValue>): FiltrosFacetas {
  const valorDe = (clave: string): string | undefined => {
    const v = searchParams[clave]
    return typeof v === 'string' && v ? v : Array.isArray(v) && v[0] ? v[0] : undefined
  }

  const filtros: FiltrosFacetas = { dinamicos: {} }
  const sector = valorDe('f_sector')
  if (sector) filtros.sector = sector
  const zona = valorDe('f_zona')
  if (zona) filtros.zona = zona
  const telefono = valorDe('f_telefono')
  if (telefono === 'con' || telefono === 'sin') filtros.telefono = telefono
  const email = valorDe('f_email')
  if (email === 'con' || email === 'sin') filtros.email = email

  for (const clave of Object.keys(searchParams)) {
    if (!clave.startsWith('f_')) continue
    const campo = clave.slice(2)
    if ((CLAVES_FIJAS as readonly string[]).includes(campo)) continue
    const valor = valorDe(clave)
    if (valor) filtros.dinamicos[campo] = valor
  }

  return filtros
}

export function hayFiltrosFacetasActivos(filtros: FiltrosFacetas): boolean {
  return !!(filtros.sector || filtros.zona || filtros.telefono || filtros.email || Object.keys(filtros.dinamicos).length > 0)
}

export function parsearPaginacion(searchParams: { pagina?: string; tamano?: string }) {
  const tamanoParseado = Number(searchParams.tamano)
  const tamano: TamanoPagina = TAMANOS_PAGINA.includes(tamanoParseado as TamanoPagina)
    ? (tamanoParseado as TamanoPagina)
    : TAMANO_DEFAULT

  const paginaParseada = Number(searchParams.pagina)
  const pagina = Number.isInteger(paginaParseada) && paginaParseada > 0 ? paginaParseada : 1

  return { pagina, tamano }
}

// Trae una página de prospectos sin revisar por el consultor actual (el
// triaje es por consultor — ver 0011_prospectos_estado_por_consultor.sql),
// más el total real (no capado a los 1000 que Supabase devuelve por
// defecto si no se pide un count explícito).
export async function obtenerProspectosSinRevisarPaginados(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pagina: number,
  tamano: number,
  filtros: FiltrosFacetas = { dinamicos: {} }
) {
  const { data: estados } = await supabase.from('prospectos_estado').select('prospecto_id')
  const idsRevisados: string[] = (estados ?? []).map((e: { prospecto_id: string }) => e.prospecto_id)

  const desde = (pagina - 1) * tamano
  const hasta = desde + tamano - 1

  let query = supabase
    .from('prospectos')
    .select('*', { count: 'exact' })
  if (idsRevisados.length > 0) {
    query = query.not('id', 'in', `(${idsRevisados.join(',')})`)
  }

  if (filtros.sector) query = query.eq('sector', filtros.sector)
  if (filtros.zona) query = query.eq('zona', filtros.zona)
  if (filtros.telefono === 'con') query = query.not('telefono', 'is', null).neq('telefono', '')
  if (filtros.telefono === 'sin') query = query.or('telefono.is.null,telefono.eq.')
  if (filtros.email === 'con') query = query.not('email', 'is', null).neq('email', '')
  if (filtros.email === 'sin') query = query.or('email.is.null,email.eq.')
  // Campos dinámicos viven en datos_extra (jsonb), keyeados por el nombre
  // canónico del campo (ver Fase 2) — PostgREST soporta filtrar directo
  // sobre el valor de una llave con la sintaxis "columna->>llave".
  for (const [campo, valor] of Object.entries(filtros.dinamicos)) {
    query = query.eq(`datos_extra->>${campo}`, valor)
  }

  const { data, count } = await query.order('created_at', { ascending: false }).range(desde, hasta)

  return { prospectos: (data ?? []) as Prospecto[], total: count ?? 0 }
}

export type OpcionesFacetas = {
  sectores: string[]
  zonas: string[]
  dinamicos: Record<string, string[]>
}

// Opciones disponibles para la barra de filtros: valores distintos de
// sector/zona y de cada campo dinámico, calculados sobre el mismo pozo de
// "sin revisar" que ve el consultor — así nunca se ofrece un filtro que no
// devolvería nada. Se trae sector/zona/datos_extra (no la fila completa) de
// todo el pozo sin paginar para poder deduplicar; con el volumen actual
// (decenas de miles de filas) es aceptable. Si el pozo sigue creciendo, la
// alternativa es precalcular esto en una tabla/vista aparte en vez de
// recorrerlo en cada carga de Bandeja — deliberadamente no se construye esa
// vista todavía porque campos_personalizados ni siquiera tiene tipos/índices
// (ver nota de Fase 2 en 0015_campos_personalizados.sql).
export async function obtenerOpcionesFacetas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  camposPersonalizados: CampoPersonalizado[]
): Promise<OpcionesFacetas> {
  const { data: estados } = await supabase.from('prospectos_estado').select('prospecto_id')
  const idsRevisados: string[] = (estados ?? []).map((e: { prospecto_id: string }) => e.prospecto_id)

  let query = supabase.from('prospectos').select('sector, zona, datos_extra')
  if (idsRevisados.length > 0) {
    query = query.not('id', 'in', `(${idsRevisados.join(',')})`)
  }
  const { data } = await query

  const sectores = new Set<string>()
  const zonas = new Set<string>()
  const dinamicos = new Map<string, Set<string>>()
  for (const c of camposPersonalizados) dinamicos.set(c.nombre, new Set())

  for (const p of (data ?? []) as { sector: string | null; zona: string | null; datos_extra: Record<string, string> | null }[]) {
    if (p.sector) sectores.add(p.sector)
    if (p.zona) zonas.add(p.zona)
    if (p.datos_extra) {
      for (const [campo, valor] of Object.entries(p.datos_extra)) {
        if (!valor) continue
        if (!dinamicos.has(campo)) dinamicos.set(campo, new Set())
        dinamicos.get(campo)!.add(valor)
      }
    }
  }

  return {
    sectores: [...sectores].sort(),
    zonas: [...zonas].sort(),
    dinamicos: Object.fromEntries([...dinamicos].map(([campo, valores]) => [campo, [...valores].sort()])),
  }
}
