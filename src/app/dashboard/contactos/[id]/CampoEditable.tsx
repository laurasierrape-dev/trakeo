'use client'

import { useRef, useState, useTransition, type CSSProperties } from 'react'
import { actualizarCampoContacto } from '../../actions'
import type { CampoContactoEditable } from '@/lib/contactoManual'

// Edición in-place de un campo fijo de contacto (Fase 1 de "Datos
// Desbloqueados" — corregir lo que trajo la importación). Click para editar,
// Enter o blur guarda, Escape cancela. Sin modo "guardar" separado: el mismo
// patrón de auto-guardado que ya usan TemperaturaSelector/ProximoToqueForm.
export function CampoEditable({
  contactoId,
  campo,
  valor,
  placeholder = 'Agregar...',
  multiline = false,
  displayClassName = '',
  displayStyle,
}: {
  contactoId: string
  campo: CampoContactoEditable
  valor: string | null
  placeholder?: string
  multiline?: boolean
  displayClassName?: string
  displayStyle?: CSSProperties
}) {
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  function guardar() {
    const nuevoValor = inputRef.current?.value ?? ''
    if (nuevoValor === (valor ?? '')) {
      setEditando(false)
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await actualizarCampoContacto(contactoId, campo, nuevoValor)
        setEditando(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar.')
      }
    })
  }

  if (editando) {
    const Comp = multiline ? 'textarea' : 'input'
    return (
      <div>
        <Comp
          ref={inputRef as never}
          defaultValue={valor ?? ''}
          autoFocus
          disabled={isPending}
          rows={multiline ? 3 : undefined}
          onBlur={guardar}
          onKeyDown={e => {
            if (e.key === 'Enter' && !multiline) guardar()
            if (e.key === 'Escape') setEditando(false)
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none resize-none"
          style={{ border: '1px solid #186b54', color: '#0d2e23' }}
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className="group flex items-start gap-1.5 text-left cursor-pointer rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-[#0d2e2306] w-full"
    >
      <span
        className={`${displayClassName} ${valor ? '' : 'italic'}`}
        style={{
          color: valor ? '#0d2e23' : '#0d2e2350',
          whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
          ...displayStyle,
        }}
      >
        {valor || placeholder}
      </span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
        style={{ color: '#0d2e23' }}
      >
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  )
}
