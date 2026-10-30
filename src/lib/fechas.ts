// Formateadores con locale y zona horaria fijas para que el render del
// servidor y el del navegador produzcan exactamente el mismo texto.
// Sin esto, React falla la hidratación y la página queda sin interactividad.

const FECHA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatearFecha(valor: string | Date) {
  return FECHA.format(new Date(valor))
}

export function formatearFechaHora(valor: string | Date) {
  return FECHA_HORA.format(new Date(valor))
}
