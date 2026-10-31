import { createClient } from '@/lib/supabase/server'
import type { Busqueda, Proyecto } from '@/lib/types'
import { tasaAprobacion, formatearTasa } from '@/lib/busquedaStats'
import { formatearFecha } from '@/lib/fechas'
import { ImportarBase } from '../prospectos/ImportarBase'
import { BookmarkletTool } from './BookmarkletTool'

export default async function BusquedasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: busquedas } = await supabase
    .from('busquedas')
    .select('*')
    .eq('consultor_id', user.id)
    .order('created_at', { ascending: false })

  const lista = (busquedas as Busqueda[] | null) ?? []
  const idsBusquedas = lista.map(b => b.id)

  // trajo/aprobados se calculan trayendo los campos mínimos y agregando en
  // JS — mismo patrón que el resto de la app (ver bandeja/page.tsx). A esta
  // escala no hace falta una función agregada en Postgres.
  const [{ data: hallazgos }, { data: prospectos }, { data: estadosProspectos }, { data: proyectos }] =
    await Promise.all([
      supabase.from('hallazgos').select('busqueda_id, estado').not('busqueda_id', 'is', null),
      idsBusquedas.length > 0
        ? supabase.from('prospectos').select('id, busqueda_id').in('busqueda_id', idsBusquedas)
        : Promise.resolve({ data: [] as { id: string; busqueda_id: string | null }[] }),
      supabase.from('prospectos_estado').select('prospecto_id, estado').eq('estado', 'aprobado'),
      supabase.from('proyectos').select('*'),
    ])

  const prospectosAprobadosIds = new Set((estadosProspectos ?? []).map(e => e.prospecto_id))
  const proyectosPorId = new Map(((proyectos as Proyecto[] | null) ?? []).map(p => [p.id, p]))

  const stats = new Map<string, { trajo: number; aprobados: number }>()
  for (const b of lista) stats.set(b.id, { trajo: 0, aprobados: 0 })

  for (const h of hallazgos ?? []) {
    if (!h.busqueda_id || !stats.has(h.busqueda_id)) continue
    const s = stats.get(h.busqueda_id)!
    s.trajo++
    if (h.estado === 'aprobado') s.aprobados++
  }
  for (const p of prospectos ?? []) {
    if (!p.busqueda_id || !stats.has(p.busqueda_id)) continue
    const s = stats.get(p.busqueda_id)!
    s.trajo++
    if (prospectosAprobadosIds.has(p.id)) s.aprobados++
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Búsquedas
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        De dónde salió cada empresa de tu bandeja.
      </p>

      {lista.length === 0 ? (
        <p className="text-sm mb-8" style={{ color: '#0d2e2380' }}>
          Todavía no has traído empresas — usa una de las fuentes de abajo.
        </p>
      ) : (
        <div
          className="rounded-2xl p-4 mb-8 overflow-x-auto"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Nombre</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Origen</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Proyecto</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Trajo</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Aprobados</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Tasa</th>
                <th className="text-left text-xs font-medium py-2 pr-4" style={{ color: '#0d2e2360' }}>Fecha</th>
                <th className="text-left text-xs font-medium py-2" style={{ color: '#0d2e2360' }}></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(b => {
                const s = stats.get(b.id) ?? { trajo: 0, aprobados: 0 }
                const proyecto = b.proyecto_id ? proyectosPorId.get(b.proyecto_id) : null
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid #0d2e2308' }}>
                    <td className="py-3 pr-4 text-sm font-medium" style={{ color: '#0d2e23' }}>
                      {b.nombre}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <span
                        className="px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#0d2e2310', color: '#0d2e2370' }}
                      >
                        {b.origen === 'csv' ? 'CSV' : 'Bookmarklet'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {proyecto ? (
                        <span className="inline-flex items-center gap-1.5" style={{ color: '#0d2e2370' }}>
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: proyecto.color }}
                          />
                          {proyecto.nombre}
                        </span>
                      ) : (
                        <span style={{ color: '#0d2e2340' }}>—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm" style={{ color: '#0d2e23' }}>{s.trajo}</td>
                    <td className="py-3 pr-4 text-sm" style={{ color: '#0d2e23' }}>{s.aprobados}</td>
                    <td className="py-3 pr-4 text-xs" style={{ color: '#0d2e2370' }}>
                      {formatearTasa(tasaAprobacion(s.trajo, s.aprobados))}
                    </td>
                    <td className="py-3 pr-4 text-xs" style={{ color: '#0d2e2370' }}>
                      {formatearFecha(b.created_at)}
                    </td>
                    <td className="py-3 text-xs">
                      <a href="/dashboard/bandeja" style={{ color: '#186b54' }}>
                        Ver en bandeja →
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23a0' }}>
        Cómo traer más empresas
      </h2>
      <ImportarBase />
      <BookmarkletTool />
    </div>
  )
}
