export type Prospecto = {
  id: string
  razon_social: string
  nit: string | null
  representante: string | null
  telefono: string | null
  email: string | null
  sector: string | null
  zona: string | null
  // Nota: la columna real en la base es "ingresos_miles" (numeric), no
  // "facturacion_est" — el nombre original de la migración 0001 quedó
  // desactualizado tras un cambio de esquema hecho fuera de las migraciones.
  ingresos_miles: number | null
  fuente: string | null
  descripcion: string | null
  datos_extra: Record<string, string> | null
  estado: 'sin_revisar' | 'aprobado' | 'descartado'
  created_at: string
}

export type Contacto = {
  id: string
  prospecto_id: string | null
  hallazgo_id: string | null
  proyecto_id: string | null
  nombre_empresa: string
  representante: string | null
  telefono: string | null
  email: string | null
  descripcion: string | null
  temperatura: 'frio' | 'interesado' | 'vinculado'
  proximo_toque: string | null
  notas: string | null
  estado: 'activo' | 'descartado'
  consultor_id: string
  created_at: string
  updated_at: string
}

export type Proyecto = {
  id: string
  consultor_id: string
  nombre: string
  criterios_busqueda: string | null
  created_at: string
}

export type Hallazgo = {
  id: string
  consultor_id: string
  nombre_empresa: string
  representante: string | null
  telefono: string | null
  email: string | null
  descripcion: string | null
  notas: string | null
  estado: 'sin_revisar' | 'aprobado' | 'descartado'
  created_at: string
}

export type Toque = {
  id: string
  contacto_id: string
  canal: 'whatsapp' | 'llamada' | 'email' | 'visita' | null
  resultado: 'no_contesto' | 'cita_agendada' | 'no_interes' | 'interesado' | null
  notas: string | null
  fecha: string
}
