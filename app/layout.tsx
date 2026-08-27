import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
  title: "Зайко Татьяна — Ламинирование ресниц и бровей в Крупках",
  description: "Профессиональное ламинирование ресниц и долговременная укладка бровей в Крупках. 5+ лет опыта, гипоаллергенные составы. Мастер Зайко Татьяна.",
  keywords: ["ламинирование ресниц Крупки", "долговременная укладка бровей", "мастер бровист Крупки", "Зайко Татьяна", "окрашивание бровей", "beauty мастер Крупки"],
  alternates: {
    canonical: 'https://zaiko.by',
  },
  // verification: {
  //   yandex: '',
  //   google: '',
  // },
  openGraph: {
    title: "Зайко Татьяна — Ламинирование ресниц и бровей в Крупках",
    description: "Профессиональное ламинирование ресниц и долговременная укладка бровей. 5+ лет опыта, гипоаллергенные составы. Рейтинг 4.4★",
    type: "website",
    locale: "ru_RU",
    url: 'https://zaiko.by',
    siteName: "Зайко Татьяна Beauty Master",
    images: [
      {
        url: "./images/og_image.webp",
        width: 1200,
        height: 630,
        alt: "Зайко Татьяна — мастер по ресницам и бровям в Крупках",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Зайко Татьяна — Ламинирование ресниц и бровей в Крупках",
    description: "Профессиональное ламинирование ресниц и долговременная укладка бровей. 5+ лет опыта, гипоаллергенные составы.",
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
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${playfair.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
