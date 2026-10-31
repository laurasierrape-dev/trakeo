'use client'

import { useState, useTransition } from 'react'
import { renombrarProyecto, eliminarProyecto } from '../actions'
import type { Proyecto } from '@/lib/types'

export function ProyectoRow({
  proyecto,
  contactos,
  otrosProyectos,
}: {
  proyecto: Proyecto
  contactos: number
  otrosProyectos: Proyecto[]
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(proyecto.nombre)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [moverA, setMoverA] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardarNombre() {
    if (!nombre.trim() || nombre.trim() === proyecto.nombre) {
      setEditando(false)
      setNombre(proyecto.nombre)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await renombrarProyecto(proyecto.id, nombre)
        setEditando(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo salió mal.')
      }
    })
  }

  function confirmarEliminar() {
    setError(null)
    startTransition(async () => {
      try {
        await eliminarProyecto(proyecto.id, moverA || null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo salió mal.')
      }
    })
  }

  return (
    <tr style={{ borderBottom: '1px solid #0d2e2310' }}>
      <td className="py-3 pr-2 w-4">
        <span
          className="block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: proyecto.color }}
        />
      </td>
      <td className="py-3 pr-4 text-sm" style={{ color: '#0d2e23' }}>
        {editando ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') guardarNombre()
                if (e.key === 'Escape') {
                  setEditando(false)
                  setNombre(proyecto.nombre)
                }
              }}
              disabled={isPending}
              className="rounded-lg px-2 py-1 text-sm focus:outline-none"
              style={{ border: '1px solid #0d2e2330', color: '#0d2e23' }}
            />
            <button
              disabled={isPending}
              onClick={guardarNombre}
              className="text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{ color: '#186b54' }}
            >
              Guardar
            </button>
          </div>
        ) : (
          <span className="font-medium">{proyecto.nombre}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-xs" style={{ color: '#0d2e2370' }}>
        {proyecto.criterios_busqueda || '—'}
      </td>
      <td className="py-3 pr-4 text-xs">
        <span
          className="px-2 py-1 rounded-full font-medium"
          style={{ backgroundColor: contactos > 0 ? '#c5f54a40' : '#0d2e2310', color: '#0d2e23' }}
        >
          {contactos}
        </span>
      </td>
      <td className="py-3">
        {confirmandoEliminar ? (
          <div className="flex flex-col gap-2">
            {contactos > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: '#0d2e2380' }}>
                  {contactos} contacto{contactos === 1 ? '' : 's'} asignado{contactos === 1 ? '' : 's'} —
                </span>
                <select
                  value={moverA}
                  onChange={e => setMoverA(e.target.value)}
                  disabled={isPending}
                  className="text-xs rounded-lg px-2 py-1 focus:outline-none"
                  style={{ border: '1px solid #0d2e2330', color: '#0d2e23' }}
                >
                  <option value="">Dejar sin proyecto</option>
                  {otrosProyectos.map(o => (
                    <option key={o.id} value={o.id}>
                      Mover a: {o.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: '#b91c1c' }}>
                ¿Eliminar para siempre?
              </span>
              <button
                disabled={isPending}
                onClick={confirmarEliminar}
                className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
                style={{ border: '1px solid #b91c1c40', color: '#b91c1c' }}
              >
                {isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                disabled={isPending}
                onClick={() => {
                  setConfirmandoEliminar(false)
                  setMoverA('')
                }}
                className="text-xs cursor-pointer disabled:opacity-50"
                style={{ color: '#0d2e23a0' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {!editando && (
              <button
                onClick={() => setEditando(true)}
                className="text-xs cursor-pointer"
                style={{ color: '#0d2e2360' }}
              >
                Renombrar
              </button>
            )}
            <button
              onClick={() => setConfirmandoEliminar(true)}
              className="text-xs cursor-pointer"
              style={{ color: '#0d2e2360' }}
            >
              Eliminar
            </button>
          </div>
        )}
        {error && (
          <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
      </td>
    </tr>
  )
}
