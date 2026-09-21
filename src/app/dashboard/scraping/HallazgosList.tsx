'use client'

import { useState } from 'react'
import { HallazgoCard } from './HallazgoCard'
import { ChatFiltro } from '@/components/ChatFiltro'
import type { Hallazgo } from '@/lib/types'

export function HallazgosList({ hallazgos }: { hallazgos: Hallazgo[] }) {
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)

  const filtrados = idsIA ? hallazgos.filter(h => idsIA.has(h.id)) : hallazgos

  return (
    <div>
      <ChatFiltro
        items={hallazgos}
        onResultado={ids => setIdsIA(ids ? new Set(ids) : null)}
      />

      {filtrados.length === 0 && (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          No hay hallazgos que coincidan con el filtro.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map(h => (
          <HallazgoCard key={h.id} hallazgo={h} />
        ))}
      </div>
    </div>
  )
}
