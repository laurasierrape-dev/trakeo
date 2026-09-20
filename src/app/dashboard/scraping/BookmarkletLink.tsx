'use client'

import { useEffect, useRef } from 'react'

export function BookmarkletLink({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null)

  // React 19 bloquea los href="javascript:..." puestos como prop JSX (por seguridad).
  // Asignarlo directo al elemento del DOM evita ese chequeo.
  useEffect(() => {
    if (ref.current) ref.current.href = href
  }, [href])

  return (
    <a
      ref={ref}
      onClick={e => e.preventDefault()}
      className="inline-block text-sm font-semibold rounded-full px-6 py-3 cursor-move select-none"
      style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
    >
      Extraer prospectos de esta página
    </a>
  )
}
