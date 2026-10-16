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
  slug: "borisov",
  city: "Борисов",
  genitive: "Борисова",
  distance: "около 70 км",
  time: "около 1 часа на машине",
  h1: "Ламинирование бровей и ресниц для жительниц Борисова — до Крупок около часа",
  subtitle:
    "Мастер с 5+ годами практики, гипоаллергенные составы и рейтинг 4.5★ на Яндекс Картах. Из Борисова до кабинета в Крупках — около 70 км и час пути.",
  intro: [
    "В Борисове студий по бровям много — от BrowBar до private-masters с 9-летним стажем, и цены там стартуют от тех же, что и в любых крупных городах. Если вашему бюджету не подходят визовые студии или запись через пару недель, посмотрите в сторону Крупок: час пути — и вы у частного мастера Татьяны Зайко с официальным прайсом от 20 BYN.",
    "Схема удобная для борисовского ритма: выезд после работы или по субботам, за один визит делаются и укладка бровей, и ламинирование ресниц (около 2 часов в кабинете), затем час пути назад. Итог — 4–6 недель без ежедневного макияжа и без поиска «своего» бровиста в переполненном списке мастеров Борисова.",
  ],
  route: [
    "Из Борисова удобный путь — трасса Р53 через Докулье, далее по местной дороге в сторону Крупок, суммарно около 70 км.",
    "В Крупках маршрут до центра: ул. Советская, 49, 2 этаж, кабинет 7.",
    "Свободная парковка у дома; на будний вечер и субботу подберём слот заранее.",
    "Если включаете визит в выходные — две процедуры за один визит, потом час назад и вы дома.",
  ],
  highlights: [
    "Цены без городских наценок: коррекция — 20 BYN, долговременная укладка бровей с окрашиванием — 35/40 BYN, ламинирование ресниц — 50 BYN.",
    "Запись в тот же день или на завтра — в WhatsApp/Viber, без недельного ожидания свободных «окон» в Instagram.",
    "Гипоаллергенные сертифицированные составы: подходит, если в борисовских студиях бывают ограничения по материалам.",
    "Одна поездка на две процедуры: брови + ламинирование ресниц за один визит — эффект 4–6 недель.",
  ],
  faqs: [
    {
      q: "Сколько времени занимает поездка из Борисова в Крупки?",
      a: "Около 70 км и примерно час на машине по трассе Р53 через Докулье. Кабинет — в центре Крупок, ул. Советская, 49, парковка рядом. На будний вечер и субботу лучше слот договаривать заранее.",
    },
    {
      q: "Стоит ли ехать из Борисова, если в городе много студий?",
      a: "Если нужны конкретные условия — день и время записи, цены, гипоаллергенные материалы — поездка оправдана. В Крупках прайс от 20 BYN, запись без недельного ожидания, эффект держится 4–6 недель. Итоговые расходы меньше, чем пара безрезультатных визитов в городе.",
    },
    {
      q: "Можно ли сделать брови и ресницы за одну поездку?",
      a: "Да, это оптимальная схема для часового пути. Укладка бровей + ламинирование ресниц подряд — около 2 часов в кабинете, одна поездка закрывает оба вопроса на 4–6 недель.",
    },
    {
      q: "На какое время лучше записаться из Борисова?",
      a: "Удобнее всего суббота (можете с утра) или будний вечер после работы — студия принимает с 9:00 до 19:00. Напишите в WhatsApp или Viber, согласуем точное время под ваш маршрут.",
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL("https://zaiko.by"),
  title: "Брови для Борисова — мастер в Крупках (~70 км) | Ламинирование без наценок",
  description:
    "Ламинирование ресниц и долговременная укладка бровей у Зайко Татьяны в Крупках: ~70 км от Борисова, около часа пути. Прайс от 20 BYN, запись без ожидания, 4.5★ на Яндекс Картах.",
  alternates: { canonical: "https://zaiko.by/brovi-borisov" },
  openGraph: {
    title: "Брови для Борисова — мастер в Крупках (~70 км)",
    description:
      "Укладка бровей и ламинирование ресниц у Зайко Татьяны. Прайс без городских наценок, запись без ожидания, рейтинг 4.5★.",
    type: "website",
    locale: "ru_RU",
    url: "https://zaiko.by/brovi-borisov",
    images: [{ url: "/images/og_image.webp", width: 1200, height: 630, alt: "Ламинирование ресниц — мастер в Крупках" }],
  },
}

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://zaiko.by" },
    { "@type": "ListItem", position: 2, name: "Брови из Борисова", item: "https://zaiko.by/brovi-borisov" },
  ],
}

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Ламинирование и долговременная укладка бровей — прием в Крупках, удобно из Борисова",
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
    { "@type": "City", "name": "Борисов" },
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

export default function BroviBorisov() {
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
