import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { InvitarUsuarioForm } from './InvitarUsuarioForm'
import { UsuarioRow } from './UsuarioRow'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: esAdmin } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!esAdmin) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: usuariosData } = await admin.auth.admin.listUsers()
  const usuarios = (usuariosData?.users ?? [])
    .map(u => ({
      id: u.id,
      email: u.email,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      created_at: u.created_at,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const { data: logs } = await supabase
    .from('login_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Administración
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Invita consultores, gestiona su acceso y revisa el historial de ingresos.
      </p>

      <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23' }}>
        Usuarios
      </h2>
      <InvitarUsuarioForm />

      <div
        className="rounded-2xl p-4 mb-8 overflow-x-auto"
        style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Email</th>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Creado</th>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Estado</th>
              <th className="text-left text-xs font-medium py-2" style={{ color: '#0d2e2360' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <UsuarioRow key={u.id} usuario={u} />
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23' }}>
        Historial de ingresos
      </h2>
      <div
        className="rounded-2xl p-4 overflow-x-auto"
        style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Email</th>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Evento</th>
              <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>IP</th>
              <th className="text-left text-xs font-medium py-2" style={{ color: '#0d2e2360' }}>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #0d2e2308' }}>
                <td className="py-2 pr-4 text-sm" style={{ color: '#0d2e23' }}>{log.email}</td>
                <td className="py-2 pr-4 text-xs">
                  <span
                    className="px-2 py-1 rounded-full font-medium"
                    style={
                      log.evento === 'login_exitoso'
                        ? { backgroundColor: '#c5f54a40', color: '#0d2e23' }
                        : log.evento === 'login_fallido'
                          ? { backgroundColor: '#b91c1c15', color: '#b91c1c' }
                          : { backgroundColor: '#0d2e2310', color: '#0d2e2370' }
                    }
                  >
                    {log.evento}
                  </span>
                </td>
                <td className="py-2 pr-4 text-xs" style={{ color: '#0d2e2370' }}>{log.ip ?? '—'}</td>
                <td className="py-2 text-xs" style={{ color: '#0d2e2370' }}>
                  {new Date(log.created_at).toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
