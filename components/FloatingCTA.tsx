interface FloatingCTAProps {
  dikidiUrl: string
}

export function FloatingCTA({ dikidiUrl }: FloatingCTAProps) {
  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 sm:hidden">
      <a
        href={dikidiUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-medium text-sm transition-all active:scale-95"
        style={{ backgroundColor: "#B8748A", color: "#fff", boxShadow: "0 8px 32px rgba(184,116,138,0.45)" }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        Записаться онлайн
      </a>
    </div>
  )
}
