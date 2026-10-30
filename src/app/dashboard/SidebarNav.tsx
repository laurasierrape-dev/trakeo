'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Target, Radar, ShieldCheck } from 'lucide-react'

const ITEMS = [
  { href: '/dashboard', label: 'Contactos', icon: Users },
  { href: '/dashboard/prospectos', label: 'Prospectos', icon: Target },
  { href: '/dashboard/scraping', label: 'Scraping', icon: Radar },
] as const

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
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
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
            style={{
              backgroundColor: activo ? '#c5f54a30' : 'transparent',
              color: activo ? '#0d2e23' : '#0d2e23a0',
            }}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
