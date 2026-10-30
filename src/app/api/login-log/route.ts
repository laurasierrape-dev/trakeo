import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email, exitoso } = await req.json()

  if (!email) {
    return NextResponse.json({ ok: false, error: 'Falta email' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const admin = createAdminClient()

  let userId: string | null = null
  if (exitoso) {
    const { data } = await admin.auth.admin.listUsers()
    userId = data.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())?.id ?? null
  }

  await admin.from('login_logs').insert([
    {
      user_id: userId,
      email: String(email).toLowerCase(),
      evento: exitoso ? 'login_exitoso' : 'login_fallido',
      ip,
      user_agent: userAgent,
    },
  ])

  return NextResponse.json({ ok: true })
}
