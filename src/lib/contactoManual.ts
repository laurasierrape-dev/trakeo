// Validación/limpieza para la edición de contactos (Fase 1 de la propuesta
// de Búsquedas: corregir datos importados + crear contactos a mano) —
// separado de actions.ts para poder testearlo sin Supabase.

export const CAMPOS_CONTACTO_EDITABLES = [
  'nombre_empresa',
  'representante',
  'telefono',
  'email',
  'descripcion',
  'notas',
] as const

export type CampoContactoEditable = (typeof CAMPOS_CONTACTO_EDITABLES)[number]

export function esCampoContactoEditable(campo: string): campo is CampoContactoEditable {
  return (CAMPOS_CONTACTO_EDITABLES as readonly string[]).includes(campo)
}

// nombre_empresa es el único campo que no puede quedar vacío — el resto se
// guarda como null si el consultor lo borra (no hay "obligatorio" real para
// representante/teléfono/email/descripción/notas).
export function limpiarValorCampoContacto(campo: CampoContactoEditable, valor: string): string | null {
  const limpio = valor.trim()
  if (campo === 'nombre_empresa' && !limpio) {
    throw new Error('El nombre de la empresa no puede quedar vacío.')
  }
  return limpio || null
}

export type DatosContactoManual = {
  nombre_empresa: string
  representante?: string | null
  telefono?: string | null
  email?: string | null
  descripcion?: string | null
}

export type ContactoManualLimpio = {
  nombre_empresa: string
  representante: string | null
  telefono: string | null
  email: string | null
  descripcion: string | null
}

export function limpiarDatosContactoManual(datos: DatosContactoManual): ContactoManualLimpio {
  const nombre = datos.nombre_empresa.trim()
  if (!nombre) {
    throw new Error('El nombre de la empresa es obligatorio.')
  }
  const texto = (v?: string | null) => (v && v.trim() ? v.trim() : null)
  return {
    nombre_empresa: nombre,
    representante: texto(datos.representante),
    telefono: texto(datos.telefono),
    email: texto(datos.email),
    descripcion: texto(datos.descripcion),
  }
}
