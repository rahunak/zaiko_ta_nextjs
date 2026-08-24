interface HeroProps {
  dikidiUrl: string
  phone: string
  scrollTo: (id: string) => void
}

export function Hero({ dikidiUrl, phone, scrollTo }: HeroProps) {
  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/work_1.webp"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.38)" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(26,22,24,0.72) 0%, rgba(26,22,24,0.3) 60%, rgba(26,22,24,0.05) 100%)" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16 w-full">
        <div className="max-w-xl">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-6 animate-fade-up animate-fade-up-delay-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(201,149,106,0.2)", color: "#F5C89A", border: "1px solid rgba(201,149,106,0.35)" }}>
              ★ Рейтинг 4.4 на Яндексе
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#E8DCDA", border: "1px solid rgba(255,255,255,0.2)" }}>
              📍 ул. Советская 49, Крупки
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-500 leading-tight mb-5 animate-fade-up animate-fade-up-delay-2" style={{ color: "#FAF6F2" }}>
            Ламинирование<br />
            <span style={{ color: "#C9956A" }}>ресниц и бровей</span><br />
            в Крупках
          </h1>

          <p className="text-base sm:text-lg leading-relaxed mb-8 animate-fade-up animate-fade-up-delay-3" style={{ color: "#CCC0BE" }}>
            Естественная красота, гипоаллергенные материалы,<br className="hidden sm:block" />
            5+ лет опыта. Мастер Зайко Татьяна.
          </p>

          <div className="flex flex-wrap gap-3 animate-fade-up animate-fade-up-delay-3">
            <a
              href={dikidiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:opacity-90 hover:scale-105 active:scale-95"
              style={{ backgroundColor: "#B8748A", color: "#fff", boxShadow: "0 4px 20px rgba(184,116,138,0.4)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Записаться онлайн
            </a>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ border: "1.5px solid rgba(255,255,255,0.35)", color: "#FAF6F2", backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              Позвонить
            </a>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce" style={{ color: "rgba(255,255,255,0.4)" }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
    </section>
  )
}
