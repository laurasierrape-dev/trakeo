'use client'

import { useState, useTransition } from 'react'
import { HallazgoCard } from './HallazgoCard'
import { ChatFiltro } from '@/components/ChatFiltro'
import { Modal } from '@/components/Modal'
import { exportarCSV } from '@/lib/csv'
import { aprobarHallazgosMasivo, descartarHallazgosMasivo } from '../actions'
import type { Hallazgo, Proyecto } from '@/lib/types'

const selectStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

export function HallazgosList({
  hallazgos,
  proyectos,
}: {
  hallazgos: Hallazgo[]
  proyectos: Proyecto[]
}) {
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)
  const [proyectoDestino, setProyectoDestino] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [detalle, setDetalle] = useState<Hallazgo | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtrados = idsIA ? hallazgos.filter(h => idsIA.has(h.id)) : hallazgos

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
      prev.size === filtrados.length ? new Set() : new Set(filtrados.map(h => h.id))
    )
  }

  const hallazgosSeleccionados = filtrados.filter(h => seleccionados.has(h.id))

  return (
    <div>
      <ChatFiltro
        items={hallazgos}
        onResultado={ids => setIdsIA(ids ? new Set(ids) : null)}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {proyectos.length > 0 && (
          <select
            value={proyectoDestino}
            onChange={e => setProyectoDestino(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={selectStyle}
            title="Proyecto al que van los que apruebes"
          >
            <option value="">Sin proyecto</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() =>
            exportarCSV(
              filtrados,
              [
                { key: 'nombre_empresa', label: 'Empresa' },
                { key: 'representante', label: 'Representante' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'email', label: 'Email' },
                { key: 'descripcion', label: 'Descripción' },
                { key: 'notas', label: 'Notas' },
              ],
              'hallazgos.csv'
            )
          }
          className="text-xs rounded-lg px-3 py-2 cursor-pointer whitespace-nowrap"
          style={{ border: '1px solid #0d2e2320', color: '#0d2e2380' }}
        >
          Exportar CSV
        </button>
      </div>

      {filtrados.length === 0 && (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          No hay hallazgos que coincidan con el filtro.
        </p>
      )}

      {filtrados.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#0d2e2370' }}>
            <input
              type="checkbox"
              checked={seleccionados.size > 0 && seleccionados.size === filtrados.length}
              onChange={toggleSeleccionarTodo}
              className="cursor-pointer"
            />
            Seleccionar todo ({filtrados.length})
          </label>

          {seleccionados.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#0d2e2360' }}>
                {seleccionados.size} seleccionado(s)
              </span>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await aprobarHallazgosMasivo(hallazgosSeleccionados, proyectoDestino || null)
                    setSeleccionados(new Set())
                  })
                }
                className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
              >
                Aprobar seleccionados
              </button>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await descartarHallazgosMasivo(Array.from(seleccionados))
                    setSeleccionados(new Set())
                  })
                }
                className="text-xs rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
                style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
              >
                Descartar seleccionados
              </button>
            </div>
          )}
        </div>
      )}

      {filtrados.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden overflow-x-auto"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
                <th className="px-4 py-3 text-xs" style={{ color: '#0d2e2360' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={seleccionados.size > 0 && seleccionados.size === filtrados.length}
                    onChange={toggleSeleccionarTodo}
                    className="cursor-pointer"
                  />
                </th>
                {['Empresa', 'Representante', 'Teléfono', 'Email'].map(h => (
                  <th
                    key={h}
                    className="text-left font-medium px-4 py-3 text-xs whitespace-nowrap"
                    style={{ color: '#0d2e2360' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(h => (
                <tr
                  key={h.id}
                  onClick={() => setDetalle(h)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid #0d2e2308' }}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(h.id)}
                      onChange={() => toggleSeleccionado(h.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: '#0d2e23' }}>
                    {h.nombre_empresa}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {h.representante || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {h.telefono || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {h.email || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo={detalle?.nombre_empresa}>
        {detalle && (
          <HallazgoCard
            hallazgo={detalle}
            proyectoId={proyectoDestino || null}
            modoDetalle
            onAccion={() => setDetalle(null)}
          />
        )}
      </Modal>
    </div>
  )
}
