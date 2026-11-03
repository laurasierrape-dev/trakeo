import { describe, expect, it } from 'vitest'
import { parsearPaginacion, TAMANOS_PAGINA } from './colaRevision'

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
