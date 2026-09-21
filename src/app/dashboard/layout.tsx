import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from './SidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f3efe5' }}>
      <aside
        className="w-60 shrink-0 flex flex-col px-4 py-6"
        style={{ borderRight: '1px solid #0d2e2315' }}
      >
        <span className="font-semibold px-3 mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
          Trakeo
        </span>

        <SidebarNav />

        <div className="mt-auto pt-6 flex flex-col gap-2 px-3" style={{ borderTop: '1px solid #0d2e2315' }}>
          <span className="text-xs truncate" style={{ color: '#0d2e2360' }}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs cursor-pointer"
              style={{ color: '#0d2e23a0' }}
            >
              Salir
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 min-w-0">{children}</main>
    </div>
  )
}
