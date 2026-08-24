'use client'

import { useState } from "react"

interface FAQ {
  q: string
  a: string
}

interface FAQProps {
  faqs: FAQ[]
}

export function FAQ({ faqs }: FAQProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Частые вопросы</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Вопросы и ответы</h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
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
