'use client'

import { useState, useEffect } from "react"
import { Header } from "@/components/Header"
import { Hero } from "@/components/Hero"
import { Services } from "@/components/Services"
import { Gallery } from "@/components/Gallery"
import { Benefits } from "@/components/Benefits"
import { About } from "@/components/About"
import { Reviews } from "@/components/Reviews"
import { FAQ } from "@/components/FAQ"
import { Contacts } from "@/components/Contacts"
import { Footer } from "@/components/Footer"
import { FloatingCTA } from "@/components/FloatingCTA"
import { Cities } from "@/components/Cities"
import { benefits, reviews, faqs, galleryImages, citiesGeo } from "@/lib/data"
import type { SiteService } from "@/lib/site-services"

const DIKIDI_URL = "/book"
const PHONE = "+375256827229"
const PHONE_DISPLAY = "+375 (25) 68-27-229"
const WHATSAPP_URL = "https://wa.me/375256827229"
const VIBER_URL = "viber://chat?number=%2B375256827229"
const TELEGRAM_URL = "https://t.me/Lapushka66"
const INSTAGRAM_URL = "https://instagram.com/zaiko_ta"

/**
 * Интерактивная часть лендинга. Вынесена из app/page.tsx, чтобы страница
 * оставалась серверной: услуги с ценами приходят из БД готовыми.
 */
export default function HomeClient({ services }: { services: SiteService[] }) {
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
      <Header scrolled={scrolled} scrollTo={scrollTo} dikidiUrl={DIKIDI_URL} />
      <Hero dikidiUrl={DIKIDI_URL} phone={PHONE} scrollTo={scrollTo} />
      <Services services={services} dikidiUrl={DIKIDI_URL} />
      <Gallery images={galleryImages} instagramUrl={INSTAGRAM_URL} />
      <Benefits benefits={benefits} />
      <Cities cities={citiesGeo} />
      <About dikidiUrl={DIKIDI_URL} />
      <Reviews reviews={reviews} />
      <FAQ faqs={faqs} />
      <Contacts
        phone={PHONE}
        phoneDisplay={PHONE_DISPLAY}
        whatsappUrl={WHATSAPP_URL}
        viberUrl={VIBER_URL}
        telegramUrl={TELEGRAM_URL}
        instagramUrl={INSTAGRAM_URL}
        dikidiUrl={DIKIDI_URL}
        scrollTo={scrollTo}
      />
      <Footer
        phone={PHONE}
        phoneDisplay={PHONE_DISPLAY}
        telegramUrl={TELEGRAM_URL}
        whatsappUrl={WHATSAPP_URL}
        viberUrl={VIBER_URL}
        instagramUrl={INSTAGRAM_URL}
        scrollTo={scrollTo}
      />
      <FloatingCTA dikidiUrl={DIKIDI_URL} />
    </div>
  )
}
