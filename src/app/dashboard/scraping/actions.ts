'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obtenerOCrearToken(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: existente } = await supabase
    .from('bookmarklet_tokens')
    .select('token')
    .eq('consultor_id', user.id)
    .maybeSingle()

  if (existente) return existente.token

  const { data: creado, error } = await supabase
    .from('bookmarklet_tokens')
    .insert([{ consultor_id: user.id }])
    .select('token')
    .single()

  if (error) throw new Error(error.message)
  return creado.token
}

export async function regenerarToken(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('bookmarklet_tokens')
    .update({ token: crypto.randomUUID().replace(/-/g, '') })
    .eq('consultor_id', user.id)
    .select('token')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/scraping')
  return data.token
}
