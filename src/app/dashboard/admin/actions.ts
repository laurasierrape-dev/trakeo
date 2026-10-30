'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

async function verificarAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!admin) throw new Error('No autorizado')
}

export async function invitarUsuario(email: string) {
  await verificarAdmin()

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
    redirectTo: `${origin}/auth/callback?next=/establecer-contrasena`,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
}

export async function revocarAcceso(userId: string) {
  await verificarAdmin()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
}

export async function restaurarAcceso(userId: string) {
  await verificarAdmin()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
}

export async function eliminarUsuario(userId: string) {
  await verificarAdmin()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/admin')
}
