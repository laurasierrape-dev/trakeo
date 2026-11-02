'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leerArchivoTabular, type ArchivoTabular } from '@/lib/parsearTabular'
import { CAMPOS_DESTINO, mapearFilaConMapeo, sugerirMapeo, type FilaMapeada, type Mapeo } from '@/lib/importarMapeo'

type Resumen = {
  filasLeidas: number
  nuevos: number
  duplicados: number
  fallidos: number
}

// Cuántas filas va cada POST al servidor — mantiene el body bien lejos del
// límite de Vercel (~4.5MB) incluso con archivos de decenas de miles de
// filas, y permite mostrar progreso en vez de una sola espera larga.
const FILAS_POR_LOTE = 2000

type Paso =
  | { tipo: 'idle' }
  | { tipo: 'hoja'; archivo: File; tabular: ArchivoTabular; hoja: string }
  | { tipo: 'mapeo'; archivo: File; headers: string[]; filas: Record<string, unknown>[]; mapeo: Mapeo }
  | { tipo: 'preview'; archivo: File; filas: Record<string, unknown>[]; mapeo: Mapeo; candidatos: FilaMapeada[]; descartadas: number }
  | { tipo: 'importando'; progreso: string }

const selectEstilo = {
  backgroundColor: '#0d2e2306',
  color: '#0d2e23',
  border: '1px solid #0d2e2315',
}

