import { headers } from 'next/headers'
import { obtenerOCrearToken } from './actions'
import { RegenerarBoton } from './RegenerarBoton'
import { BookmarkletLink } from './BookmarkletLink'

function construirBookmarklet(origin: string, token: string): string {
  const codigo = `(function(){
    var contenido = document.body.innerText.slice(0, 60000);
    fetch(${JSON.stringify(origin)} + "/api/bookmarklet", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ token: ${JSON.stringify(token)}, url: location.href, contenido: contenido })
    }).then(function(r){ return r.json(); }).then(function(data){
      if (data.ok) { alert("Trakeo: " + data.creados + " prospecto(s) agregado(s)."); }
      else { alert("Trakeo: " + (data.error || "error desconocido")); }
    }).catch(function(){ alert("Trakeo: no se pudo conectar."); });
  })()`.replace(/\s+/g, ' ')

  return `javascript:${encodeURIComponent(codigo)}`
}

export default async function ScrapingPage() {
  const token = await obtenerOCrearToken()
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const bookmarkletHref = construirBookmarklet(origin, token)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1" style={{ color: '#f3efe5' }}>
        Scraping desde tus propias fuentes
      </h1>
      <p className="text-sm mb-6" style={{ color: '#f3efe580' }}>
        Si tienes acceso pago a una fuente de datos (ej. Orbis) con sesión ya iniciada en tu
        computador, usa este botón para traer prospectos de ahí — sin que Trakeo toque tu
        contraseña ni tu sesión.
      </p>

      <div
        className="rounded-2xl p-6 mb-6"
        style={{ backgroundColor: '#ffffff0d', border: '1px solid #f3efe520' }}
      >
        <p className="text-sm mb-4" style={{ color: '#f3efe5' }}>
          1. Arrastra este botón a tu barra de marcadores:
        </p>
        <BookmarkletLink href={bookmarkletHref} />
        <p className="text-sm mt-4" style={{ color: '#f3efe580' }}>
          2. Ve a cualquier página donde ya hayas iniciado sesión (ej. tus resultados de Orbis) y
          haz clic en ese botón desde tu barra de marcadores. Los prospectos que encuentre
          aparecerán en tu <a href="/dashboard" style={{ color: '#c5f54a' }}>pipeline</a>.
        </p>
      </div>

      <div className="text-xs mb-6" style={{ color: '#f3efe560' }}>
        <p className="mb-1">Qué hace: lee el texto visible de esa página y le pide a una IA que identifique prospectos.</p>
        <p className="mb-1">Qué NO hace: no guarda tu contraseña, no inicia sesión por ti, no navega otras páginas por su cuenta.</p>
        <p>Captura lo que se ve en esa vista — si los resultados están paginados, repite el clic en cada página.</p>
      </div>

      <RegenerarBoton />
    </div>
  )
}
