'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TAMANOS_PAGINA } from '@/lib/colaRevision'

const selectStyle = {
  backgroundColor: 'white',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

export function Paginador({
  pagina,
  tamano,
  total,
}: {
  pagina: number
  tamano: number
  total: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const totalPaginas = Math.max(1, Math.ceil(total / tamano))

  function irA(paginaNueva: number, tamanoNuevo: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('pagina', String(paginaNueva))
    params.set('tamano', String(tamanoNuevo))
    router.push(`${pathname}?${params.toString()}`)
  }

  if (total === 0) return null

  const desde = (pagina - 1) * tamano + 1
  const hasta = Math.min(pagina * tamano, total)

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
      <p className="text-xs" style={{ color: '#0d2e2360' }}>
        {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <select
          value={tamano}
          onChange={e => irA(1, Number(e.target.value))}
          className="rounded-lg px-2 py-1.5 text-xs"
          style={selectStyle}
        >
          {TAMANOS_PAGINA.map(t => (
            <option key={t} value={t}>
              {t} por página
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => irA(pagina - 1, tamano)}
          className="text-xs rounded-lg px-3 py-1.5 disabled:opacity-30"
          style={selectStyle}
        >
          Anterior
        </button>
        <span className="text-xs" style={{ color: '#0d2e2360' }}>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => irA(pagina + 1, tamano)}
          className="text-xs rounded-lg px-3 py-1.5 disabled:opacity-30"
          style={selectStyle}
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
