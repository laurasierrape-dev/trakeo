'use client'

import { useState, useTransition } from 'react'
import { invitarUsuario } from './actions'

export function InvitarUsuarioForm() {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)
    startTransition(async () => {
      const resultado = await invitarUsuario(email)
      if (resultado.ok) {
        setMensaje({ tipo: 'ok', texto: resultado.mensaje })
        setEmail('')
      } else {
        setMensaje({ tipo: 'error', texto: resultado.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-sm mb-6">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="rounded-lg px-3 py-2 text-sm focus:outline-none flex-1"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2320', color: '#0d2e23' }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="text-sm font-semibold rounded-lg px-4 py-2 cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
        >
          {isPending ? 'Invitando...' : 'Invitar usuario'}
        </button>
      </div>
      {mensaje && (
        <p className="text-xs" style={{ color: mensaje.tipo === 'ok' ? '#0d2e2380' : '#b91c1c' }}>
          {mensaje.texto}
        </p>
      )}
    </form>
  )
}
