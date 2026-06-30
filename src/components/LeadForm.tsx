'use client'

import { useState } from 'react'

export default function LeadForm() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email }),
    })

    const data = await res.json()

    if (res.ok) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(data.error || 'Algo salió mal. Intenta de nuevo.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#c5f54a' }}>
        <div className="text-3xl mb-4">✓</div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: '#0d2e23' }}>¡Ya estás dentro!</h3>
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          Te contactamos en las próximas 48 horas con tu acceso anticipado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Tu nombre"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        required
        className="rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-colors"
        style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
      />
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-colors"
        style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
      />
      {status === 'error' && (
        <p className="text-xs" style={{ color: '#b91c1c' }}>{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="font-semibold rounded-full px-6 py-3.5 transition-colors cursor-pointer text-sm mt-1 disabled:opacity-50"
        style={{ backgroundColor: '#0d2e23', color: '#f3efe5' }}
      >
        {status === 'loading' ? 'Guardando...' : 'Quiero acceso anticipado →'}
      </button>
      <p className="text-xs text-center mt-1" style={{ color: '#0d2e2345' }}>
        Sin spam. Solo te avisamos cuando Trakeo esté listo.
      </p>
    </form>
  )
}
