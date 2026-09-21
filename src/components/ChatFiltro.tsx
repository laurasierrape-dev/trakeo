'use client'

import { useState, useTransition } from 'react'

type Mensaje = { pregunta: string; respuesta: string }

const inputStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

export function ChatFiltro({
  items,
  onResultado,
}: {
  items: { id: string }[]
  onResultado: (ids: string[] | null, respuesta: string) => void
}) {
  const [pregunta, setPregunta] = useState('')
  const [historial, setHistorial] = useState<Mensaje[]>([])
  const [activo, setActivo] = useState(false)
  const [isPending, startTransition] = useTransition()

  function enviar() {
    if (!pregunta.trim() || isPending) return
    const preguntaActual = pregunta.trim()
    setPregunta('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/chat-filtro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, pregunta: preguntaActual }),
        })
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)

        setHistorial(h => [...h.slice(-2), { pregunta: preguntaActual, respuesta: data.respuesta }])
        setActivo(true)
        onResultado(data.ids, data.respuesta)
      } catch {
        setHistorial(h => [
          ...h.slice(-2),
          { pregunta: preguntaActual, respuesta: 'No se pudo procesar la pregunta. Intenta de nuevo.' },
        ])
      }
    })
  }

  function limpiar() {
    setHistorial([])
    setActivo(false)
    onResultado(null, '')
  }

  return (
    <div className="mb-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Busca en lenguaje natural: solo empresas en Bogotá con teléfono..."
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
          disabled={isPending}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none flex-1 disabled:opacity-50"
          style={inputStyle}
        />
        <button
          onClick={enviar}
          disabled={isPending || !pregunta.trim()}
          className="text-xs font-semibold rounded-lg px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
        >
          {isPending ? '...' : 'Preguntar'}
        </button>
        {activo && (
          <button
            onClick={limpiar}
            className="text-xs rounded-lg px-3 py-2 cursor-pointer"
            style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {historial.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2">
          {historial.map((m, i) => (
            <p key={i} className="text-xs" style={{ color: '#0d2e2380' }}>
              <span style={{ color: '#186b54' }}>{m.pregunta}</span> — {m.respuesta}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
