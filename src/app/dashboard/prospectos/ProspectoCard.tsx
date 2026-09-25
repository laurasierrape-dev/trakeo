'use client'

import { useState, useTransition } from 'react'
import { aprobarProspecto, descartarProspecto } from '../actions'
import type { Prospecto } from '@/lib/types'

export function ProspectoCard({
  prospecto,
  selected,
  onToggleSelected,
}: {
  prospecto: Prospecto
  selected: boolean
  onToggleSelected: () => void
}) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (hidden) return null

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
    >
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          className="mt-0.5 cursor-pointer"
        />
        <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
          {prospecto.razon_social}
        </p>
      </div>
      <div className="text-xs mt-1 flex flex-col gap-0.5" style={{ color: '#0d2e2370' }}>
        {prospecto.representante && <span>Representante: {prospecto.representante}</span>}
        {prospecto.telefono && <span>Tel: {prospecto.telefono}</span>}
        {prospecto.sector && (
          <span>
            Sector: {prospecto.sector}
            {prospecto.zona ? ` — ${prospecto.zona}` : ''}
          </span>
        )}
        {prospecto.ingresos_miles != null && (
          <span>Ingresos est.: {prospecto.ingresos_miles.toLocaleString('es-CO')} mil</span>
        )}
        {prospecto.descripcion && <span>{prospecto.descripcion}</span>}
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
          style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
