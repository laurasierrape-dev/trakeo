'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { eliminarContacto } from '../../actions'

export function EliminarContactoBoton({ contactoId }: { contactoId: string }) {
  const [confirmando, setConfirmando] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="text-xs cursor-pointer"
        style={{ color: '#0d2e2360' }}
      >
        Eliminar contacto
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs" style={{ color: '#0d2e2380' }}>
        ¿Eliminar de tu pipeline? Si viene de un prospecto o hallazgo, volverá a la lista de
        revisión.
      </span>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await eliminarContacto(contactoId)
            router.push('/dashboard')
          })
        }
        className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
        style={{ border: '1px solid #b91c1c40', color: '#b91c1c' }}
      >
        {isPending ? 'Eliminando...' : 'Sí, eliminar'}
      </button>
      <button
        disabled={isPending}
        onClick={() => setConfirmando(false)}
        className="text-xs cursor-pointer disabled:opacity-50"
        style={{ color: '#0d2e23a0' }}
      >
        Cancelar
      </button>
    </div>
  )
}
