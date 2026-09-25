-- Caso de uso: tras registrar uno o más toques con un contacto, el
-- consultor puede decidir descartarlo (no le interesa seguir, no contesta,
-- etc.) sin perder el historial de toques ni revertirlo a prospecto/hallazgo
-- para re-revisión — a diferencia de eliminarContacto, que sí hace eso.
-- "Descartar" es un estado reversible (se puede reactivar); "eliminar" sigue
-- siendo la acción que deshace la aprobación por completo.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

alter table contactos add column estado text not null default 'activo'
  check (estado in ('activo', 'descartado'));
