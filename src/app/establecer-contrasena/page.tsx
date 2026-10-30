'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EstablecerContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [listo, setListo] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setListo(true)
      }
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.')
      setStatus('error')
      return
    }
    if (password !== confirmar) {
      setErrorMsg('Las contraseñas no coinciden.')
      setStatus('error')
      return
    }

    setStatus('loading')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg('Algo salió mal. Intenta de nuevo.')
      setStatus('error')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (!listo) return null

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
          Elige tu contraseña
        </h1>
        <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
          Mínimo 8 caracteres.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="rounded-xl px-4 py-3.5 text-sm focus:outline-none"
            style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            required
            className="rounded-xl px-4 py-3.5 text-sm focus:outline-none"
            style={{ backgroundColor: 'white', border: '1.5px solid #0d2e2320', color: '#0d2e23' }}
          />
          {status === 'error' && (
            <p className="text-xs" style={{ color: '#b91c1c' }}>
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="font-semibold rounded-full px-6 py-3.5 transition-colors cursor-pointer text-sm mt-1 disabled:opacity-50"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            {status === 'loading' ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
