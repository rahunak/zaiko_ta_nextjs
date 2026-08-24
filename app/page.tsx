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

  // LocalBusiness structured data with reviews
  const localBusinessData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "name": "Зайко Татьяна - Ламинирование ресниц и бровей",
    "image": "https://zaiko.by/images/ZT.svg",
    "description": "Профессиональное ламинирование ресниц и долговременная укладка бровей в Крупках. 5+ лет опыта, гипоаллергенные составы.",
    "@id": "https://zaiko.by",
    "url": "https://zaiko.by",
    "telephone": "+375256827229",
    "priceRange": "20-45 BYN",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Советская, дом 49, 2 этаж, кабинет 7",
      "addressLocality": "Крупки",
      "addressRegion": "Минская область",
      "postalCode": "223410",
      "addressCountry": "BY"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "54.324896",
      "longitude": "29.142504"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "09:00",
        "closes": "20:00"
      }
    ],
    "sameAs": [
      "https://instagram.com/zaiko_ta",
      "https://t.me/Lapushka66",
      "https://dikidi.net/1784388"
    ],
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
      }
    })),
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Услуги по уходу за ресницами и бровями",
      "itemListElement": services.map((service, index) => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": service.name,
          "description": service.desc
        },
        "price": Number(service.price.replace(/[^\d.]/g, '')),
        "priceCurrency": "BYN"
      }))
    }
  }

  // FAQ structured data
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  }

  // BreadcrumbList structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Главная",
        "item": "https://zaiko.by"
      }
    ]
  }

  return (
    <>
      {/* LocalBusiness Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessData) }}
      />

      {/* FAQ Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
      />

      {/* Breadcrumb Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
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
