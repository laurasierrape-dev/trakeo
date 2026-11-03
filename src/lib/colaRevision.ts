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
import type { Prospecto } from '@/lib/types'

export const TAMANOS_PAGINA = [15, 50, 100, 1000] as const
export type TamanoPagina = (typeof TAMANOS_PAGINA)[number]
const TAMANO_DEFAULT: TamanoPagina = 50

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
  tamano: number
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

  const { data, count } = await query.order('created_at', { ascending: false }).range(desde, hasta)

  return { prospectos: (data ?? []) as Prospecto[], total: count ?? 0 }
}
