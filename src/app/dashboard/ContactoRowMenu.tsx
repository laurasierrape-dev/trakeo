'use client'

import { useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { actualizarTemperatura, eliminarContacto, descartarContacto, reactivarContacto } from './actions'
import type { Contacto } from '@/lib/types'

const OPCIONES: Contacto['temperatura'][] = ['frio', 'interesado', 'vinculado']
const MENU_WIDTH = 224
const MENU_MAX_HEIGHT = 220

export function ContactoRowMenu({ contacto }: { contacto: Contacto }) {
  const [abierto, setAbierto] = useState(false)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [posicion, setPosicion] = useState({ top: 0, left: 0 })
  const botonRef = useRef<HTMLButtonElement>(null)

  function abrir() {
    const rect = botonRef.current?.getBoundingClientRect()
    if (!rect) return
    const abajo = window.innerHeight - rect.bottom >= MENU_MAX_HEIGHT
    setPosicion({
      top: abajo ? rect.bottom + 4 : rect.top - MENU_MAX_HEIGHT - 4,
      left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
    })
    setAbierto(true)
  }

  function cerrar() {
    setAbierto(false)
    setConfirmandoEliminar(false)
  }

  return (
    <div className="inline-block" onClick={e => e.stopPropagation()}>
      <button
        ref={botonRef}
        onClick={() => (abierto ? cerrar() : abrir())}
        className="text-sm rounded-lg w-7 h-7 cursor-pointer"
        style={{ color: '#0d2e2370' }}
      >
        ⋮
      </button>

      {abierto &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={cerrar} />
            <div
              className="fixed z-50 rounded-xl p-3"
              style={{
                top: posicion.top,
                left: posicion.left,
                width: MENU_WIDTH,
                backgroundColor: 'white',
                border: '1px solid #0d2e2315',
                boxShadow: '0 4px 16px #0d2e2320',
              }}
            >
              <Link
                href={`/dashboard/contactos/${contacto.id}`}
                className="block text-xs px-2 py-1.5 rounded-lg hover:opacity-70"
                style={{ color: '#0d2e23' }}
              >
                Ver detalle
              </Link>

              <p className="text-xs px-2 pt-2 pb-1" style={{ color: '#0d2e2360' }}>
                Temperatura
              </p>
              <div className="flex gap-1 px-2 mb-2">
                {OPCIONES.map(opcion => (
                  <button
                    key={opcion}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await actualizarTemperatura(contacto.id, opcion)
                        cerrar()
                      })
                    }
                    className="text-xs rounded-full px-2.5 py-1 cursor-pointer disabled:opacity-50 capitalize"
                    style={
                      opcion === contacto.temperatura
                        ? { backgroundColor: '#c5f54a', color: '#0d2e23' }
                        : { border: '1px solid #0d2e2320', color: '#0d2e2380' }
                    }
                  >
                    {opcion}
                  </button>
                ))}
              </div>

              <div className="border-t pt-2 px-2 flex flex-col gap-1.5" style={{ borderColor: '#0d2e2315' }}>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      if (contacto.estado === 'descartado') await reactivarContacto(contacto.id)
                      else await descartarContacto(contacto.id)
                      cerrar()
                    })
                  }
                  className="text-xs cursor-pointer text-left disabled:opacity-50"
                  style={{ color: '#0d2e2380' }}
                >
                  {contacto.estado === 'descartado' ? 'Reactivar' : 'Descartar'}
                </button>
                {!confirmandoEliminar ? (
                  <button
                    onClick={() => setConfirmandoEliminar(true)}
                    className="text-xs cursor-pointer text-left"
                    style={{ color: '#b91c1c' }}
                  >
                    Eliminar
                  </button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs" style={{ color: '#0d2e2370' }}>
                      ¿Eliminar? Si viene de un prospecto/hallazgo, volverá a revisión.
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await eliminarContacto(contacto.id)
                            cerrar()
                          })
                        }
                        className="text-xs font-semibold cursor-pointer disabled:opacity-50"
                        style={{ color: '#b91c1c' }}
                      >
                        {isPending ? 'Eliminando...' : 'Sí, eliminar'}
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() => setConfirmandoEliminar(false)}
                        className="text-xs cursor-pointer disabled:opacity-50"
                        style={{ color: '#0d2e2360' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
