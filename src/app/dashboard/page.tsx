import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Contacto } from '@/lib/types'
import { ContactosBoard } from './ContactosBoard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: contactos } = await supabase
    .from('contactos')
    .select('*')
    .order('proximo_toque', { ascending: true, nullsFirst: false })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Tu pipeline
      </h1>

      {(contactos ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          Todavía no tienes contactos.{' '}
          <Link href="/dashboard/prospectos" style={{ color: '#c5f54a' }}>
            Revisa los prospectos disponibles →
          </Link>
        </p>
      ) : (
        <ContactosBoard contactos={(contactos as Contacto[] | null) ?? []} />
      )}
    </div>
  )
}
