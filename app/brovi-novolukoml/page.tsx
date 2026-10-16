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
  slug: "novolukoml",
  city: "Новолукомль",
  genitive: "Новолукомля",
  distance: "52 км",
  time: "около 50 минут на машине",
  h1: "Укладка бровей и ламинирование ресниц для жительниц Новолукомля — 52 км, ~50 минут",
  subtitle:
    "Гипоаллергенные составы, официальный график и рейтинг 4.5★ на Яндекс Картах. Кабинет — в центре Крупок, до вас из Новолукомля — один рейс на машине.",
  intro: [
    "В Новолукомле выбор мастеров по бровям небольшой: пара профилей в dikidi и Instagram. Если после неудачной укладки вы две недели возитесь с формой карандашом, — это повод проехать полусотню километров и попасть к мастеру, работающему с гипоаллергенными составами на постоянной базе.",
    "Студия Зайко Татьяны в Крупках работает ежедневно с 9:00 до 19:00, у каждой услуги — официальная цена и понятный срок эффекта: укладка бровей держится 4–6 недель, ламинирование ресниц — 6–8 недель. Один визит в выходной — и два месяца не придётся думать про ежедневный макияж бровей.",
  ],
  route: [
    "Из Новолукомля выезжаете в сторону Толочина и далее по трассе Р62 до Крупок — 52 км, около 50 минут.",
    "В Крупках ориентир — центр города: ул. Советская, 49, 2 этаж, кабинет 7.",
    "Парковка у дома свободная; время записи подберём под ваш график — утро, обед или вечер.",
    "Обратный путь занимает столько же — к вечеру вы дома с готовым результатом.",
  ],
  highlights: [
    "Официальные цены: долговременная укладка бровей с окрашиванием — 35/40 BYN, коррекция — 20 BYN, ламинирование ресниц — 50 BYN.",
    "Гипоаллергенные сертифицированные материалы — безопасно для чувствительных глаз.",
    "Комплекс за один визит: брови + ресницы — 2 процедуры подряд, около 2 часов в кабинете.",
    "Стабильная экспертная оценка: 5+ лет работы, сертификаты и рейтинг 4.5★ на Яндекс Картах.",
  ],
  faqs: [
    {
      q: "Как доехать из Новолукомля до Крупок?",
      a: "52 км и около 50 минут на машине: сначала в сторону Толочина, затем по трассе Р62 до Крупок. Кабинет — в центре города, ул. Советская, 49, парковка рядом.",
    },
    {
      q: "Хватит ли 50 минут на дорогу в городской рабочий день из Новолукомля?",
      a: "Да: смежную запись лучше ставить с запасом. Например, на 10:00 или 17:00 — будите в Крупках 40–60 минут. Если оформляете и брови, и ресницы — планируйте около 2 часов в кабинете.",
    },
    {
      q: "Чем студия в Крупках отличается от мастеров Новолукомля?",
      a: "Главные три преимущества: официальный прайс и график, гипоаллергенные составы, накопленные отзывы клиенток (4.5★ на Яндекс Картах). Вы будете точно знать, сколько стоит и как долго продлится процедура.",
    },
    {
      q: "Сколько раз в год нужно приезжать?",
      a: "Укладка бровей держится 4–6 недель, ламинирование ресниц — 6–8 недель. Практический график: шесть-семь поездок в год, две процедуры за каждый визит.",
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL("https://zaiko.by"),
  title: "Брови и ресницы для Новолукомля — мастер в Крупках (52 км) | Зайко Татьяна",
  description:
    "Долговременная укладка бровей и ламинирование ресниц у мастера в Крупках: 52 км от Новолукомля, ~50 минут. Прайс от 20 BYN, гипоаллергенные составы, 4.5★ на Яндекс Картах. Запись в WhatsApp/Viber.",
  alternates: { canonical: "https://zaiko.by/brovi-novolukoml" },
  openGraph: {
    title: "Брови для Новолукомля — мастер в Крупках (52 км)",
    description:
      "Укладка бровей и ламинирование ресниц у Зайко Татьяны: 50 минут от Новолукомля. Гипоаллергенные составы, рейтинг 4.5★.",
    type: "website",
    locale: "ru_RU",
    url: "https://zaiko.by/brovi-novolukoml",
    images: [{ url: "/images/og_image.webp", width: 1200, height: 630, alt: "Укладка бровей — мастер в Крупках" }],
  },
}

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://zaiko.by" },
    { "@type": "ListItem", position: 2, name: "Брови из Новолукомля", item: "https://zaiko.by/brovi-novolukoml" },
  ],
}

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Ламинирование и долговременная укладка бровей — прием в Крупках, удобно из Новолукомля",
  serviceType: "Eyebrow lamination and lash lift",
  provider: {
    "@type": "BeautySalon",
    name: "Зайко Татьяна — Ламинирование ресниц и бровей",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Советская, 49, 2 этаж, кабинет 7",
      addressLocality: "Крупки",
      addressRegion: "Минская область",
      postalCode: "223410",
      addressCountry: "BY",
    },
    telephone: "+375256827229",
    url: "https://zaiko.by",
  },
  areaServed: [
    { "@type": "City", "name": "Новолукомль" },
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

export default function BroviNovolukoml() {
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