export function ImportarBase() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [paso, setPaso] = useState<Paso>({ tipo: 'idle' })
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reiniciar() {
    setPaso({ tipo: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  async function onArchivoElegido(archivo: File) {
    setError(null)
    setResumen(null)
    const nombre = archivo.name.toLowerCase()

    // El PDF sigue el camino viejo: no es una tabla, necesita extracción con
    // IA en el servidor — no hay hoja ni columnas que elegir.
    if (nombre.endsWith('.pdf')) {
      startTransition(async () => {
        try {
          const form = new FormData()
          form.append('archivo', archivo)
          const r = await fetch('/api/prospectos/importar', { method: 'POST', body: form })
          const data = await r.json()
          if (data.ok) {
            setResumen(data)
            router.refresh()
          } else {
            setError(data.error || 'Error desconocido al importar')
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        }
        reiniciar()
      })
      return
    }

    try {
      const tabular = await leerArchivoTabular(archivo)
      if (tabular.hojas.length > 1) {
        setPaso({ tipo: 'hoja', archivo, tabular, hoja: tabular.hojaSugerida })
      } else {
        irAMapeo(archivo, tabular, tabular.hojaSugerida)
      }
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`)
      reiniciar()
    }
  }

  function irAMapeo(archivo: File, tabular: ArchivoTabular, hoja: string) {
    const { headers, filas } = tabular.obtenerFilas(hoja)
    if (headers.length === 0 || filas.length === 0) {
      setError(`La hoja "${hoja}" no tiene datos legibles.`)
      reiniciar()
      return
    }
    setPaso({ tipo: 'mapeo', archivo, headers, filas, mapeo: sugerirMapeo(headers) })
  }

  function irAPreview(archivo: File, filas: Record<string, unknown>[], mapeo: Mapeo) {
    const mapeadas = filas.map(f => mapearFilaConMapeo(f, mapeo))
    const candidatos = mapeadas.filter((f): f is FilaMapeada => f !== null)
    setPaso({
      tipo: 'preview',
      archivo,
      filas,
      mapeo,
      candidatos,
      descartadas: filas.length - candidatos.length,
    })
  }

  async function importar(archivo: File, candidatos: FilaMapeada[]) {
    setError(null)
    const totalLotes = Math.max(1, Math.ceil(candidatos.length / FILAS_POR_LOTE))
    let busquedaId: string | undefined
    let acumulado: Resumen = { filasLeidas: candidatos.length, nuevos: 0, duplicados: 0, fallidos: 0 }

    startTransition(async () => {
      try {
        for (let i = 0; i < totalLotes; i++) {
          setPaso({ tipo: 'importando', progreso: totalLotes > 1 ? `Lote ${i + 1} de ${totalLotes}...` : 'Importando...' })
          const lote = candidatos.slice(i * FILAS_POR_LOTE, (i + 1) * FILAS_POR_LOTE)
          const r = await fetch('/api/prospectos/importar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreArchivo: archivo.name, filas: lote, busquedaId }),
          })
          const data = await r.json()
          if (!data.ok) {
            setError(data.error || 'Error desconocido al importar')
            reiniciar()
            return
          }
          busquedaId = data.busquedaId
          acumulado = {
            filasLeidas: acumulado.filasLeidas,
            nuevos: acumulado.nuevos + data.nuevos,
            duplicados: acumulado.duplicados + data.duplicados,
            fallidos: acumulado.fallidos + data.fallidos,
          }
        }
        setResumen(acumulado)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
      reiniciar()
    })
  }

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium" style={{ color: '#0d2e23' }}>
            Importar tu propia base
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#0d2e2370' }}>
            Sube un .xlsx, .csv o .pdf — elegís qué columna es cuál antes de traer nada.
          </p>
        </div>
        {paso.tipo === 'idle' && (
          <label
            className="text-xs font-semibold rounded-full px-4 py-2 cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: isPending ? '#c5f54a80' : '#c5f54a',
              color: '#0d2e23',
              pointerEvents: isPending ? 'none' : 'auto',
            }}
          >
            {isPending ? 'Importando...' : 'Importar base'}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              onChange={e => {
                const archivo = e.target.files?.[0]
                if (archivo) onArchivoElegido(archivo)
              }}
            />
          </label>
        )}
        {paso.tipo !== 'idle' && paso.tipo !== 'importando' && (
          <button
            type="button"
            onClick={reiniciar}
            className="text-xs font-medium"
            style={{ color: '#0d2e2360' }}
          >
            Cancelar
          </button>
        )}
      </div>

      {paso.tipo === 'hoja' && (
        <div className="mt-4">
          <p className="text-xs mb-2" style={{ color: '#0d2e2380' }}>
            Este archivo tiene varias hojas — algunos exports (ej. Orbis) ponen un resumen en la primera y los
            datos reales en otra. Elegí cuál usar:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={paso.hoja}
              onChange={e => setPaso({ ...paso, hoja: e.target.value })}
              className="text-xs rounded-lg px-3 py-2"
              style={selectEstilo}
            >
              {paso.tabular.hojas.map(h => (
                <option key={h.nombre} value={h.nombre}>
                  {h.nombre} ({h.filas} filas)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => irAMapeo(paso.archivo, paso.tabular, paso.hoja)}
              className="text-xs font-semibold rounded-full px-4 py-2"
              style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {paso.tipo === 'mapeo' && (
        <div className="mt-4">
          <p className="text-xs mb-3" style={{ color: '#0d2e2380' }}>
            {paso.filas.length} fila(s) detectadas. Decí a qué campo va cada columna — &ldquo;Razón social&rdquo; es la única
            obligatoria, el resto queda guardado como dato adicional si no la mapeás.
          </p>
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #0d2e2312' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #0d2e2315', backgroundColor: '#0d2e2306' }}>
                  <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>
                    Columna del archivo
                  </th>
                  <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>
                    Se usa como
                  </th>
                </tr>
              </thead>
              <tbody>
                {paso.headers.map(header => (
                  <tr key={header} style={{ borderBottom: '1px solid #0d2e230d' }}>
                    <td className="px-3 py-2 text-[12.5px]" style={{ color: '#0d2e23' }}>
                      {header}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={paso.mapeo[header] ?? ''}
                        onChange={e => {
                          const campo = e.target.value || null
                          setPaso({ ...paso, mapeo: { ...paso.mapeo, [header]: campo as Mapeo[string] } })
                        }}
                        className="text-xs rounded-lg px-2 py-1.5 w-full"
                        style={selectEstilo}
                      >
                        <option value="">No usar</option>
                        {CAMPOS_DESTINO.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                            {c.requerido ? ' *' : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={!Object.values(paso.mapeo).includes('razon_social')}
            onClick={() => irAPreview(paso.archivo, paso.filas, paso.mapeo)}
            className="text-xs font-semibold rounded-full px-4 py-2 mt-3 disabled:opacity-40"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            Ver preview
          </button>
          {!Object.values(paso.mapeo).includes('razon_social') && (
            <p className="text-xs mt-2" style={{ color: '#b91c1c' }}>
              Mapeá al menos una columna como &ldquo;Razón social&rdquo; para continuar.
            </p>
          )}
        </div>
      )}

      {paso.tipo === 'preview' && (
        <div className="mt-4">
          <p className="text-xs mb-3" style={{ color: '#0d2e2380' }}>
            {paso.candidatos.length} empresa(s) listas para importar
            {paso.descartadas > 0 ? ` — ${paso.descartadas} fila(s) sin razón social se descartan` : ''}.
          </p>
          {paso.candidatos.length > 0 && (
            <div className="overflow-x-auto rounded-xl mb-3" style={{ border: '1px solid #0d2e2312' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #0d2e2315', backgroundColor: '#0d2e2306' }}>
                    <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>Razón social</th>
                    <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>NIT</th>
                    <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>Teléfono</th>
                    <th className="text-left text-[11px] font-medium px-3 py-2" style={{ color: '#0d2e2360' }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {paso.candidatos.slice(0, 5).map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #0d2e230d' }}>
                      <td className="px-3 py-2 text-[12.5px]" style={{ color: '#0d2e23' }}>{c.razon_social}</td>
                      <td className="px-3 py-2 text-[12.5px]" style={{ color: '#0d2e2378' }}>{c.nit ?? '—'}</td>
                      <td className="px-3 py-2 text-[12.5px]" style={{ color: '#0d2e2378' }}>{c.telefono ?? '—'}</td>
                      <td className="px-3 py-2 text-[12.5px]" style={{ color: '#0d2e2378' }}>{c.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paso.candidatos.length > 5 && (
                <p className="text-[11px] px-3 py-2" style={{ color: '#0d2e2360' }}>
                  + {paso.candidatos.length - 5} más
                </p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaso({ tipo: 'mapeo', archivo: paso.archivo, headers: Object.keys(paso.mapeo), filas: paso.filas, mapeo: paso.mapeo })}
              className="text-xs font-medium"
              style={{ color: '#0d2e2360' }}
            >
              Volver al mapeo
            </button>
            <button
              type="button"
              disabled={paso.candidatos.length === 0}
              onClick={() => importar(paso.archivo, paso.candidatos)}
              className="text-xs font-semibold rounded-full px-4 py-2 disabled:opacity-40"
              style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
            >
              Importar {paso.candidatos.length} empresa(s)
            </button>
          </div>
        </div>
      )}

      {paso.tipo === 'importando' && (
        <p className="text-xs mt-3" style={{ color: '#0d2e2380' }}>
          {paso.progreso}
        </p>
      )}

      {resumen && (
        <p className="text-xs mt-3" style={{ color: '#186b54' }}>
          {resumen.filasLeidas} fila(s) leídas — {resumen.nuevos} nuevo(s), {resumen.duplicados} ya existían
          {resumen.fallidos > 0 ? `, ${resumen.fallidos} sin razón social` : ''}.
        </p>
      )}
      {error && (
        <p className="text-xs mt-3" style={{ color: '#b91c1c' }}>
          {error}
        </p>
      )}
    </div>
  )
}
