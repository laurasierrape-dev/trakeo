'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [linkInvalido, setLinkInvalido] = useState(false)

  // El callback redirige acá con ?error=auth cuando el link del correo ya
  // expiró o se usó antes. Sin este aviso la pantalla queda muda.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('error') === 'auth') {
      setLinkInvalido(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const supabase = createClient()
    const emailNormalizado = email.toLowerCase().trim()
    const { error } = await supabase.auth.signInWithPassword({
      email: emailNormalizado,
      password,
    })

    fetch('/api/login-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailNormalizado, exitoso: !error }),
    }).catch(() => {})

    if (error) {
      setStatus('error')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f3efe5' }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}
        >
          Trakeo
        </h1>
        <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
          Ingresa con tu email y contraseña para acceder a tu pipeline.
        </p>

        {linkInvalido && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-xs"
            style={{ backgroundColor: '#b91c1c10', color: '#b91c1c' }}
          >
            El link del correo ya expiró o fue usado. Pide una invitación nueva,
            o usa &quot;¿Olvidaste tu contraseña?&quot; si ya tienes cuenta.
          </div>
        )}

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
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="rounded-xl px-4 py-3.5 text-sm focus:outline-none"
            style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
          />
          {status === 'error' && (
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              Email o contraseña incorrectos. Intenta de nuevo.
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-semibold rounded-full px-6 py-3.5 transition-colors cursor-pointer text-sm mt-1 disabled:opacity-50"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            {status === 'loading' ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
          <Link
            href="/forgot-password"
            className="text-xs text-center mt-1"
            style={{ color: '#0d2e2380' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </form>
      </div>
    </div>
  )
}
