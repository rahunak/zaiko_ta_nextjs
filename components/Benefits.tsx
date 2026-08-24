interface Benefit {
  icon: string
  title: string
  desc: string
}

interface BenefitsProps {
  benefits: Benefit[]
}

export function Benefits({ benefits }: BenefitsProps) {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Почему выбирают меня</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500" style={{ color: "#1A1618" }}>Мои преимущества</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
            >
              <div className="text-3xl mb-4">{b.icon}</div>
              <h3 className="font-display font-500 text-base mb-2" style={{ color: "#1A1618" }}>{b.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#8B7E7A" }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
