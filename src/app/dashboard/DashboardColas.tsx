'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { calcularColas, colaMasUrgente, totalPendientes, type NombreCola } from '@/lib/dashboardColas'
import { BandejaList } from './bandeja/BandejaList'
import type { Contacto, Hallazgo, Prospecto, Proyecto } from '@/lib/types'
import {
  tablaContenedorStyle,
  tablaHeaderRowStyle,
  tablaHeaderCellClass,
  tablaHeaderCellStyle,
  tablaRowStyle,
  tablaCellPrimaryClass,
  tablaCellPrimaryStyle,
  tablaCellClass,
  tablaCellStyle,
} from '@/lib/tableStyles'

type ContactoLista = Pick<Contacto, 'id' | 'nombre_empresa' | 'temperatura' | 'proximo_toque'>

const ETIQUETAS: Record<NombreCola, string> = {
  porRevisar: 'Leads por revisar',
  toqueVencido: 'Toque vencido',
  interesadoSinProximoPaso: 'Interesado sin próximo paso',
}

export function DashboardColas({
  prospectos,
  totalProspectos,
  paginaProspectos,
  tamanoProspectos,
  hallazgos,
  proyectos,
  toquesVencidos,
  interesadosSinProximoPaso,
  hoyISO,
  nombresBusqueda,
}: {
  prospectos: Prospecto[]
  // Total real de prospectos sin revisar (prospectos puede ser solo una
  // página de ese total — ver src/lib/colaRevision.ts). Sin esto el
  // contador "Leads por revisar" quedaba capado a lo que Supabase devuelve
  // por defecto (1000 filas) en vez del total real.
  totalProspectos: number
  paginaProspectos: number
  tamanoProspectos: number
  hallazgos: Hallazgo[]
  proyectos: Proyecto[]
  toquesVencidos: ContactoLista[]
  interesadosSinProximoPaso: ContactoLista[]
  hoyISO: string
  nombresBusqueda?: Record<string, string>
}) {
  const colas = useMemo(
    () =>
      calcularColas({
        porRevisar: totalProspectos + hallazgos.length,
        // El cálculo real de las dos colas basadas en fecha ya se hizo en el
        // servidor (son las listas que llegaron por props); acá solo se usan
        // sus largos para los contadores, evitando repetir la lógica de
        // fechas en el cliente con el reloj del navegador.
        contactos: [
          ...toquesVencidos.map(c => ({
            estado: 'activo' as const,
            temperatura: c.temperatura,
            proximo_toque: c.proximo_toque,
          })),
          ...interesadosSinProximoPaso.map(c => ({
            estado: 'activo' as const,
            temperatura: c.temperatura,
            proximo_toque: c.proximo_toque,
          })),
        ],
        hoyISO,
      }),
    [totalProspectos, hallazgos.length, toquesVencidos, interesadosSinProximoPaso, hoyISO]
  )

  const [seleccion, setSeleccion] = useState<NombreCola | null>(colaMasUrgente(colas))
  const total = totalPendientes(colas)

  return (
    <div>
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {(Object.keys(ETIQUETAS) as NombreCola[]).map(nombre => {
          const valor = colas[nombre]
          const activa = seleccion === nombre
          return (
            <button
              key={nombre}
              onClick={() => setSeleccion(nombre)}
              className="text-left rounded-xl p-3.5 cursor-pointer transition-colors"
              style={{
                backgroundColor: activa ? 'white' : '#0d2e2308',
                border: activa ? '1px solid #0d2e2335' : '1px solid transparent',
              }}
            >
              <span
                className="block text-2xl font-semibold"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: valor > 0 ? '#b06c0a' : '#0d2e2340',
                }}
              >
                {valor}
              </span>
              <span className="text-xs" style={{ color: '#0d2e2370' }}>
                {ETIQUETAS[nombre]}
              </span>
            </button>
          )
        })}
      </div>

      {total === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
        >
          <p className="text-sm mb-4" style={{ color: '#0d2e2380' }}>
            No tienes nada pendiente. Lo siguiente sería traer empresas nuevas.
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/dashboard/scraping"
              className="text-xs font-semibold rounded-full px-4 py-2"
              style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
            >
              Bookmarklet
            </Link>
            <Link
              href="/dashboard/prospectos"
              className="text-xs rounded-full px-4 py-2"
              style={{ border: '1px solid #0d2e2330', color: '#0d2e23a0' }}
            >
              Importar CSV
            </Link>
          </div>
        </div>
      )}

      {seleccion === 'porRevisar' && colas.porRevisar > 0 && (
        <BandejaList
          prospectos={prospectos}
          totalProspectos={totalProspectos}
          paginaProspectos={paginaProspectos}
          tamanoProspectos={tamanoProspectos}
          hallazgos={hallazgos}
          proyectos={proyectos}
          nombresBusqueda={nombresBusqueda}
        />
      )}

      {seleccion === 'toqueVencido' && colas.toqueVencido > 0 && (
        <ListaContactos
          titulo="Toques vencidos"
          contactos={toquesVencidos}
          mostrarTemperatura
        />
      )}

      {seleccion === 'interesadoSinProximoPaso' && colas.interesadoSinProximoPaso > 0 && (
        <ListaContactos
          titulo="Interesados sin próximo paso"
          contactos={interesadosSinProximoPaso}
        />
      )}
    </div>
  )
}

// Las colas de toques/interesados son de solo lectura: entrar al detalle
// del contacto (donde ya viven NuevoToqueForm/ProximoToqueForm) es la
// acción, en vez de duplicar esos formularios acá dentro.
function ListaContactos({
  titulo,
  contactos,
  mostrarTemperatura,
}: {
  titulo: string
  contactos: ContactoLista[]
  mostrarTemperatura?: boolean
}) {
  return (
    <div>
      <h2 className="text-sm font-medium mb-3" style={{ color: '#0d2e23a0' }}>
        {titulo}
      </h2>
      <div className="rounded-2xl overflow-hidden overflow-x-auto" style={tablaContenedorStyle}>
        <table className="w-full">
          <thead>
            <tr style={tablaHeaderRowStyle}>
              <th className={tablaHeaderCellClass} style={tablaHeaderCellStyle}>Empresa</th>
              {mostrarTemperatura && (
                <th className={tablaHeaderCellClass} style={tablaHeaderCellStyle}>Temperatura</th>
              )}
              <th className={tablaHeaderCellClass} style={tablaHeaderCellStyle}>Próximo toque</th>
              <th className={tablaHeaderCellClass} style={tablaHeaderCellStyle}></th>
            </tr>
          </thead>
          <tbody>
            {contactos.map(c => (
              <tr key={c.id} style={tablaRowStyle}>
                <td className={tablaCellPrimaryClass} style={tablaCellPrimaryStyle}>
                  {c.nombre_empresa}
                </td>
                {mostrarTemperatura && (
                  <td className={`${tablaCellClass} capitalize`} style={tablaCellStyle}>
                    {c.temperatura}
                  </td>
                )}
                <td className={tablaCellClass} style={tablaCellStyle}>
                  {c.proximo_toque || '—'}
                </td>
                <td className={tablaCellClass} style={tablaCellStyle}>
                  <Link href={`/dashboard/contactos/${c.id}`} style={{ color: '#186b54' }}>
                    Ver contacto →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
