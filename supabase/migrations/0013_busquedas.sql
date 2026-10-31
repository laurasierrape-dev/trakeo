-- Cada corrida del bookmarklet o importación de CSV queda como un registro
-- con nombre, en vez de perderse en cuanto cierras el alert() del
-- bookmarklet. Permite "de qué búsqueda vino esta empresa" en la Bandeja y
-- "qué búsqueda vale la pena repetir" en /dashboard/busquedas.
--
-- Visibilidad: lectura abierta a cualquier autenticado (using(true)), igual
-- que prospectos. No hay forma limpia de restringir por dueño: una búsqueda
-- de origen 'csv' puede enlazar prospectos del pozo común (que ya es de
-- lectura compartida), así que cualquier consultor necesita poder resolver
-- el nombre de la búsqueda que trajo un prospecto que está viendo, sin
-- importar quién la corrió. Esto no expone hallazgos ni prospectos en sí
-- (esos mantienen su RLS actual) — solo el nombre/origen/fecha de la
-- búsqueda, que es metadata de bajo riesgo.
create table busquedas (
  id            uuid primary key default gen_random_uuid(),
  consultor_id  uuid not null references auth.users(id),
  nombre        text not null,
  origen        text not null check (origen in ('bookmarklet', 'csv')),
  proyecto_id   uuid references proyectos(id),
  created_at    timestamptz default now()
);

alter table busquedas enable row level security;

create policy "busquedas_select_authenticated"
  on busquedas for select
  to authenticated
  using (true);

create policy "busquedas_insert_own"
  on busquedas for insert
  to authenticated
  with check (consultor_id = auth.uid());

alter table hallazgos add column busqueda_id uuid references busquedas(id);
alter table prospectos add column busqueda_id uuid references busquedas(id);
