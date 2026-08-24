'use client'

import { useState, useEffect } from "react"
import Image from "next/image"

const DIKIDI_URL = "https://dikidi.net/1784388?p=1.pi-ssm"
const PHONE = "+375256827229"
const PHONE_DISPLAY = "+375 (25) 68-27-229"
const WHATSAPP_URL = "https://wa.me/375256827229"
const VIBER_URL = "viber://chat?number=%2B375256827229"
const TELEGRAM_URL = "https://t.me/Lapushka66"
const INSTAGRAM_URL = "https://instagram.com/zaiko_ta"

const services = [
  { name: "Ламинирование ресниц", price: "45 BYN", duration: "90 мин", desc: "Стойкий эффект завитых и ухоженных ресниц до 6–8 недель" },
  { name: "Долговременная укладка бровей", price: "35 BYN", duration: "60 мин", desc: "Аккуратные, оформленные брови с укладкой на 4–6 недель" },
  { name: "Окрашивание и коррекция бровей", price: "30 BYN", duration: "45 мин", desc: "Придание формы и насыщенного цвета бровям" },
  { name: "Коррекция бровей", price: "20 BYN", duration: "30 мин", desc: "Придание бровям идеальной формы под тип лица" },
  { name: "Окрашивание ресниц", price: "10 BYN", duration: "20 мин", desc: "Насыщенный цвет ресниц - быстро и надолго" },
]

const benefits = [
  { icon: "🌿", title: "Гипоаллергенные составы", desc: "Только сертифицированные безопасные материалы" },
  { icon: "⭐", title: "5+ лет опыта", desc: "Более 500 довольных клиенток за годы работы" },
  { icon: "💎", title: "Индивидуальный подход", desc: "Каждая процедура - под особенности ваших ресниц и бровей" },
  { icon: "📍", title: "Центр Крупок", desc: "Удобное расположение - ул. Советская, 49, 2 этаж" },
  { icon: "🏆", title: "Рейтинг 4.4★", desc: "Высокая оценка на Яндексе от реальных клиентов" },
]

const reviews = [
  {
    name: "Алеся Шараева",
    date: "2024",
    rating: 5,
    text: "Наконец-то нашла своего мастера! 👌 Всё делает очень аккуратно, красиво и со вкусом — результат всегда просто огонь! 🔥 Брови идеальной формы, ресницы естественные и выразительные ✨. Мастер вежливая и коммуникабельная, всегда всё объяснит. Хожу только к ней и всем советую! 💫",
    avatar: "А",
    url: "https://yandex.by/maps/org/17028481096/reviews?reviews%5BpublicId%5D=3553pxg9wjbbqqegvx5ddrc774",
    datePublished: "2024-08-15",
  },
  {
    name: "Анастасия Шолохман",
    date: "2024",
    rating: 5,
    text: "Татьяна, мастерство, которое вы проявили в работе с моими бровями и ресничками просто поразительно. Спасибо за все, обязательно вернусь и приведу с собой подруг. Таким мастером нужно делиться, ведь вас так сложно найти.🙂👍",
    avatar: "А",
    url: "https://yandex.by/maps/org/17028481096/reviews?reviews%5BpublicId%5D=593yvqgphutewdmx5rzzr4vde4",
    datePublished: "2024-07-22",
  },
  {
    name: "qwliiin",
    date: "2024",
    rating: 5,
    text: "рекомендую всем Татьяну как мастера. Она легко находит подход к каждому клиенту, учитывает все пожелания и создает неимоверную красоту!!",
    avatar: "Q",
    url: "https://yandex.by/maps/org/17028481096/reviews?reviews%5BpublicId%5D=3ckkfv09cfcyw41ez9yt3j1624",
    datePublished: "2024-06-10",
  },
]

