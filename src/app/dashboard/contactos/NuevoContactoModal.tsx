'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { crearContactoManual } from '../actions'
import type { Proyecto } from '@/lib/types'

const inputStyle = { border: '1px solid #0d2e2320', color: '#0d2e23' }

// Segunda pieza de la Fase 1 de "Datos Desbloqueados": cargar un lead que
// nunca pasó por una importación ni por el bookmarklet (referencia, llamada
// en frío, evento). Mismo patrón que NuevoProyectoModal.
export function NuevoContactoModal({ proyectos }: { proyectos: Proyecto[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [representante, setRepresentante] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function cerrar() {
    setAbierto(false)
    setNombre('')
    setRepresentante('')
    setTelefono('')
    setEmail('')
    setDescripcion('')
    setProyectoId('')
    setError(null)
  }

  function crear() {
    setError(null)
    startTransition(async () => {
      try {
        const id = await crearContactoManual(
          { nombre_empresa: nombre, representante, telefono, email, descripcion },
          proyectoId || null
        )
        cerrar()
        router.push(`/dashboard/contactos/${id}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo salió mal.')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer whitespace-nowrap"
        style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
      >
        + Nuevo contacto
      </button>

      <Modal abierto={abierto} onCerrar={cerrar} titulo="Nuevo contacto">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Empresa
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Cliente referido por Juan"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Representante
            </label>
            <input
              type="text"
              value={representante}
              onChange={e => setRepresentante(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          {proyectos.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
                Proyecto (opcional)
              </label>
              <select
                value={proyectoId}
                onChange={e => setProyectoId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="">Sin proyecto</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: '#0d2e2370' }}>
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
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
              {isPending ? 'Creando...' : 'Crear contacto'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
