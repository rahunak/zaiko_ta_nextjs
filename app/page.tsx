import Script from "next/script"
import HomeClient from "@/components/HomeClient"
import { reviews, faqs } from "@/lib/data"
import { getSiteServices } from "@/lib/site-services"

export default async function Home() {
  // Услуги и цены — из БД (единый источник с /book), тексты карточек — из lib/data.ts.
  const services = await getSiteServices()

  // LocalBusiness structured data with reviews
  const localBusinessData = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "name": "Зайко Татьяна - Ламинирование ресниц и бровей",
    "image": "https://zaiko.by/images/ZT.svg",
    "description": "Профессиональное ламинирование ресниц и долговременная укладка бровей в Крупках. 5+ лет опыта, гипоаллергенные составы. Удобно приезжать из Толочина, Новолукомля и Борисова.",
    "@id": "https://zaiko.by",
    "url": "https://zaiko.by",
    "telephone": "+375256827229",
    "priceRange": "20-50 BYN",
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
    "areaServed": [
      { "@type": "City", "name": "Крупки" },
      { "@type": "City", "name": "Толочин" },
      { "@type": "City", "name": "Новолукомль" },
      { "@type": "City", "name": "Борисов" }
    ],
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "09:00",
        // Синхронизировано с блоком «Часы работы» в components/Contacts.tsx (9:00–19:00)
        "closes": "19:00"
      }
    ],
    "sameAs": [
      "https://instagram.com/zaiko_ta",
      "https://t.me/Lapushka66",
      "https://dikidi.net/1784388"
    ],
    // Единый источник правды по рейтингу: schema — по отзывам СВОБОДНО размещённым на
    // этой странице (reviews из lib/data.ts), бейдж «4.5★ на Яндекс Картах» в Reviews.tsx —
    // рейтинг ВНЕШНЕГО источника и в schema не дублируется. См. P2 отчёта 2026-10-16.
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
      // Цены берутся из БД вместе с карточками услуг — расхождений с /book нет.
      "itemListElement": services.map((service) => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": service.name,
          "description": service.desc
        },
        "price": service.priceValue,
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

      <HomeClient services={services} />

      <Script
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var iframe=null;
            function getIframe(){ if(!iframe) iframe=document.querySelector('iframe[src^="/character.html"]'); return iframe; }
            function send(type,x,y){ var f=getIframe(); if(f&&f.contentWindow){ var r=f.getBoundingClientRect(); f.contentWindow.postMessage({type:type,x:x-r.left,y:y-r.top},'*'); } }
            document.addEventListener('pointermove',function(e){ send('pointer',e.clientX,e.clientY); },{passive:true});
            document.addEventListener('pointerdown',function(e){ send('down',e.clientX,e.clientY); },{passive:true});
          })();`,
        }}
      />
    </>
  )
}
