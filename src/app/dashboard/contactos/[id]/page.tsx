import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Contacto, Proyecto, Toque } from '@/lib/types'
import { CampoEditable } from './CampoEditable'
import { TemperaturaSelector } from './TemperaturaSelector'
import { ProyectoSelector } from './ProyectoSelector'
import { ProximoToqueForm } from './ProximoToqueForm'
import { NuevoToqueForm } from './NuevoToqueForm'
import { EliminarContactoBoton } from './EliminarContactoBoton'
import { DescartarContactoBoton } from './DescartarContactoBoton'
import { formatearFecha } from '@/lib/fechas'

export default async function ContactoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: contacto } = await supabase
    .from('contactos')
    .select('*')
    .eq('id', id)
    .single()

  if (!contacto) notFound()

  const c = contacto as Contacto

  const [{ data: toques }, { data: proyectos }, { data: prospecto }] = await Promise.all([
    supabase.from('toques').select('*').eq('contacto_id', id).order('fecha', { ascending: false }),
    supabase.from('proyectos').select('*').order('nombre', { ascending: true }),
    // Al aprobar un prospecto solo se copian nombre/representante/teléfono/
    // descripción a contactos — sector, zona, ingresos y el NIT original se
    // quedan en la tabla compartida. Se traen acá en vez de duplicarlos en
    // cada contacto, así nunca quedan desactualizados respecto al prospecto.
    c.prospecto_id
      ? supabase
          .from('prospectos')
          .select('nit, sector, zona, ingresos_miles, email, datos_extra')
          .eq('id', c.prospecto_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const emailContacto = c.email || prospecto?.email || null
  // Columnas que no entraron en los 8 campos fijos de la importación (ver
  // Fase 2 de "Datos Desbloqueados") — ya vienen con el nombre canónico del
  // campo personalizado, no el encabezado crudo del archivo original.
  const datosExtra = (prospecto?.datos_extra as Record<string, string> | null) ?? null
  const tieneInfoOrigen =
    !!prospecto &&
    (prospecto.nit ||
      prospecto.sector ||
      prospecto.zona ||
      prospecto.ingresos_miles != null ||
      (datosExtra && Object.keys(datosExtra).length > 0))

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <CampoEditable
            contactoId={c.id}
            campo="nombre_empresa"
            valor={c.nombre_empresa}
            displayClassName="text-xl font-semibold"
            displayStyle={{ fontFamily: 'var(--font-display)' }}
          />
        </div>
        {c.estado === 'descartado' && (
          <span
            className="text-xs font-medium rounded-full px-2.5 py-1 shrink-0"
            style={{ backgroundColor: '#0d2e2310', color: '#b91c1c' }}
          >
            Descartado
          </span>
        )}
      </div>

      <div className="text-sm mt-1 flex flex-col gap-0.5 max-w-sm" style={{ color: '#0d2e2380' }}>
        <CampoEditable contactoId={c.id} campo="representante" valor={c.representante} placeholder="Agregar representante..." />
        <CampoEditable contactoId={c.id} campo="telefono" valor={c.telefono} placeholder="Agregar teléfono..." />
        <CampoEditable contactoId={c.id} campo="email" valor={emailContacto} placeholder="Agregar email..." />
      </div>

      <div className="mt-3 max-w-lg text-sm" style={{ color: '#0d2e2370' }}>
        <CampoEditable contactoId={c.id} campo="descripcion" valor={c.descripcion} placeholder="Agregar descripción..." multiline />
      </div>

      <div className="mt-2 max-w-lg text-sm" style={{ color: '#0d2e2370' }}>
        <CampoEditable contactoId={c.id} campo="notas" valor={c.notas} placeholder="Agregar notas..." multiline />
      </div>

      {tieneInfoOrigen && (
        <div
          className="text-xs mt-3 pt-3 flex flex-col gap-0.5 max-w-lg"
          style={{ borderTop: '1px solid #0d2e2315', color: '#0d2e2370' }}
        >
          <p className="font-medium mb-0.5" style={{ color: '#0d2e2360' }}>
            De la base importada
          </p>
          {prospecto!.nit && <span>NIT: {prospecto!.nit}</span>}
          {(prospecto!.sector || prospecto!.zona) && (
            <span>
              {prospecto!.sector}
              {prospecto!.sector && prospecto!.zona ? ' — ' : ''}
              {prospecto!.zona}
            </span>
          )}
          {prospecto!.ingresos_miles != null && (
            <span>Ingresos est.: {prospecto!.ingresos_miles.toLocaleString('es-CO')} mil</span>
          )}
          {datosExtra &&
            Object.entries(datosExtra).map(([campo, valor]) => (
              <span key={campo}>
                {campo}: {valor}
              </span>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-6 mt-6">
        <TemperaturaSelector contactoId={c.id} temperatura={c.temperatura} />
        <ProyectoSelector
          contactoId={c.id}
          proyectoId={c.proyecto_id}
          proyectos={(proyectos as Proyecto[] | null) ?? []}
        />
        <ProximoToqueForm contactoId={c.id} proximoToque={c.proximo_toque} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23a0' }}>
          Registrar toque
        </h2>
        <NuevoToqueForm contactoId={c.id} />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23a0' }}>
          Historial
        </h2>
        {(toques ?? []).length === 0 && (
          <p className="text-sm" style={{ color: '#0d2e2360' }}>
            Sin toques registrados todavía.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {((toques as Toque[] | null) ?? []).map(t => (
            <div
              key={t.id}
              className="rounded-xl p-3 text-sm"
              style={{ backgroundColor: 'white', border: '1px solid #0d2e2310', color: '#0d2e23' }}
            >
              <div className="flex justify-between">
                <span className="font-medium">
                  {t.canal} — {t.resultado}
                </span>
                <span style={{ color: '#0d2e2360' }}>
                  {formatearFecha(t.fecha)}
                </span>
              </div>
              {t.notas && (
                <p className="mt-1" style={{ color: '#0d2e2380' }}>
                  {t.notas}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 pt-6 flex items-center gap-4" style={{ borderTop: '1px solid #0d2e2315' }}>
        <DescartarContactoBoton contactoId={c.id} estado={c.estado} />
        <EliminarContactoBoton contactoId={c.id} />
      </div>
    </div>
  )
}
