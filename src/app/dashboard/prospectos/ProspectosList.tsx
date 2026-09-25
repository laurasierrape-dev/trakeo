'use client'

import { useMemo, useState, useTransition } from 'react'
import { ProspectoCard } from './ProspectoCard'
import { ChatFiltro } from '@/components/ChatFiltro'
import { exportarCSV } from '@/lib/csv'
import { aprobarProspectosMasivo, descartarProspectosMasivo } from '../actions'
import type { Prospecto } from '@/lib/types'

const selectStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

export function ProspectosList({ prospectos }: { prospectos: Prospecto[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [sector, setSector] = useState('')
  const [zona, setZona] = useState('')
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const sectores = useMemo(
    () => Array.from(new Set(prospectos.map(p => p.sector).filter(Boolean))) as string[],
    [prospectos]
  )
  const zonas = useMemo(
    () => Array.from(new Set(prospectos.map(p => p.zona).filter(Boolean))) as string[],
    [prospectos]
  )

  const filtrados = prospectos.filter(p => {
    if (idsIA && !idsIA.has(p.id)) return false
    if (busqueda && !p.razon_social.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (sector && p.sector !== sector) return false
    if (zona && p.zona !== zona) return false
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
      prev.size === filtrados.length ? new Set() : new Set(filtrados.map(p => p.id))
    )
  }

  const prospectosSeleccionados = filtrados.filter(p => seleccionados.has(p.id))

  return (
    <div>
      <ChatFiltro
        items={prospectos}
        onResultado={ids => setIdsIA(ids ? new Set(ids) : null)}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none flex-1 min-w-[180px]"
          style={selectStyle}
        />
        {sectores.length > 0 && (
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={selectStyle}
          >
            <option value="">Todos los sectores</option>
            {sectores.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        {zonas.length > 0 && (
          <select
            value={zona}
            onChange={e => setZona(e.target.value)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={selectStyle}
          >
            <option value="">Todas las zonas</option>
            {zonas.map(z => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() =>
            exportarCSV(
              filtrados,
              [
                { key: 'razon_social', label: 'Razón social' },
                { key: 'nit', label: 'NIT' },
                { key: 'representante', label: 'Representante' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'sector', label: 'Sector' },
                { key: 'zona', label: 'Zona' },
                { key: 'ingresos_miles', label: 'Ingresos estimados (miles)' },
                { key: 'descripcion', label: 'Descripción' },
              ],
              'prospectos.csv'
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
          No hay prospectos que coincidan con el filtro.
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
                    await aprobarProspectosMasivo(prospectosSeleccionados)
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
                    await descartarProspectosMasivo(Array.from(seleccionados))
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

      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map(p => (
          <ProspectoCard
            key={p.id}
            prospecto={p}
            selected={seleccionados.has(p.id)}
            onToggleSelected={() => toggleSeleccionado(p.id)}
          />
        ))}
      </div>
    </div>
  )
}
