'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

// Las server actions enmascaran los `throw` en producción ("An error occurred
// in the Server Components render..."), así que devolvemos el resultado en vez
// de lanzar: el cliente muestra el mensaje real.
export type Resultado = { ok: true; mensaje: string } | { ok: false; error: string }

async function esAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!admin
}

async function origenActual() {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

export async function invitarUsuario(email: string): Promise<Resultado> {
  if (!(await esAdmin())) return { ok: false, error: 'No tienes permisos para esto.' }

  const emailNormalizado = email.toLowerCase().trim()
  const redirectTo = `${await origenActual()}/auth/callback?next=/establecer-contrasena`
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.inviteUserByEmail(emailNormalizado, { redirectTo })

  if (error) {
    // Si ya existe, reenviamos el link en vez de fallar: el caso real es
    // "le invité pero no le llegó / se le venció el link".
    const yaExiste =
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('registered')

    if (!yaExiste) return { ok: false, error: error.message }

    const { error: errorReenvio } = await admin.auth.resetPasswordForEmail(emailNormalizado, {
      redirectTo,
    })
    if (errorReenvio) return { ok: false, error: errorReenvio.message }

    revalidatePath('/dashboard/admin')
    return {
      ok: true,
      mensaje: `${emailNormalizado} ya tenía cuenta. Le reenviamos un link para definir su contraseña.`,
    }
  }

  revalidatePath('/dashboard/admin')
  return { ok: true, mensaje: `Invitación enviada a ${emailNormalizado}.` }
}

export async function revocarAcceso(userId: string): Promise<Resultado> {
  if (!(await esAdmin())) return { ok: false, error: 'No tienes permisos para esto.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin')
  return { ok: true, mensaje: 'Acceso revocado.' }
}

export async function restaurarAcceso(userId: string): Promise<Resultado> {
  if (!(await esAdmin())) return { ok: false, error: 'No tienes permisos para esto.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin')
  return { ok: true, mensaje: 'Acceso restaurado.' }
}

export async function eliminarUsuario(userId: string): Promise<Resultado> {
  if (!(await esAdmin())) return { ok: false, error: 'No tienes permisos para esto.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/admin')
  return { ok: true, mensaje: 'Usuario eliminado.' }
}
