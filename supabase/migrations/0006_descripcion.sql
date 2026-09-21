-- Campo opcional de descripción de la empresa (a qué se dedica), capturado
-- cuando la fuente lo trae — tanto en el scraper de RUES como en el
-- bookmarklet.
-- Ejecutar en el SQL Editor del dashboard de Supabase — en AMBOS proyectos
-- (Trakeo producción y trakeo-staging)

alter table prospectos add column descripcion text;
alter table hallazgos add column descripcion text;
alter table contactos add column descripcion text;
