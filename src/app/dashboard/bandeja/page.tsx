import { createClient } from '@/lib/supabase/server'
import type { Hallazgo, Proyecto } from '@/lib/types'
import { BandejaList } from './BandejaList'
import {
  obtenerOpcionesFacetas,
  obtenerProspectosSinRevisarPaginados,
  parsearFiltrosFacetas,
  parsearPaginacion,
} from '@/lib/colaRevision'
import { obtenerCamposPersonalizados } from '../prospectos/camposActions'

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; tamano?: string; [clave: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const paramsResueltos = await searchParams
  const { pagina, tamano } = parsearPaginacion(paramsResueltos)
  const filtros = parsearFiltrosFacetas(paramsResueltos)

  // El estado de un prospecto (aprobado/descartado) es por consultor — ver
  // 0011_prospectos_estado_por_consultor.sql. RLS limita la consulta a
  // prospectos_estado a las filas del usuario actual.
  const [
    { prospectos: prospectosSinRevisar, total: totalProspectos },
    { data: hallazgos },
    { data: proyectos },
    { data: busquedas },
    camposPersonalizados,
  ] = await Promise.all([
    obtenerProspectosSinRevisarPaginados(supabase, pagina, tamano, filtros),
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
    obtenerCamposPersonalizados(),
  ])

  const opcionesFacetas = await obtenerOpcionesFacetas(supabase, camposPersonalizados)

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
        totalProspectos={totalProspectos}
        paginaProspectos={pagina}
        tamanoProspectos={tamano}
        hallazgos={(hallazgos as Hallazgo[] | null) ?? []}
        proyectos={(proyectos as Proyecto[] | null) ?? []}
        nombresBusqueda={Object.fromEntries(nombresBusqueda)}
        opcionesFacetas={opcionesFacetas}
        filtrosFacetas={filtros}
      />
    </div>
  )
}
