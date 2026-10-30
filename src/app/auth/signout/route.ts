import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    // Se espera el insert: en serverless la función puede congelarse apenas
    // responde, y un log disparado sin await se pierde en silencio.
    await createAdminClient()
      .from('login_logs')
      .insert([
        {
          user_id: user.id,
          email: user.email,
          evento: 'logout',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null,
          user_agent: request.headers.get('user-agent'),
        },
      ])
  }

  await supabase.auth.signOut()
  // 303 fuerza GET: un 307 preservaría el POST y /login respondería 405.
  return NextResponse.redirect(new URL('/login', request.url), 303)
}
