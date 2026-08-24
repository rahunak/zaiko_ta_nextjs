interface Service {
  name: string
  price: string
  duration: string
  desc: string
}

interface ServicesProps {
  services: Service[]
  dikidiUrl: string
}

export function Services({ services, dikidiUrl }: ServicesProps) {
  return (
    <section id="services" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Услуги и цены</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Что я предлагаю</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc, i) => (
            <div
              key={i}
              className="group rounded-2xl p-6 flex flex-col gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA", boxShadow: "0 1px 6px rgba(26,22,24,0.04)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display font-500 text-lg leading-snug" style={{ color: "#1A1618" }}>{svc.name}</h3>
                <span className="shrink-0 font-600 text-base rounded-full px-3 py-0.5 text-sm" style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}>{svc.price}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#8B7E7A" }}>{svc.desc}</p>
              <div className="flex items-center gap-1.5 mt-auto pt-1" style={{ color: "#C9956A" }}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
                <span className="text-xs">{svc.duration}</span>
              </div>
              <a
                href={dikidiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 w-full py-2.5 rounded-xl text-sm font-medium text-center transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}
              >
                Записаться
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
