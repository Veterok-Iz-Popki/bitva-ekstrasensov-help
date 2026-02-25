import { useState, useEffect } from 'react';
import { Star, Users, Award, Shield } from 'lucide-react';
import api, { setSEO } from '../lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reviews'),
      api.get('/pages/reviews'),
      api.get('/seo/reviews')
    ]).then(([revRes, pageRes, seoRes]) => {
      setReviews(revRes.data || []);
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="reviews-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4">
            {blocks.page_title || 'Отзывы'}
          </h1>
          <p className="text-white/50 font-body text-sm md:text-base">
            {blocks.page_subtitle || 'Реальные истории людей, которым мы помогли'}
          </p>
        </div>

        {/* Trust block */}
        {blocks.trust_text && (
          <div className="mb-12 teal-card p-6 md:p-8" data-testid="trust-block">
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-gold mb-4 text-center">
              {blocks.trust_title || 'Почему нам доверяют'}
            </h2>
            <p className="text-white/50 font-body max-w-2xl mx-auto leading-relaxed mb-8 text-center text-sm md:text-base">
              {blocks.trust_text}
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
              <div className="text-center">
                <div className="benefit-icon-circle mx-auto mb-3 w-16 h-16">
                  <Users className="w-7 h-7" />
                </div>
                <p className="text-xl md:text-2xl font-heading font-bold text-gold">10 000+</p>
                <p className="text-xs text-white/40 font-body">Консультаций</p>
              </div>
              <div className="text-center">
                <div className="benefit-icon-circle mx-auto mb-3 w-16 h-16">
                  <Award className="w-7 h-7" />
                </div>
                <p className="text-xl md:text-2xl font-heading font-bold text-gold">15+</p>
                <p className="text-xs text-white/40 font-body">Лет опыта</p>
              </div>
              <div className="text-center">
                <div className="benefit-icon-circle mx-auto mb-3 w-16 h-16">
                  <Shield className="w-7 h-7" />
                </div>
                <p className="text-xl md:text-2xl font-heading font-bold text-gold">100%</p>
                <p className="text-xs text-white/40 font-body">Конфиденциальность</p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews list */}
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review.id} className="teal-card p-6" data-testid={`review-card-${review.id}`}>
              <p className="text-white/70 font-body leading-relaxed mb-4 text-sm md:text-base">
                {review.text}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="font-body text-gold text-sm font-semibold italic">
                  — {review.author_name}
                  {review.author_city ? `, ${review.author_city}` : ''}
                </p>
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-gold fill-gold" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {reviews.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 font-body">Отзывы скоро появятся</p>
          </div>
        )}
      </div>
    </div>
  );
}
