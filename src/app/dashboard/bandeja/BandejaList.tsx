'use client'

import { useMemo, useState, useTransition } from 'react'
import { ProspectoCard } from '../prospectos/ProspectoCard'
import { HallazgoCard } from '../scraping/HallazgoCard'
import { ChatFiltro } from '@/components/ChatFiltro'
import { Modal } from '@/components/Modal'
import { exportarCSV } from '@/lib/csv'
import {
  aprobarProspectosMasivo,
  descartarProspectosMasivo,
  aprobarHallazgosMasivo,
  descartarHallazgosMasivo,
} from '../actions'
import {
  tablaContenedorStyle,
  tablaHeaderRowStyle,
  tablaHeaderCellClass,
  tablaHeaderCellStyle,
  tablaRowStyle,
  tablaCellPrimaryClass,
  tablaCellPrimaryStyle,
  tablaCellClass,
  tablaCellStyle,
} from '@/lib/tableStyles'
import type { Hallazgo, Prospecto, Proyecto } from '@/lib/types'

const selectStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

// prospectos y hallazgos son leads sin triar que entraron por distinta
// fuente (importación vs. bookmarklet) — se muestran como una sola cola con
// el origen como dato, no como dos pantallas separadas que hacen lo mismo.
type Item = {
  id: string
  origen: 'prospecto' | 'hallazgo'
  nombre_empresa: string
  representante: string | null
  telefono: string | null
  email: string | null
  vinoDe: string
  raw: Prospecto | Hallazgo
}

