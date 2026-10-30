import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email) {
    createAdminClient()
      .from('login_logs')
      .insert([{ user_id: user.id, email: user.email, evento: 'logout' }])
      .then(() => {})
  }

  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), 303)
}
