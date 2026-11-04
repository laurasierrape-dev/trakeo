'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizar, type CampoPersonalizado } from '@/lib/importarMapeo'

// Diccionario compartido de campos personalizados (Fase 2 de "Datos
// Desbloqueados" — ver 0015_campos_personalizados.sql). Se lee al abrir el
// paso de mapeo de una importación, para sugerir campos ya creados por
// cualquier consultor en vez de solo los 8 fijos.
export async function obtenerCamposPersonalizados(): Promise<CampoPersonalizado[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('campos_personalizados')
    .select('id, nombre, sinonimos')
    .order('nombre', { ascending: true })
  return (data ?? []) as CampoPersonalizado[]
}

// Se llama una vez por columna cuando el usuario confirma el mapeo hacia un
// campo personalizado (nuevo o existente) — busca o crea el campo por
// nombre (sin distinguir mayúsculas), y le agrega el encabezado original
// como sinónimo aprendido si todavía no lo tenía. La próxima importación
// con ese mismo encabezado (en cualquier archivo, de cualquier consultor)
// sugiere este campo solo.
//
// Nota: a propósito NO se usa upsert — en este proyecto upsert con
// onConflict/ignoreDuplicates se comportó de forma impredecible contra
// PostgREST (ver commit de la etapa 5 de Búsquedas), así que se usa el
// mismo patrón de consultar-y-luego-insertar/actualizar que ya probó ser
// confiable en el resto de la app.
export async function confirmarCampoPersonalizado(
  headerOriginal: string,
  nombreCampo: string
): Promise<CampoPersonalizado> {
  const supabase = await createClient()
  const nombre = nombreCampo.trim()
  if (!nombre) throw new Error('El nombre del campo no puede quedar vacío.')
  const sinonimoNuevo = normalizar(headerOriginal)

  const { data: existente } = await supabase
    .from('campos_personalizados')
    .select('id, nombre, sinonimos')
    .ilike('nombre', nombre)
    .maybeSingle()

  if (existente) {
    const campo = existente as CampoPersonalizado
    if (campo.sinonimos.includes(sinonimoNuevo)) return campo
    const sinonimos = [...campo.sinonimos, sinonimoNuevo]
    const { error } = await supabase
      .from('campos_personalizados')
      .update({ sinonimos })
      .eq('id', campo.id)
    if (error) throw new Error(error.message)
    return { ...campo, sinonimos }
  }

  const { data: creado, error } = await supabase
    .from('campos_personalizados')
    .insert([{ nombre, sinonimos: [sinonimoNuevo] }])
    .select('id, nombre, sinonimos')
    .single()
  if (error) throw new Error(error.message)
  return creado as CampoPersonalizado
}
