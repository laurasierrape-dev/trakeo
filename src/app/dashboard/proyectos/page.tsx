import { createClient } from '@/lib/supabase/server'
import type { Proyecto } from '@/lib/types'
import { NuevoProyectoModal } from '../NuevoProyectoModal'
import { ProyectoRow } from './ProyectoRow'

export default async function ProyectosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: proyectos }, { data: contactos }] = await Promise.all([
    supabase.from('proyectos').select('*').order('nombre', { ascending: true }),
    supabase.from('contactos').select('proyecto_id').eq('consultor_id', user?.id ?? ''),
  ])

  const conteoPorProyecto = new Map<string, number>()
  for (const c of contactos ?? []) {
    if (!c.proyecto_id) continue
    conteoPorProyecto.set(c.proyecto_id, (conteoPorProyecto.get(c.proyecto_id) ?? 0) + 1)
  }

  const lista = (proyectos as Proyecto[] | null) ?? []

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Proyectos
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Agrupa tus contactos por mandato o campaña.
      </p>

      <div className="mb-6">
        <NuevoProyectoModal />
      </div>

      {lista.length === 0 ? (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          Todavía no tienes proyectos.
        </p>
      ) : (
        <div
          className="rounded-2xl p-4 overflow-x-auto"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}></th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Nombre</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Criterios de búsqueda</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Contactos</th>
                <th className="text-left text-xs font-medium py-2" style={{ color: '#0d2e2360' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(p => (
                <ProyectoRow
                  key={p.id}
                  proyecto={p}
                  contactos={conteoPorProyecto.get(p.id) ?? 0}
                  otrosProyectos={lista.filter(o => o.id !== p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
