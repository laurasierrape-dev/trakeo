export type Prospecto = {
  id: string
  razon_social: string
  nit: string | null
  representante: string | null
  telefono: string | null
  sector: string | null
  zona: string | null
  facturacion_est: string | null
  fuente: string | null
  estado: 'sin_revisar' | 'aprobado' | 'descartado'
  created_at: string
}

export type Contacto = {
  id: string
  prospecto_id: string | null
  nombre_empresa: string
  representante: string | null
  telefono: string | null
  email: string | null
  temperatura: 'frio' | 'interesado' | 'vinculado'
  proximo_toque: string | null
  notas: string | null
  consultor_id: string
  created_at: string
  updated_at: string
}

export type Toque = {
  id: string
  contacto_id: string
  canal: 'whatsapp' | 'llamada' | 'email' | 'visita' | null
  resultado: 'no_contesto' | 'cita_agendada' | 'no_interes' | 'interesado' | null
  notas: string | null
  fecha: string
}
