'use client'

import { useEffect, useState, useTransition } from 'react'
import { aprobarHallazgo, descartarHallazgo, buscarCoincidencias } from '../actions'
import type { Hallazgo, Prospecto } from '@/lib/types'

export function HallazgoCard({
  hallazgo,
  proyectoId,
  selected,
  onToggleSelected,
  modoDetalle,
  onAccion,
}: {
  hallazgo: Hallazgo
  proyectoId: string | null
  selected?: boolean
  onToggleSelected?: () => void
  modoDetalle?: boolean
  onAccion?: () => void
}) {
  const [hidden, setHidden] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [coincidencias, setCoincidencias] = useState<Prospecto[] | null>(null)

  useEffect(() => {
    if (!modoDetalle) return
    let vivo = true
    buscarCoincidencias(hallazgo.nombre_empresa, { hallazgoId: hallazgo.id }).then(r => {
      if (vivo) setCoincidencias(r.prospectos)
    })
    return () => {
      vivo = false
    }
  }, [modoDetalle, hallazgo.nombre_empresa, hallazgo.id])

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
          {hallazgo.nombre_empresa}
        </p>
      </div>
      <div className="text-xs mt-1 flex flex-col gap-0.5" style={{ color: '#0d2e2370' }}>
        {hallazgo.representante && <span>Representante: {hallazgo.representante}</span>}
        {hallazgo.telefono && <span>Tel: {hallazgo.telefono}</span>}
        {hallazgo.email && <span>Email: {hallazgo.email}</span>}
        {hallazgo.descripcion && <span>{hallazgo.descripcion}</span>}
        {hallazgo.notas && <span>{hallazgo.notas}</span>}
      </div>

      {modoDetalle && coincidencias && coincidencias.length > 0 && (
        <div
          className="text-xs mt-3 pt-3 flex flex-col gap-1"
          style={{ borderTop: '1px solid #0d2e2315', color: '#0d2e2370' }}
        >
          <p className="font-medium" style={{ color: '#0d2e23' }}>
            Encontrado en tus bases
          </p>
          {coincidencias.map(p => (
            <div key={p.id}>
              {p.representante && <span>Representante: {p.representante} — </span>}
              {p.telefono && <span>Tel: {p.telefono} — </span>}
              {p.sector && <span>Sector: {p.sector}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          disabled={isPending}
          onClick={() => confirmar(() => aprobarHallazgo(hallazgo, proyectoId))}
          className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
        >
          Aprobar
        </button>
        <button
          disabled={isPending}
          onClick={() => confirmar(() => descartarHallazgo(hallazgo.id))}
          className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
        >
          Descartar
        </button>
      </div>
    </div>
  )
}
