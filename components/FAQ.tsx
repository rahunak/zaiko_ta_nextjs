'use client'

import { useEffect, useRef, useState } from "react"

interface FAQ {
  q: string
  a: string
}

interface FAQProps {
  faqs: FAQ[]
}

export function FAQ({ faqs }: FAQProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [girlSize, setGirlSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      // высота = 60% от высоты блока (50% + 20%), ширина = 40%
      setGirlSize({ w: rect.width * 0.4, h: rect.height * 0.6 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <section ref={sectionRef} className="relative py-20 px-4 sm:px-6 overflow-hidden" style={{ backgroundColor: "#F5EDE5" }}>
      {/* Анимация справа, фиксированного размера (без моргания при открытии пунктов) */}
      {girlSize && (
        <div
          className="hidden md:block absolute bottom-0 right-0 z-0 overflow-hidden pointer-events-none"
          style={{ width: girlSize.w, height: girlSize.h, backgroundColor: "transparent" }}
        >
          <iframe
            src="/character.html?embed=1"
            title="Анимация"
            className="absolute inset-0 h-full w-full border-0"
            style={{ pointerEvents: "none", background: "transparent" }}
            loading="lazy"
          />
        </div>
      )}

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Частые вопросы</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Вопросы и ответы</h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{ backgroundColor: "rgba(255,255,255,0.85)", border: "1px solid #E8DCDA", backdropFilter: "blur(2px)" }}
            >
              <button
                className="w-full flex items-center justify-between gap-4 p-6 text-left transition-colors hover:bg-rose-50"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-display font-500 text-base leading-snug" style={{ color: "#1A1618" }}>{faq.q}</span>
                <svg
                  className="w-5 h-5 shrink-0 transition-transform duration-300"
                  style={{ color: "#B8748A", transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`faq-content ${openFaq === i ? "open" : ""}`}>
                <p className="px-6 pb-6 text-sm leading-relaxed" style={{ color: "#5A4E52" }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
