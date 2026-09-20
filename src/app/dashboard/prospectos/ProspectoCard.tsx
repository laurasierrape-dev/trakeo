'use client'

import { useState, useTransition } from 'react'
import { aprobarProspecto, descartarProspecto } from '../actions'
import type { Prospecto } from '@/lib/types'

export function ProspectoCard({ prospecto }: { prospecto: Prospecto }) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (hidden) return null

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#ffffff0d', border: '1px solid #f3efe520' }}
    >
      <p className="text-sm font-medium" style={{ color: '#f3efe5' }}>
        {prospecto.razon_social}
      </p>
      <div className="text-xs mt-1 flex flex-col gap-0.5" style={{ color: '#f3efe570' }}>
        {prospecto.representante && <span>Representante: {prospecto.representante}</span>}
        {prospecto.telefono && <span>Tel: {prospecto.telefono}</span>}
        {prospecto.sector && (
          <span>
            Sector: {prospecto.sector}
            {prospecto.zona ? ` — ${prospecto.zona}` : ''}
          </span>
        )}
        {prospecto.facturacion_est && <span>Ingresos est.: {prospecto.facturacion_est}</span>}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await aprobarProspecto(prospecto)
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
              await descartarProspecto(prospecto.id)
              setHidden(true)
            })
          }
          className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ border: '1px solid #f3efe540', color: '#f3efe5a0' }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
