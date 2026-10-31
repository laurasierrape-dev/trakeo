// Tasa de aprobación de una búsqueda: de lo que trajo, cuánto pasó el
// triaje. Función pura para poder testear los bordes (cero resultados,
// redondeo) sin tocar Supabase.

export function tasaAprobacion(trajo: number, aprobados: number): number | null {
  if (trajo <= 0) return null
  return aprobados / trajo
}

export function formatearTasa(tasa: number | null): string {
  if (tasa === null) return '—'
  return `${Math.round(tasa * 100)}%`
}
