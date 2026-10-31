'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Users, FolderKanban, Search, ShieldCheck } from 'lucide-react'

// "Bandeja" no es un ítem propio: Dashboard ya muestra ese mismo triaje
// completo en su cola "Por revisar" — tener las dos confundía más de lo que
// ayudaba. La ruta /dashboard/bandeja se queda viva (la usan los enlaces
// "Ver en bandeja" desde Búsquedas y el bookmarklet), solo sale del menú.
const ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/dashboard/contactos', label: 'Contactos', icon: Users },
  { href: '/dashboard/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/dashboard/busquedas', label: 'Búsquedas', icon: Search },
] as const

export function SidebarNav({ isAdmin, colapsado }: { isAdmin: boolean; colapsado: boolean }) {
  const pathname = usePathname()
  const items = isAdmin
    ? [...ITEMS, { href: '/dashboard/admin', label: 'Administración', icon: ShieldCheck }]
    : ITEMS

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const activo = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            title={colapsado ? label : undefined}
            className="flex items-center gap-3 rounded-xl py-2.5 text-sm transition-colors"
            style={{
              backgroundColor: activo ? '#c5f54a30' : 'transparent',
              color: activo ? '#0d2e23' : '#0d2e23a0',
              justifyContent: colapsado ? 'center' : 'flex-start',
              paddingLeft: colapsado ? 0 : 12,
              paddingRight: colapsado ? 0 : 12,
            }}
          >
            <Icon size={16} strokeWidth={2} />
            {!colapsado && label}
          </Link>
        )
      })}
    </nav>
  )
}
