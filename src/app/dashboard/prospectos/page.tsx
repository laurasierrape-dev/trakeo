import { createClient } from '@/lib/supabase/server'
import type { Prospecto, Proyecto } from '@/lib/types'
import { ProspectosList } from './ProspectosList'
import { ImportarBase } from './ImportarBase'

export default async function ProspectosPage() {
  const supabase = await createClient()

  // El estado (aprobado/descartado) es por consultor, no de la tabla
  // compartida — ver 0011_prospectos_estado_por_consultor.sql. RLS limita
  // la consulta a prospectos_estado a las filas del usuario actual.
  const [{ data: prospectos }, { data: estados }, { data: proyectos }] = await Promise.all([
    supabase.from('prospectos').select('*').order('created_at', { ascending: false }),
    supabase.from('prospectos_estado').select('prospecto_id'),
    supabase.from('proyectos').select('*').order('nombre', { ascending: true }),
  ])

  const revisadosIds = new Set((estados ?? []).map(e => e.prospecto_id))
  const sinRevisar = (prospectos ?? []).filter(p => !revisadosIds.has(p.id))

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Prospectos por revisar
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Aprobar crea un contacto en tu pipeline. Descartar lo saca de tu pool.
      </p>

      <ImportarBase />

      {sinRevisar.length === 0 ? (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          No hay prospectos sin revisar por ahora.
        </p>
      ) : (
        <ProspectosList
          prospectos={sinRevisar as Prospecto[]}
          proyectos={(proyectos as Proyecto[] | null) ?? []}
        />
      )}
    </div>
  )
}
