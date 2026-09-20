import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Contacto } from '@/lib/types'

const TEMPERATURAS = [
  { key: 'interesado', label: 'Interesado' },
  { key: 'vinculado', label: 'Vinculado' },
  { key: 'frio', label: 'Frío' },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: contactos } = await supabase
    .from('contactos')
    .select('*')
    .order('proximo_toque', { ascending: true, nullsFirst: false })

  const porTemperatura = (temp: string) =>
    ((contactos as Contacto[] | null) ?? []).filter(c => c.temperatura === temp)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: '#f3efe5' }}>
        Tu pipeline
      </h1>

      {(contactos ?? []).length === 0 && (
        <p className="text-sm" style={{ color: '#f3efe580' }}>
          Todavía no tienes contactos.{' '}
          <Link href="/dashboard/prospectos" style={{ color: '#c5f54a' }}>
            Revisa los prospectos disponibles →
          </Link>
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {TEMPERATURAS.map(({ key, label }) => (
          <div key={key}>
            <h2 className="text-sm font-medium mb-3" style={{ color: '#f3efe5a0' }}>
              {label} ({porTemperatura(key).length})
            </h2>
            <div className="flex flex-col gap-2">
              {porTemperatura(key).map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/contactos/${c.id}`}
                  className="block rounded-xl p-4 transition-colors"
                  style={{ backgroundColor: '#ffffff0d', border: '1px solid #f3efe520' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#f3efe5' }}>
                    {c.nombre_empresa}
                  </p>
                  {c.representante && (
                    <p className="text-xs mt-1" style={{ color: '#f3efe570' }}>
                      {c.representante}
                    </p>
                  )}
                  {c.proximo_toque && (
                    <p className="text-xs mt-2" style={{ color: '#c5f54a' }}>
                      Próximo toque: {c.proximo_toque}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
