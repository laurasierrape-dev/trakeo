import { describe, it, expect } from 'vitest'
import { tasaAprobacion, formatearTasa } from './busquedaStats'

describe('tasaAprobacion', () => {
  it('null cuando la búsqueda no trajo nada — evita dividir por cero', () => {
    expect(tasaAprobacion(0, 0)).toBeNull()
  })

  it('caso típico: 31 trajo, 6 aprobados', () => {
    expect(tasaAprobacion(31, 6)).toBeCloseTo(0.1935, 4)
  })

  it('100% cuando se aprobó todo', () => {
    expect(tasaAprobacion(10, 10)).toBe(1)
  })

  it('0% cuando no se aprobó nada pero sí trajo resultados', () => {
    expect(tasaAprobacion(10, 0)).toBe(0)
  })

  it('trajo negativo (no debería pasar, pero no debe dividir) también da null', () => {
    expect(tasaAprobacion(-1, 0)).toBeNull()
  })
})

describe('formatearTasa', () => {
  it('— cuando la tasa es null', () => {
    expect(formatearTasa(null)).toBe('—')
  })

  it('redondea 19.35% a 19%', () => {
    expect(formatearTasa(0.1935)).toBe('19%')
  })

  it('redondea hacia arriba en el punto medio (19.5 → 20%)', () => {
    expect(formatearTasa(0.195)).toBe('20%')
  })

  it('100% se muestra entero, sin decimales', () => {
    expect(formatearTasa(1)).toBe('100%')
  })

  it('0% se muestra explícito, no como guion', () => {
    expect(formatearTasa(0)).toBe('0%')
  })
})
