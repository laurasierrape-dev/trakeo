'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0d2e23' }}
    >
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: '#f3efe5' }}>
          Trakeo
        </h1>
        <p className="text-sm mb-6" style={{ color: '#f3efe580' }}>
          Ingresa con tu email para acceder a tu pipeline.
        </p>

        {status === 'sent' ? (
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#c5f54a' }}>
            <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
              Revisa tu correo — te enviamos un link de acceso.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="rounded-xl px-4 py-3.5 text-sm focus:outline-none"
              style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
            />
            {status === 'error' && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                Algo salió mal. Intenta de nuevo.
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'loading'}
              className="font-semibold rounded-full px-6 py-3.5 transition-colors cursor-pointer text-sm mt-1 disabled:opacity-50"
              style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
            >
              {status === 'loading' ? 'Enviando...' : 'Enviarme el link de acceso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
