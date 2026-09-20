-- Fase 1: Pipeline CRM — prospectos, contactos, toques
-- Ejecutar en el SQL Editor del dashboard de Supabase (proyecto trakeo)

create table prospectos (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  nit               text unique,
  representante     text,
  telefono          text,
  sector            text,
  zona              text,
  facturacion_est   text,
  fuente            text default 'rues',
  estado            text not null default 'sin_revisar'
                       check (estado in ('sin_revisar', 'aprobado', 'descartado')),
  created_at        timestamptz default now()
);

create table contactos (
  id              uuid primary key default gen_random_uuid(),
  prospecto_id    uuid references prospectos(id),
  nombre_empresa  text not null,
  representante   text,
  telefono        text,
  email           text,
  temperatura     text not null default 'frio'
                     check (temperatura in ('frio', 'interesado', 'vinculado')),
  proximo_toque   date,
  notas           text,
  consultor_id    uuid not null references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table toques (
  id           uuid primary key default gen_random_uuid(),
  contacto_id  uuid not null references contactos(id) on delete cascade,
  canal        text check (canal in ('whatsapp', 'llamada', 'email', 'visita')),
  resultado    text check (resultado in ('no_contesto', 'cita_agendada', 'no_interes', 'interesado')),
  notas        text,
  fecha        timestamptz default now()
);

-- RLS

alter table prospectos enable row level security;
alter table contactos enable row level security;
alter table toques enable row level security;

-- prospectos: pool compartido — cualquier consultor autenticado puede ver y
-- pasar de estado (aprobar/descartar). Solo el scraper (service_role) inserta.
create policy "prospectos_select_authenticated"
  on prospectos for select
  to authenticated
  using (true);

create policy "prospectos_update_estado_authenticated"
  on prospectos for update
  to authenticated
  using (true)
  with check (true);

-- contactos: cada consultor solo ve y modifica los suyos
create policy "contactos_select_own"
  on contactos for select
  to authenticated
  using (consultor_id = auth.uid());

create policy "contactos_insert_own"
  on contactos for insert
  to authenticated
  with check (consultor_id = auth.uid());

create policy "contactos_update_own"
  on contactos for update
  to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

-- toques: visibles/insertables solo si el contacto asociado es del consultor
create policy "toques_select_own"
  on toques for select
  to authenticated
  using (
    exists (
      select 1 from contactos
      where contactos.id = toques.contacto_id
        and contactos.consultor_id = auth.uid()
    )
  );

create policy "toques_insert_own"
  on toques for insert
  to authenticated
  with check (
    exists (
      select 1 from contactos
      where contactos.id = toques.contacto_id
        and contactos.consultor_id = auth.uid()
    )
  );
