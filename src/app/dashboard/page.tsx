import { createClient } from '@/lib/supabase/server'
import type { Hallazgo, Prospecto, Proyecto } from '@/lib/types'
import { DashboardColas } from './DashboardColas'
import { hoyBogotaISO } from '@/lib/fechas'

// Entrada de la app tras el login — reemplaza lo que antes era el tablero
// de Contactos en esta misma ruta (movido a /dashboard/contactos). Ver
// docs/plan-reestructuracion.md, etapa 4.
export default async function DashboardPage() {
  const supabase = await createClient()
  const hoyISO = hoyBogotaISO()

  const [
    { data: prospectos },
    { data: estados },
    { data: hallazgos },
    { data: proyectos },
    { data: toquesVencidos },
    { data: interesadosSinProximoPaso },
    { data: busquedas },
  ] = await Promise.all([
    supabase.from('prospectos').select('*').order('created_at', { ascending: false }),
    supabase.from('prospectos_estado').select('prospecto_id'),
    supabase
      .from('hallazgos')
      .select('*')
      .eq('estado', 'sin_revisar')
      .order('created_at', { ascending: false }),
    supabase.from('proyectos').select('*').order('nombre', { ascending: true }),
    supabase
      .from('contactos')
      .select('id, nombre_empresa, temperatura, proximo_toque')
      .eq('estado', 'activo')
      .lt('proximo_toque', hoyISO)
      .order('proximo_toque', { ascending: true }),
    supabase
      .from('contactos')
      .select('id, nombre_empresa, temperatura, proximo_toque')
      .eq('estado', 'activo')
      .eq('temperatura', 'interesado')
      .is('proximo_toque', null)
      .order('nombre_empresa', { ascending: true }),
    supabase.from('busquedas').select('id, nombre'),
  ])

  const revisadosIds = new Set((estados ?? []).map(e => e.prospecto_id))
  const prospectosSinRevisar = ((prospectos as Prospecto[] | null) ?? []).filter(
    p => !revisadosIds.has(p.id)
  )
  const nombresBusqueda = Object.fromEntries((busquedas ?? []).map(b => [b.id, b.nombre]))

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Buenos días
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Esto es lo que tienes pendiente hoy.
      </p>

      <DashboardColas
        prospectos={prospectosSinRevisar}
        hallazgos={(hallazgos as Hallazgo[] | null) ?? []}
        proyectos={(proyectos as Proyecto[] | null) ?? []}
        toquesVencidos={toquesVencidos ?? []}
        interesadosSinProximoPaso={interesadosSinProximoPaso ?? []}
        hoyISO={hoyISO}
        nombresBusqueda={nombresBusqueda}
      />
    </div>
  )
}
