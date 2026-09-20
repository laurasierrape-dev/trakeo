'use client'

import { useTransition } from 'react'
import { actualizarProximoToque } from '../../actions'

export function ProximoToqueForm({
  contactoId,
  proximoToque,
}: {
  contactoId: string
  proximoToque: string | null
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: '#f3efe560' }}>
        Próximo toque
      </p>
      <input
        type="date"
        defaultValue={proximoToque ?? ''}
        disabled={isPending}
        onChange={e =>
          startTransition(() => actualizarProximoToque(contactoId, e.target.value || null))
        }
        className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
        style={{ backgroundColor: 'white', color: '#0d2e23' }}
      />
    </div>
  )
}
