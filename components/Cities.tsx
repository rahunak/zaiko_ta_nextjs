"use client"

import Link from "next/link"

interface CityGeo {
  slug: string
  city: string
  url: string
  distance: string
  time: string
  card: string
}

interface CitiesProps {
  cities: CityGeo[]
}

export function Cities({ cities }: CitiesProps) {
  return (
    <section id="cities" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>
            Для клиенток из соседних городов
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-500 mb-4" style={{ color: "#1A1618" }}>
            Уютный кабинет в Крупках — легко доехать из вашего города
          </h2>
          <p className="text-base max-w-2xl mx-auto" style={{ color: "#5A4E52" }}>
            За 40–60 минут на машине вы приезжаете к мастеру с 5+ годами опыта,
            официальными ценами и рейтингом 4.5★ на Яндекс Картах. За один визит
            можно оформить и брови, и ламинирование ресниц — эффект на 4–6 недель.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={c.url}
              className="flex flex-col gap-3 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-500" style={{ color: "#1A1618" }}>
                  Из {c.city}а
                </h3>
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}
                >
                  {c.distance}
                </span>
              </div>
              <div className="text-sm font-medium" style={{ color: "#B8748A" }}>{c.time}</div>
              <p className="text-sm leading-relaxed flex-1" style={{ color: "#5A4E52" }}>{c.card}</p>
              <span className="text-sm font-medium inline-flex items-center gap-1 hover:translate-x-1 transition-transform" style={{ color: "#B8748A" }}>
                Как доехать →
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm mb-5" style={{ color: "#8B7E7A" }}>
            Вопросы по записи из вашего города? Напишите в WhatsApp или Viber — отвечу в течение дня.
          </p>
        </div>
      </div>
    </section>
  )
}
