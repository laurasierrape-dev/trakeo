'use client'

import { useMemo, useState } from 'react'
import { ProspectoCard } from './ProspectoCard'
import { ChatFiltro } from '@/components/ChatFiltro'
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
      </div>

      {filtrados.length === 0 && (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          No hay prospectos que coincidan con el filtro.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map(p => (
          <ProspectoCard key={p.id} prospecto={p} />
        ))}
      </div>
    </div>
  )
}
