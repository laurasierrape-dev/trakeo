'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Hallazgo, Prospecto } from '@/lib/types'

// HU-04: al abrir el detalle de un prospecto o hallazgo, busca coincidencias
// por nombre exacto (sin distinguir mayúsculas) en la otra tabla — el
// "resumen" que junta lo encontrado por scraping con lo que ya existe en
// las bases importadas del consultor.
export async function buscarCoincidencias(
  nombreEmpresa: string,
  excluir: { prospectoId?: string; hallazgoId?: string }
) {
  const supabase = await createClient()
  const nombre = nombreEmpresa.trim()
  if (!nombre) return { prospectos: [] as Prospecto[], hallazgos: [] as Hallazgo[] }

  const [{ data: prospectos }, { data: hallazgos }] = await Promise.all([
    supabase.from('prospectos').select('*').ilike('razon_social', nombre),
    supabase.from('hallazgos').select('*').ilike('nombre_empresa', nombre),
  ])

  return {
    prospectos: ((prospectos as Prospecto[] | null) ?? []).filter(p => p.id !== excluir.prospectoId),
    hallazgos: ((hallazgos as Hallazgo[] | null) ?? []).filter(h => h.id !== excluir.hallazgoId),
  }
}

export async function crearProyecto(nombre: string, criterios: string, color?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('proyectos').insert([
    {
      nombre: nombre.trim(),
      criterios_busqueda: criterios.trim() || null,
      color: color || undefined,
      consultor_id: user.id,
    },
  ])
  if (error) {
    // El índice único (consultor_id, lower(nombre)) da un mensaje técnico de
    // Postgres — se traduce a algo que el usuario entienda.
    if (error.message.includes('proyectos_nombre_unico')) {
      throw new Error('Ya tienes un proyecto con ese nombre.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard/proyectos')
}

export async function renombrarProyecto(proyectoId: string, nombre: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('proyectos')
    .update({ nombre: nombre.trim() })
    .eq('id', proyectoId)
    .eq('consultor_id', user.id)
  if (error) {
    if (error.message.includes('proyectos_nombre_unico')) {
      throw new Error('Ya tienes un proyecto con ese nombre.')
    }
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/proyectos')
  revalidatePath('/dashboard/contactos')
}

// Eliminar un proyecto nunca borra contactos: si tenía alguno asignado, hay
// que decidir qué hacer con ellos primero — moverlos a otro proyecto
// (moverAProyectoId) o dejarlos sin proyecto (null).
export async function eliminarProyecto(proyectoId: string, moverAProyectoId: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error: moveError } = await supabase
    .from('contactos')
    .update({ proyecto_id: moverAProyectoId })
    .eq('proyecto_id', proyectoId)
    .eq('consultor_id', user.id)
  if (moveError) throw new Error(moveError.message)

  const { error } = await supabase
    .from('proyectos')
    .delete()
    .eq('id', proyectoId)
    .eq('consultor_id', user.id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/proyectos')
  revalidatePath('/dashboard/contactos')
}

export async function aprobarProspecto(prospecto: Prospecto, proyectoId?: string | null) {
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
      email: prospecto.email,
      descripcion: prospecto.descripcion,
      proyecto_id: proyectoId || null,
      consultor_id: user.id,
    },
  ])
  if (insertError) throw new Error(insertError.message)

  const { error: estadoError } = await supabase
    .from('prospectos_estado')
    .upsert([{ prospecto_id: prospecto.id, consultor_id: user.id, estado: 'aprobado' }])
  if (estadoError) throw new Error(estadoError.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard')
}

export async function descartarProspecto(prospectoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase
    .from('prospectos_estado')
    .upsert([{ prospecto_id: prospectoId, consultor_id: user.id, estado: 'descartado' }])
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard')
}

export async function aprobarProspectosMasivo(prospectos: Prospecto[], proyectoId?: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error: insertError } = await supabase.from('contactos').insert(
    prospectos.map(p => ({
      prospecto_id: p.id,
      nombre_empresa: p.razon_social,
      representante: p.representante,
      telefono: p.telefono,
      email: p.email,
      descripcion: p.descripcion,
      proyecto_id: proyectoId || null,
      consultor_id: user.id,
    }))
  )
  if (insertError) throw new Error(insertError.message)

  const { error: estadoError } = await supabase.from('prospectos_estado').upsert(
    prospectos.map(p => ({ prospecto_id: p.id, consultor_id: user.id, estado: 'aprobado' as const }))
  )
  if (estadoError) throw new Error(estadoError.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard')
}

export async function descartarProspectosMasivo(ids: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error } = await supabase.from('prospectos_estado').upsert(
    ids.map(id => ({ prospecto_id: id, consultor_id: user.id, estado: 'descartado' as const }))
  )
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard')
}

