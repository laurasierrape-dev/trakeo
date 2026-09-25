'use client'

import { useTransition } from 'react'
import { descartarContacto, reactivarContacto } from '../../actions'
import type { Contacto } from '@/lib/types'

export function DescartarContactoBoton({
  contactoId,
  estado,
}: {
  contactoId: string
  estado: Contacto['estado']
}) {
  const [isPending, startTransition] = useTransition()
  const descartado = estado === 'descartado'

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (descartado) await reactivarContacto(contactoId)
          else await descartarContacto(contactoId)
        })
      }
      className="text-xs cursor-pointer disabled:opacity-50"
      style={{ color: '#0d2e2360' }}
    >
      {isPending ? 'Guardando...' : descartado ? 'Reactivar contacto' : 'Descartar contacto'}
    </button>
  )
}
