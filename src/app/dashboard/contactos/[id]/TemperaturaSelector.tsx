'use client'

import { useTransition } from 'react'
import { actualizarTemperatura } from '../../actions'
import type { Contacto } from '@/lib/types'

const OPCIONES: Contacto['temperatura'][] = ['frio', 'interesado', 'vinculado']

export function TemperaturaSelector({
  contactoId,
  temperatura,
}: {
  contactoId: string
  temperatura: Contacto['temperatura']
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div>
      <p className="text-xs mb-1.5" style={{ color: '#f3efe560' }}>
        Temperatura
      </p>
      <div className="flex gap-1.5">
        {OPCIONES.map(opcion => (
          <button
            key={opcion}
            disabled={isPending}
            onClick={() => startTransition(() => actualizarTemperatura(contactoId, opcion))}
            className="text-xs rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50 capitalize"
            style={
              opcion === temperatura
                ? { backgroundColor: '#c5f54a', color: '#0d2e23' }
                : { border: '1px solid #f3efe540', color: '#f3efe5a0' }
            }
          >
            {opcion}
          </button>
        ))}
      </div>
    </div>
  )
}