const faqs = [
  {
    q: "Сколько держится эффект ламинирования?",
    a: "Ламинирование ресниц сохраняется 6–8 недель, долговременная укладка бровей - 4–6 недель. Срок зависит от особенностей волосяного покрова и правильности ухода после процедуры.",
  },
  {
    q: "Можно ли мочить ресницы после процедуры?",
    a: "В течение первых 24–48 часов после ламинирования необходимо избегать контакта с водой, парами и слезами. После этого периода ресницы можно мочить без ограничений.",
  },
  {
    q: "Есть ли противопоказания?",
    a: "Процедуры противопоказаны при аллергии на компоненты состава, активных воспалениях и повреждениях кожи вокруг глаз, в период беременности и кормления (по согласованию с врачом), при конъюнктивите.",
  },
  {
    q: "В чём отличие ламинирования от наращивания ресниц?",
    a: "Ламинирование - это уход за своими ресницами: состав придаёт им изогнутую форму, объём и блеск, питает и укрепляет. Наращивание - это прикрепление искусственных волосков. Ламинирование выглядит естественно и не требует выравнивания.",
  },
]

const galleryImages = [
  { src: "./images/work_3.webp", alt: "Ламинирование ресниц - результат", tall: true },
  { src: "./images/eye_6.webp", alt: "Оформление бровей - до и после", tall: false },
  { src: "./images/eye_0.webp", alt: "Укладка бровей - результат", tall: false },
  { src: "./images/work_5.webp", alt: "Ламинирование ресниц крупный план", tall: true },
  { src: "./images/work_4.webp", alt: "Идеальные брови после процедуры", tall: false },
  { src: "./images/girl_1.webp", alt: "Процесс ламинирования ресниц", tall: true },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-4 h-4 ${i <= count ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Structured data for reviews
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "name": "zaiko_ta - Ламинирование ресниц и бровей",
    "image": "https://zaiko-ta.by/images/ZT.svg",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Советская, дом 49, 2 этаж, кабинет 7",
      "addressLocality": "Крупки",
      "addressRegion": "Минская область",
      "postalCode": "223410",
      "addressCountry": "BY"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": "3",
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": reviews.map((review) => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.name
      },
      "datePublished": review.datePublished,
      "inLanguage": "ru",
      "reviewBody": review.text,
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating.toString(),
        "bestRating": "5",
        "worstRating": "1"
      },
      "itemReviewed": {
        "@type": "BeautySalon",
        "name": "zaiko_ta"
      },
      "url": review.url
    }))
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    setMenuOpen(false)
  }

  return (
    <>
      {/* Schema.org JSON-LD for reviews */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2", color: "#1A1618" }}>

      {/* ── STICKY HEADER ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(250,246,242,0.97)" : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          borderBottom: scrolled ? "1px solid #E8DCDA" : "none",
          boxShadow: scrolled ? "0 1px 16px rgba(26,22,24,0.06)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/images/ZT.svg" alt="ЗТ" width={36} height={36} className="object-contain" style={{ filter: "invert(30%) sepia(20%) saturate(600%) hue-rotate(300deg)" }} />
            <div className="leading-tight">
              <div className="font-display font-600 text-sm" style={{ color: scrolled ? "#1A1618" : "#FAF6F2" }}>Зайко Татьяна</div>
              <div className="text-xs" style={{ color: scrolled ? "#8B7E7A" : "rgba(250,246,242,0.65)" }}>beauty master</div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {[["Услуги", "services"], ["Работы", "gallery"], ["Обо мне", "about"], ["Отзывы", "reviews"], ["Контакты", "contacts"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="transition-all duration-200 hover:opacity-70 hover:scale-105" style={{ color: "#8B7E7A" }}>{label}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={DIKIDI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#B8748A", color: "#fff" }}
            >
              Записаться
            </a>
            <button
              className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Меню"
            >
              <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", transform: menuOpen ? "rotate(45deg) translate(3px, 3px)" : "" }} />
              <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", opacity: menuOpen ? 0 : 1 }} />
              <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", transform: menuOpen ? "rotate(-45deg) translate(3px, -3px)" : "" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 pt-2" style={{ backgroundColor: "rgba(250,246,242,0.98)" }}>
            {[["Услуги", "services"], ["Работы", "gallery"], ["Обо мне", "about"], ["Отзывы", "reviews"], ["Контакты", "contacts"]].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left py-3 text-sm border-b" style={{ color: "#1A1618", borderColor: "#E8DCDA" }}>{label}</button>
            ))}
            <a href={DIKIDI_URL} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center py-3 rounded-full text-sm font-medium" style={{ backgroundColor: "#B8748A", color: "#fff" }}>Записаться онлайн</a>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
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
                href={DIKIDI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-medium text-sm transition-all hover:opacity-90 hover:scale-105 active:scale-95"
                style={{ backgroundColor: "#B8748A", color: "#fff", boxShadow: "0 4px 20px rgba(184,116,138,0.4)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Записаться онлайн
              </a>
              <a
                href={`tel:${PHONE}`}
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

      {/* ── SERVICES ── */}
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
                  href={DIKIDI_URL}
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

      {/* ── GALLERY ── */}
      <section id="gallery" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Портфолио</p>
            <h2 className="font-display text-3xl sm:text-4xl font-500 mb-2" style={{ color: "#1A1618" }}>Реальные результаты</h2>
            <p className="text-sm" style={{ color: "#8B7E7A" }}>Работы из моего Instagram - без фильтров и ретуши</p>
          </div>

          {/* Masonry grid */}
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {galleryImages.map((img, i) => (
              <div
                key={i}
                className="gallery-card relative rounded-2xl overflow-hidden break-inside-avoid cursor-pointer"
                style={{ marginBottom: "1rem" }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full object-cover transition-transform duration-500"
                  style={{ height: img.tall ? "320px" : "220px" }}
                  loading="lazy"
                />
                <div
                  className="gallery-overlay absolute inset-0 flex items-end p-4 transition-opacity duration-300"
                  style={{ opacity: 0, background: "linear-gradient(to top, rgba(26,22,24,0.75) 0%, transparent 60%)" }}
                >
                  <p className="text-white text-sm font-medium">{img.alt}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ border: "1.5px solid #B8748A", color: "#B8748A" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              Ещё работы в Instagram
            </a>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Почему выбирают меня</p>
            <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Мои преимущества</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
              >
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="font-display font-500 text-base mb-2" style={{ color: "#1A1618" }}>{b.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8B7E7A" }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#1A1618" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
                <img
                  src="./images/ABOUT.webp"
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
                <Image src="/images/ZT.svg" alt="ЗТ" width={48} height={48} className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest mb-4 font-medium" style={{ color: "#C9956A" }}>Обо мне</p>
              <h2 className="font-display text-3xl sm:text-4xl font-500 mb-5 leading-tight" style={{ color: "#FAF6F2" }}>
                Зайко Татьяна -<br />мастер красоты
              </h2>
              <p className="text-base leading-relaxed mb-5" style={{ color: "#CCC0BE" }}>
                Более 5 лет я помогаю женщинам Крупок выглядеть ухоженно каждый день - без лишних усилий. Специализируюсь на ламинировании ресниц и долговременной укладке бровей: процедурах, которые подчёркивают натуральную красоту.
              </p>
              <p className="text-base leading-relaxed mb-8" style={{ color: "#CCC0BE" }}>
                Работаю только с проверенными гипоаллергенными составами. Принимаю в уютном кабинете в центре города - ул. Советская, 49, 2 этаж, каб. 7.
              </p>

              {/* Certs */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {["Сертификат ламинирование ресниц", "Сертификат долговременная укладка", "Повышение квалификации 2023", "Обучение у топ-мастеров"].map((cert, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <svg className="w-4 h-4 shrink-0" style={{ color: "#C9956A" }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span className="text-xs leading-snug" style={{ color: "#E8DCDA" }}>{cert}</span>
                  </div>
                ))}
              </div>

              <a
                href={DIKIDI_URL}
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

      {/* ── REVIEWS ── */}
      <section id="reviews" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Отзывы клиентов</p>
            <h2 className="font-display text-3xl sm:text-4xl font-500 mb-2" style={{ color: "#1A1618" }}>Что говорят клиентки</h2>
            <div className="flex items-center justify-center gap-2 mt-3">
              <StarRating count={4} />
              <span className="text-sm font-medium" style={{ color: "#1A1618" }}>4.4</span>
              <span className="text-sm" style={{ color: "#8B7E7A" }}>на Яндекс Картах</span>
            </div>
          </div>

          {/* Carousel */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((rev, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-500 text-base" style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}>
                    {rev.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-sm" style={{ color: "#1A1618" }}>{rev.name}</div>
                    <div className="text-xs" style={{ color: "#8B7E7A" }}>{rev.date}</div>
                  </div>
                </div>
                <StarRating count={rev.rating} />
                <p className="text-sm leading-relaxed flex-1" style={{ color: "#3D3338" }}>{rev.text}</p>
                <a
                  href={rev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 pt-1 hover:opacity-70 transition-opacity"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  <span className="text-xs" style={{ color: "#8B7E7A" }}>Источник на Яндекс.Картах</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Частые вопросы</p>
            <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Вопросы и ответы</h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-rose-50"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-display font-500 text-base leading-snug" style={{ color: "#1A1618" }}>{faq.q}</span>
                  <svg
                    className="w-5 h-5 shrink-0 transition-transform duration-300"
                    style={{ color: "#B8748A", transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`faq-content ${openFaq === i ? "open" : ""}`}>
                  <p className="px-6 pb-6 text-sm leading-relaxed" style={{ color: "#5A4E52" }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTS ── */}
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
                  <a href={`tel:${PHONE}`} className="text-sm transition-colors hover:opacity-70" style={{ color: "#B8748A" }}>{PHONE_DISPLAY}</a>
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
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#25D366", color: "#fff" }}>
                  <Image src="/images/whatsapp.svg" alt="whatsapp" width={24} height={24} />
                  WhatsApp
                </a>
                <a href={VIBER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#7360F2", color: "#fff" }}>
                  <Image src="/images/viber.svg" alt="Viber" width={36} height={36} />
                  Viber
                </a>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#229ED9", color: "#fff" }}>
                  <Image src="/images/telegram.svg" alt="telegram" width={24} height={24} />
                  Telegram
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)", color: "#fff" }}>
                  <Image src="/images/instagram.svg" alt="instagram" width={24} height={24} />
                  Instagram
                </a>
              </div>

              {/* Dual CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={DIKIDI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 rounded-full text-sm font-medium text-center transition-all hover:opacity-90"
                  style={{ backgroundColor: "#B8748A", color: "#fff" }}
                >
                  Записаться через DIKIDI
                </a>
                <a
                  href={VIBER_URL}
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

      {/* ── FOOTER ── */}
      <footer style={{ backgroundColor: "#1A1618", color: "#E8DCDA" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 pb-10" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/images/ZT.svg" alt="ЗТ" width={40} height={40} className="object-contain" style={{ filter: "brightness(0) invert(1)" }} />
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
                  <button key={id} onClick={() => scrollTo(id)} className="text-left text-sm transition-all duration-200 hover:text-white hover:translate-x-1" style={{ color: "#8B7E7A" }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Contact */}
            <div>
              <div className="font-medium text-sm mb-4" style={{ color: "#FAF6F2" }}>Контакты</div>
              <div className="flex flex-col gap-2 text-sm" style={{ color: "#8B7E7A" }}>
                <span>г. Крупки, ул. Советская, 49</span>
                <span>2 этаж, кабинет 7</span>
                <a href={`tel:${PHONE}`} className="hover:text-white transition-all duration-200 hover:translate-x-1" style={{ color: "#C9956A" }}>{PHONE_DISPLAY}</a>
                <div className="flex items-center gap-3 mt-2">
                  {[
                    [TELEGRAM_URL, "TG"],
                    [WHATSAPP_URL, "WA"],
                    [INSTAGRAM_URL, "IG"],
                  ].map(([href, label]) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 hover:scale-110 hover:bg-white hover:text-black" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#E8DCDA" }}>{label}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 text-xs" style={{ color: "#5A4E52" }}>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <span>© 2024 Зайко Татьяна. Все права защищены.</span>
              <span style={{ color: "#4A3E42" }}>УНП KE8812226</span>
            </div>
            <a href="#" className="hover:text-white transition-all duration-200 hover:underline">Политика конфиденциальности</a>
          </div>
        </div>
      </footer>

      {/* ── FLOATING MOBILE CTA ── */}
      <div className="fixed bottom-5 left-4 right-4 z-50 sm:hidden">
        <a
          href={DIKIDI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-medium text-sm transition-all active:scale-95"
          style={{ backgroundColor: "#B8748A", color: "#fff", boxShadow: "0 8px 32px rgba(184,116,138,0.45)" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Записаться онлайн
        </a>
      </div>

      </div>
    </>
  )
}
