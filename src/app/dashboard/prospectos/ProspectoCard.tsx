'use client'

import { useEffect, useState, useTransition } from 'react'
import { aprobarProspecto, descartarProspecto, buscarCoincidencias } from '../actions'
import type { Hallazgo, Prospecto } from '@/lib/types'

export function ProspectoCard({
  prospecto,
  proyectoId,
  selected,
  onToggleSelected,
  modoDetalle,
  onAccion,
}: {
  prospecto: Prospecto
  proyectoId: string | null
  selected?: boolean
  onToggleSelected?: () => void
  modoDetalle?: boolean
  onAccion?: () => void
}) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coincidencias, setCoincidencias] = useState<Hallazgo[] | null>(null)

  useEffect(() => {
    if (!modoDetalle) return
    let vivo = true
    buscarCoincidencias(prospecto.razon_social, { prospectoId: prospecto.id }).then(r => {
      if (vivo) setCoincidencias(r.hallazgos)
    })
    return () => {
      vivo = false
    }
  }, [modoDetalle, prospecto.razon_social, prospecto.id])

  if (hidden) return null

  function confirmar(callback: () => Promise<void>) {
    startTransition(async () => {
      await callback()
      setHidden(true)
      onAccion?.()
    })
  }

  return (
    <div
      className={modoDetalle ? '' : 'rounded-xl p-4'}
      style={modoDetalle ? undefined : { backgroundColor: 'white', border: '1px solid #0d2e2310' }}
    >
      <div className="flex items-start gap-2">
        {!modoDetalle && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelected}
            className="mt-0.5 cursor-pointer"
          />
        )}
        <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
          {prospecto.razon_social}
        </p>
      </div>
      <div className="text-xs mt-1 flex flex-col gap-0.5" style={{ color: '#0d2e2370' }}>
        {prospecto.representante && <span>Representante: {prospecto.representante}</span>}
        {prospecto.telefono && <span>Tel: {prospecto.telefono}</span>}
        {prospecto.email && <span>Email: {prospecto.email}</span>}
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

      {modoDetalle && coincidencias && coincidencias.length > 0 && (
        <div
          className="text-xs mt-3 pt-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid #0d2e2315', color: '#0d2e2370' }}
        >
          <p className="font-medium" style={{ color: '#0d2e23' }}>
            Encontrado en scraping
          </p>
          {coincidencias.map(h => (
            <div key={h.id}>
              {h.representante && <span>Representante: {h.representante} — </span>}
              {h.telefono && <span>Tel: {h.telefono} — </span>}
              {h.notas && <span>{h.notas}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          disabled={isPending}
          onClick={() => confirmar(() => aprobarProspecto(prospecto, proyectoId))}
          className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
        >
          Aprobar
        </button>
        <button
          disabled={isPending}
          onClick={() => confirmar(() => descartarProspecto(prospecto.id))}
          className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
