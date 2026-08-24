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
import { services, benefits, reviews, faqs, galleryImages } from "@/lib/data"

const DIKIDI_URL = "https://dikidi.net/1784388?p=1.pi-ssm"
const PHONE = "+375256827229"
const PHONE_DISPLAY = "+375 (25) 68-27-229"
const WHATSAPP_URL = "https://wa.me/375256827229"
const VIBER_URL = "viber://chat?number=%2B375256827229"
const TELEGRAM_URL = "https://t.me/Lapushka66"
const INSTAGRAM_URL = "https://instagram.com/zaiko_ta"

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

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

  return (
    <>
      {/* Schema.org JSON-LD for reviews */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2", color: "#1A1618" }}>
        <Header scrolled={scrolled} scrollTo={scrollTo} dikidiUrl={DIKIDI_URL} />
        <Hero dikidiUrl={DIKIDI_URL} phone={PHONE} scrollTo={scrollTo} />
        <Services services={services} dikidiUrl={DIKIDI_URL} />
        <Gallery images={galleryImages} instagramUrl={INSTAGRAM_URL} />
        <Benefits benefits={benefits} />
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
          instagramUrl={INSTAGRAM_URL}
          scrollTo={scrollTo}
        />
        <FloatingCTA dikidiUrl={DIKIDI_URL} />
      </div>
    </>
  )
}