export function BandejaList({
  prospectos,
  hallazgos,
  proyectos,
  nombresBusqueda = {},
}: {
  prospectos: Prospecto[]
  hallazgos: Hallazgo[]
  proyectos: Proyecto[]
  nombresBusqueda?: Record<string, string>
}) {
  // El nombre de la búsqueda real (ej. "Alimentos en Bogotá") reemplaza la
  // etiqueta genérica cuando se conoce — filas de antes de 0013_busquedas.sql
  // no tienen busqueda_id, y ahí se usa el origen como antes.
  const items = useMemo<Item[]>(
    () => [
      ...prospectos.map(p => ({
        id: p.id,
        origen: 'prospecto' as const,
        nombre_empresa: p.razon_social,
        representante: p.representante,
        telefono: p.telefono,
        email: p.email,
        vinoDe: (p.busqueda_id && nombresBusqueda[p.busqueda_id]) || 'Importado',
        raw: p,
      })),
      ...hallazgos.map(h => ({
        id: h.id,
        origen: 'hallazgo' as const,
        nombre_empresa: h.nombre_empresa,
        representante: h.representante,
        telefono: h.telefono,
        email: h.email,
        vinoDe: (h.busqueda_id && nombresBusqueda[h.busqueda_id]) || 'Bookmarklet',
        raw: h,
      })),
    ],
    [prospectos, hallazgos, nombresBusqueda]
  )

  const [busqueda, setBusqueda] = useState('')
  const [origenFiltro, setOrigenFiltro] = useState<'' | 'prospecto' | 'hallazgo'>('')
  const [proyectoDestino, setProyectoDestino] = useState('')
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [detalle, setDetalle] = useState<Item | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtrados = items.filter(i => {
    if (idsIA && !idsIA.has(i.id)) return false
    if (origenFiltro && i.origen !== origenFiltro) return false
    if (busqueda && !i.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase())) return false
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
      prev.size === filtrados.length ? new Set() : new Set(filtrados.map(i => i.id))
    )
  }

  const seleccionadosItems = filtrados.filter(i => seleccionados.has(i.id))
  const prospectosSeleccionados = seleccionadosItems
    .filter(i => i.origen === 'prospecto')
    .map(i => i.raw as Prospecto)
  const hallazgosSeleccionados = seleccionadosItems
    .filter(i => i.origen === 'hallazgo')
    .map(i => i.raw as Hallazgo)

  function aprobarSeleccionados() {
    startTransition(async () => {
      await Promise.all([
        prospectosSeleccionados.length > 0
          ? aprobarProspectosMasivo(prospectosSeleccionados, proyectoDestino || null)
          : null,
        hallazgosSeleccionados.length > 0
          ? aprobarHallazgosMasivo(hallazgosSeleccionados, proyectoDestino || null)
          : null,
      ])
      setSeleccionados(new Set())
    })
  }

  function descartarSeleccionados() {
    startTransition(async () => {
      await Promise.all([
        prospectosSeleccionados.length > 0
          ? descartarProspectosMasivo(prospectosSeleccionados.map(p => p.id))
          : null,
        hallazgosSeleccionados.length > 0
          ? descartarHallazgosMasivo(hallazgosSeleccionados.map(h => h.id))
          : null,
      ])
      setSeleccionados(new Set())
    })
  }

  return (
    <div>
      <ChatFiltro items={items} onResultado={ids => setIdsIA(ids ? new Set(ids) : null)} />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none flex-1 min-w-[180px]"
          style={selectStyle}
        />
        <select
          value={origenFiltro}
          onChange={e => setOrigenFiltro(e.target.value as '' | 'prospecto' | 'hallazgo')}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none"
          style={selectStyle}
        >
          <option value="">Todos los orígenes</option>
          <option value="prospecto">Importados</option>
          <option value="hallazgo">Bookmarklet</option>
        </select>
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
              filtrados.map(i => ({
                empresa: i.nombre_empresa,
                origen: i.vinoDe,
                representante: i.representante ?? '',
                telefono: i.telefono ?? '',
                email: i.email ?? '',
              })),
              [
                { key: 'empresa', label: 'Empresa' },
                { key: 'origen', label: 'Origen' },
                { key: 'representante', label: 'Representante' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'email', label: 'Email' },
              ],
              'bandeja.csv'
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
          {items.length === 0
            ? 'No hay nada por revisar por ahora.'
            : 'Nada coincide con el filtro.'}
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
                onClick={aprobarSeleccionados}
                className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
              >
                Aprobar seleccionados
              </button>
              <button
                disabled={isPending}
                onClick={descartarSeleccionados}
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
        <div className="rounded-2xl overflow-hidden overflow-x-auto" style={tablaContenedorStyle}>
          <table className="w-full">
            <thead>
              <tr style={tablaHeaderRowStyle}>
                <th className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={seleccionados.size > 0 && seleccionados.size === filtrados.length}
                    onChange={toggleSeleccionarTodo}
                    className="cursor-pointer"
                  />
                </th>
                {['Empresa', 'Vino de', 'Representante', 'Teléfono'].map(h => (
                  <th key={h} className={tablaHeaderCellClass} style={tablaHeaderCellStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(i => (
                <tr
                  key={i.id}
                  onClick={() => setDetalle(i)}
                  className="cursor-pointer transition-colors hover:bg-[#0d2e2306]"
                  style={tablaRowStyle}
                >
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(i.id)}
                      onChange={() => toggleSeleccionado(i.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className={tablaCellPrimaryClass} style={tablaCellPrimaryStyle}>
                    {i.nombre_empresa}
                  </td>
                  <td className={tablaCellClass} style={tablaCellStyle}>
                    {i.vinoDe}
                  </td>
                  <td className={tablaCellClass} style={tablaCellStyle}>
                    {i.representante || '—'}
                  </td>
                  <td className={tablaCellClass} style={tablaCellStyle}>
                    {i.telefono || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo={detalle?.nombre_empresa}>
        {detalle?.origen === 'prospecto' && (
          <ProspectoCard
            prospecto={detalle.raw as Prospecto}
            proyectoId={proyectoDestino || null}
            modoDetalle
            onAccion={() => setDetalle(null)}
          />
        )}
        {detalle?.origen === 'hallazgo' && (
          <HallazgoCard
            hallazgo={detalle.raw as Hallazgo}
            proyectoId={proyectoDestino || null}
            modoDetalle
            onAccion={() => setDetalle(null)}
          />
        )}
      </Modal>
    </div>
  )
}
