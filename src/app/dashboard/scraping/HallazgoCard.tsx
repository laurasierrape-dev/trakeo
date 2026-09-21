'use client'

import { useState, useTransition } from 'react'
import { aprobarHallazgo, descartarHallazgo } from '../actions'
import type { Hallazgo } from '@/lib/types'

export function HallazgoCard({ hallazgo }: { hallazgo: Hallazgo }) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (hidden) return null

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
    >
      <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
        {hallazgo.nombre_empresa}
      </p>
      <div className="text-xs mt-1 flex flex-col gap-0.5" style={{ color: '#0d2e2370' }}>
        {hallazgo.representante && <span>Representante: {hallazgo.representante}</span>}
        {hallazgo.telefono && <span>Tel: {hallazgo.telefono}</span>}
        {hallazgo.email && <span>Email: {hallazgo.email}</span>}
        {hallazgo.notas && <span>{hallazgo.notas}</span>}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await aprobarHallazgo(hallazgo)
              setHidden(true)
            })
          }
          className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
        >
          Aprobar
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await descartarHallazgo(hallazgo.id)
              setHidden(true)
            })
          }
          className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
