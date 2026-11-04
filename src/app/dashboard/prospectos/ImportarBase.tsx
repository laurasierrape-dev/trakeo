'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { leerArchivoTabular, type ArchivoTabular } from '@/lib/parsearTabular'
import {
  CAMPOS_DESTINO,
  mapearFilaConMapeo,
  sugerirMapeo,
  type CampoDestino,
  type CampoPersonalizado,
  type DestinoMapeo,
  type FilaMapeada,
  type Mapeo,
} from '@/lib/importarMapeo'
import { confirmarCampoPersonalizado, obtenerCamposPersonalizados } from './camposActions'

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

const SIN_USAR = ''
const NUEVO_CAMPO = '__nuevo__'

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

function valorSelect(destino: DestinoMapeo, camposPersonalizados: CampoPersonalizado[]): string {
  if (!destino) return SIN_USAR
  if (destino.tipo === 'fijo') return `fijo:${destino.campo}`
  const existe = camposPersonalizados.some(c => c.nombre === destino.nombre)
  return existe ? `dinamico:${destino.nombre}` : NUEVO_CAMPO
}

export function ImportarBase() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [paso, setPaso] = useState<Paso>({ tipo: 'idle' })
  const [camposPersonalizados, setCamposPersonalizados] = useState<CampoPersonalizado[]>([])
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
        await irAMapeo(archivo, tabular, tabular.hojaSugerida)
      }
    } catch (e) {
      setError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`)
      reiniciar()
    }
  }

  async function irAMapeo(archivo: File, tabular: ArchivoTabular, hoja: string) {
    const { headers, filas } = tabular.obtenerFilas(hoja)
    if (headers.length === 0 || filas.length === 0) {
      setError(`La hoja "${hoja}" no tiene datos legibles.`)
      reiniciar()
      return
    }
    // El diccionario de campos personalizados es compartido entre todo el
    // equipo (ver 0015_campos_personalizados.sql) — se trae acá para que la
    // sugerencia de mapeo también considere lo que ya se mapeó antes, no
    // solo los 8 campos fijos.
    const campos = await obtenerCamposPersonalizados()
    setCamposPersonalizados(campos)
    setPaso({ tipo: 'mapeo', archivo, headers, filas, mapeo: sugerirMapeo(headers, campos) })
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

  async function importar(archivo: File, candidatos: FilaMapeada[], mapeo: Mapeo) {
    setError(null)

    // Antes de importar, confirma cada columna mapeada a un campo
    // personalizado — esto es lo que graba el sinónimo en el diccionario
    // compartido (crea el campo si es nuevo, o solo le suma el encabezado
    // si ya existía). Se hace una sola vez acá, no en el paso de mapeo, para
    // no ensuciar el diccionario si el consultor cancela antes de importar.
    const dinamicos = Object.entries(mapeo).filter(
      (e): e is [string, Extract<DestinoMapeo, { tipo: 'dinamico' }>] => e[1]?.tipo === 'dinamico'
    )
    try {
      await Promise.all(dinamicos.map(([header, destino]) => confirmarCampoPersonalizado(header, destino.nombre)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron registrar los campos personalizados.')
      return
    }

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

  function actualizarDestino(paso: Extract<Paso, { tipo: 'mapeo' }>, header: string, valorCrudo: string) {
    let destino: DestinoMapeo
    if (valorCrudo === SIN_USAR) destino = null
    else if (valorCrudo === NUEVO_CAMPO) destino = { tipo: 'dinamico', nombre: header }
    else if (valorCrudo.startsWith('fijo:')) destino = { tipo: 'fijo', campo: valorCrudo.slice(5) as CampoDestino }
    else destino = { tipo: 'dinamico', nombre: valorCrudo.slice('dinamico:'.length) }
    setPaso({ ...paso, mapeo: { ...paso.mapeo, [header]: destino } })
  }

  const tieneRazonSocial =
    paso.tipo === 'mapeo' && Object.values(paso.mapeo).some(d => d?.tipo === 'fijo' && d.campo === 'razon_social')

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
            obligatoria. Lo que mapees como campo personalizado queda visible en el detalle del contacto, y Trakeo
            recuerda la columna para la próxima importación.
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
                {paso.headers.map(header => {
                  const destino = paso.mapeo[header]
                  const select = valorSelect(destino, camposPersonalizados)
                  const creandoNuevo = select === NUEVO_CAMPO
                  return (
                    <tr key={header} style={{ borderBottom: '1px solid #0d2e230d' }}>
                      <td className="px-3 py-2 text-[12.5px] align-top" style={{ color: '#0d2e23' }}>
                        {header}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={select}
                          onChange={e => actualizarDestino(paso, header, e.target.value)}
                          className="text-xs rounded-lg px-2 py-1.5 w-full"
                          style={selectEstilo}
                        >
                          <option value={SIN_USAR}>No usar</option>
                          <optgroup label="Campos fijos">
                            {CAMPOS_DESTINO.map(c => (
                              <option key={c.id} value={`fijo:${c.id}`}>
                                {c.label}
                                {c.requerido ? ' *' : ''}
                              </option>
                            ))}
                          </optgroup>
                          {camposPersonalizados.length > 0 && (
                            <optgroup label="Campos personalizados">
                              {camposPersonalizados.map(c => (
                                <option key={c.id} value={`dinamico:${c.nombre}`}>
                                  {c.nombre}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value={NUEVO_CAMPO}>+ Crear campo nuevo</option>
                        </select>
                        {creandoNuevo && destino?.tipo === 'dinamico' && (
                          <input
                            type="text"
                            value={destino.nombre}
                            onChange={e =>
                              setPaso({
                                ...paso,
                                mapeo: { ...paso.mapeo, [header]: { tipo: 'dinamico', nombre: e.target.value } },
                              })
                            }
                            placeholder="Nombre del campo nuevo"
                            className="text-xs rounded-lg px-2 py-1.5 w-full mt-1.5"
                            style={{ border: '1px solid #186b54', color: '#0d2e23' }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            disabled={!tieneRazonSocial}
            onClick={() => irAPreview(paso.archivo, paso.filas, paso.mapeo)}
            className="text-xs font-semibold rounded-full px-4 py-2 mt-3 disabled:opacity-40"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            Ver preview
          </button>
          {!tieneRazonSocial && (
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
              onClick={() => importar(paso.archivo, paso.candidatos, paso.mapeo)}
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
