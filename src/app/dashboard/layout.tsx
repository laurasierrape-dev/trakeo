import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d2e23' }}>
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #f3efe520' }}
      >
        <div className="flex items-center gap-6">
          <span className="font-semibold" style={{ color: '#f3efe5' }}>
            Trakeo
          </span>
          <Link href="/dashboard" className="text-sm" style={{ color: '#f3efe5a0' }}>
            Contactos
          </Link>
          <Link href="/dashboard/prospectos" className="text-sm" style={{ color: '#f3efe5a0' }}>
            Prospectos
          </Link>
          <Link href="/dashboard/scraping" className="text-sm" style={{ color: '#f3efe5a0' }}>
            Scraping
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: '#f3efe560' }}>
            {user.email}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs cursor-pointer"
              style={{ color: '#f3efe5a0' }}
            >
              Salir
            </button>
          </form>
        </div>
      </nav>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
