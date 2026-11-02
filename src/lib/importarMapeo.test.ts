import { describe, expect, it } from 'vitest'
import { mapearFilaAutomatico, mapearFilaConMapeo, parseIngresos, sugerirMapeo } from './importarMapeo'

describe('sugerirMapeo', () => {
  it('mapea encabezados estándar por sinónimo exacto, sin importar mayúsculas/tildes', () => {
    const mapeo = sugerirMapeo(['Razón Social', 'NIT', 'Teléfono', 'Email'])
    expect(mapeo['Razón Social']).toBe('razon_social')
    expect(mapeo['NIT']).toBe('nit')
    expect(mapeo['Teléfono']).toBe('telefono')
    expect(mapeo['Email']).toBe('email')
  })

  it('deja sin mapear un encabezado que no coincide con ningún sinónimo', () => {
    const mapeo = sugerirMapeo(['Columna rara sin sentido'])
    expect(mapeo['Columna rara sin sentido']).toBeNull()
  })

  it('no detecta encabezados pegados/mal formados de exports reales (ej. Orbis)', () => {
    // "Nombre empresaAlfabeto latino" es un caso real: dos encabezados que
    // el export fusionó en una sola celda. No coincide con el sinónimo
    // exacto "nombre" ni "empresa" — por diseño esto queda para que el
    // usuario lo mapee a mano en el paso de mapeo, no se adivina.
    const mapeo = sugerirMapeo(['Nombre empresaAlfabeto latino'])
    expect(mapeo['Nombre empresaAlfabeto latino']).toBeNull()
  })

  it('solo asigna un campo destino a la primera columna que matchea, no a columnas repetidas', () => {
    const mapeo = sugerirMapeo(['Teléfono', 'Teléfonos'])
    expect(mapeo['Teléfono']).toBe('telefono')
    expect(mapeo['Teléfonos']).toBeNull()
  })
})

describe('mapearFilaConMapeo', () => {
  it('mapea una fila usando el mapeo explícito, sin depender del nombre de columna', () => {
    const mapeo = { 'Columna rara sin sentido': 'razon_social' as const, Tel: 'telefono' as const }
    const resultado = mapearFilaConMapeo({ 'Columna rara sin sentido': 'Acme SAS', Tel: '3001234567' }, mapeo)
    expect(resultado?.razon_social).toBe('Acme SAS')
    expect(resultado?.telefono).toBe('3001234567')
  })

  it('devuelve null si no hay razón social mapeada', () => {
    const mapeo = { Tel: 'telefono' as const }
    const resultado = mapearFilaConMapeo({ Tel: '3001234567' }, mapeo)
    expect(resultado).toBeNull()
  })

  it('una columna marcada "No usar" (campo null) se descarta, no queda en datos_extra', () => {
    const mapeo = { Nombre: 'razon_social' as const, Basura: null }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Basura: 'lo que sea' }, mapeo)
    expect(resultado?.datos_extra).toBeNull()
  })

  it('una columna que no está en el mapeo (no evaluada por el usuario) se preserva en datos_extra', () => {
    const mapeo = { Nombre: 'razon_social' as const }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', 'Columna nueva': 'dato' }, mapeo)
    expect(resultado?.datos_extra).toEqual({ 'Columna nueva': 'dato' })
  })

  it('parsea ingresos con separadores de miles/moneda a solo dígitos', () => {
    const mapeo = { Nombre: 'razon_social' as const, Facturacion: 'ingresos_miles' as const }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Facturacion: '$1.500.000' }, mapeo)
    expect(resultado?.ingresos_miles).toBe(1500000)
  })

  it('si ingresos no tiene ningún dígito, el texto original se guarda en datos_extra en vez de perderse', () => {
    const mapeo = { Nombre: 'razon_social' as const, Facturacion: 'ingresos_miles' as const }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Facturacion: 'n.d.' }, mapeo)
    expect(resultado?.ingresos_miles).toBeNull()
    expect(resultado?.datos_extra).toEqual({ 'ingresos (texto original)': 'n.d.' })
  })

  it('si dos columnas mapean al mismo campo, la primera con valor gana', () => {
    const mapeo = { ColA: 'razon_social' as const, ColB: 'razon_social' as const }
    const resultado = mapearFilaConMapeo({ ColA: 'Primero SAS', ColB: 'Segundo SAS' }, mapeo)
    expect(resultado?.razon_social).toBe('Primero SAS')
  })
})

describe('mapearFilaAutomatico (usado por el flujo de PDF)', () => {
  it('mapea las claves fijas que devuelve la extracción con IA', () => {
    const resultado = mapearFilaAutomatico({
      nombre: 'Acme SAS',
      telefono: '3001234567',
      facturacion: '2.000.000',
    })
    expect(resultado?.razon_social).toBe('Acme SAS')
    expect(resultado?.telefono).toBe('3001234567')
    expect(resultado?.ingresos_miles).toBe(2000000)
  })
})

describe('parseIngresos', () => {
  it('extrae solo dígitos ignorando separadores', () => {
    expect(parseIngresos('$1.500.000')).toBe(1500000)
  })

  it('devuelve null si no hay ningún dígito', () => {
    expect(parseIngresos('n.d.')).toBeNull()
  })
})
