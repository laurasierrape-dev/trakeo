'use client'

import { useTransition } from 'react'
import { regenerarToken } from './actions'

export function RegenerarBoton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await regenerarToken()
          window.location.reload()
        })
      }
      className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
      style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
    >
      {isPending ? 'Regenerando...' : 'Regenerar enlace'}
    </button>
  )
}
