'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Resumen = {
  filasLeidas: number
  nuevos: number
  duplicados: number
  fallidos: number
}

export function ImportarBase() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState<string | null>(null)

  function subirArchivo(archivo: File) {
    setError(null)
    setResumen(null)
    startTransition(async () => {
      const form = new FormData()
      form.append('archivo', archivo)
      try {
        const r = await fetch('/api/prospectos/importar', { method: 'POST', body: form })
        const data = await r.json()
        if (data.ok) {
          setResumen(data)
          router.refresh()
        } else {
          setError(data.error || 'Error desconocido al importar')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
            Importar tu propia base
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#0d2e2370' }}>
            Sube un .xlsx, .csv o .pdf — los prospectos que traiga aparecen aquí para revisar.
          </p>
        </div>
        <label
          className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer whitespace-nowrap"
          style={{
            backgroundColor: isPending ? '#c5f54a80' : '#c5f54a',
            color: '#0d2e23',
            pointerEvents: isPending ? 'none' : 'auto',
          }}
        >
          {isPending ? 'Importando...' : 'Importar base'}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            className="hidden"
            onChange={e => {
              const archivo = e.target.files?.[0]
              if (archivo) subirArchivo(archivo)
            }}
          />
        </label>
      </div>

      {resumen && (
        <p className="text-xs mt-3" style={{ color: '#186b54' }}>
          {resumen.filasLeidas} fila(s) leídas — {resumen.nuevos} nuevo(s), {resumen.duplicados} ya existían
          {resumen.fallidos > 0 ? `, ${resumen.fallidos} sin nombre reconocible` : ''}.
        </p>
      )}
      {error && (
        <p className="text-xs mt-3" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
    </div>
  )
}
