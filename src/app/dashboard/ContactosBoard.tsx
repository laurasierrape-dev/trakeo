'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChatFiltro } from '@/components/ChatFiltro'
import { ContactoRowMenu } from './ContactoRowMenu'
import { NuevoProyectoModal } from './NuevoProyectoModal'
import { exportarCSV } from '@/lib/csv'
import { actualizarTemperaturaMasivo, eliminarContactosMasivo, descartarContactosMasivo } from './actions'
import type { Contacto, Proyecto } from '@/lib/types'

const OPCIONES_TEMPERATURA: Contacto['temperatura'][] = ['frio', 'interesado', 'vinculado']

const PILL_ESTILO: Record<Contacto['temperatura'], { backgroundColor: string; color: string }> = {
  vinculado: { backgroundColor: '#c5f54a', color: '#0d2e23' },
  interesado: { backgroundColor: '#c5f54a40', color: '#0d2e23' },
  frio: { backgroundColor: '#0d2e2310', color: '#0d2e2360' },
}

function Stat({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
      <p className="text-xs font-medium mb-2" style={{ color: '#0d2e2360' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        {valor}
      </p>
    </div>
  )
}

export function ContactosBoard({
  contactos,
  proyectos,
}: {
  contactos: Contacto[]
  proyectos: Proyecto[]
}) {
  const router = useRouter()
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [proyectoFiltro, setProyectoFiltro] = useState('')
  const [mostrarDescartados, setMostrarDescartados] = useState(false)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [isPending, startTransition] = useTransition()

  const proyectosPorId = useMemo(
    () => new Map(proyectos.map(p => [p.id, p.nombre])),
    [proyectos]
  )

  const activos = useMemo(() => contactos.filter(c => c.estado === 'activo'), [contactos])

  const stats = useMemo(
    () => ({
      total: activos.length,
      interesados: activos.filter(c => c.temperatura === 'interesado').length,
      vinculados: activos.filter(c => c.temperatura === 'vinculado').length,
      conProximoToque: activos.filter(c => c.proximo_toque).length,
    }),
    [activos]
  )

  const filtrados = (mostrarDescartados ? contactos : activos).filter(c => {
    if (idsIA && !idsIA.has(c.id)) return false
    if (busqueda && !c.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (proyectoFiltro && c.proyecto_id !== proyectoFiltro) return false
    return true
  })

  function toggleSeleccionado(id: string) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSeleccionarTodo() {
    setSeleccionados(prev =>
      prev.size === filtrados.length ? new Set() : new Set(filtrados.map(c => c.id))
    )
  }

  function limpiarSeleccion() {
    setSeleccionados(new Set())
    setConfirmandoEliminar(false)
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Stat label="Contactos totales" valor={stats.total} />
        <Stat label="Interesados" valor={stats.interesados} />
        <Stat label="Vinculados" valor={stats.vinculados} />
        <Stat label="Con próximo toque" valor={stats.conProximoToque} />
      </div>

      <ChatFiltro items={contactos} onResultado={ids => setIdsIA(ids ? new Set(ids) : null)} />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none w-full max-w-xs"
          style={{ backgroundColor: 'white', color: '#0d2e23', border: '1px solid #0d2e2315' }}
        />
        {proyectos.length > 0 && (
          <select
            value={proyectoFiltro}
            onChange={e => setProyectoFiltro(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={{ backgroundColor: 'white', color: '#0d2e23', border: '1px solid #0d2e2315' }}
          >
            <option value="">Todos los proyectos</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <NuevoProyectoModal />
        <label
          className="flex items-center gap-1.5 text-xs cursor-pointer rounded-lg px-3 py-2"
          style={{ border: '1px solid #0d2e2315', color: '#0d2e2380' }}
        >
          <input
            type="checkbox"
            checked={mostrarDescartados}
            onChange={e => setMostrarDescartados(e.target.checked)}
            className="cursor-pointer"
          />
          Mostrar descartados
        </label>
        <button
          onClick={() =>
            exportarCSV(
              filtrados,
              [
                { key: 'nombre_empresa', label: 'Empresa' },
                { key: 'representante', label: 'Representante' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'temperatura', label: 'Temperatura' },
                { key: 'proximo_toque', label: 'Próximo toque' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'notas', label: 'Notas' },
              ],
              'contactos.csv'
            )
          }
          className="text-xs rounded-lg px-3 py-2 cursor-pointer whitespace-nowrap"
          style={{ border: '1px solid #0d2e2320', color: '#0d2e2380' }}
        >
          Exportar CSV
        </button>
      </div>

      {seleccionados.size > 0 && (
        <div
          className="flex flex-wrap items-center gap-3 rounded-xl p-3 mb-4"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2315' }}
        >
          <span className="text-xs" style={{ color: '#0d2e2360' }}>
            {seleccionados.size} seleccionado(s)
          </span>

          <div className="flex items-center gap-1">
            {OPCIONES_TEMPERATURA.map(opcion => (
              <button
                key={opcion}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await actualizarTemperaturaMasivo(Array.from(seleccionados), opcion)
                    limpiarSeleccion()
                  })
                }
                className="text-xs rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50 capitalize"
                style={{ border: '1px solid #0d2e2330', color: '#0d2e2380' }}
              >
                {opcion}
              </button>
            ))}
          </div>

          <div className="h-4 w-px" style={{ backgroundColor: '#0d2e2320' }} />

          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await descartarContactosMasivo(Array.from(seleccionados))
                limpiarSeleccion()
              })
            }
            className="text-xs rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
            style={{ border: '1px solid #0d2e2330', color: '#0d2e2380' }}
          >
            Descartar seleccionados
          </button>

          <div className="h-4 w-px" style={{ backgroundColor: '#0d2e2320' }} />

          {!confirmandoEliminar ? (
            <button
              onClick={() => setConfirmandoEliminar(true)}
              className="text-xs cursor-pointer"
              style={{ color: '#b91c1c' }}
            >
              Eliminar seleccionados
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#0d2e2370' }}>
                ¿Eliminar {seleccionados.size}? Los que vengan de prospecto/hallazgo volverán a revisión.
              </span>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await eliminarContactosMasivo(Array.from(seleccionados))
                    limpiarSeleccion()
                  })
                }
                className="text-xs font-semibold cursor-pointer disabled:opacity-50"
                style={{ color: '#b91c1c' }}
              >
                {isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                disabled={isPending}
                onClick={() => setConfirmandoEliminar(false)}
                className="text-xs cursor-pointer disabled:opacity-50"
                style={{ color: '#0d2e2360' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
      >
        {filtrados.length === 0 ? (
          <p className="text-sm p-5" style={{ color: '#0d2e2370' }}>
            No hay contactos que coincidan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
                <th className="px-4 py-3 text-xs" style={{ color: '#0d2e2360' }}>
                  <input
                    type="checkbox"
                    checked={seleccionados.size > 0 && seleccionados.size === filtrados.length}
                    onChange={toggleSeleccionarTodo}
                    className="cursor-pointer"
                  />
                </th>
                {['Empresa', 'Representante', 'Teléfono', 'Proyecto', 'Temperatura', 'Próximo toque', ''].map(h => (
                  <th
                    key={h}
                    className="text-left font-medium px-4 py-3 text-xs"
                    style={{ color: '#0d2e2360' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/contactos/${c.id}`)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid #0d2e2308',
                    opacity: c.estado === 'descartado' ? 0.55 : 1,
                  }}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(c.id)}
                      onChange={() => toggleSeleccionado(c.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#0d2e23' }}>
                    {c.nombre_empresa}
                    {c.estado === 'descartado' && (
                      <span className="ml-2 text-xs font-normal" style={{ color: '#b91c1c' }}>
                        Descartado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {c.representante || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {c.telefono || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.proyecto_id && proyectosPorId.has(c.proyecto_id) ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: '#0d2e2310', color: '#0d2e23' }}
                      >
                        {proyectosPorId.get(c.proyecto_id)}
                      </span>
                    ) : (
                      <span style={{ color: '#0d2e2350' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                      style={PILL_ESTILO[c.temperatura]}
                    >
                      {c.temperatura}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: c.proximo_toque ? '#186b54' : '#0d2e2350' }}>
                    {c.proximo_toque || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ContactoRowMenu contacto={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
