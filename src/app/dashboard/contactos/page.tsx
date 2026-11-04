import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Contacto, Proyecto } from '@/lib/types'
import { ContactosBoard } from '../ContactosBoard'
import { NuevoContactoModal } from './NuevoContactoModal'

// Vivía en /dashboard antes de que esa ruta pasara a ser el Dashboard de
// pendientes (colas + triaje) — ver docs/plan-reestructuracion.md, etapa 4.
export default async function ContactosPage() {
  const supabase = await createClient()
  const { data: contactos } = await supabase
    .from('contactos')
    .select('*')
    .order('proximo_toque', { ascending: true, nullsFirst: false })
  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('*')
    .order('nombre', { ascending: true })

  const listaProyectos = (proyectos as Proyecto[] | null) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
          Tu pipeline
        </h1>
        <NuevoContactoModal proyectos={listaProyectos} />
      </div>

      {(contactos ?? []).length === 0 ? (
        <p className="text-sm" style={{ color: '#0d2e2380' }}>
          Todavía no tienes contactos.{' '}
          <Link href="/dashboard/bandeja" style={{ color: '#c5f54a' }}>
            Revisa tu bandeja →
          </Link>
        </p>
      ) : (
        <ContactosBoard
          contactos={(contactos as Contacto[] | null) ?? []}
          proyectos={listaProyectos}
        />
      )}
    </div>
  )
}
