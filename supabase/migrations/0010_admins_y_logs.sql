-- Rol de super-admin y auditoría de accesos.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

create table admins (
  user_id     uuid primary key references auth.users(id),
  created_at  timestamptz default now()
);
alter table admins enable row level security;

create policy "admins_select_self"
  on admins for select
  to authenticated
  using (user_id = auth.uid());
-- Solo se inserta/borra manualmente por SQL (bootstrap) o vía service_role
-- desde las acciones de admin — no hay policy de insert para authenticated.

create table login_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  email       text not null,
  evento      text not null check (evento in ('login_exitoso', 'login_fallido', 'logout')),
  ip          text,
  user_agent  text,
  created_at  timestamptz default now()
);
alter table login_logs enable row level security;

create policy "login_logs_select_admin"
  on login_logs for select
  to authenticated
  using (exists (select 1 from admins where admins.user_id = auth.uid()));
-- Solo /api/login-log (service_role) inserta.
