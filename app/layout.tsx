import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import YandexMetrika from "@/components/YandexMetrika";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import PhoneClickTracker from "@/components/PhoneClickTracker";
import ConversionTracker from "@/components/ConversionTracker";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zaiko.by'),
  title: "Брови и ламинирование ресниц в Крупках — Зайко Татьяна | удобно добраться из Толочина, Новолукомля, Борисова",
  description: "Ламинирование ресниц (от 50 BYN), долговременная укладка и коррекция бровей в Крупках. 5+ лет опыта, гипоаллергенные составы, рейтинг 4.5★ на Яндекс Картах. Удобно приезжать из Толочина (40 км), Новолукомля (52 км) и Борисова (~70 км). Мастер Зайко Татьяна.",
  keywords: ["ламинирование ресниц Крупки", "долговременная укладка бровей", "мастер бровист Крупки", "коррекция бровей Крупки", "брови Толочин", "ламинирование бровей Новолукомль", "брови Борисов", "Зайко Татьяна", "beauty мастер Крупки"],
  alternates: {
    canonical: 'https://zaiko.by',
  },
  verification: {
    yandex: '5b014f5d4ea4bb79',
    google: 'XUrscGobjOcPO2HImTiKv4XxWZTtTlIYyVP8YrDx2ig',
  },
  openGraph: {
    title: "Зайко Татьяна — Брови и ламинирование ресниц в Крупках",
    description: "Ламинирование ресниц и долговременная укладка бровей в Крупках — приём в кабинете по ул. Советской, 49. Клиентки из Толочина, Новолукомля и Борисова легко доберутся. 5+ лет опыта, гипоаллергенные составы, 4.5★ на Яндекс Картах.",
    type: "website",
    locale: "ru_RU",
    url: 'https://zaiko.by',
    siteName: "Зайко Татьяна Beauty Master",
    images: [
      {
        url: "/images/og_image.webp",
        width: 1200,
        height: 630,
        alt: "Зайко Татьяна — мастер по ресницам и бровям в Крупках",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Зайко Татьяна — Брови и ламинирование ресниц в Крупках",
    description: "Ламинирование ресниц и долговременная укладка бровей в Крупках. Кабинет удобно расположен для клиенток из Толочина, Новолукомля и Борисова.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const isProduction = process.env.NODE_ENV === 'production';

  return (
    <html
      lang="ru"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>
        {children}

        {/* Яндекс.Метрика — поведенческие факторы Яндекса. Отложенная загрузка,
            не влияет на TBT. Номер счётчика вписать в components/YandexMetrika.tsx. */}
        {isProduction && <YandexMetrika enabled={isProduction} />}

        {/* GA4 — отложенная загрузка. ID вписать в components/GoogleAnalytics.tsx */}
        {isProduction && <GoogleAnalytics enabled={isProduction} />}

        {/* Глобальный трекер кликов по телефонным ссылкам → GA4 tel_click */}
        {isProduction && <PhoneClickTracker />}

        {/* Конверсии: WhatsApp/Viber/Telegram/DIKIDI/Instagram → GA4 */}
        {isProduction && <ConversionTracker />}
      </body>
    </html>
  );
}
