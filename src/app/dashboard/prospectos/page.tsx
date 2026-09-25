import { createClient } from '@/lib/supabase/server'
import type { Prospecto, Proyecto } from '@/lib/types'
import { ProspectosList } from './ProspectosList'
import { ImportarBase } from './ImportarBase'

export default async function ProspectosPage() {
  const supabase = await createClient()
  const { data: prospectos } = await supabase
    .from('prospectos')
    .select('*')
    .eq('estado', 'sin_revisar')
    .order('created_at', { ascending: false })
  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('*')
    .order('nombre', { ascending: true })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Prospectos por revisar
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Aprobar crea un contacto en tu pipeline. Descartar lo saca del pool.
      </p>

      <ImportarBase />

      {(prospectos ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          No hay prospectos sin revisar por ahora.
        </p>
      ) : (
        <ProspectosList
          prospectos={(prospectos as Prospecto[] | null) ?? []}
          proyectos={(proyectos as Proyecto[] | null) ?? []}
        />
      )}
    </div>
  )
}
