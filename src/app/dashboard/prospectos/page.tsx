import { createClient } from '@/lib/supabase/server'
import type { Prospecto } from '@/lib/types'
import { ProspectosList } from './ProspectosList'

export default async function ProspectosPage() {
  const supabase = await createClient()
  const { data: prospectos } = await supabase
    .from('prospectos')
    .select('*')
    .eq('estado', 'sin_revisar')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#f3efe5' }}>
        Prospectos por revisar
      </h1>
      <p className="text-sm mb-6" style={{ color: '#f3efe580' }}>
        Aprobar crea un contacto en tu pipeline. Descartar lo saca del pool.
      </p>

      {(prospectos ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: '#f3efe580' }}>
          No hay prospectos sin revisar por ahora.
        </p>
      ) : (
        <ProspectosList prospectos={(prospectos as Prospecto[] | null) ?? []} />
      )}
    </div>
  )
}
