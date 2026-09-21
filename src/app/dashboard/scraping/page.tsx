import { headers } from 'next/headers'
import { obtenerOCrearToken } from './actions'
import { RegenerarBoton } from './RegenerarBoton'
import { BookmarkletLink } from './BookmarkletLink'
import { HallazgosList } from './HallazgosList'
import { createClient } from '@/lib/supabase/server'
import type { Hallazgo } from '@/lib/types'

const MAX_PAGINAS_BOOKMARKLET = 10
// Tope de seguridad por página individual — no es el límite del recorrido
// completo (ver PAUSA_ENTRE_PAGINAS_MS más abajo). Debe coincidir con
// MAX_CONTENT_CHARS en /api/bookmarklet/route.ts.
const MAX_CHARS_BOOKMARKLET = 15_000
// El límite de la cuenta de Groq es 8,000 tokens/minuto ACUMULADOS — mandar
// varios POSTs seguidos sigue sumando aunque cada uno sea chico. Por eso el
// bookmarklet manda un POST por página en vez de juntar todo al final, y
// espera este tiempo extra entre página y página para mantener el ritmo de
// tokens/minuto bajo el límite. A costa de que el recorrido completo tarde
// más (10 páginas ≈ 1.5-2 min) en vez de fallar con un 413.
const PAUSA_ENTRE_PAGINAS_MS = 6_000

function construirBookmarklet(origin: string, token: string): string {
  const codigo = `(async function(){
    var pregunta = prompt("¿Qué buscas en esta página? (opcional)") || "";
    var paginasTexto = prompt("¿Cuántas páginas quieres recorrer como máximo? (1-${MAX_PAGINAS_BOOKMARKLET}, deja vacío para ${MAX_PAGINAS_BOOKMARKLET})") || "";
    var MAX_PAGINAS = Math.min(Math.max(parseInt(paginasTexto, 10) || ${MAX_PAGINAS_BOOKMARKLET}, 1), ${MAX_PAGINAS_BOOKMARKLET});
    var MAX_CHARS = ${MAX_CHARS_BOOKMARKLET};
    var paginas = 0;
    var creadosTotal = 0;
    var fallidas = 0;

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

    async function enviarPagina(texto) {
      try {
        var r = await fetch(${JSON.stringify(origin)} + "/api/bookmarklet", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({ token: ${JSON.stringify(token)}, url: location.href, contenido: texto.slice(0, MAX_CHARS), pregunta: pregunta })
        });
        var data = await r.json();
        if (data.ok) { creadosTotal += data.creados; } else { fallidas++; }
      } catch (e) { fallidas++; }
    }

    while (paginas < MAX_PAGINAS) {
      await enviarPagina(document.body.innerText);
      paginas++;
      if (paginas >= MAX_PAGINAS) break;
      var siguiente = buscarSiguiente();
      if (!siguiente) break;
      siguiente.click();
      await new Promise(function(r) { setTimeout(r, 1500); });
      await new Promise(function(r) { setTimeout(r, ${PAUSA_ENTRE_PAGINAS_MS}); });
    }

    alert("Trakeo: " + creadosTotal + " hallazgo(s) nuevo(s) para revisar en tu dashboard (recorrió " + paginas + " página(s))" + (fallidas > 0 ? ", " + fallidas + " página(s) fallaron" : "") + ".");
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
        <p>Te va a preguntar dos cosas: qué buscas (para que la IA filtre) y cuántas páginas recorrer (tú decides, hasta {MAX_PAGINAS_BOOKMARKLET}). Manda cada página por separado para no exceder el límite de tu cuenta de IA, así que un recorrido de {MAX_PAGINAS_BOOKMARKLET} páginas puede tardar 1-2 minutos — no cierres la pestaña mientras corre. Si buscas lo mismo dos veces, no duplica lo que ya tienes.</p>
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
