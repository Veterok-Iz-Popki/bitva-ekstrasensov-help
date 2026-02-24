import { useState, useEffect } from 'react';
import { Star, Quote, Shield, Users, Award } from 'lucide-react';
import api, { setSEO } from '../lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reviews'),
      api.get('/pages/reviews'),
      api.get('/seo/reviews'),
    ]).then(([revRes, pageRes, seoRes]) => {
      setReviews(revRes.data || []);
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div className="pt-24 md:pt-32 pb-24" data-testid="reviews-page">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4 font-body">Отзывы клиентов</p>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {blocks.page_title || 'Отзывы'}
          </h1>
          <p className="text-base md:text-lg text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || ''}
          </p>
        </div>

        {/* Trust Block */}
        {blocks.trust_text && (
          <div className="mb-16 p-8 border border-gold/20 bg-burgundy/10 text-center" data-testid="trust-block">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-4">
              {blocks.trust_title || 'Почему нам доверяют'}
            </h2>
            <p className="text-white/50 font-body max-w-2xl mx-auto leading-relaxed">
              {blocks.trust_text}
            </p>
            <div className="flex items-center justify-center gap-8 md:gap-12 mt-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 border border-gold/30 mb-2">
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <p className="text-2xl font-heading font-bold text-white">10 000+</p>
                <p className="text-xs text-white/40 font-body uppercase tracking-wider">Консультаций</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 border border-gold/30 mb-2">
                  <Award className="w-5 h-5 text-gold" />
                </div>
                <p className="text-2xl font-heading font-bold text-white">15+</p>
                <p className="text-xs text-white/40 font-body uppercase tracking-wider">Лет опыта</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 border border-gold/30 mb-2">
                  <Shield className="w-5 h-5 text-gold" />
                </div>
                <p className="text-2xl font-heading font-bold text-white">100%</p>
                <p className="text-xs text-white/40 font-body uppercase tracking-wider">Конфиденциальность</p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-6 border border-white/5 bg-[#0a0a0a] hover:border-gold/20 transition-colors duration-500"
              data-testid={`review-card-${review.id}`}
            >
              <Quote className="w-8 h-8 text-gold/30 mb-4" />
              <p className="text-white/70 font-body leading-relaxed mb-6">{review.text}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-white font-medium">{review.author_name}</p>
                  {review.author_city && (
                    <p className="text-sm text-white/40 font-body">{review.author_city}</p>
                  )}
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-gold fill-gold" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
