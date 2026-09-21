-- Permite a cada consultor eliminar sus propios contactos.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

create policy "contactos_delete_own"
  on contactos for delete
  to authenticated
  using (consultor_id = auth.uid());

-- toques ya tiene "on delete cascade" sobre contacto_id (ver 0001_pipeline.sql),
-- así que se eliminan solos junto con el contacto.
