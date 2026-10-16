import type { Metadata } from "next"
import GeoPage, { type GeoCityData } from "@/components/GeoPage"

const PHONE = "+375256827229"
const PHONE_DISPLAY = "+375 (25) 68-27-229"
const DIKIDI_URL = "https://dikidi.net/1784388?p=1.pi-ssm"
const WHATSAPP_URL = "https://wa.me/375256827229"
const VIBER_URL = "viber://chat?number=%2B375256827229"
const TELEGRAM_URL = "https://t.me/Lapushka66"
const INSTAGRAM_URL = "https://instagram.com/zaiko_ta"

const data: GeoCityData = {
  slug: "tolochin",
  city: "Толочин",
  genitive: "Толочина",
  distance: "40 км",
  time: "около 40 минут на машине",
  h1: "Ламинирование бровей и ресниц для жительниц Толочина — мастер в Крупках, 40 км",
  subtitle:
    "Долговременная укладка и коррекция бровей, ламинирование ресниц у мастера с 5+ годами опыта. Из Толочина до кабинета в центре Крупок — 40 минут на машине.",
  intro: [
    "В Толочине брови оформляют частные мастера из Instagram и VK — но почти ни у кого из них нет публичного прайса, фиксированного графика и накопленных отзывов. Если надоело гадать, будет ли свободное «окно» в этот четверг, — студия в Крупках в 40 км и ~40 минутах на машине открывается быстро: запись подтверждается заранее.",
    "Татьяна Зайко принимает в кабинете по ул. Советской, 49 уже 5+ лет: у студии официально указанные цены, график 9:00–19:00 без выходных и рейтинг 4.5★ на Яндекс Картах. За один визит можно уладить и брови, и ламинирование ресниц — и не думать о макияже 4–6 недель.",
  ],
  route: [
    "Из Толочина выезжаете по трассе Р62 в сторону Крупок — дорога ровная, около 40 км.",
    "В Крупках поворачиваете к центру города: ул. Советская, 49 (2 этаж, кабинет 7).",
    "Рядом с домом — свободная парковка, дорогу подскажет любой ориентир «стадион» / «почта».",
    "После процедуры — тот же маршрут назад: к вечеру вы дома, эффект держится 4–6 недель.",
  ],
  highlights: [
    "Официальный прайс: долговременная укладка бровей с окрашиванием — 35/40 BYN, коррекция — 20 BYN, ламинирование ресниц — 50 BYN.",
    "Гипоаллергенные сертифицированные составы — важно, если в Толочине уже был негативный опыт с дешёвыми материалами.",
    "Удобное комбинирование: брови + ламинирование ресниц за один визит — две процедуры подряд, ~2 часа.",
    "Гибкое время: подберём слот под ваш маршрут — можно успеть до или после работы/учёбы.",
  ],
  faqs: [
    {
      q: "Сколько ехать из Толочина до Крупок?",
      a: "Около 40 км и 40 минут на машине по трассе Р62. Кабинет — в центре города, ул. Советская 49, рядом парковка.",
    },
    {
      q: "Можно ли записаться из Толочина вечером после работы?",
      a: "Да. Студия принимает с 9:00 до 19:00 ежедневно — напишите в WhatsApp или Viber, подберём слот под ваш график. Длительность процедур: коррекция 20 мин, укладка бровей 40–60 мин, ламинирование ресниц 60 мин.",
    },
    {
      q: "Сколько стоят услуги для приезжающих из Толочина?",
      a: "Цены единые для всех: долговременная укладка бровей 35/40 BYN, коррекция 20 BYN, окрашивание 30 BYN, ламинирование ресниц 50 BYN. «Гео-скидок» нет — но за один визит вы закрываете 4–6 недель ухода без ежедневного макияжа.",
    },
    {
      q: "Что если после укладки через неделю результат не понравится?",
      a: "Напишите мастеру в WhatsApp/Viber — разберём ситуацию вместе, Татьяна всегда на связи со своими клиентками. Статистика трудных случаев за 5+ лет — минимальная: составы сертифицированные, технология отработана на сотнях клиенток.",
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL("https://zaiko.by"),
  title: "Брови в Толочине — мастер в Крупках, 40 км | Ламинирование у Зайко Татьяны",
  description:
    "Ламинирование и долговременная укладка бровей у мастера с 5+ годами опыта — 40 км от Толочина, ~40 минут на машине. Официальный прайс от 20 BYN, рейтинг 4.5★ на Яндекс Картах. Запись в WhatsApp/Viber.",
  alternates: { canonical: "https://zaiko.by/brovi-tolochin" },
  openGraph: {
    title: "Брови в Толочине — мастер в Крупках (40 км)",
    description:
      "Долговременная укладка бровей и ламинирование ресниц у Зайко Татьяны. Из Толочина — 40 минут. Рейтинг 4.5★, прайс от 20 BYN.",
    type: "website",
    locale: "ru_RU",
    url: "https://zaiko.by/brovi-tolochin",
    images: [{ url: "/images/og_image.webp", width: 1200, height: 630, alt: "Оформление бровей — мастер У Крупках" }],
  },
}

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://zaiko.by" },
    { "@type": "ListItem", position: 2, name: "Брови из Толочина", item: "https://zaiko.by/brovi-tolochin" },
  ],
}

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Ламинирование и долговременная укладка бровей — прием в Крупках, удобно из Толочина",
  serviceType: "Eyebrow lamination and lash lift",
  provider: {
    "@type": "BeautySalon",
    "name": "Зайко Татьяна — Ламинирование ресниц и бровей",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Советская, 49, 2 этаж, кабинет 7",
      "addressLocality": "Крупки",
      "addressRegion": "Минская область",
      "postalCode": "223410",
      "addressCountry": "BY",
    },
    "telephone": "+375256827229",
    "url": "https://zaiko.by",
  },
  areaServed: [
    { "@type": "City", "name": "Толочин" },
    { "@type": "City", "name": "Крупки" },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: data.faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
}

export default function BroviTolochin() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <GeoPage
        data={data}
        phone={PHONE}
        phoneDisplay={PHONE_DISPLAY}
        whatsappUrl={WHATSAPP_URL}
        viberUrl={VIBER_URL}
        telegramUrl={TELEGRAM_URL}
        instagramUrl={INSTAGRAM_URL}
        dikidiUrl={DIKIDI_URL}
      />
    </>
  )
}
