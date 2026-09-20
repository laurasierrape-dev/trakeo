-- Fase 3: tokens del bookmarklet de scraping
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

create table bookmarklet_tokens (
  id            uuid primary key default gen_random_uuid(),
  consultor_id  uuid not null unique references auth.users(id),
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at    timestamptz default now()
);

alter table bookmarklet_tokens enable row level security;

-- El consultor puede ver su propio token (para mostrarlo en el dashboard).
create policy "bookmarklet_tokens_select_own"
  on bookmarklet_tokens for select
  to authenticated
  using (consultor_id = auth.uid());

-- El consultor puede crear su propio token la primera vez.
create policy "bookmarklet_tokens_insert_own"
  on bookmarklet_tokens for insert
  to authenticated
  with check (consultor_id = auth.uid());

-- Regenerar (botón "Regenerar enlace") = update del propio token.
create policy "bookmarklet_tokens_update_own"
  on bookmarklet_tokens for update
  to authenticated
  using (consultor_id = auth.uid())
  with check (consultor_id = auth.uid());

-- El endpoint /api/bookmarklet valida el token vía service_role (bypassa RLS),
-- no necesita una policy propia.
