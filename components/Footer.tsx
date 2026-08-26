import Image from "next/image"

interface FooterProps {
  phone: string
  phoneDisplay: string
  telegramUrl: string
  whatsappUrl: string
  instagramUrl: string
  scrollTo: (id: string) => void
}

export function Footer({ phone, phoneDisplay, telegramUrl, whatsappUrl, instagramUrl, scrollTo }: FooterProps) {
  return (
    <footer style={{ backgroundColor: "#1A1618", color: "#E8DCDA" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/images/ZT.svg" alt="" width={40} height={40} className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              <div>
                <div className="font-display font-500 text-base" style={{ color: "#FAF6F2" }}>Зайко Татьяна</div>
                <div className="text-xs" style={{ color: "#8B7E7A" }}>Мастер красоты, Крупки</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#8B7E7A" }}>Ламинирование ресниц и бровей. Гипоаллергенные составы. 5+ лет опыта.</p>
          </div>

          {/* Quick links */}
          <div>
            <div className="font-medium text-sm mb-4" style={{ color: "#FAF6F2" }}>Навигация</div>
            <div className="flex flex-col gap-2">
              {[["Услуги", "services"], ["Работы", "gallery"], ["Обо мне", "about"], ["Отзывы", "reviews"], ["Контакты", "contacts"]].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)} className="text-left text-sm transition-all duration-200 hover:text-white hover:translate-x-1 cursor-pointer" style={{ color: "#8B7E7A" }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div className="font-medium text-sm mb-4" style={{ color: "#FAF6F2" }}>Контакты</div>
            <div className="flex flex-col gap-2 text-sm" style={{ color: "#8B7E7A" }}>
              <span>г. Крупки, ул. Советская, 49</span>
              <span>2 этаж, кабинет 7</span>
              <a href={`tel:${phone}`} className="hover:text-white transition-all duration-200 hover:translate-x-1" style={{ color: "#C9956A" }}>{phoneDisplay}</a>
              <div className="flex items-center gap-3 mt-2">
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="group w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-white" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Image src="/images/telegram.svg" alt="чат в Telegram" width={16} height={16} className="transition-all duration-200 group-hover:brightness-0" />
                </a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="group w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-white" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Image src="/images/whatsapp.svg" alt="чат в WhatsApp" width={16} height={16} className="transition-all duration-200 group-hover:brightness-0" />
                </a>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="group w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-white" style={{ border: "1px solid rgba(255,255,255,0.2)" }}>
                  <Image src="/images/instagram.svg" alt="Профиль в Instagram" width={16} height={16} className="transition-all duration-200 group-hover:brightness-0" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 text-xs" style={{ color: "#5A4E52" }}>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span>© 2026 Зайко Татьяна. Все права защищены.</span>
            <span style={{ color: "#4A3E42" }}>УНП KE8812226</span>
          </div>
          <a href="#" className="hover:text-white transition-all duration-200 hover:underline">Политика конфиденциальности</a>
        </div>
      </div>
    </footer>
  )
}
