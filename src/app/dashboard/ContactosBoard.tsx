'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatFiltro } from '@/components/ChatFiltro'
import { ContactoRowMenu } from './ContactoRowMenu'
import type { Contacto } from '@/lib/types'

const PILL_ESTILO: Record<Contacto['temperatura'], { backgroundColor: string; color: string }> = {
  vinculado: { backgroundColor: '#c5f54a', color: '#0d2e23' },
  interesado: { backgroundColor: '#c5f54a40', color: '#0d2e23' },
  frio: { backgroundColor: '#0d2e2310', color: '#0d2e2360' },
}

function Stat({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
      <p className="text-xs font-medium mb-2" style={{ color: '#0d2e2360' }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        {valor}
      </p>
    </div>
  )
}

export function ContactosBoard({ contactos }: { contactos: Contacto[] }) {
  const router = useRouter()
  const [idsIA, setIdsIA] = useState<Set<string> | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const stats = useMemo(
    () => ({
      total: contactos.length,
      interesados: contactos.filter(c => c.temperatura === 'interesado').length,
      vinculados: contactos.filter(c => c.temperatura === 'vinculado').length,
      conProximoToque: contactos.filter(c => c.proximo_toque).length,
    }),
    [contactos]
  )

  const filtrados = contactos.filter(c => {
    if (idsIA && !idsIA.has(c.id)) return false
    if (busqueda && !c.nombre_empresa.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Stat label="Contactos totales" valor={stats.total} />
        <Stat label="Interesados" valor={stats.interesados} />
        <Stat label="Vinculados" valor={stats.vinculados} />
        <Stat label="Con próximo toque" valor={stats.conProximoToque} />
      </div>

      <ChatFiltro items={contactos} onResultado={ids => setIdsIA(ids ? new Set(ids) : null)} />

      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="rounded-lg px-3 py-2 text-xs focus:outline-none mb-4 w-full max-w-xs"
        style={{ backgroundColor: 'white', color: '#0d2e23', border: '1px solid #0d2e2315' }}
      />

      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
      >
        {filtrados.length === 0 ? (
          <p className="text-sm p-5" style={{ color: '#0d2e2370' }}>
            No hay contactos que coincidan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #0d2e2315' }}>
                {['Empresa', 'Representante', 'Teléfono', 'Temperatura', 'Próximo toque', ''].map(h => (
                  <th
                    key={h}
                    className="text-left font-medium px-4 py-3 text-xs"
                    style={{ color: '#0d2e2360' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/dashboard/contactos/${c.id}`)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid #0d2e2308' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: '#0d2e23' }}>
                    {c.nombre_empresa}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {c.representante || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: '#0d2e2370' }}>
                    {c.telefono || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                      style={PILL_ESTILO[c.temperatura]}
                    >
                      {c.temperatura}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: c.proximo_toque ? '#186b54' : '#0d2e2350' }}>
                    {c.proximo_toque || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ContactoRowMenu contacto={c} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
