"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { FloatingCTA } from "@/components/FloatingCTA"
import { FAQ } from "@/components/FAQ"
import { StarRating } from "./StarRating"
import { services, galleryImages } from "@/lib/data"
// Перелинковка гео-посадки ↔ блог (план роста 25.10, Этап 1):
// статья блога ссылается на гео-страницу, гео-страница — на статьи.
import { articles } from "@/lib/blog"

export interface GeoCityData {
  slug: string
  city: string
  genitive: string // «Толочина», «Новолукомля», «Борисова»
  distance: string
  time: string
  h1: string
  subtitle: string
  intro: string[]
  route: string[]
  highlights: string[]
  faqs: { q: string; a: string }[]
}

interface GeoPageProps {
  data: GeoCityData
  phone: string
  phoneDisplay: string
  whatsappUrl: string
  viberUrl: string
  telegramUrl: string
  instagramUrl: string
  dikidiUrl: string
  sendMessageUrl?: string
}

const GEO_NAV: [string, string][] = [
  ["Маршрут", "route"],
  ["Цены", "prices"],
  ["Вопросы", "faq"],
  ["Запись", "book"],
]

export default function GeoPage({
  data,
  phone,
  phoneDisplay,
  whatsappUrl,
  viberUrl,
  telegramUrl,
  instagramUrl,
  dikidiUrl,
}: GeoPageProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2", color: "#1A1618" }}>
      <Header scrolled={scrolled} scrollTo={scrollTo} dikidiUrl={dikidiUrl} navItems={GEO_NAV} />

      {/* Hero */}
      <section
        id="hero-geo"
        className="pt-32 pb-16 px-4 sm:px-6 text-center"
        style={{ backgroundColor: "#1A1618" }}
      >
        <div className="max-w-3xl mx-auto">
          <span
            className="inline-block text-xs px-4 py-1.5 rounded-full font-medium mb-6"
            style={{ backgroundColor: "rgba(184,116,138,0.25)", color: "#E8DCDA" }}
          >
            Из {data.genitive} → Крупки: {data.distance}, {data.time}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-500 mb-5 leading-tight" style={{ color: "#FAF6F2" }}>
            {data.h1}
          </h1>
          <p className="text-base sm:text-lg mb-8" style={{ color: "#CCC0BE" }}>
            {data.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={dikidiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#B8748A", color: "#fff" }}
            >
              Записаться онлайн
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#25D366", color: "#fff" }}
            >
              Написать в WhatsApp
            </a>
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            <StarRating count={4} />
            <span className="text-sm" style={{ color: "#E8DCDA" }}>4.5★ на Яндекс Картах</span>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
        <div className="max-w-3xl mx-auto">
          {data.intro.map((p, i) => (
            <p key={i} className="text-base leading-relaxed mb-5" style={{ color: "#3D3338" }}>{p}</p>
          ))}
          <ul className="flex flex-col gap-3 mt-8">
            {data.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#B8748A" }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm leading-relaxed" style={{ color: "#3D3338" }}>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Route */}
      <section id="route" className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Как добраться</p>
          <h2 className="font-display text-2xl sm:text-3xl font-500 mb-6" style={{ color: "#1A1618" }}>
            Из {data.genitive} в Крупки: {data.distance}, {data.time}
          </h2>
          <ol className="flex flex-col gap-3">
            {data.route.map((step, i) => (
              <li key={i} className="flex gap-4 p-4 rounded-2xl" style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}>
                <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium" style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}>
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed" style={{ color: "#3D3338" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Prices */}
      <section id="prices" className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Цены</p>
          <h2 className="font-display text-2xl sm:text-3xl font-500 mb-8" style={{ color: "#1A1618" }}>Что можно сделать за один визит</h2>
          <div className="flex flex-col gap-3">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between gap-4 p-5 rounded-2xl"
                style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
              >
                <div>
                  <div className="font-medium text-sm mb-1" style={{ color: "#1A1618" }}>{s.name}</div>
                  <div className="text-xs" style={{ color: "#8B7E7A" }}>{s.duration} · {s.desc}</div>
                </div>
                <div className="font-display text-lg shrink-0" style={{ color: "#B8748A" }}>{s.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Работы мастера (фото с главной, alt-тексты из lib/data) */}
      <section className="py-12 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Работы мастера</p>
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.slice(0, 6).map((img) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                loading="lazy"
                className="w-full h-24 sm:h-32 object-cover rounded-xl"
              />
            ))}
          </div>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs hover:opacity-70 transition-opacity" style={{ color: "#8B7E7A" }}>
            Больше работ — Instagram @zaiko_ta
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
        <div className="max-w-3xl mx-auto">
          <FAQ faqs={data.faqs} />
        </div>
      </section>

      {/* Полезные статьи (перелинковка с блогом) */}
      <section id="blog" className="py-12 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Полезные статьи</p>
          <h2 className="font-display text-2xl sm:text-3xl font-500 mb-6" style={{ color: "#1A1618" }}>
            Всё о процедуре — до того, как ехать
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {articles.slice(0, 3).map((article) => (
              <a
                key={article.slug}
                href={`/blog/${article.slug}`}
                className="block p-5 rounded-2xl transition-all hover:shadow-md"
                style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
              >
                <div className="font-medium text-sm mb-2" style={{ color: "#1A1618" }}>{article.h1}</div>
                <div className="text-xs leading-relaxed" style={{ color: "#8B7E7A" }}>{article.description}</div>
              </a>
            ))}
          </div>
          <a href="/blog" className="inline-block mt-4 text-sm hover:underline" style={{ color: "#B8748A" }}>
            Все статьи блога →
          </a>
        </div>
      </section>

      {/* Book */}
      <section id="book" className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#1A1618" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-500 mb-4" style={{ color: "#FAF6F2" }}>
            Запись к Татьяне из {data.genitive}
          </h2>
          <p className="text-sm mb-8" style={{ color: "#CCC0BE" }}>
            Адрес: г. Крупки, ул. Советская, 49, 2 этаж, кабинет 7 · Пн–Вс: 9:00–19:00 · Тел. {phoneDisplay}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={dikidiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#B8748A", color: "#fff" }}
            >
              Онлайн-запись через DIKIDI
            </a>
            <a
              href={viberUrl}
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ border: "1.5px solid #B8748A", color: "#B8748A" }}
            >
              Viber
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: "#229ED9", color: "#fff" }}
            >
              Telegram
            </a>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 text-xs hover:opacity-70 transition-opacity"
            style={{ color: "#8B7E7A" }}
          >
            Работы мастера — Instagram @zaiko_ta
          </a>
        </div>
      </section>

      <Footer
        phone={phone}
        phoneDisplay={phoneDisplay}
        telegramUrl={telegramUrl}
        whatsappUrl={whatsappUrl}
        viberUrl={viberUrl}
        instagramUrl={instagramUrl}
        scrollTo={scrollTo}
        navItems={GEO_NAV}
      />
      <FloatingCTA dikidiUrl={dikidiUrl} />
    </div>
  )
}
