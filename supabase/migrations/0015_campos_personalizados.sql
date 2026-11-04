-- Fase 2 de "Datos Desbloqueados" (propuesta de Búsquedas): hoy una columna
-- del CSV que no entra en los 8 campos fijos se pierde en datos_extra como
-- texto suelto, sin nombre consistente entre una importación y la
-- siguiente. "campos_personalizados" es el diccionario compartido que le da
-- nombre canónico a esos datos — compartido entre consultores, igual que
-- prospectos (pozo común de lectura), no por consultor: si alguien ya
-- mapeó "Ciudad", el resto del equipo se beneficia de esa decisión.
--
-- Los sinónimos (cómo se llamaba esa columna en cada archivo real: "City",
-- "CIUDAD", "Localización") viven como array en la misma fila en vez de en
-- una tabla aparte — alcanza para el volumen esperado (decenas de campos,
-- no miles) y evita un join extra solo para resolver el mapeo sugerido.
create table campos_personalizados (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  sinonimos   text[] not null default '{}',
  created_at  timestamptz default now()
);

create unique index campos_personalizados_nombre_unico
  on campos_personalizados (lower(nombre));

alter table campos_personalizados enable row level security;

create policy "campos_personalizados_select_authenticated"
  on campos_personalizados for select
  to authenticated
  using (true);

create policy "campos_personalizados_insert_authenticated"
  on campos_personalizados for insert
  to authenticated
  with check (true);

create policy "campos_personalizados_update_authenticated"
  on campos_personalizados for update
  to authenticated
  using (true)
  with check (true);
