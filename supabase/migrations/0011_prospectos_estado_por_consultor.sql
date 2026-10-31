-- El estado de un prospecto (aprobado / descartado) era una sola columna
-- compartida: si un consultor aprobaba una empresa, desaparecía de la lista de
-- todos los demás, y cualquiera podía descartar el prospecto que otro estaba
-- trabajando. Con una sola persona usando la app daba igual; con varias, no.
--
-- La base importada sigue siendo un pozo común de LECTURA (todos pescan de la
-- misma lista), pero el triaje pasa a ser por consultor.

create table prospectos_estado (
  prospecto_id  uuid not null references prospectos(id) on delete cascade,
  consultor_id  uuid not null references auth.users(id),
  estado        text not null check (estado in ('aprobado', 'descartado')),
  created_at    timestamptz default now(),
  primary key (prospecto_id, consultor_id)
);

alter table prospectos_estado enable row level security;

create policy "prospectos_estado_select_own"
  on prospectos_estado for select
  to authenticated
  using (consultor_id = auth.uid());

create policy "prospectos_estado_insert_own"
  on prospectos_estado for insert
  to authenticated
  with check (consultor_id = auth.uid());

create policy "prospectos_estado_update_own"
  on prospectos_estado for update
  to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

create policy "prospectos_estado_delete_own"
  on prospectos_estado for delete
  to authenticated
  using (consultor_id = auth.uid());

-- Backfill 1: los aprobados sí sabemos de quién son — el contacto que se creó
-- al aprobarlos guarda el consultor_id.
insert into prospectos_estado (prospecto_id, consultor_id, estado)
select distinct c.prospecto_id, c.consultor_id, 'aprobado'
from contactos c
where c.prospecto_id is not null
on conflict do nothing;

-- Backfill 2: de los descartados no hay forma de saber quién los descartó —
-- esa información nunca se guardó. Se le asignan al admin, que hasta ahora era
-- quien realmente usaba la app. La alternativa (dejarlos sin dueño) haría que
-- reaparezcan como "sin revisar" para todos, que es peor.
insert into prospectos_estado (prospecto_id, consultor_id, estado)
select p.id, (select user_id from admins order by created_at limit 1), 'descartado'
from prospectos p
where p.estado = 'descartado'
  and exists (select 1 from admins)
on conflict do nothing;

-- La columna vieja se renombra en vez de borrarse: si el backfill quedó mal,
-- el dato original sigue ahí. Se puede eliminar más adelante.
alter table prospectos rename column estado to estado_legacy;

-- Ya nadie escribe sobre la tabla compartida desde la app: el triaje vive en
-- prospectos_estado y la importación solo inserta filas nuevas.
drop policy "prospectos_update_estado_authenticated" on prospectos;
