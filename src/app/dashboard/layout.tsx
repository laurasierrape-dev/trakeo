import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarShell } from './SidebarShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f3efe5' }}>
      <SidebarShell isAdmin={!!admin} email={user.email ?? ''} />
      <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
    </div>
  )
}
