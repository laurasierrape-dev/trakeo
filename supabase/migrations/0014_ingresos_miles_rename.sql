-- Causa real del bug "todo NIT nuevo se reporta como ya existía" en el
-- importador de CSV/XLSX: el código (src/lib/types.ts, el importador) usa
-- la columna "ingresos_miles" (numeric) asumiendo que ya se había renombrado
-- desde "facturacion_est" (text, nombre original de 0001_pipeline.sql) —
-- pero ese rename solo se aplicó alguna vez en staging, nunca en producción.
-- Cada insert a prospectos en producción fallaba con PGRST204 ("Could not
-- find the 'ingresos_miles' column... in the schema cache"), y el código no
-- distinguía ese error de un duplicado real, así que lo contaba como
-- "ya existía". Verificado antes de correr: 0 filas en prospectos (prod)
-- tienen valor en facturacion_est, así que no hay datos reales que convertir.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'prospectos' and column_name = 'facturacion_est'
  ) then
    alter table prospectos rename column facturacion_est to ingresos_miles;
    alter table prospectos
      alter column ingresos_miles type numeric
      using nullif(regexp_replace(ingresos_miles, '[^0-9]', '', 'g'), '')::numeric;
  end if;
end $$;
