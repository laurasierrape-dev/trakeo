-- Enlaza contactos con el hallazgo del que vinieron (si aplica), igual que ya
-- existe prospecto_id para los que vienen del pool de prospectos. Permite que
-- "eliminar contacto" devuelva el hallazgo a la cola de revisión en vez de
-- perder el dato.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

alter table contactos add column hallazgo_id uuid references hallazgos(id);
