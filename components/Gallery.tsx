interface GalleryImage {
  src: string
  alt: string
  tall: boolean
}

interface GalleryProps {
  images: GalleryImage[]
  instagramUrl: string
}

export function Gallery({ images, instagramUrl }: GalleryProps) {
  return (
    <section id="gallery" className="py-20 px-4 sm:px-6" style={{ backgroundColor: "#F5EDE5" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color: "#B8748A" }}>Портфолио</p>
          <h2 className="font-display text-3xl sm:text-4xl font-500 mb-2" style={{ color: "#1A1618" }}>Реальные результаты</h2>
          <p className="text-sm" style={{ color: "#8B7E7A" }}>Работы из моего Instagram - без фильтров и ретуши</p>
        </div>

        {/* Masonry grid */}
        <div className="columns-2 md:columns-3 gap-4 space-y-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="gallery-card relative rounded-2xl overflow-hidden break-inside-avoid cursor-pointer"
              style={{ marginBottom: "1rem" }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full object-cover transition-transform duration-500"
                style={{ height: img.tall ? "320px" : "220px" }}
                loading="lazy"
              />
              <div
                className="gallery-overlay absolute inset-0 flex items-end p-4 transition-opacity duration-300"
                style={{ opacity: 0, background: "linear-gradient(to top, rgba(26,22,24,0.75) 0%, transparent 60%)" }}
              >
                <p className="text-white text-sm font-medium">{img.alt}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all hover:opacity-90"
            style={{ border: "1.5px solid #B8748A", color: "#B8748A" }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
            Ещё работы в Instagram
          </a>
        </div>
      </div>
    </section>
  )
}
