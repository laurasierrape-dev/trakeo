# Trakeo — Product Requirements Document

> Versión 1.0 | Junio 2026 | Bogotá, Colombia

---

## 1. Problema que resuelve

### El dolor

Los consultores financieros independientes en Colombia (pensiones, seguros, inversiones) desperdician el **60% de su tiempo en tareas operativas**: buscar prospectos manualmente en el RUES, llevar su pipeline en Excel, recordar por memoria a quién llamar, y enviar mensajes de nurturing uno a uno por WhatsApp.

No es falta de talento — es falta de infraestructura. Trabajan solos, sin equipo de ventas, sin CRM, y sin un sistema que les diga quién está listo para comprar.

### A quién le duele

**Segmento objetivo (fase 1):** Consultores financieros independientes en Colombia (pensiones, seguros, inversiones). Trabajan solos o en equipos muy pequeños (1-3 personas) y dependen de la venta consultiva en frío para crecer su cartera B2B.

**Segmento potencial (fases siguientes):** Cualquier fuerza comercial que realice venta consultiva en frío — asesores inmobiliarios, representantes de servicios empresariales, consultores de tecnología, agentes de seguros corporativos. El dolor es el mismo: prospectar sin sistema, hacer seguimiento sin herramienta, nutrir sin tiempo.

**Perfil del usuario entrevistado:**
- Prospecta empresas "por olfato" — entra al RUES a mano, busca NIT, encuentra representante legal, llama.
- No sabe cuánto factura una empresa antes de llamarle.
- Lleva su pipeline en Excel con notas como "la llamé tal día, no contestó".
- Nunca saca un cliente del pipeline — puede trabajarlo 4 o 5 años.
- Prefiere WhatsApp sobre email porque siente que el correo "nadie lo lee".
- Quiere exactamente 10 prospectos nuevos + 10 seguimientos calientes por semana.

### El costo de no resolverlo

Sin una herramienta, el consultor pierde negocios no por falta de producto sino por falta de seguimiento sistemático. La prospección queda atada a la energía y memoria de una sola persona. La empresa no escala — la persona se revienta.

---

## 2. Solución propuesta

### Visión

**Trakeo** es el copiloto de ventas para el consultor financiero colombiano que trabaja solo pero quiere actuar como una firma.

Trakeo hace tres cosas que hoy el consultor hace a mano:

1. **Encuentra prospectos** desde registros públicos (RUES, DIAN) filtrados por sector, zona y facturación estimada — y le entrega 10 al consultor cada semana, con nombre del representante legal y teléfono.

2. **Organiza el pipeline** con un termómetro de temperatura (frío → interesado → vinculado) y le dice exactamente a quién llamar esta semana y por qué.

3. **Automatiza el nurturing** generando contenido relevante por segmento (normas tributarias, perspectivas económicas, noticias sectoriales) que el consultor revisa y aprueba antes de que se envíe por WhatsApp.

### Por qué resuelve el dolor

El consultor no necesita más información — necesita que alguien le diga qué hacer hoy. Trakeo convierte datos públicos dispersos en una lista de acción clara, y convierte el conocimiento del consultor en mensajes personalizados que se envían sin que él tenga que redactarlos cada vez.

### Canales

- **MVP:** WhatsApp via deeplinks (`wa.me/`) con mensajes pre-generados listos para enviar con un clic.
- **V2:** WhatsApp Business API (Twilio o 360dialog) para envíos masivos aprobados por Meta.

### Longevidad del pipeline

Trakeo está diseñado para pipelines de largo aliento. Un contacto nunca se elimina — se programa. Los clientes "fríos" pueden tener recordatorios a 6 meses o 1 año. El sistema nunca deja de trabajar aunque el consultor lo haga.

---

## 3. MVP — Landing de captura de leads

### Objetivo del MVP

Validar que existe demanda real antes de construir el producto. La primera versión de Trakeo es una landing page en español que explica el problema y la solución, y captura el email y nombre de consultores financieros interesados.

### Hero

> *"Tu próximo cliente ya existe. Solo necesitas encontrarlo antes que la competencia."*

**Subheadline:** *"La venta consultiva en frío es de las más difíciles. Trakeo convierte ese esfuerzo en un proceso inteligente: sabe a quién llamar, cuándo llamar y qué decir."*

### Estructura de la landing

| Sección | Contenido |
|---|---|
| Hero | Headline + subheadline + stat badges flotantes + dashboard mockup del producto |
| Problema | 4 dolores concretos: prospección ciega, Excel como CRM, sin termómetro, nurturing manual |
| Solución | 3 capacidades en sección oscura: prospectos listos, termómetro, nurturing WhatsApp |
| Cómo funciona | Flujo en 5 pasos: empresas identificadas → filtro → top 10 → pipeline → WhatsApp listo |
| Formulario | Nombre + Email + botón de envío |
| Footer | Sin distracciones |

