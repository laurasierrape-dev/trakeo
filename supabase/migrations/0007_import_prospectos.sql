-- HU-01: carga de bases propias en Prospectos (Excel/CSV/PDF)
-- - email: las bases reales (ej. la que bajó Andrés de RUES) traen correo,
--   y prospectos no tenía ese campo todavía.
-- - datos_extra: cajón flexible (jsonb) para columnas que el archivo trae
--   pero el esquema no modela (fax, auditores, etc.) — evita tener que
--   migrar cada vez que aparece un campo nuevo en un archivo distinto.
-- - Política de insert: prospectos es un pool compartido de solo-lectura
--   para los consultores hasta ahora (solo el scraper con service_role
--   insertaba). HU-01 permite que el consultor autenticado también inserte
--   los suyos vía la nueva ruta de importación.
-- - nit nullable: la tabla real (no la migración 0001 original) tiene nit
--   como NOT NULL — descubierto en vivo al importar un PDF sin NIT. Muchos
--   archivos (sobre todo extracción por IA de PDF) no van a traer NIT.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

alter table prospectos add column email text;
alter table prospectos add column datos_extra jsonb;
alter table prospectos alter column nit drop not null;

create policy "prospectos_insert_authenticated"
  on prospectos for insert
  to authenticated
  with check (true);
