-- Proyectos hoy solo existe como dropdown: se crea desde un modal pero nunca
-- se puede renombrar ni eliminar, por eso es fácil terminar con duplicados
-- ("Core Capital" dos veces) sin forma de arreglarlo desde la app.

-- Color para que el proyecto sea reconocible de un vistazo donde aparezca
-- como etiqueta (Contactos, y más adelante Dashboard/Búsquedas).
alter table proyectos add column color text not null default '#186b54';

-- Evita que se puedan crear dos proyectos con el mismo nombre para un mismo
-- consultor. No se puede poner una constraint única directa sobre nombres
-- duplicados ya existentes, así que primero hay que resolverlos.
do $$
declare
  dup record;
begin
  for dup in
    select consultor_id, lower(nombre) as nombre_lower, array_agg(id order by created_at) as ids
    from proyectos
    group by consultor_id, lower(nombre)
    having count(*) > 1
  loop
    -- El más antiguo se queda con el nombre; los demás se renombran con un
    -- sufijo para no perder ningún proyecto ni sus contactos asignados.
    for i in 2..array_length(dup.ids, 1) loop
      update proyectos
      set nombre = nombre || ' (' || i || ')'
      where id = dup.ids[i];
    end loop;
  end loop;
end $$;

create unique index proyectos_nombre_unico
  on proyectos (consultor_id, lower(nombre));