// Descartar un contacto (ej. tras un toque que no llevó a nada) lo saca de
// la vista activa del pipeline sin perder su historial de toques ni
// revertir el prospecto/hallazgo de origen a revisión — a diferencia de
// eliminarContacto, que sí deshace la aprobación por completo. Es
// reversible vía reactivarContacto.
export async function descartarContacto(contactoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ estado: 'descartado', updated_at: new Date().toISOString() })
    .eq('id', contactoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/contactos')
  revalidatePath(`/dashboard/contactos/${contactoId}`)
}

export async function reactivarContacto(contactoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ estado: 'activo', updated_at: new Date().toISOString() })
    .eq('id', contactoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/contactos')
  revalidatePath(`/dashboard/contactos/${contactoId}`)
}

export async function descartarContactosMasivo(contactoIds: string[]) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ estado: 'descartado', updated_at: new Date().toISOString() })
    .in('id', contactoIds)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/contactos')
}

export async function asignarProyecto(contactoId: string, proyectoId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ proyecto_id: proyectoId, updated_at: new Date().toISOString() })
    .eq('id', contactoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/contactos')
  revalidatePath(`/dashboard/contactos/${contactoId}`)
}

export async function asignarProyectoMasivo(contactoIds: string[], proyectoId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ proyecto_id: proyectoId, updated_at: new Date().toISOString() })
    .in('id', contactoIds)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/contactos')
}

export async function eliminarContacto(contactoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: contacto, error: fetchError } = await supabase
    .from('contactos')
    .select('prospecto_id, hallazgo_id')
    .eq('id', contactoId)
    .single()
  if (fetchError) throw new Error(fetchError.message)

  if (contacto.prospecto_id) {
    // El estado vive en prospectos_estado (por consultor), no en una columna
    // de la tabla compartida — ver 0011_prospectos_estado_por_consultor.sql.
    const { error } = await supabase
      .from('prospectos_estado')
      .delete()
      .eq('prospecto_id', contacto.prospecto_id)
      .eq('consultor_id', user.id)
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
  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard/contactos')
}

export async function eliminarContactosMasivo(contactoIds: string[]) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: contactos, error: fetchError } = await supabase
    .from('contactos')
    .select('prospecto_id, hallazgo_id')
    .in('id', contactoIds)
  if (fetchError) throw new Error(fetchError.message)

  const prospectoIds = (contactos ?? []).map(c => c.prospecto_id).filter(Boolean) as string[]
  const hallazgoIds = (contactos ?? []).map(c => c.hallazgo_id).filter(Boolean) as string[]

  if (prospectoIds.length > 0) {
    // El estado vive en prospectos_estado (por consultor), no en una columna
    // de la tabla compartida — ver 0011_prospectos_estado_por_consultor.sql.
    const { error } = await supabase
      .from('prospectos_estado')
      .delete()
      .in('prospecto_id', prospectoIds)
      .eq('consultor_id', user.id)
    if (error) throw new Error(error.message)
  }

  if (hallazgoIds.length > 0) {
    const { error } = await supabase
      .from('hallazgos')
      .update({ estado: 'sin_revisar' })
      .in('id', hallazgoIds)
    if (error) throw new Error(error.message)
  }

  const { error: deleteError } = await supabase.from('contactos').delete().in('id', contactoIds)
  if (deleteError) throw new Error(deleteError.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/prospectos')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard/contactos')
}

export async function aprobarHallazgo(hallazgo: Hallazgo, proyectoId?: string | null) {
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
      proyecto_id: proyectoId || null,
      consultor_id: user.id,
    },
  ])
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('hallazgos')
    .update({ estado: 'aprobado' })
    .eq('id', hallazgo.id)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard')
}

export async function descartarHallazgo(hallazgoId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('hallazgos')
    .update({ estado: 'descartado' })
    .eq('id', hallazgoId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard')
}

export async function aprobarHallazgosMasivo(hallazgos: Hallazgo[], proyectoId?: string | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { error: insertError } = await supabase.from('contactos').insert(
    hallazgos.map(h => ({
      hallazgo_id: h.id,
      nombre_empresa: h.nombre_empresa,
      representante: h.representante,
      telefono: h.telefono,
      email: h.email,
      descripcion: h.descripcion,
      notas: h.notas,
      proyecto_id: proyectoId || null,
      consultor_id: user.id,
    }))
  )
  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('hallazgos')
    .update({ estado: 'aprobado' })
    .in('id', hallazgos.map(h => h.id))
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard')
}

export async function descartarHallazgosMasivo(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.from('hallazgos').update({ estado: 'descartado' }).in('id', ids)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/bandeja')
  revalidatePath('/dashboard/scraping')
  revalidatePath('/dashboard')
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
  revalidatePath('/dashboard/contactos')
  revalidatePath('/dashboard')
}

export async function actualizarTemperaturaMasivo(
  contactoIds: string[],
  temperatura: 'frio' | 'interesado' | 'vinculado'
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('contactos')
    .update({ temperatura, updated_at: new Date().toISOString() })
    .in('id', contactoIds)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/contactos')
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
  revalidatePath('/dashboard/contactos')
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
