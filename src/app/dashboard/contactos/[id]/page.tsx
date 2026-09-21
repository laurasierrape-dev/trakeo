import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Contacto, Toque } from '@/lib/types'
import { TemperaturaSelector } from './TemperaturaSelector'
import { ProximoToqueForm } from './ProximoToqueForm'
import { NuevoToqueForm } from './NuevoToqueForm'
import { EliminarContactoBoton } from './EliminarContactoBoton'

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

  const { data: toques } = await supabase
    .from('toques')
    .select('*')
    .eq('contacto_id', id)
    .order('fecha', { ascending: false })

  const c = contacto as Contacto

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        {c.nombre_empresa}
      </h1>
      <div className="text-sm mt-1 flex flex-col gap-0.5" style={{ color: '#0d2e2380' }}>
        {c.representante && <span>{c.representante}</span>}
        {c.telefono && <span>{c.telefono}</span>}
        {c.email && <span>{c.email}</span>}
      </div>
      {c.descripcion && (
        <p className="text-sm mt-3 max-w-lg" style={{ color: '#0d2e2370' }}>
          {c.descripcion}
        </p>
      )}

      <div className="flex flex-wrap gap-6 mt-6">
        <TemperaturaSelector contactoId={c.id} temperatura={c.temperatura} />
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
                  {new Date(t.fecha).toLocaleDateString('es-CO')}
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

      <div className="mt-10 pt-6" style={{ borderTop: '1px solid #0d2e2315' }}>
        <EliminarContactoBoton contactoId={c.id} />
      </div>
    </div>
  )
}