### Estética

Fintech colombiano. Fondo oscuro (azul profundo o negro), tipografía grande y limpia en el hero, acentos en color vibrante (naranja o verde neón), cards con bordes suaves, jerarquía visual fuerte. Referencia de tono: plataformas de inversión y SaaS de logística premium.

### Backend de leads — Supabase

**Decisión: Supabase (Postgres)**

**Justificación:** Google Apps Script en una Sheet funciona para las primeras 50 capturas, pero cuando Trakeo crezca los leads deben estar en una base de datos real para poder segmentarlos, exportarlos, conectarlos al producto y analizarlos. Migrar de una Sheet a Postgres después es fricción innecesaria. Supabase tiene tier gratuito robusto (50k filas), API REST instantánea y Auth integrado. El esfuerzo adicional respecto a una Sheet es de 20 minutos de setup — vale la pena desde el primer día.

### Deploy

- **Plataforma:** Vercel
- **Dominio inicial:** subdominio Vercel gratuito (`trakeo.vercel.app`) hasta validar el nombre definitivo
- **Idioma:** Español colombiano

---

## 4. Arquitectura técnica

### 4A. Arquitectura del MVP

```
Usuario
  │
  ▼
Landing (Next.js 14 en Vercel)
  │
  ├── Formulario de captura
  │       │
  │       ▼
  │   Supabase
  │   tabla: leads
  │   (email, nombre, fecha, fuente)
  │
  └── Contenido estático (hero, secciones, copy)
```

**Flujo:**
1. Usuario llega a la landing desde redes, referidos o búsqueda.
2. Completa el formulario (nombre + email).
3. Next.js llama a la API de Supabase via cliente JS.
4. El lead queda guardado en la tabla `leads` con timestamp y fuente.
5. Tú ves los leads en el dashboard de Supabase en tiempo real.

### 4B. Arquitectura objetivo (producto completo)

```
Fuentes públicas          Trakeo Core              Consultor
─────────────────         ────────────             ──────────
RUES (scraping)  ──►  Motor de prospección  ──►  Lista semanal (10+10)
DIAN (scraping)  ──►  Clasificador IA       ──►  Termómetro de clientes
Noticias/DIAN   ──►  Generador de contenido ──►  Bandeja de revisión
                                                        │
                                                        ▼
                                               Aprobación del consultor
                                                        │
                                                        ▼
                                               WhatsApp (deeplink → API)
```

**Componentes:**

| Componente | Responsabilidad |
|---|---|
| Scraper RUES/DIAN | Extrae empresas por sector/zona/facturación y las pone en cola |
| Motor de prospección | Filtra, deduplica y rankea los mejores 10 prospectos de la semana |
| Clasificador IA | Asigna temperatura al contacto según historial de toques e interacciones |
| Generador de contenido | Crea mensajes de nurturing por segmento usando Claude |
| Bandeja de revisión | El consultor aprueba o edita antes de que se envíe |
| Canal WhatsApp | Deeplink (MVP) → API masiva (V2) |

---

## 5. Base de datos

### Tabla: `leads` *(MVP — clientes de Trakeo el SaaS)*

Personas interesadas en usar Trakeo. Son los prospectos de la fundadora, no del consultor.

```sql
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  fuente      TEXT,                    -- 'landing', 'referido', 'instagram', etc.
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `prospectos` *(producto completo — empresas encontradas por IA)*

Empresas extraídas del RUES que el consultor aún no ha trabajado.

```sql
CREATE TABLE prospectos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social      TEXT NOT NULL,
  nit               TEXT UNIQUE,
  representante     TEXT,
  telefono          TEXT,
  sector            TEXT,
  zona              TEXT,
  facturacion_est   TEXT,             -- estimado desde fuentes públicas
  fuente            TEXT DEFAULT 'rues',
  estado            TEXT DEFAULT 'sin_revisar', -- sin_revisar | aprobado | descartado
  created_at        TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `contactos` *(producto completo — pipeline activo del consultor)*

Empresas que el consultor ya comenzó a trabajar. Un prospecto aprobado se convierte en contacto.

```sql
CREATE TABLE contactos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id    UUID REFERENCES prospectos(id),
  nombre_empresa  TEXT NOT NULL,
  representante   TEXT,
  telefono        TEXT,
  email           TEXT,
  temperatura     TEXT DEFAULT 'frio',  -- frio | interesado | vinculado
  proximo_toque   DATE,
  notas           TEXT,
  consultor_id    UUID,                 -- FK al usuario de Supabase Auth
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `aliados` *(producto completo — red de referidos del consultor)*

Contadores, revisores fiscales y otros aliados que generan referidos. Tabla separada porque su ciclo de relación es distinto al de un cliente.

```sql
CREATE TABLE aliados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  tipo        TEXT,                    -- 'contador', 'revisor_fiscal', 'otro'
  notas       TEXT,
  consultor_id UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `toques` *(producto completo — historial de interacciones)*

