import { redirect } from 'next/navigation'

// El importador de CSV se mudó a /dashboard/busquedas (ver ImportarBase.tsx
// ahí) junto con el bookmarklet. Este redirect existe por si queda algún
// enlace viejo apuntando acá.
export default function ProspectosRedirect() {
  redirect('/dashboard/busquedas')
}
