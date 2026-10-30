'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'

type Mensaje = { pregunta: string; respuesta: string }

const inputStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #c5f54a00',
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
    <div
      className="mb-4 rounded-2xl p-3"
      style={{ backgroundColor: '#f2f7dd', border: '1px solid #c5f54a60' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
          style={{ backgroundColor: '#0d2e23' }}
        >
          <Sparkles size={11} color="#c5f54a" strokeWidth={2.5} />
        </div>
        <span className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: '#5a7a1f' }}>
          Búsqueda con IA
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Busca en lenguaje natural: solo empresas en Bogotá con teléfono..."
          value={pregunta}
          onChange={e => setPregunta(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviar()}
          disabled={isPending}
          className="rounded-lg px-3 py-2 text-[13px] focus:outline-none flex-1 disabled:opacity-50"
          style={inputStyle}
        />
        <button
          onClick={enviar}
          disabled={isPending || !pregunta.trim()}
          className="text-xs font-semibold rounded-lg px-4 py-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: '#0d2e23', color: '#c5f54a' }}
        >
          {isPending ? 'Pensando...' : 'Preguntar'}
        </button>
        {activo && (
          <button
            onClick={limpiar}
            className="text-xs rounded-lg px-3 py-2 cursor-pointer whitespace-nowrap"
            style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {historial.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-2.5 pt-2.5" style={{ borderTop: '1px solid #c5f54a50' }}>
          {historial.map((m, i) => (
            <p key={i} className="text-xs" style={{ color: '#0d2e2380' }}>
              <span style={{ color: '#186b54', fontWeight: 600 }}>{m.pregunta}</span> — {m.respuesta}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
