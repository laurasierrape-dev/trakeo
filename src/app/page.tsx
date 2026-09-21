import LeadForm from '@/components/LeadForm'
import { Search, Thermometer, MessageCircle, Building2, TableProperties, TrendingDown, BarChart3, MapPin, PhoneCall, CheckCircle, Phone, Clock, TrendingUp, Users } from 'lucide-react'
// Phone usado en mockup dashboard

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#f3efe5', color: '#0d2e23', fontFamily: 'var(--font-body)' }}>

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color: '#0d2e23' }}>
          Trakeo
        </span>
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="text-sm font-medium"
            style={{ color: '#0d2e2380' }}
          >
            Iniciar sesión
          </a>
          <a
            href="#formulario"
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all"
            style={{ backgroundColor: '#0d2e23', color: '#f3efe5' }}
          >
            Acceso anticipado
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 pt-16 pb-24 relative">

        <h1 className="mb-6 leading-[1.02]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(3rem, 8vw, 5.5rem)', color: '#0d2e23' }}>
          Tu próximo cliente<br />
          ya existe. <span style={{ color: '#186b54', fontStyle: 'italic' }}>Encuéntralo</span><br />
          antes que la competencia.
        </h1>

        <p className="text-lg mb-10 max-w-xl leading-relaxed" style={{ color: '#0d2e2380' }}>
          La venta consultiva en frío es de las más difíciles. Trakeo convierte ese esfuerzo en un proceso inteligente: sabe a quién llamar, cuándo llamar y qué decir.
        </p>

        <div className="flex flex-wrap items-center gap-4 mb-10">
          <a
            href="#formulario"
            className="font-semibold px-7 py-3.5 rounded-full transition-all text-sm"
            style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}
          >
            Quiero acceso anticipado
          </a>
          <a
            href="#como-funciona"
            className="font-medium px-7 py-3.5 rounded-full border text-sm transition-all"
            style={{ border: '1.5px solid #0d2e2330', color: '#0d2e23' }}
          >
            Cómo funciona
          </a>
        </div>

        {/* Promesas concretas debajo del CTA */}
        <div className="flex flex-wrap gap-6 mb-16">
          {[
            { Icon: TrendingUp, label: '10 prospectos nuevos por semana, listos para llamar' },
            { Icon: Clock,      label: 'Reduce el tiempo operativo de 60% a menos del 20%' },
            { Icon: Users,      label: 'Ningún cliente se enfría por falta de seguimiento' },
          ].map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={14} color="#186b54" strokeWidth={2} />
              <span className="text-sm" style={{ color: '#0d2e2370' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Dashboard mockup */}
        <div className="rounded-2xl overflow-hidden shadow-xl" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
          {/* Barra superior del mockup */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#0d2e2308', backgroundColor: '#fafaf8' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0d2e23' }} />
              <span className="text-xs font-semibold" style={{ color: '#0d2e23' }}>Trakeo — Pipeline de la semana</span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#c5f54a', color: '#0d2e23' }}>Lunes · 23 Jun</span>
          </div>

          <div className="grid grid-cols-3" style={{ borderTop: '1px solid #0d2e2308' }}>
            {/* Col 1: Lista de prospectos */}
            <div className="p-5">
              <div className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color: '#0d2e2360' }}>
                <Search size={11} /> PROSPECTOS ESTA SEMANA
              </div>
              {[
                { empresa: 'Inversiones Arias & Cia.', cargo: 'Gerente General', temp: 'caliente', color: '#c5f54a' },
                { empresa: 'Distribuidora Rionegro', cargo: 'Rep. Legal', temp: 'tibio', color: '#fbbf24' },
                { empresa: 'Soluciones HR Ltda.', cargo: 'Gerente Financiero', temp: 'frío', color: '#dadaff' },
              ].map(p => (
                <div key={p.empresa} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: '#0d2e2306' }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: '#0d2e23' }}>{p.empresa}</div>
                    <div className="text-xs" style={{ color: '#0d2e2350' }}>{p.cargo}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: p.color, color: '#0d2e23' }}>{p.temp}</span>
                </div>
              ))}
            </div>

            {/* Col 2: Seguimientos */}
            <div className="p-5">
              <div className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color: '#0d2e2360' }}>
                <Phone size={11} /> SEGUIMIENTOS HOY
              </div>
              {[
                { empresa: 'Tecnigas del Norte', accion: 'Llamar · 3er toque', hace: 'hace 6 meses' },
                { empresa: 'Constructora Palma Real', accion: 'Enviar propuesta', hace: 'hace 2 semanas' },
                { empresa: 'Grupo Comercial Andino', accion: 'Agendar reunión', hace: 'hace 1 mes' },
              ].map(s => (
                <div key={s.empresa} className="py-2.5 border-b" style={{ borderColor: '#0d2e2306' }}>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: '#0d2e23' }}>{s.empresa}</div>
                  <div className="text-xs font-medium" style={{ color: '#186b54' }}>{s.accion}</div>
                  <div className="text-xs" style={{ color: '#0d2e2440' }}>{s.hace}</div>
                </div>
              ))}
            </div>

            {/* Col 3: Mensaje listo */}
            <div className="p-5">
              <div className="text-xs font-semibold mb-4 flex items-center gap-2" style={{ color: '#0d2e2360' }}>
                <MessageCircle size={11} /> MENSAJE LISTO PARA ENVIAR
              </div>
              <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: '#f3efe5', border: '1px solid #0d2e2310' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#0d2e23' }}>Para: Inversiones Arias & Cia.</div>
                <p className="text-xs leading-relaxed" style={{ color: '#0d2e2370' }}>
                  "Buenos días, Dr. Arias. Le comparto las proyecciones de rentabilidad para pensión voluntaria en el segundo semestre…"
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 text-xs font-semibold py-2 rounded-lg" style={{ backgroundColor: '#0d2e23', color: '#f3efe5' }}>
                  Enviar por WhatsApp
                </button>
                <button className="text-xs px-3 py-2 rounded-lg" style={{ border: '1px solid #0d2e2315', color: '#0d2e2360' }}>
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-b py-10" style={{ borderColor: '#0d2e2315' }}>
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-3 gap-8 text-center">
          {[
            { n: '60%', l: 'del tiempo en tareas que no cierran ventas' },
            { n: '10+10', l: 'prospectos nuevos + seguimientos cada semana' },
            { n: '4–5 años', l: 'puede durar un cliente en el pipeline sin sistema' },
          ].map(s => (
            <div key={s.n}>
              <div className="mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2rem', color: '#0d2e23' }}>{s.n}</div>
              <div className="text-xs leading-snug" style={{ color: '#0d2e2360' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problema */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1.5 h-1.5 rounded-full inline-block mr-2" style={{ backgroundColor: '#186b54' }} /><span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#186b54' }}>El problema</span>
        </div>
        <h2 className="mb-16 leading-tight max-w-2xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.25rem)', color: '#0d2e23' }}>
          Más horas no significan<br />
          <span style={{ color: '#186b54', fontStyle: 'italic' }}>más negocios cerrados.</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 rounded-2xl p-8" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f3efe5' }}>
              <MapPin size={18} color="#0d2e23" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-lg mb-3">Prospección ciega</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#0d2e2370' }}>
              Buscas empresas por olfato. Entras al RUES a mano, encuentras el NIT, buscas teléfono y llamas sin saber si la empresa tiene potencial real.
            </p>
          </div>
          <div className="rounded-2xl p-8" style={{ backgroundColor: '#dadaff', border: '1px solid #b8b4f020' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#b8b4f030' }}>
              <TableProperties size={18} color="#0d2e23" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-lg mb-3">Excel como CRM</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#0d2e2370' }}>
              Anotas todo a mano. Nadie te recuerda a quién llamar hoy.
            </p>
          </div>
          <div className="rounded-2xl p-8" style={{ backgroundColor: '#dadaff', border: '1px solid #b8b4f020' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#b8b4f030' }}>
              <TrendingDown size={18} color="#0d2e23" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-lg mb-3">Sin termómetro</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#0d2e2370' }}>
              No sabes quién está caliente. Los interesados se enfrían mientras atiendes otros.
            </p>
          </div>
          <div className="col-span-2 rounded-2xl p-8" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#f3efe5' }}>
              <PhoneCall size={18} color="#0d2e23" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-lg mb-3">Nurturing uno a uno</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#0d2e2370' }}>
              Redactas cada mensaje individualmente. Enviar información de valor a 50 contactos distintos te toma horas que deberían ir en ventas.
            </p>
          </div>
        </div>
      </section>

      {/* Solución */}
      <section className="py-24" style={{ backgroundColor: '#0d2e23' }}>
        <div className="max-w-5xl mx-auto px-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1.5 h-1.5 rounded-full inline-block mr-2" style={{ backgroundColor: '#c5f54a' }} /><span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#c5f54a' }}>La solución</span>
          </div>
          <h2 className="mb-16 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.25rem)', color: '#f3efe5' }}>
            Un sistema que trabaja<br />
            <span style={{ color: '#c5f54a', fontStyle: 'italic' }}>mientras tú vendes.</span>
          </h2>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { n: '01', Icon: Search, t: '10 prospectos listos', d: 'Cada semana. Filtrados por sector, zona y facturación. Con nombre del representante y teléfono.', bg: '#1a3d30' },
              { n: '02', Icon: Thermometer, t: 'Termómetro de clientes', d: 'Frío, interesado, vinculado. Trakeo te dice a quién llamar esta semana y por qué es el momento.', bg: '#c5f54a', dark: true },
              { n: '03', Icon: MessageCircle, t: 'Nurturing por WhatsApp', d: 'IA genera el mensaje. Tú lo apruebas. Lo envías con un clic. Sin redactar, sin olvidar.', bg: '#1a3d30' },
            ].map(f => (
              <div key={f.n} className="rounded-2xl p-8 flex flex-col gap-6" style={{ backgroundColor: f.bg }}>
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: f.dark ? '#0d2e2315' : '#ffffff15' }}>
                    <f.Icon size={20} color={f.dark ? '#0d2e23' : '#f3efe5'} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs" style={{ color: f.dark ? '#0d2e2350' : '#f3efe530' }}>{f.n}</span>
                </div>
                <div>
                  <h3 className="font-semibold mb-2" style={{ color: f.dark ? '#0d2e23' : '#f3efe5' }}>{f.t}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: f.dark ? '#0d2e2370' : '#f3efe560' }}>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-8 py-24">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1.5 h-1.5 rounded-full inline-block mr-2" style={{ backgroundColor: '#186b54' }} /><span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#186b54' }}>Cómo funciona</span>
        </div>
        <h2 className="mb-16 leading-tight" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 3.25rem)', color: '#0d2e23' }}>
          De datos públicos<br />
          a <span style={{ color: '#186b54', fontStyle: 'italic' }}>negocios cerrados.</span>
        </h2>

        <div className="grid sm:grid-cols-5 gap-3">
          {[
            { n: '01', Icon: Building2, t: 'Empresas identificadas', d: 'Sector, zona y potencial de negocio' },
            { n: '02', Icon: BarChart3, t: 'Filtro inteligente', d: 'Solo las que valen tu tiempo' },
            { n: '03', Icon: Search, t: 'Top 10 semanales', d: 'Con nombre y contacto directo' },
            { n: '04', Icon: Thermometer, t: 'Pipeline vivo', d: 'Temperatura actualizada por contacto' },
            { n: '05', Icon: CheckCircle, t: 'WhatsApp listo', d: 'Mensaje aprobado, un clic para enviar' },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl p-6 flex flex-col gap-4" style={{ backgroundColor: 'white', border: '1px solid #0d2e2310' }}>
              <s.Icon size={18} color="#186b54" strokeWidth={1.5} />
              <div>
                <div className="font-semibold text-sm mb-1" style={{ color: '#0d2e23' }}>{s.t}</div>
                <div className="text-xs" style={{ color: '#0d2e2355' }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulario */}
      <section id="formulario" className="max-w-lg mx-auto px-8 py-24">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-1.5 h-1.5 rounded-full inline-block mr-2" style={{ backgroundColor: '#186b54' }} /><span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#186b54' }}>Acceso anticipado</span>
          </div>
          <h2 className="mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '2.5rem', color: '#0d2e23' }}>
            Reserva tu lugar
          </h2>
          <p className="text-sm" style={{ color: '#0d2e2360' }}>Solo 50 cupos para el primer piloto en Colombia.</p>
        </div>
        <LeadForm />
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: '#0d2e2315', color: '#0d2e2345' }}>
        © 2026 Trakeo · Bogotá, Colombia
      </footer>
    </main>
  )
}
