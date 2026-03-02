import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReviewsCarousel({ reviews = [] }) {
  const [current, setCurrent] = useState(0);
  const total = reviews.length;

  const goTo = useCallback((idx) => {
    if (total === 0) return;
    setCurrent(((idx % total) + total) % total);
  }, [total]);

  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (total === 0) return null;

  const review = reviews[current];
  const stars = review.rating || 5;

  return (
    <div className="relative w-full" data-testid="reviews-carousel">
      {/* Card */}
      <div className="relative max-w-4xl mx-auto">
        {/* Arrow Left */}
        <button
          onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-14 z-10 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          data-testid="carousel-prev-btn"
          aria-label="Previous review"
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2} />
        </button>

        {/* Review Content */}
        <div
          className="teal-card px-6 py-8 md:px-12 md:py-10 text-center min-h-[220px] flex flex-col justify-center"
          data-testid={`review-card-${current}`}
        >
          {/* Stars */}
          {stars > 0 && (
            <div className="flex justify-center gap-1 mb-4" data-testid="review-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < stars ? 'text-gold fill-gold' : 'text-white/20'}`}
                />
              ))}
            </div>
          )}

          {/* Text */}
          <p className="text-white/90 font-body text-base md:text-lg leading-relaxed mb-6" data-testid="review-text">
            {review.text}
          </p>

          {/* Author */}
          <p className="text-gold font-heading text-base md:text-lg italic font-medium" data-testid="review-author">
            {review.author_name}
            {review.author_city && `, ${review.author_city}`}
          </p>

          {/* Participant link */}
          {review.participant_name && review.participant_slug && (
            <Link
              to={`/uchastniki/${review.participant_slug}`}
              className="text-white/40 hover:text-gold/70 font-body text-sm mt-2 transition-colors inline-block"
              data-testid="review-participant-link"
            >
              Экстрасенс: {review.participant_name}
            </Link>
          )}
        </div>

        {/* Arrow Right */}
        <button
          onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-14 z-10 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          data-testid="carousel-next-btn"
          aria-label="Next review"
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2} />
        </button>
      </div>

      {/* Counter */}
      {total > 1 && (
        <p className="text-center text-white/30 font-body text-sm mt-3" data-testid="carousel-counter">
          {current + 1} / {total}
        </p>
      )}

      {/* Dot indicators - show max 15, with grouping for larger sets */}
      {total > 1 && (
        <div className="flex justify-center gap-2 mt-6" data-testid="carousel-dots">
          {total <= 15 ? (
            reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'bg-gold w-3 h-3'
                    : 'bg-white/25 hover:bg-white/40 w-2.5 h-2.5'
                }`}
                aria-label={`Go to review ${i + 1}`}
                data-testid={`carousel-dot-${i}`}
              />
            ))
          ) : (
            <>
              {(() => {
                const maxDots = 11;
                const half = Math.floor(maxDots / 2);
                let start = Math.max(0, current - half);
                let end = start + maxDots;
                if (end > total) { end = total; start = Math.max(0, end - maxDots); }
                const dots = [];
                if (start > 0) dots.push(<span key="start-ellipsis" className="text-white/30 text-xs px-1">...</span>);
                for (let i = start; i < end; i++) {
                  dots.push(
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === current
                          ? 'bg-gold w-3 h-3'
                          : 'bg-white/25 hover:bg-white/40 w-2.5 h-2.5'
                      }`}
                      aria-label={`Go to review ${i + 1}`}
                      data-testid={`carousel-dot-${i}`}
                    />
                  );
                }
                if (end < total) dots.push(<span key="end-ellipsis" className="text-white/30 text-xs px-1">...</span>);
                return dots;
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
