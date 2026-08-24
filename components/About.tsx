import Image from "next/image"

interface AboutProps {
  dikidiUrl: string
}

export function About({ dikidiUrl }: AboutProps) {
  return (
    <section id="about" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#1A1618" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
              <img
                src="./images/about_me.webp"
                alt="Зайко Татьяна - мастер по ресницам и бровям"
                className="w-full object-cover"
                style={{ height: "500px" }}
              />
            </div>
            {/* Floating logo badge */}
            <div
              className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#B8748A", boxShadow: "0 8px 24px rgba(184,116,138,0.4)" }}
            >
              <Image src="/images/ZT.svg" alt="" width={48} height={48} className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest mb-4 font-medium" style={{ color: "#C9956A" }}>Обо мне</p>
            <h2 className="font-display text-3xl sm:text-4xl font-500 mb-5 leading-tight" style={{ color: "#FAF6F2" }}>
              Зайко Татьяна -<br />мастер красоты
            </h2>
            <p className="text-base leading-relaxed mb-5" style={{ color: "#CCC0BE" }}>
              Более 5 лет я помогаю девушкам выглядеть ухоженно каждый день - без лишних усилий. Специализируюсь на ламинировании ресниц и долговременной укладке бровей: процедурах, которые подчёркивают натуральную красоту.
            </p>
            <p className="text-base leading-relaxed mb-8" style={{ color: "#CCC0BE" }}>
              Работаю только с проверенными гипоаллергенными составами. Принимаю в уютном кабинете в центре города - ул. Советская, 49, 2 этаж, каб. 7.
            </p>

            {/* Certs */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {["Сертификат ламинирование ресниц", "Сертификат долговременная укладка", "Повышение квалификации 2025", "Обучение у топ-мастеров"].map((cert, i) => (
                <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: "#C9956A" }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="text-xs leading-snug" style={{ color: "#E8DCDA" }}>{cert}</span>
                </div>
              ))}
            </div>

            <a
              href={dikidiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: "#B8748A", color: "#fff" }}
            >
              Записаться к Татьяне
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
