'use client'

import { useSyncExternalStore } from 'react'
import { ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import { SidebarNav } from './SidebarNav'

const STORAGE_KEY = 'trakeo_sidebar_colapsado'
// localStorage no dispara el evento nativo "storage" en la misma pestaña que
// escribió el valor (solo en otras pestañas) — este evento propio es lo que
// hace que useSyncExternalStore vuelva a leer y re-renderice al alternar.
const EVENTO_CAMBIO = 'trakeo-sidebar-colapsado-cambio'
const ANCHO_EXPANDIDO = 240
const ANCHO_COLAPSADO = 68

function suscribirse(callback: () => void) {
  window.addEventListener(EVENTO_CAMBIO, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENTO_CAMBIO, callback)
    window.removeEventListener('storage', callback)
  }
}

function leerColapsado() {
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

// En el servidor no existe localStorage — arranca expandido, igual que el
// primer render del cliente antes de hidratar. useSyncExternalStore se
// encarga de que ese primer render coincida con el del servidor sin
// warnings de hidratación, y resuelve al valor real apenas puede leerlo.
function leerColapsadoServidor() {
  return false
}

export function SidebarShell({ isAdmin, email }: { isAdmin: boolean; email: string }) {
  const colapsado = useSyncExternalStore(suscribirse, leerColapsado, leerColapsadoServidor)

  function alternar() {
    window.localStorage.setItem(STORAGE_KEY, colapsado ? '0' : '1')
    window.dispatchEvent(new Event(EVENTO_CAMBIO))
  }

  return (
    <aside
      className="shrink-0 flex flex-col px-3 py-6 transition-[width] duration-150"
      style={{ borderRight: '1px solid #0d2e2315', width: colapsado ? ANCHO_COLAPSADO : ANCHO_EXPANDIDO }}
    >
      <div
        className="flex items-center mb-6 px-1"
        style={{ justifyContent: colapsado ? 'center' : 'space-between' }}
      >
        {!colapsado && (
          <span className="font-semibold px-2" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
            Trakeo
          </span>
        )}
        <button
          onClick={alternar}
          title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
          className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-colors hover:bg-[#0d2e2310]"
          style={{ color: '#0d2e2360' }}
        >
          {colapsado ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      <SidebarNav isAdmin={isAdmin} colapsado={colapsado} />

      <div className="mt-auto pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid #0d2e2315' }}>
        {!colapsado && (
          <span className="text-xs truncate px-3" style={{ color: '#0d2e2360' }} title={email}>
            {email}
          </span>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            title={colapsado ? 'Cerrar sesión' : undefined}
            className="w-full flex items-center gap-2.5 text-sm font-medium rounded-lg py-2.5 cursor-pointer transition-colors hover:opacity-80"
            style={{
              border: '1px solid #0d2e2320',
              color: '#0d2e23',
              backgroundColor: 'white',
              justifyContent: colapsado ? 'center' : 'flex-start',
              paddingLeft: colapsado ? 0 : 12,
              paddingRight: colapsado ? 0 : 12,
            }}
          >
            <LogOut size={16} strokeWidth={2} />
            {!colapsado && 'Cerrar sesión'}
          </button>
        </form>
      </div>
    </aside>
  )
}
