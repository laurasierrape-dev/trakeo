'use client'

import { useState, useTransition } from 'react'
import { revocarAcceso, restaurarAcceso, eliminarUsuario } from './actions'

type Usuario = {
  id: string
  email: string | undefined
  banned: boolean
  created_at: string
}

export function UsuarioRow({ usuario }: { usuario: Usuario }) {
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <tr style={{ borderBottom: '1px solid #0d2e2310' }}>
      <td className="py-3 pr-4 text-sm" style={{ color: '#0d2e23' }}>
        {usuario.email}
      </td>
      <td className="py-3 pr-4 text-xs" style={{ color: '#0d2e2370' }}>
        {new Date(usuario.created_at).toLocaleDateString('es-CO')}
      </td>
      <td className="py-3 pr-4 text-xs">
        <span
          className="px-2 py-1 rounded-full font-medium"
          style={
            usuario.banned
              ? { backgroundColor: '#b91c1c15', color: '#b91c1c' }
              : { backgroundColor: '#c5f54a40', color: '#0d2e23' }
          }
        >
          {usuario.banned ? 'Acceso revocado' : 'Activo'}
        </span>
      </td>
      <td className="py-3 flex items-center gap-3 flex-wrap">
        {usuario.banned ? (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => restaurarAcceso(usuario.id))}
            className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            Restaurar acceso
          </button>
        ) : (
          <button
            disabled={isPending}
            onClick={() => startTransition(() => revocarAcceso(usuario.id))}
            className="text-xs rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
            style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
          >
            Revocar acceso
          </button>
        )}

        {confirmandoEliminar ? (
          <>
            <span className="text-xs" style={{ color: '#b91c1c' }}>
              ¿Eliminar para siempre?
            </span>
            <button
              disabled={isPending}
              onClick={() => startTransition(() => eliminarUsuario(usuario.id))}
              className="text-xs font-semibold rounded-full px-3 py-1.5 cursor-pointer disabled:opacity-50"
              style={{ border: '1px solid #b91c1c40', color: '#b91c1c' }}
            >
              Sí, eliminar
            </button>
            <button
              disabled={isPending}
              onClick={() => setConfirmandoEliminar(false)}
              className="text-xs cursor-pointer disabled:opacity-50"
              style={{ color: '#0d2e23a0' }}
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            disabled={isPending}
            onClick={() => setConfirmandoEliminar(true)}
            className="text-xs cursor-pointer disabled:opacity-50"
            style={{ color: '#0d2e2360' }}
          >
            Eliminar
          </button>
        )}
      </td>
    </tr>
  )
}
