'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!abierto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: '#0d2e2360' }}
      onClick={onCerrar}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'white' }}
        onClick={e => e.stopPropagation()}
      >
        {titulo && (
          <h2
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}
          >
            {titulo}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