Cada vez que el consultor contacta a un cliente queda registrado aquí.

```sql
CREATE TABLE toques (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id  UUID REFERENCES contactos(id),
  canal        TEXT,                   -- 'whatsapp', 'llamada', 'email', 'visita'
  resultado    TEXT,                   -- 'no_contesto', 'cita_agendada', 'no_interes', 'interesado'
  notas        TEXT,
  fecha        TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `contenidos` *(producto completo — mensajes generados por IA)*

Mensajes de nurturing creados por Claude, en cola de revisión antes de enviarse.

```sql
CREATE TABLE contenidos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contacto_id  UUID REFERENCES contactos(id),
  segmento     TEXT,                   -- 'frio', 'interesado', 'vinculado', 'aliado'
  mensaje      TEXT NOT NULL,
  estado       TEXT DEFAULT 'borrador', -- borrador | aprobado | enviado
  canal        TEXT DEFAULT 'whatsapp',
  enviado_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | SEO nativo para la landing, deploy directo a Vercel, React server components para rendimiento |
| **Estilos** | Tailwind CSS | Velocidad de desarrollo, diseño consistente sin CSS custom, mobile-first por defecto |
| **Base de datos** | Supabase (Postgres) | Auth integrado, API REST y realtime sin backend propio, tier gratis sólido, escala cuando el producto crezca |
| **IA — generación** | Claude claude-sonnet-4-6 (Anthropic) | Genera mensajes de nurturing personalizados por segmento, clasifica temperatura de clientes según historial |
| **Scraping** | Python + Playwright | RUES no tiene API oficial. Playwright maneja JavaScript rendering que BeautifulSoup solo no puede |
| **WhatsApp MVP** | `wa.me/` deeplinks | Cero fricción, cero aprobación de Meta, listo en horas |
| **WhatsApp V2** | Twilio / 360dialog | API oficial de Meta para envíos masivos, una vez validado el modelo de negocio |
| **Deploy** | Vercel | CI/CD automático desde GitHub, preview deployments por PR, dominio gratuito para arrancar |
| **Control de versiones** | GitHub | Estándar, integración nativa con Vercel |

---

## 7. Historias de usuario (MVP)

- Como **consultora financiera independiente**, quiero llegar a una landing que entienda mi problema en 10 segundos, para saber si Trakeo es para mí.
- Como **consultora financiera**, quiero dejar mi nombre y email con un clic, para reservar mi acceso anticipado sin fricción.
- Como **fundadora de Trakeo**, quiero ver en tiempo real los leads capturados con nombre, email, fecha y fuente, para hacer outreach y validar el interés del mercado.

---

## 8. Métricas de éxito

### MVP (landing)
| Métrica | Objetivo |
|---|---|
| Leads capturados en los primeros 30 días | ≥ 50 |
| Tasa de conversión visita → lead | ≥ 8% |
| % de leads que responden al primer outreach | ≥ 30% |

### Producto completo (6 meses post-lanzamiento)
| Métrica | Objetivo |
|---|---|
| Tiempo en tareas operativas por semana | Reducción del 60% al 20% |
| Prospectos trabajados por semana por consultor | ≥ 20 (10 nuevos + 10 seguimientos) |
| Tasa de conversión prospecto → cita | Línea base a medir en primeros 90 días |
| Retención de consultores a 3 meses | ≥ 70% |

---

## 9. No-goals (V1)

- **No** integración con WhatsApp Business API en el MVP — va por deeplinks hasta validar el canal.
- **No** prospección de personas naturales — solo empresas en fase 1.
- **No** módulo de reportes o analytics avanzados — el consultor necesita acción, no dashboards complejos.
- **No** app móvil nativa — web responsiva es suficiente para arrancar.
- **No** multiusuario / equipos — diseñado para el consultor que trabaja solo en fase 1.
- **No** exposición de nombres de fuentes de datos al usuario final — el producto muestra resultados (empresa, contacto, sector), no la fuente técnica de donde provienen.

---

## 10. Preguntas abiertas

| Pregunta | Quién responde | Bloqueante |
|---|---|---|
| ¿El RUES permite scraping sin bloquear IPs? | Ingeniería | Sí — afecta arquitectura del scraper |
| ¿La DIAN tiene datos de facturación accesibles públicamente o requiere permisos? | Legal + Ingeniería | Sí — define si podemos mostrar facturación estimada |
| ¿Cuánto están dispuestos a pagar los consultores? ¿Suscripción mensual o por resultado? | Fundadora (entrevistas) | No (define modelo de negocio, no el MVP) |
| ¿Twilio o 360dialog para V2 de WhatsApp? | Ingeniería | No — solo importa cuando se construya V2 |

---

*Documento generado a partir de entrevista con usuario real. Próximo paso: construir la landing con Next.js + Supabase y publicarla en Vercel.*
