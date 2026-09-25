-- HU-02 + HU-03: proyectos dentro de Contactos
-- Cada proyecto agrupa contactos con su propio criterio de búsqueda. Un
-- contacto puede o no pertenecer a un proyecto (nullable) — la vista
-- general de Contactos sigue mostrando todo, con o sin proyecto, y el
-- proyecto funciona además como etiqueta visible en esa vista.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

create table proyectos (
  id                 uuid primary key default gen_random_uuid(),
  consultor_id       uuid not null references auth.users(id),
  nombre             text not null,
  criterios_busqueda text,
  created_at         timestamptz default now()
);

alter table proyectos enable row level security;

create policy "proyectos_select_own"
  on proyectos for select
  to authenticated
  using (consultor_id = auth.uid());

create policy "proyectos_insert_own"
  on proyectos for insert
  to authenticated
  with check (consultor_id = auth.uid());

create policy "proyectos_update_own"
  on proyectos for update
  to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

create policy "proyectos_delete_own"
  on proyectos for delete
  to authenticated
  using (consultor_id = auth.uid());

alter table contactos add column proyecto_id uuid references proyectos(id);
