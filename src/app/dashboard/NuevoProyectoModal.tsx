'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/Modal'
import { crearProyecto } from './actions'
import { COLORES_PROYECTO } from '@/lib/proyectoColores'

export function NuevoProyectoModal() {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [criterios, setCriterios] = useState('')
  const [color, setColor] = useState<string>(COLORES_PROYECTO[0])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function cerrar() {
    setAbierto(false)
    setNombre('')
    setCriterios('')
    setColor(COLORES_PROYECTO[0])
    setError(null)
  }

  function crear() {
    setError(null)
    startTransition(async () => {
      try {
        await crearProyecto(nombre, criterios, color)
        cerrar()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo salió mal.')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="text-xs rounded-lg px-3 py-2 cursor-pointer whitespace-nowrap"
        style={{ border: '1px solid #0d2e2320', color: '#0d2e2380' }}
      >
        + Nuevo proyecto
      </button>

      <Modal abierto={abierto} onCerrar={cerrar} titulo="Nuevo proyecto">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Nombre
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Expansión Bogotá 2026"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: '1px solid #0d2e2320', color: '#0d2e23' }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Color
            </label>
            <div className="flex gap-2">
              {COLORES_PROYECTO.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className="w-6 h-6 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? '0 0 0 2px white, 0 0 0 4px #0d2e2360' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Criterios de búsqueda (opcional)
            </label>
            <textarea
              value={criterios}
              onChange={e => setCriterios(e.target.value)}
              placeholder="Ej: empresas de logística en Bogotá con más de 50 empleados"
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ border: '1px solid #0d2e2320', color: '#0d2e23' }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={cerrar}
              disabled={isPending}
              className="text-xs rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
              style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
            >
              Cancelar
            </button>
            <button
              disabled={isPending || !nombre.trim()}
              onClick={crear}
              className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
            >
              {isPending ? 'Creando...' : 'Crear proyecto'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
