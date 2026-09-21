-- Hallazgos: staging privado por consultor para resultados del bookmarklet.
-- A diferencia de `prospectos` (pool compartido de fuentes públicas), estos
-- datos vienen del acceso pago *personal* del consultor — no se mezclan con
-- otros consultores. El consultor los revisa (aprobar/descartar) antes de
-- que pasen a `contactos`.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

create table hallazgos (
  id              uuid primary key default gen_random_uuid(),
  consultor_id    uuid not null references auth.users(id),
  nombre_empresa  text not null,
  representante   text,
  telefono        text,
  email           text,
  notas           text,
  estado          text not null default 'sin_revisar'
                    check (estado in ('sin_revisar', 'aprobado', 'descartado')),
  created_at      timestamptz default now()
);

alter table hallazgos enable row level security;

create policy "hallazgos_select_own"
  on hallazgos for select
  to authenticated
  using (consultor_id = auth.uid());

create policy "hallazgos_update_own"
  on hallazgos for update
  to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

-- El endpoint /api/bookmarklet inserta vía service_role (bypassa RLS),
-- no necesita una policy de insert propia.
