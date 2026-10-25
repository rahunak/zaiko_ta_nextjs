import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/blog";

export const metadata: Metadata = {
  metadataBase: new URL("https://zaiko.by"),
  title: "Блог о ламинировании ресниц и бровей | Зайко Татьяна",
  description:
    "Ответы на частые вопросы о ламинировании ресниц и бровей: сколько держится, что выбрать — окрашивание или укладка, цены в Беларуси, уход после процедуры. Опыт мастера 5+ лет, Крупки.",
  alternates: { canonical: "https://zaiko.by/blog" },
  openGraph: {
    title: "Блог о ламинировании ресниц и бровей",
    description:
      "Сколько держится ламинирование, что выбрать — окрашивание или укладка, цены в Беларуси и уход после процедуры.",
    type: "website",
    locale: "ru_RU",
    url: "https://zaiko.by/blog",
    images: [{ url: "/images/og_image.webp", width: 1200, height: 630, alt: "Блог Зайко Татьяны о бровях и ресницах" }],
  },
}

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: "https://zaiko.by" },
    { "@type": "ListItem", position: 2, name: "Блог", item: "https://zaiko.by/blog" },
  ],
}

const itemListData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Статьи блога о ламинировании ресниц и бровей",
  itemListElement: articles.map((a, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://zaiko.by/blog/${a.slug}`,
    name: a.h1,
  })),
}

export default function Blog() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2", color: "#1A1618" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/" className="text-sm hover:underline" style={{ color: "#C9956A" }}>
          ← На главную
        </Link>
        <h1 className="font-display text-4xl sm:text-5xl mt-6 mb-4">Блог о бровях и ресницах</h1>
        <p className="text-base leading-relaxed mb-10" style={{ color: "#5A4E52" }}>
          Отвечаю на вопросы, которые задают мне клиентки перед записью: сколько держится эффект, чем ламинирование
          отличается от окрашивания, сколько это стоит и как ухаживать после. Пишу на основе 5+ лет практики,
          без воды.
        </p>

        <div className="flex flex-col gap-6">
          {articles.map((a) => (
            <Link
              key={a.slug}
              href={`/blog/${a.slug}`}
              className="block rounded-2xl p-6 transition-all duration-200 hover:shadow-md"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(43,36,32,0.08)" }}
            >
              <div className="text-xs mb-2" style={{ color: "#8B7E7A" }}>
                {new Date(a.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <h2 className="font-display text-xl sm:text-2xl mb-2">{a.h1}</h2>
              <p className="text-sm leading-relaxed" style={{ color: "#5A4E52" }}>{a.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
