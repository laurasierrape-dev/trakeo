'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { FiltrosFacetas, OpcionesFacetas } from '@/lib/colaRevision'
import { hayFiltrosFacetasActivos } from '@/lib/colaRevision'

const selectStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

// Barra de filtros reales sobre prospectos (Fase 3 de "Datos Desbloqueados")
// — complementa el buscador de texto libre y la IA de ChatFiltro, que
// siguen operando sobre esta misma lista ya filtrada por el servidor.
export function FiltrosFacetados({
  opciones,
  filtros,
}: {
  opciones: OpcionesFacetas
  filtros: FiltrosFacetas
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function actualizar(clave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) params.set(clave, valor)
    else params.delete(clave)
    params.set('pagina', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  function limpiarFiltros() {
    const params = new URLSearchParams(searchParams.toString())
    for (const clave of Array.from(params.keys())) {
      if (clave.startsWith('f_')) params.delete(clave)
    }
    params.set('pagina', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const dinamicosConOpciones = Object.entries(opciones.dinamicos).filter(([, valores]) => valores.length > 0)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {opciones.sectores.length > 0 && (
        <select
          value={filtros.sector ?? ''}
          onChange={e => actualizar('f_sector', e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none"
          style={selectStyle}
        >
          <option value="">Sector: cualquiera</option>
          {opciones.sectores.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      {opciones.zonas.length > 0 && (
        <select
          value={filtros.zona ?? ''}
          onChange={e => actualizar('f_zona', e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none"
          style={selectStyle}
        >
          <option value="">Zona: cualquiera</option>
          {opciones.zonas.map(z => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      )}
      <select
        value={filtros.telefono ?? ''}
        onChange={e => actualizar('f_telefono', e.target.value)}
        className="rounded-lg px-3 py-2 text-xs focus:outline-none"
        style={selectStyle}
      >
        <option value="">Teléfono: cualquiera</option>
        <option value="con">Con teléfono</option>
        <option value="sin">Sin teléfono</option>
      </select>
      <select
        value={filtros.email ?? ''}
        onChange={e => actualizar('f_email', e.target.value)}
        className="rounded-lg px-3 py-2 text-xs focus:outline-none"
        style={selectStyle}
      >
        <option value="">Email: cualquiera</option>
        <option value="con">Con email</option>
        <option value="sin">Sin email</option>
      </select>
      {dinamicosConOpciones.map(([campo, valores]) => (
        <select
          key={campo}
          value={filtros.dinamicos[campo] ?? ''}
          onChange={e => actualizar(`f_${campo}`, e.target.value)}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none"
          style={selectStyle}
        >
          <option value="">{campo}: cualquiera</option>
          {valores.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      ))}
      {hayFiltrosFacetasActivos(filtros) && (
        <button
          type="button"
          onClick={limpiarFiltros}
          className="text-xs cursor-pointer"
          style={{ color: '#0d2e2360' }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
