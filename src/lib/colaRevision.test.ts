import { describe, expect, it } from 'vitest'
import { hayFiltrosFacetasActivos, parsearFiltrosFacetas, parsearPaginacion, TAMANOS_PAGINA } from './colaRevision'

describe('parsearPaginacion', () => {
  it('usa página 1 y tamaño 50 por defecto si no viene nada en la URL', () => {
    expect(parsearPaginacion({})).toEqual({ pagina: 1, tamano: 50 })
  })

  it('respeta página y tamaño válidos de la URL', () => {
    expect(parsearPaginacion({ pagina: '3', tamano: '100' })).toEqual({ pagina: 3, tamano: 100 })
  })

  it('cae al default si el tamaño no es una de las opciones permitidas', () => {
    expect(parsearPaginacion({ tamano: '7' })).toEqual({ pagina: 1, tamano: 50 })
  })

  it('cae a página 1 si viene negativa, cero, o no numérica', () => {
    expect(parsearPaginacion({ pagina: '-1' }).pagina).toBe(1)
    expect(parsearPaginacion({ pagina: '0' }).pagina).toBe(1)
    expect(parsearPaginacion({ pagina: 'abc' }).pagina).toBe(1)
  })

  it('acepta cualquiera de los tamaños publicados', () => {
    for (const tamano of TAMANOS_PAGINA) {
      expect(parsearPaginacion({ tamano: String(tamano) }).tamano).toBe(tamano)
    }
  })
})

describe('parsearFiltrosFacetas', () => {
  it('no tiene filtros activos si la URL no trae ningún f_*', () => {
    expect(parsearFiltrosFacetas({ pagina: '2' })).toEqual({ dinamicos: {} })
  })

  it('lee sector y zona de f_sector y f_zona', () => {
    const filtros = parsearFiltrosFacetas({ f_sector: 'Agricultura', f_zona: 'Bogotá' })
    expect(filtros.sector).toBe('Agricultura')
    expect(filtros.zona).toBe('Bogotá')
  })

  it('solo acepta "con"/"sin" para teléfono y email, ignora cualquier otro valor', () => {
    expect(parsearFiltrosFacetas({ f_telefono: 'con' }).telefono).toBe('con')
    expect(parsearFiltrosFacetas({ f_telefono: 'sin' }).telefono).toBe('sin')
    expect(parsearFiltrosFacetas({ f_telefono: 'cualquier-cosa' }).telefono).toBeUndefined()
    expect(parsearFiltrosFacetas({ f_email: 'con' }).email).toBe('con')
  })

  it('trata cualquier f_<algo> que no sea una clave fija como filtro de campo dinámico', () => {
    const filtros = parsearFiltrosFacetas({ f_Ciudad: 'Bogotá', f_Tipo: 'Premium' })
    expect(filtros.dinamicos).toEqual({ Ciudad: 'Bogotá', Tipo: 'Premium' })
  })

  it('ignora valores vacíos y toma el primer valor si la URL repite la misma clave', () => {
    const filtros = parsearFiltrosFacetas({ f_sector: '', f_Ciudad: ['Bogotá', 'Medellín'] })
    expect(filtros.sector).toBeUndefined()
    expect(filtros.dinamicos.Ciudad).toBe('Bogotá')
  })
})

describe('hayFiltrosFacetasActivos', () => {
  it('es falso sin ningún filtro', () => {
    expect(hayFiltrosFacetasActivos({ dinamicos: {} })).toBe(false)
  })

  it('es verdadero si hay al menos un filtro fijo o dinámico', () => {
    expect(hayFiltrosFacetasActivos({ sector: 'Agricultura', dinamicos: {} })).toBe(true)
    expect(hayFiltrosFacetasActivos({ dinamicos: { Ciudad: 'Bogotá' } })).toBe(true)
  })
})
