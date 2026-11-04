import { describe, expect, it } from 'vitest'
import {
  mapearFilaAutomatico,
  mapearFilaConMapeo,
  parseIngresos,
  sugerirMapeo,
  type CampoPersonalizado,
  type Mapeo,
} from './importarMapeo'

const fijo = (campo: 'razon_social' | 'nit' | 'representante' | 'telefono' | 'email' | 'sector' | 'ingresos_miles' | 'descripcion') =>
  ({ tipo: 'fijo' as const, campo })
const dinamico = (nombre: string) => ({ tipo: 'dinamico' as const, nombre })

describe('sugerirMapeo', () => {
  it('mapea encabezados estándar por sinónimo exacto, sin importar mayúsculas/tildes', () => {
    const mapeo = sugerirMapeo(['Razón Social', 'NIT', 'Teléfono', 'Email'])
    expect(mapeo['Razón Social']).toEqual(fijo('razon_social'))
    expect(mapeo['NIT']).toEqual(fijo('nit'))
    expect(mapeo['Teléfono']).toEqual(fijo('telefono'))
    expect(mapeo['Email']).toEqual(fijo('email'))
  })

  it('deja sin mapear un encabezado que no coincide con ningún sinónimo ni campo personalizado', () => {
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

  it('solo asigna un campo fijo a la primera columna que matchea, no a columnas repetidas', () => {
    const mapeo = sugerirMapeo(['Teléfono', 'Teléfonos'])
    expect(mapeo['Teléfono']).toEqual(fijo('telefono'))
    expect(mapeo['Teléfonos']).toBeNull()
  })

  it('sugiere un campo personalizado existente por sinónimo ya aprendido', () => {
    const campos: CampoPersonalizado[] = [{ id: '1', nombre: 'Ciudad', sinonimos: ['city', 'ciudad'] }]
    const mapeo = sugerirMapeo(['City'], campos)
    expect(mapeo['City']).toEqual(dinamico('Ciudad'))
  })

  it('sugiere un campo personalizado por coincidencia directa con su nombre, aunque no tenga ese sinónimo todavía', () => {
    const campos: CampoPersonalizado[] = [{ id: '1', nombre: 'Ciudad', sinonimos: [] }]
    const mapeo = sugerirMapeo(['Ciudad'], campos)
    expect(mapeo['Ciudad']).toEqual(dinamico('Ciudad'))
  })

  it('los campos fijos tienen prioridad sobre los personalizados si ambos matchean', () => {
    const campos: CampoPersonalizado[] = [{ id: '1', nombre: 'Email', sinonimos: ['email'] }]
    const mapeo = sugerirMapeo(['Email'], campos)
    expect(mapeo['Email']).toEqual(fijo('email'))
  })
})

describe('mapearFilaConMapeo', () => {
  it('mapea una fila usando el mapeo explícito, sin depender del nombre de columna', () => {
    const mapeo: Mapeo = { 'Columna rara sin sentido': fijo('razon_social'), Tel: fijo('telefono') }
    const resultado = mapearFilaConMapeo({ 'Columna rara sin sentido': 'Acme SAS', Tel: '3001234567' }, mapeo)
    expect(resultado?.razon_social).toBe('Acme SAS')
    expect(resultado?.telefono).toBe('3001234567')
  })

  it('devuelve null si no hay razón social mapeada', () => {
    const mapeo: Mapeo = { Tel: fijo('telefono') }
    const resultado = mapearFilaConMapeo({ Tel: '3001234567' }, mapeo)
    expect(resultado).toBeNull()
  })

  it('una columna marcada "No usar" (destino null) se descarta, no queda en datos_extra', () => {
    const mapeo: Mapeo = { Nombre: fijo('razon_social'), Basura: null }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Basura: 'lo que sea' }, mapeo)
    expect(resultado?.datos_extra).toBeNull()
  })

  it('una columna que no está en el mapeo (no evaluada por el usuario) se preserva en datos_extra', () => {
    const mapeo: Mapeo = { Nombre: fijo('razon_social') }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', 'Columna nueva': 'dato' }, mapeo)
    expect(resultado?.datos_extra).toEqual({ 'Columna nueva': 'dato' })
  })

  it('parsea ingresos con separadores de miles/moneda a solo dígitos', () => {
    const mapeo: Mapeo = { Nombre: fijo('razon_social'), Facturacion: fijo('ingresos_miles') }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Facturacion: '$1.500.000' }, mapeo)
    expect(resultado?.ingresos_miles).toBe(1500000)
  })

  it('si ingresos no tiene ningún dígito, el texto original se guarda en datos_extra en vez de perderse', () => {
    const mapeo: Mapeo = { Nombre: fijo('razon_social'), Facturacion: fijo('ingresos_miles') }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', Facturacion: 'n.d.' }, mapeo)
    expect(resultado?.ingresos_miles).toBeNull()
    expect(resultado?.datos_extra).toEqual({ 'ingresos (texto original)': 'n.d.' })
  })

  it('si dos columnas mapean al mismo campo fijo, la primera con valor gana', () => {
    const mapeo: Mapeo = { ColA: fijo('razon_social'), ColB: fijo('razon_social') }
    const resultado = mapearFilaConMapeo({ ColA: 'Primero SAS', ColB: 'Segundo SAS' }, mapeo)
    expect(resultado?.razon_social).toBe('Primero SAS')
  })

  it('una columna mapeada a un campo personalizado va a datos_extra con el nombre canónico del campo', () => {
    const mapeo: Mapeo = { Nombre: fijo('razon_social'), City: dinamico('Ciudad') }
    const resultado = mapearFilaConMapeo({ Nombre: 'Acme SAS', City: 'Bogotá' }, mapeo)
    expect(resultado?.datos_extra).toEqual({ Ciudad: 'Bogotá' })
  })

  it('dos columnas de archivos distintos mapeadas al mismo campo personalizado usan la misma llave', () => {
    const mapeoArchivo1: Mapeo = { Nombre: fijo('razon_social'), City: dinamico('Ciudad') }
    const mapeoArchivo2: Mapeo = { Nombre: fijo('razon_social'), CIUDAD: dinamico('Ciudad') }
    const r1 = mapearFilaConMapeo({ Nombre: 'Acme SAS', City: 'Bogotá' }, mapeoArchivo1)
    const r2 = mapearFilaConMapeo({ Nombre: 'Otra SAS', CIUDAD: 'Medellín' }, mapeoArchivo2)
    expect(Object.keys(r1?.datos_extra ?? {})).toEqual(['Ciudad'])
    expect(Object.keys(r2?.datos_extra ?? {})).toEqual(['Ciudad'])
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
