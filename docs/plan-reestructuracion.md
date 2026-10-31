# Plan de reestructuración de Trakeo

Mockup de referencia: https://claude.ai/code/artifact/4308de26-b1d1-40be-9f38-5601e97436f2

## Objetivo

Reorganizar la app por **etapa del trabajo** en vez de por **origen de los datos**, y darle
pantalla propia a Proyectos (hoy solo existe como dropdown, por eso no se pueden eliminar).

### Menú actual → propuesto

| Hoy | Propuesto |
|---|---|
| Contactos | **Dashboard** (pendientes + triaje + embudo) |
| Prospectos | **Contactos** (igual que hoy, sin la tira de KPIs) |
| Scraping | **Proyectos** (nueva) |
| Administración | **Búsquedas** (nueva) |
| | Administración |

`Prospectos` y `Scraping` eran dos bandejas que hacían el mismo trabajo; se fusionan en la cola
de triaje del Dashboard. La configuración del bookmarklet se va a Búsquedas.

---

## Etapas

### 0. Botón de salir visible — ✅
Hoy es un texto gris de 12px al pie del sidebar. Pasa a botón con ícono.

### 1. Permisos de `prospectos` — ✅
**Bug de seguridad, independiente de todo lo demás.** Las políticas actuales son
`using (true)` para `select` y `update`: cualquier usuario autenticado lee y modifica los
prospectos de todos los consultores. Con tres cuentas activas, dos consultores pueden trabajar
la misma empresa sin saberlo, o uno descartar el prospecto del otro.

Decisión: la base importada sigue siendo **pozo común de lectura** (todos pescan de ahí), pero
el estado (`aprobado` / `descartado`) pasa a ser **por consultor**.

### 2. Proyectos
- Migración: `color`, restricción única `(consultor_id, lower(nombre))`.
- Página `/dashboard/proyectos`: listar, crear, renombrar, eliminar.
- Eliminar pregunta qué hacer con los contactos asignados (dejar sin proyecto o mover).
  Nunca borra contactos.

### 3. Bandeja unificada
- Fusionar `prospectos` + `hallazgos` en una sola cola de triaje.
- Columna `origen` para filtrar.
- Una sola lista, un solo flujo de aprobar/descartar.

### 4. Dashboard
- Colas de pendientes: por revisar, toque vencido, interesado sin próximo paso, búsqueda fallida.
- Barra de filtros con chips removibles (proyecto, búsqueda, temperatura). Las colas se
  recalculan con el filtro.
- Embudo con anotaciones de fuga, debajo de las colas.
- Los KPIs que no piden acción bajan a una línea de contexto al pie.

### 5. Búsquedas
Lo único que no es reorganizar lo existente.
- Tabla `busquedas` + FK desde los leads.
- El endpoint del bookmarklet registra la corrida.
- Tabla de rendimiento: qué búsqueda trae contactos que sí sirven.
- Absorbe la configuración del bookmarklet y el importador de CSV.

---

## Decisiones tomadas

- **Dashboard ES la bandeja**, no un resumen que apunta a ella. Cero clics entre saber y hacer.
- **Se organiza por acción, no por métrica.** «Contactos totales: 7» no dice qué hacer;
  «38 por revisar» sí.
- **Contactos conserva su nombre** (no «Pipeline»): menos cambio para quien ya usa la app.
- **Bandeja y Contactos siguen separados.** Los contactos trabajados tienen temperatura, próximo
  toque e historial — estado de CRM que un lead sin triar no tiene.
- **La búsqueda con IA** pasa de tres copias a dos (Dashboard y Contactos), solo porque dos de
  sus listas se fusionan.
- **Sin sparklines ni variaciones porcentuales** hasta que haya volumen: con 7 contactos, pasar
  de 1 a 2 interesados es «↑100%».
- **Sin selector de rango de fechas en el Dashboard**: una cola de pendientes no tiene dimensión
  temporal. Sí en Búsquedas, que es un historial.
- **Sin menú agrupado por categorías**: eso se gana su lugar más allá de ocho secciones.
- **Sin feed de actividad reciente** por ahora; tiene sentido más adelante como actividad del
  equipo, cuando los otros consultores estén usando la app.
