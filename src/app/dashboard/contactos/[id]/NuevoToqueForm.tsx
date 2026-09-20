'use client'

import { useState, useTransition } from 'react'
import { registrarToque } from '../../actions'
import type { Toque } from '@/lib/types'

const CANALES: NonNullable<Toque['canal']>[] = ['whatsapp', 'llamada', 'email', 'visita']
const RESULTADOS: NonNullable<Toque['resultado']>[] = [
  'no_contesto',
  'cita_agendada',
  'no_interes',
  'interesado',
]

export function NuevoToqueForm({ contactoId }: { contactoId: string }) {
  const [canal, setCanal] = useState<NonNullable<Toque['canal']>>('whatsapp')
  const [resultado, setResultado] = useState<NonNullable<Toque['resultado']>>('no_contesto')
  const [notas, setNotas] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await registrarToque(contactoId, canal, resultado, notas)
      setNotas('')
    })
  }

  const selectStyle = {
    backgroundColor: 'white',
    color: '#0d2e23',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md">
      <div className="flex gap-2">
        <select
          value={canal}
          onChange={e => setCanal(e.target.value as typeof canal)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none flex-1"
          style={selectStyle}
        >
          {CANALES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={resultado}
          onChange={e => setResultado(e.target.value as typeof resultado)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none flex-1"
          style={selectStyle}
        >
          {RESULTADOS.map(r => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <textarea
        placeholder="Notas (opcional)"
        value={notas}
        onChange={e => setNotas(e.target.value)}
        rows={2}
        className="rounded-lg px-3 py-2 text-xs focus:outline-none"
        style={selectStyle}
      />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50 self-start"
        style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
      >
        {isPending ? 'Guardando...' : 'Registrar toque'}
      </button>
    </form>
  )
}
