'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Hallazgo, Prospecto } from '@/lib/types'

export async function aprobarProspecto(prospecto: Prospecto) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error: insertError } = await supabase.from('contactos').insert([
    {
      prospecto_id: prospecto.id,
      nombre_empresa: prospecto.razon_social,
      representante: prospecto.representante,
      telefono: prospecto.telefono,
      descripcion: prospecto.descripcion,
      consultor_id: user.id,
    },
  ])
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('prospectos')
    .update({ estado: 'aprobado' })
    .eq('id', prospecto.id)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard')
}

export async function descartarProspecto(prospectoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('prospectos')
    .update({ estado: 'descartado' })
    .eq('id', prospectoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/prospectos')
}

export async function eliminarContacto(contactoId: string) {
  const supabase = await createClient()

  const { data: contacto, error: fetchError } = await supabase
    .from('contactos')
    .select('prospecto_id, hallazgo_id')
    .eq('id', contactoId)
    .single()
  if (fetchError) throw new Error(fetchError.message)

  if (contacto.prospecto_id) {
    const { error } = await supabase
      .from('prospectos')
      .update({ estado: 'sin_revisar' })
      .eq('id', contacto.prospecto_id)
    if (error) throw new Error(error.message)
  }

  if (contacto.hallazgo_id) {
    const { error } = await supabase
      .from('hallazgos')
      .update({ estado: 'sin_revisar' })
      .eq('id', contacto.hallazgo_id)
    if (error) throw new Error(error.message)
  }

  const { error: deleteError } = await supabase.from('contactos').delete().eq('id', contactoId)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/scraping')
}

export async function aprobarHallazgo(hallazgo: Hallazgo) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error: insertError } = await supabase.from('contactos').insert([
    {
      hallazgo_id: hallazgo.id,
      nombre_empresa: hallazgo.nombre_empresa,
      representante: hallazgo.representante,
      telefono: hallazgo.telefono,
      email: hallazgo.email,
      descripcion: hallazgo.descripcion,
      notas: hallazgo.notas,
      consultor_id: user.id,
    },
  ])
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('hallazgos')
    .update({ estado: 'aprobado' })
    .eq('id', hallazgo.id)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard')
}

export async function descartarHallazgo(hallazgoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hallazgos')
    .update({ estado: 'descartado' })
    .eq('id', hallazgoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/scraping')
}

export async function actualizarTemperatura(
  contactoId: string,
  temperatura: 'frio' | 'interesado' | 'vinculado'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ temperatura, updated_at: new Date().toISOString() })
    .eq('id', contactoId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/contactos/${contactoId}`)
  revalidatePath('/dashboard')
}

export async function actualizarProximoToque(contactoId: string, fecha: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ proximo_toque: fecha, updated_at: new Date().toISOString() })
    .eq('id', contactoId)
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/contactos/${contactoId}`)
  revalidatePath('/dashboard')
}

export async function registrarToque(
  contactoId: string,
  canal: 'whatsapp' | 'llamada' | 'email' | 'visita',
  resultado: 'no_contesto' | 'cita_agendada' | 'no_interes' | 'interesado',
  notas: string
) {
  const supabase = await createClient()
  const { error } = await supabase.from('toques').insert([
    {
      contacto_id: contactoId,
      canal,
      resultado,
      notas: notas.trim() || null,
    },
  ])
  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/contactos/${contactoId}`)
}
