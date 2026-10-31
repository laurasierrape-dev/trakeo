import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from './SidebarNav'
import { LogOut } from 'lucide-react'

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
      <aside
        className="w-60 shrink-0 flex flex-col px-4 py-6"
        style={{ borderRight: '1px solid #0d2e2315' }}
      >
        <span className="font-semibold px-3 mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
          Trakeo
        </span>

        <SidebarNav isAdmin={!!admin} />

        <div className="mt-auto pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid #0d2e2315' }}>
          <span className="text-xs truncate px-3" style={{ color: '#0d2e2360' }} title={user.email}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 text-sm font-medium rounded-lg px-3 py-2.5 cursor-pointer transition-colors hover:opacity-80"
              style={{ border: '1px solid #0d2e2320', color: '#0d2e23', backgroundColor: 'white' }}
            >
              <LogOut size={16} strokeWidth={2} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
    </div>
  )
}
