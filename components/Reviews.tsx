import { StarRating } from "./StarRating"

interface Review {
  name: string
  date: string
  rating: number
  text: string
  avatar: string
  url: string
  datePublished: string
}

interface ReviewsProps {
  reviews: Review[]
}

export function Reviews({ reviews }: ReviewsProps) {
  return (
    <section id="reviews" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#FAF6F2" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Отзывы клиентов</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500 mb-2" style={{ color: "#1A1618" }}>Что говорят клиентки</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <StarRating count={5} />
            <span className="text-sm font-medium" style={{ color: "#1A1618" }}>5.0</span>
            <span className="text-sm" style={{ color: "#8B7E7A" }}>на Яндекс Картах</span>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((rev, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              style={{ backgroundColor: "#fff", border: "1px solid #E8DCDA" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-display font-500 text-base" style={{ backgroundColor: "#F2E4EA", color: "#8B4A63" }}>
                  {rev.avatar}
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: "#1A1618" }}>{rev.name}</div>
                  <div className="text-xs" style={{ color: "#8B7E7A" }}>{rev.date}</div>
                </div>
              </div>
              <StarRating count={rev.rating} />
              <p className="text-sm leading-relaxed flex-1" style={{ color: "#3D3338" }}>{rev.text}</p>
              <a
                href={rev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 pt-1 hover:opacity-70 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                <span className="text-xs" style={{ color: "#8B7E7A" }}>Источник на Яндекс.Картах</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
