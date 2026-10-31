import Link from 'next/link'
import { ImportarBase } from './ImportarBase'

// El triaje de lo importado vive en /dashboard/bandeja junto con lo que
// trae el bookmarklet — ver ADR en docs/plan-reestructuracion.md. Esta
// página se queda solo con la herramienta de importar.
export default function ProspectosPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Importar base de datos
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Sube un CSV (RUES u otra fuente). Lo que traiga aparece en tu{' '}
        <Link href="/dashboard/bandeja" style={{ color: '#186b54' }}>
          bandeja
        </Link>{' '}
        para revisar.
      </p>

      <ImportarBase />
    </div>
  )
}
