import { createClient } from '@/lib/supabase/server'
import type { Hallazgo, Prospecto, Proyecto } from '@/lib/types'
import { BandejaList } from './BandejaList'

export default async function BandejaPage() {
  const supabase = await createClient()

  // El estado de un prospecto (aprobado/descartado) es por consultor — ver
  // 0011_prospectos_estado_por_consultor.sql. RLS limita la consulta a
  // prospectos_estado a las filas del usuario actual.
  const [{ data: prospectos }, { data: estados }, { data: hallazgos }, { data: proyectos }, { data: busquedas }] =
    await Promise.all([
      supabase.from('prospectos').select('*').order('created_at', { ascending: false }),
      supabase.from('prospectos_estado').select('prospecto_id'),
      supabase
        .from('hallazgos')
        .select('*')
        .eq('estado', 'sin_revisar')
        .order('created_at', { ascending: false }),
      supabase.from('proyectos').select('*').order('nombre', { ascending: true }),
      // Lectura abierta a cualquier autenticado (ver 0013_busquedas.sql) —
      // necesaria para resolver el nombre de búsquedas de otros consultores
      // sobre prospectos del pozo común.
      supabase.from('busquedas').select('id, nombre'),
    ])

  const revisadosIds = new Set((estados ?? []).map(e => e.prospecto_id))
  const prospectosSinRevisar = ((prospectos as Prospecto[] | null) ?? []).filter(
    p => !revisadosIds.has(p.id)
  )
  const nombresBusqueda = new Map((busquedas ?? []).map(b => [b.id, b.nombre]))

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Bandeja
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Todo lo que falta revisar, venga de donde venga. Aprobar crea un contacto en tu pipeline;
        descartar lo saca de tu lista.
      </p>

      <BandejaList
        prospectos={prospectosSinRevisar}
        hallazgos={(hallazgos as Hallazgo[] | null) ?? []}
        proyectos={(proyectos as Proyecto[] | null) ?? []}
        nombresBusqueda={Object.fromEntries(nombresBusqueda)}
      />
    </div>
  )
}
