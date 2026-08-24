'use client'

import { useState } from "react"
import Image from "next/image"

interface HeaderProps {
  scrolled: boolean
  scrollTo: (id: string) => void
  dikidiUrl: string
}

export function Header({ scrolled, scrollTo, dikidiUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(250,246,242,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        borderBottom: scrolled ? "1px solid #E8DCDA" : "none",
        boxShadow: scrolled ? "0 1px 16px rgba(26,22,24,0.06)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/images/ZT.svg" alt="zaiko_ta - ламинирование ресниц и бровей в Крупках, Татьяна Зайко" width={36} height={36} className="object-contain" style={{ filter: "invert(30%) sepia(20%) saturate(600%) hue-rotate(300deg)" }} />
          <div className="leading-tight">
            <div className="font-display font-600 text-sm" style={{ color: scrolled ? "#1A1618" : "#FAF6F2" }}>Зайко Татьяна</div>
            <div className="text-xs" style={{ color: scrolled ? "#8B7E7A" : "rgba(250,246,242,0.65)" }}>beauty master</div>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {[["Услуги", "services"], ["Работы", "gallery"], ["Обо мне", "about"], ["Отзывы", "reviews"], ["Контакты", "contacts"]].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} className="transition-all duration-200 hover:opacity-70 hover:scale-105" style={{ color: "#8B7E7A" }}>{label}</button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={dikidiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: "#B8748A", color: "#fff" }}
          >
            Записаться
          </a>
          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Меню"
          >
            <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", transform: menuOpen ? "rotate(45deg) translate(3px, 3px)" : "" }} />
            <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", opacity: menuOpen ? 0 : 1 }} />
            <span className="block w-5 h-0.5 transition-all" style={{ backgroundColor: "#1A1618", transform: menuOpen ? "rotate(-45deg) translate(3px, -3px)" : "" }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 pt-2" style={{ backgroundColor: "rgba(250,246,242,0.98)" }}>
          {[["Услуги", "services"], ["Работы", "gallery"], ["Обо мне", "about"], ["Отзывы", "reviews"], ["Контакты", "contacts"]].map(([label, id]) => (
            <button key={id} onClick={() => { scrollTo(id); setMenuOpen(false); }} className="block w-full text-left py-3 text-sm border-b" style={{ color: "#1A1618", borderColor: "#E8DCDA" }}>{label}</button>
          ))}
          <a href={dikidiUrl} target="_blank" rel="noopener noreferrer" className="mt-3 w-full flex items-center justify-center py-3 rounded-full text-sm font-medium" style={{ backgroundColor: "#B8748A", color: "#fff" }}>Записаться онлайн</a>
        </div>
      )}
    </header>
  )
}
