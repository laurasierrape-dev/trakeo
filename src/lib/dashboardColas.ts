// Lógica pura de las "colas" de pendientes del Dashboard — separada del
// componente para poder testearla sin levantar Supabase ni React. Las
// fechas se comparan como strings 'YYYY-MM-DD' (formato del input type=date
// y de la columna `date` en Postgres): la comparación lexicográfica de ISO
// dates es segura y evita bugs de zona horaria de `new Date(string)`.

export type ContactoParaColas = {
  estado: 'activo' | 'descartado'
  temperatura: 'frio' | 'interesado' | 'vinculado'
  proximo_toque: string | null
}

export type Colas = {
  porRevisar: number
  toqueVencido: number
  interesadoSinProximoPaso: number
}

export type NombreCola = keyof Colas

// Orden de prioridad para decidir qué cola mostrar abierta por defecto.
const ORDEN_PRIORIDAD: NombreCola[] = ['porRevisar', 'toqueVencido', 'interesadoSinProximoPaso']

export function calcularColas(params: {
  porRevisar: number
  contactos: ContactoParaColas[]
  hoyISO: string
}): Colas {
  const { porRevisar, contactos, hoyISO } = params
  const activos = contactos.filter(c => c.estado === 'activo')

  return {
    porRevisar,
    // "Vencido" = la fecha ya pasó. Un toque programado para hoy todavía no
    // está vencido, vence hoy — por eso es estrictamente anterior, no <=.
    toqueVencido: activos.filter(c => c.proximo_toque !== null && c.proximo_toque < hoyISO).length,
    interesadoSinProximoPaso: activos.filter(
      c => c.temperatura === 'interesado' && c.proximo_toque === null
    ).length,
  }
}

// La cola con la que abre la pantalla: la de mayor prioridad que tenga algo
// pendiente. null cuando todo está en cero (estado "al día").
export function colaMasUrgente(colas: Colas): NombreCola | null {
  return ORDEN_PRIORIDAD.find(nombre => colas[nombre] > 0) ?? null
}

export function totalPendientes(colas: Colas): number {
  return colas.porRevisar + colas.toqueVencido + colas.interesadoSinProximoPaso
}
