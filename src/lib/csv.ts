export type ColumnaCSV<T> = { key: keyof T; label: string }

export function exportarCSV<T extends Record<string, unknown>>(
  filas: T[],
  columnas: ColumnaCSV<T>[],
  nombreArchivo: string
) {
  const escapar = (valor: unknown) => `"${String(valor ?? '').replace(/"/g, '""')}"`

  const encabezado = columnas.map(c => escapar(c.label)).join(',')
  const cuerpo = filas.map(fila => columnas.map(c => escapar(fila[c.key])).join(','))
  const csv = [encabezado, ...cuerpo].join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
