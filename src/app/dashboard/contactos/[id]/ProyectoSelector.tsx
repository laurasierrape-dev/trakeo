'use client'

import { useTransition } from 'react'
import { asignarProyecto } from '../../actions'
import type { Proyecto } from '@/lib/types'

export function ProyectoSelector({
  contactoId,
  proyectoId,
  proyectos,
}: {
  contactoId: string
  proyectoId: string | null
  proyectos: Proyecto[]
}) {
  const [isPending, startTransition] = useTransition()

  if (proyectos.length === 0) return null

  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: '#0d2e2360' }}>
        Proyecto
      </p>
      <select
        value={proyectoId ?? ''}
        disabled={isPending}
        onChange={e => startTransition(() => asignarProyecto(contactoId, e.target.value || null))}
        className="text-sm rounded-lg px-3 py-2 cursor-pointer focus:outline-none disabled:opacity-50"
        style={{ border: '1px solid #0d2e2320', color: '#0d2e23' }}
      >
        <option value="">Sin proyecto</option>
        {proyectos.map(p => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
