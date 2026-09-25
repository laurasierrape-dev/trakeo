'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/Modal'
import { crearProyecto } from './actions'

export function NuevoProyectoModal() {
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [criterios, setCriterios] = useState('')
  const [isPending, startTransition] = useTransition()

  function cerrar() {
    setAbierto(false)
    setNombre('')
    setCriterios('')
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
              onClick={() =>
                startTransition(async () => {
                  await crearProyecto(nombre, criterios)
                  cerrar()
                })
              }
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
