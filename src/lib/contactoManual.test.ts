import { describe, expect, it } from 'vitest'
import {
  esCampoContactoEditable,
  limpiarDatosContactoManual,
  limpiarValorCampoContacto,
} from './contactoManual'

describe('esCampoContactoEditable', () => {
  it('acepta los campos fijos editables', () => {
    expect(esCampoContactoEditable('nombre_empresa')).toBe(true)
    expect(esCampoContactoEditable('notas')).toBe(true)
  })

  it('rechaza nombres de columna que no están en la lista permitida', () => {
    expect(esCampoContactoEditable('consultor_id')).toBe(false)
    expect(esCampoContactoEditable('estado')).toBe(false)
  })
})

describe('limpiarValorCampoContacto', () => {
  it('recorta espacios', () => {
    expect(limpiarValorCampoContacto('representante', '  Juan Pérez  ')).toBe('Juan Pérez')
  })

  it('guarda null si el campo opcional queda vacío', () => {
    expect(limpiarValorCampoContacto('telefono', '   ')).toBeNull()
  })

  it('rechaza nombre_empresa vacío', () => {
    expect(() => limpiarValorCampoContacto('nombre_empresa', '   ')).toThrow()
  })

  it('permite nombre_empresa con contenido', () => {
    expect(limpiarValorCampoContacto('nombre_empresa', 'Acme SAS')).toBe('Acme SAS')
  })
})

describe('limpiarDatosContactoManual', () => {
  it('rechaza si falta el nombre de la empresa', () => {
    expect(() => limpiarDatosContactoManual({ nombre_empresa: '  ' })).toThrow()
  })

  it('arma el objeto limpio con los campos opcionales como null si no vienen', () => {
    expect(limpiarDatosContactoManual({ nombre_empresa: 'Acme SAS' })).toEqual({
      nombre_empresa: 'Acme SAS',
      representante: null,
      telefono: null,
      email: null,
      descripcion: null,
    })
  })

  it('recorta espacios en todos los campos', () => {
    const resultado = limpiarDatosContactoManual({
      nombre_empresa: '  Acme SAS  ',
      representante: ' Juan ',
      telefono: ' 3001234567 ',
      email: '  a@b.com ',
      descripcion: ' texto ',
    })
    expect(resultado).toEqual({
      nombre_empresa: 'Acme SAS',
      representante: 'Juan',
      telefono: '3001234567',
      email: 'a@b.com',
      descripcion: 'texto',
    })
  })
})
