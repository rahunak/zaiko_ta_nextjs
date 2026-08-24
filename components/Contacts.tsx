import Image from "next/image"

interface ContactsProps {
  phone: string
  phoneDisplay: string
  whatsappUrl: string
  viberUrl: string
  telegramUrl: string
  instagramUrl: string
  dikidiUrl: string
  scrollTo: (id: string) => void
}

export function Contacts({ phone, phoneDisplay, whatsappUrl, viberUrl, telegramUrl, instagramUrl, dikidiUrl, scrollTo }: ContactsProps) {
  return (
    <section id="contacts" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Контакты</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Как меня найти</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Map */}
          <div className="rounded-3xl overflow-hidden" style={{ height: "420px", border: "1px solid #E8DCDA" }}>
            <iframe
              src="https://yandex.ru/map-widget/v1/?ll=29.135800%2C54.319700&z=16&pt=29.135800,54.319700,pm2rdm&text=%D0%9A%D1%80%D1%83%D0%BF%D0%BA%D0%B8%2C%20%D1%83%D0%BB.%20%D0%A1%D0%BE%D0%B2%D0%B5%D1%82%D1%81%D0%BA%D0%B0%D1%8F%2049"
              width="100%"
              height="100%"
              frameBorder="0"
              title="Карта - Зайко Татьяна, Крупки"
              allowFullScreen
            />
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center gap-6">
            {/* Address */}
            <div className="flex gap-4 p-5 rounded-2xl" style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#F2E4EA" }}>
                <svg className="w-5 h-5" style={{ color: "#B8748A" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5" style={{ color: "#1A1618" }}>Адрес</div>
                <div className="text-sm" style={{ color: "#5A4E52" }}>г. Крупки, ул. Советская, 49<br />2 этаж, кабинет 7</div>
              </div>
            </div>

            {/* Phone */}
            <div className="flex gap-4 p-5 rounded-2xl" style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#F2E4EA" }}>
                <svg className="w-5 h-5" style={{ color: "#B8748A" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5" style={{ color: "#1A1618" }}>Телефон</div>
                <a href={`tel:${phone}`} className="text-sm transition-colors hover:opacity-70" style={{ color: "#B8748A" }}>{phoneDisplay}</a>
              </div>
            </div>

            {/* Hours */}
            <div className="flex gap-4 p-5 rounded-2xl" style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#F2E4EA" }}>
                <svg className="w-5 h-5" style={{ color: "#B8748A" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-1" style={{ color: "#1A1618" }}>Часы работы</div>
                <div className="text-sm" style={{ color: "#5A4E52" }}>Пн–Вс: 9:00 - 19:00<br /></div>
              </div>
            </div>

            {/* Social links */}
            <div className="flex flex-wrap gap-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#25D366", color: "#fff" }}>
                <Image src="/images/whatsapp.svg" alt="чат в WhatsApp" width={24} height={24} />
                WhatsApp
              </a>
              <a href={viberUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#7360F2", color: "#fff" }}>
                <Image src="/images/viber.svg" alt="чат в Viber" width={36} height={36} />
                Viber
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#229ED9", color: "#fff" }}>
                <Image src="/images/telegram.svg" alt="чат в Telegram" width={24} height={24} />
                Telegram
              </a>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)", color: "#fff" }}>
                <Image src="/images/instagram.svg" alt="Профиль в Instagram" width={24} height={24} />
                Instagram
              </a>
            </div>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={dikidiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-center transition-all hover:opacity-90"
                style={{ backgroundColor: "#B8748A", color: "#fff" }}
              >
                Записаться через DIKIDI
              </a>
              <a
                href={viberUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-full text-sm font-medium text-center transition-all hover:opacity-90"
                style={{ border: "1.5px solid #B8748A", color: "#B8748A" }}
              >
                Написать в Viber
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
