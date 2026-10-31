import { redirect } from 'next/navigation'

// El bookmarklet se mudó a /dashboard/busquedas (ver BookmarkletTool.tsx ahí)
// junto con el importador de CSV — las dos formas de traer empresas en una
// sola pantalla. Este redirect existe por si queda algún enlace o marcador
// viejo apuntando acá.
export default function ScrapingRedirect() {
  redirect('/dashboard/busquedas')
}
