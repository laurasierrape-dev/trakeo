import { describe, it, expect } from 'vitest'
import { calcularColas, colaMasUrgente, totalPendientes, type ContactoParaColas } from './dashboardColas'

const HOY = '2026-10-31'
const AYER = '2026-10-30'
const MANANA = '2026-11-01'

function contacto(overrides: Partial<ContactoParaColas> = {}): ContactoParaColas {
  return { estado: 'activo', temperatura: 'frio', proximo_toque: null, ...overrides }
}

describe('calcularColas', () => {
  it('todo en cero cuando no hay nada pendiente', () => {
    const colas = calcularColas({ porRevisar: 0, contactos: [], hoyISO: HOY })
    expect(colas).toEqual({ porRevisar: 0, toqueVencido: 0, interesadoSinProximoPaso: 0 })
  })

  it('porRevisar pasa directo, sin tocar contactos', () => {
    const colas = calcularColas({ porRevisar: 38, contactos: [], hoyISO: HOY })
    expect(colas.porRevisar).toBe(38)
  })

  it('un toque de ayer cuenta como vencido', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ proximo_toque: AYER })],
      hoyISO: HOY,
    })
    expect(colas.toqueVencido).toBe(1)
  })

  it('un toque programado para HOY todavía no está vencido', () => {
    // Decisión de diseño: "vencido" es estrictamente anterior a hoy. Un
    // toque que vence hoy todavía se puede hacer hoy — no es un pendiente
    // atrasado, es el trabajo del día.
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ proximo_toque: HOY })],
      hoyISO: HOY,
    })
    expect(colas.toqueVencido).toBe(0)
  })

  it('un toque de mañana no cuenta como vencido', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ proximo_toque: MANANA })],
      hoyISO: HOY,
    })
    expect(colas.toqueVencido).toBe(0)
  })

  it('un contacto descartado con toque vencido no cuenta', () => {
    // Si ya se descartó, el toque programado es ruido histórico, no un
    // pendiente — descartarContacto no borra proximo_toque.
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ estado: 'descartado', proximo_toque: AYER })],
      hoyISO: HOY,
    })
    expect(colas.toqueVencido).toBe(0)
  })

  it('un interesado activo sin próximo toque cuenta como sin próximo paso', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ temperatura: 'interesado', proximo_toque: null })],
      hoyISO: HOY,
    })
    expect(colas.interesadoSinProximoPaso).toBe(1)
  })

  it('un interesado CON próximo toque no cuenta como sin próximo paso', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ temperatura: 'interesado', proximo_toque: MANANA })],
      hoyISO: HOY,
    })
    expect(colas.interesadoSinProximoPaso).toBe(0)
  })

  it('frío o vinculado sin próximo toque NO cuentan — la cola es solo para interesados', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [
        contacto({ temperatura: 'frio', proximo_toque: null }),
        contacto({ temperatura: 'vinculado', proximo_toque: null }),
      ],
      hoyISO: HOY,
    })
    expect(colas.interesadoSinProximoPaso).toBe(0)
  })

  it('un interesado descartado sin próximo toque no cuenta', () => {
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ estado: 'descartado', temperatura: 'interesado', proximo_toque: null })],
      hoyISO: HOY,
    })
    expect(colas.interesadoSinProximoPaso).toBe(0)
  })

  it('un interesado con toque vencido cuenta en vencido, no en sin-próximo-paso', () => {
    // Las dos colas son mutuamente excluyentes por construcción: si hay
    // proximo_toque (aunque esté vencido), ya no es "sin próximo paso".
    const colas = calcularColas({
      porRevisar: 0,
      contactos: [contacto({ temperatura: 'interesado', proximo_toque: AYER })],
      hoyISO: HOY,
    })
    expect(colas.toqueVencido).toBe(1)
    expect(colas.interesadoSinProximoPaso).toBe(0)
  })

  it('caso realista: mezcla de contactos con conteos exactos', () => {
    const colas = calcularColas({
      porRevisar: 38,
      contactos: [
        contacto({ proximo_toque: AYER }), // vencido
        contacto({ proximo_toque: AYER }), // vencido
        contacto({ temperatura: 'interesado', proximo_toque: null }), // sin próximo paso
        contacto({ temperatura: 'interesado', proximo_toque: MANANA }), // ninguna cola
        contacto({ estado: 'descartado', proximo_toque: AYER }), // ignorado
        contacto({ temperatura: 'frio', proximo_toque: null }), // ninguna cola
      ],
      hoyISO: HOY,
    })
    expect(colas).toEqual({ porRevisar: 38, toqueVencido: 2, interesadoSinProximoPaso: 1 })
  })
})

describe('colaMasUrgente', () => {
  it('null cuando todo está en cero — estado "al día"', () => {
    expect(colaMasUrgente({ porRevisar: 0, toqueVencido: 0, interesadoSinProximoPaso: 0 })).toBeNull()
  })

  it('porRevisar tiene la prioridad más alta', () => {
    expect(
      colaMasUrgente({ porRevisar: 1, toqueVencido: 5, interesadoSinProximoPaso: 5 })
    ).toBe('porRevisar')
  })

  it('toqueVencido gana sobre interesadoSinProximoPaso cuando no hay nada por revisar', () => {
    expect(
      colaMasUrgente({ porRevisar: 0, toqueVencido: 1, interesadoSinProximoPaso: 1 })
    ).toBe('toqueVencido')
  })

  it('interesadoSinProximoPaso es el último recurso', () => {
    expect(
      colaMasUrgente({ porRevisar: 0, toqueVencido: 0, interesadoSinProximoPaso: 1 })
    ).toBe('interesadoSinProximoPaso')
  })
})

describe('totalPendientes', () => {
  it('suma las tres colas', () => {
    expect(totalPendientes({ porRevisar: 38, toqueVencido: 1, interesadoSinProximoPaso: 1 })).toBe(40)
  })

  it('cero cuando todo está vacío', () => {
    expect(totalPendientes({ porRevisar: 0, toqueVencido: 0, interesadoSinProximoPaso: 0 })).toBe(0)
  })
})
