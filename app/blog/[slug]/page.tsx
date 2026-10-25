import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle } from "@/lib/blog";

const SITE = "https://zaiko.by";

// Статья статична для краулера: полностью Server Component, без клиентского JS.
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}

  return {
    metadataBase: new URL(SITE),
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `${SITE}/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      locale: "ru_RU",
      url: `${SITE}/blog/${article.slug}`,
      publishedTime: article.date,
      images: [{ url: "/images/og_image.webp", width: 1200, height: 630, alt: article.h1 }],
    },
  }
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: article.h1, item: `${SITE}/blog/${article.slug}` },
    ],
  }

  const articleData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.h1,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    inLanguage: "ru",
    author: { "@type": "Person", name: "Зайко Татьяна", url: SITE },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${article.slug}` },
  }

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  const DIKIDI_URL = "https://dikidi.net/1784388?p=1.pi-ssm"
  const WHATSAPP_URL = "https://wa.me/375256827229"

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F2", color: "#1A1618" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-wrap gap-x-4 text-sm mb-6">
          <Link href="/" className="hover:underline" style={{ color: "#C9956A" }}>← На главную</Link>
          <Link href="/blog" className="hover:underline" style={{ color: "#C9956A" }}>← Все статьи</Link>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl mb-3">{article.h1}</h1>
        <div className="text-xs mb-10" style={{ color: "#8B7E7A" }}>
          Опубликовано {new Date(article.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })} · Зайко Татьяна, мастер с 5+ годами опыта, Крупки
        </div>

        <div className="space-y-4 text-base leading-relaxed">
          {article.intro.map((p, i) => (
            <p key={`intro-${i}`}>{p}</p>
          ))}
        </div>

        {article.sections.map((section, si) => (
          <section key={`sec-${si}`} className="mt-10">
            <h2 className="font-display text-2xl mb-4">{section.h2}</h2>
            <div className="space-y-3 text-base leading-relaxed">
              {section.paragraphs.map((p, pi) => (
                <p key={`p-${si}-${pi}`}>{p}</p>
              ))}
            </div>
            {section.list && (
              <ul className="mt-3 space-y-2 text-base leading-relaxed">
                {section.list.map((item, li) => (
                  <li key={`li-${si}-${li}`} className="flex gap-2">
                    <span style={{ color: "#C9956A" }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-12">
          <h2 className="font-display text-2xl mb-4">Частые вопросы</h2>
          <div className="space-y-4">
            {article.faqs.map((f, i) => (
              <div key={`faq-${i}`} className="rounded-xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(43,36,32,0.08)" }}>
                <div className="font-medium text-sm mb-1">{f.q}</div>
                <div className="text-sm leading-relaxed" style={{ color: "#5A4E52" }}>{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl p-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(43,36,32,0.08)" }}>
          <h2 className="font-display text-xl mb-3">Записаться на процедуру</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: "#5A4E52" }}>
            Приём в кабинете: г. Крупки, ул. Советская, 49 (2 этаж, кабинет 7), ежедневно 9:00–19:00.
            Удобно добираться из Толочина, Новолукомля и Борисова.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href={DIKIDI_URL} target="_blank" rel="noopener noreferrer" className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90" style={{ backgroundColor: "#C9956A" }}>
              Записаться онлайн
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 hover:opacity-90" style={{ border: "1px solid #C9956A", color: "#C9956A" }}>
              Написать в WhatsApp
            </a>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl mb-4">Читаете из соседнего города?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {article.related.map((r) => (
              <Link key={r.url} href={r.url} className="block rounded-xl p-4 text-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(43,36,32,0.08)", color: "#5A4E52" }}>
                {r.title} <span style={{ color: "#C9956A" }}>→</span>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  )
}
