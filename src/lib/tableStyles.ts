// Tokens compartidos para las tablas de Contactos, Prospectos y Hallazgos.
// Centralizados acá para que ajustar la jerarquía visual no signifique tocar
// los mismos valores en 3 archivos distintos.

import type { CSSProperties } from 'react'

export const tablaContenedorStyle = {
  backgroundColor: 'white',
  border: '1px solid #0d2e2314',
  boxShadow: '0 1px 2px #0d2e2308',
}

export const tablaHeaderRowStyle = {
  borderBottom: '1px solid #0d2e2318',
  backgroundColor: '#0d2e2306',
}

export const tablaHeaderCellClass =
  'text-left font-semibold px-4 py-3 text-[11px] uppercase tracking-wider whitespace-nowrap'

export const tablaHeaderCellStyle = {
  color: '#0d2e2365',
  letterSpacing: '0.04em',
}

export const tablaRowStyle = {
  borderBottom: '1px solid #0d2e230d',
}

export const tablaCellPrimaryClass = 'px-4 py-3.5 text-[13.5px] font-semibold'
export const tablaCellPrimaryStyle = { color: '#0d2e23' }

export const tablaCellClass = 'px-4 py-3.5 text-[13.5px]'
export const tablaCellStyle = { color: '#0d2e2378' }

export function pillEstilo(tono: 'activo' | 'suave' | 'neutro'): CSSProperties {
  switch (tono) {
    case 'activo':
      return { backgroundColor: '#c5f54a', color: '#0d2e23' }
    case 'suave':
      return { backgroundColor: '#c5f54a35', color: '#5a7a1f' }
    default:
      return { backgroundColor: '#0d2e230c', color: '#0d2e2380' }
  }
}

export const pillClass = 'text-[11.5px] px-2.5 py-1 rounded-full font-semibold tracking-wide'
