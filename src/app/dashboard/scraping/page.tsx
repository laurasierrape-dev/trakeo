import { headers } from 'next/headers'
import { obtenerOCrearToken } from './actions'
import { RegenerarBoton } from './RegenerarBoton'
import { BookmarkletLink } from './BookmarkletLink'
import { HallazgosList } from './HallazgosList'
import { createClient } from '@/lib/supabase/server'
import type { Hallazgo } from '@/lib/types'

const MAX_PAGINAS_BOOKMARKLET = 10

function construirBookmarklet(origin: string, token: string): string {
  const codigo = `(async function(){
    var pregunta = prompt("¿Qué buscas en esta página? (opcional)") || "";
    var MAX_PAGINAS = ${MAX_PAGINAS_BOOKMARKLET};
    var MAX_CHARS = 200000;
    var textos = [document.body.innerText];
    var paginas = 1;

    function deshabilitado(el) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return true;
      if (el.offsetParent === null) return true;
      return !!el.closest('.disabled, [disabled], [aria-disabled="true"]');
    }

    function buscarSiguiente() {
      var candidatos = document.querySelectorAll('a, button');
      for (var i = 0; i < candidatos.length; i++) {
        var el = candidatos[i];
        if (deshabilitado(el)) continue;
        var txt = (el.textContent || '').trim().toLowerCase();
        var aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (txt === 'siguiente' || txt === 'next' || txt === '>' || txt === '\\u203a' ||
            aria.indexOf('next') !== -1 || aria.indexOf('siguiente') !== -1) {
          return el;
        }
      }
      var iconos = document.querySelectorAll(
        '[class*="chevron-right"], [class*="angle-right"], [class*="arrow-right"], [class*="caret-right"]'
      );
      for (var j = 0; j < iconos.length; j++) {
        var clicable = iconos[j].closest('a, button, li, [role="button"]');
        if (clicable && !deshabilitado(clicable)) return clicable;
      }
      return null;
    }

    while (paginas < MAX_PAGINAS && textos.join('').length < MAX_CHARS) {
      var siguiente = buscarSiguiente();
      if (!siguiente) break;
      siguiente.click();
      await new Promise(function(r) { setTimeout(r, 1500); });
      textos.push(document.body.innerText);
      paginas++;
    }

    var contenido = textos.join('\\n\\n---PAGINA---\\n\\n').slice(0, MAX_CHARS);

    fetch(${JSON.stringify(origin)} + "/api/bookmarklet", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ token: ${JSON.stringify(token)}, url: location.href, contenido: contenido, pregunta: pregunta })
    }).then(function(r){ return r.json(); }).then(function(data){
      if (data.ok) { alert("Trakeo: " + data.creados + " hallazgo(s) para revisar en tu dashboard (recorrió " + paginas + " página(s))."); }
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

  const supabase = await createClient()
  const { data: hallazgos } = await supabase
    .from('hallazgos')
    .select('*')
    .eq('estado', 'sin_revisar')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
        Scraping desde tus propias fuentes
      </h1>
      <p className="text-sm mb-6" style={{ color: '#0d2e2380' }}>
        Si tienes acceso pago a una fuente de datos (ej. Orbis) con sesión ya iniciada en tu
        computador, usa este botón para traer prospectos de ahí — sin que Trakeo toque tu
        contraseña ni tu sesión.
      </p>

      <div
        className="rounded-2xl p-6 mb-6"
        style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}
      >
        <p className="text-sm mb-4" style={{ color: '#0d2e23' }}>
          1. Arrastra este botón a tu barra de marcadores:
        </p>
        <BookmarkletLink href={bookmarkletHref} />
        <p className="text-sm mt-4" style={{ color: '#0d2e2380' }}>
          2. Ve a cualquier página donde ya hayas iniciado sesión (ej. tus resultados de Orbis) y
          haz clic en ese botón desde tu barra de marcadores. Los prospectos que encuentre
          aparecerán en tu <a href="/dashboard" style={{ color: '#186b54' }}>pipeline</a>.
        </p>
      </div>

      <div className="text-xs mb-6" style={{ color: '#0d2e2360' }}>
        <p className="mb-1">Qué hace: lee el texto visible de esa página y le pide a una IA que identifique prospectos.</p>
        <p className="mb-1">Qué NO hace: no guarda tu contraseña, no inicia sesión por ti, no navega otras páginas por su cuenta.</p>
        <p>Si detecta un botón de &quot;Siguiente&quot; en la página, avanza automáticamente hasta 10 páginas de resultados antes de mandarlo todo — si hay más, repite el clic desde donde se quedó.</p>
      </div>

      <RegenerarBoton />

      <div className="mt-10 pt-8" style={{ borderTop: '1px solid #0d2e2315' }}>
        <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: '#0d2e23' }}>
          Hallazgos por revisar
        </h2>
        <p className="text-sm mb-4" style={{ color: '#0d2e2380' }}>
          Lo que traiga el bookmarklet aparece aquí primero. Aprobar lo pasa a tu pipeline en
          Contactos; Descartar lo saca de la lista.
        </p>
        {(hallazgos ?? []).length === 0 ? (
          <p className="text-sm" style={{ color: '#0d2e2380' }}>
            No hay hallazgos sin revisar por ahora.
          </p>
        ) : (
          <HallazgosList hallazgos={(hallazgos as Hallazgo[] | null) ?? []} />
        )}
      </div>
    </div>
  )
}
