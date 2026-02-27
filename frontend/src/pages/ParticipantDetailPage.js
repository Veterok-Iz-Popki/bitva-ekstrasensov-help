import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, ChevronDown } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';
import ApplicationForm from '../components/ApplicationForm';

export default function ParticipantDetailPage() {
  const { slug } = useParams();
  const [participant, setParticipant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const INITIAL_REVIEWS = 5;

  useEffect(() => {
    Promise.all([
      api.get(`/participants/${slug}`),
      api.get(`/participants/${slug}/reviews`),
    ]).then(([partRes, revRes]) => {
      setParticipant(partRes.data);
      setReviews(revRes.data || []);
      setSEO({
        title: `${partRes.data.name} — участник Битвы экстрасенсов | Запись на консультацию`,
        description: partRes.data.description,
        keywords: `${partRes.data.name}, экстрасенс, консультация, битва экстрасенсов`,
      });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": partRes.data.name,
        "description": partRes.data.description,
        "image": partRes.data.photo_url,
        "jobTitle": partRes.data.title
      });
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  if (notFound || !participant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-white/50 font-body text-lg">Участник не найден</p>
        <Link to="/#ekstrasensy" className="btn-outline-gold px-6 py-2 font-body text-sm">
          К списку участников
        </Link>
      </div>
    );
  }

  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, INITIAL_REVIEWS);
  const hasMore = reviews.length > INITIAL_REVIEWS;

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="participant-detail-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Back link */}
        <Link
          to="/#ekstrasensy"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold transition-colors font-body mb-8"
          data-testid="back-to-participants"
        >
          <ArrowLeft className="w-4 h-4" />
          Все участники
        </Link>

        {/* Main content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Photo column */}
          <div className="flex flex-col items-center md:items-start">
            <div className="w-[200px] h-[200px] md:w-full md:h-auto md:aspect-square overflow-hidden rounded-lg border-2 border-gold/30">
              <img
                src={participant.photo_url}
                alt={participant.name}
                className="w-full h-full object-cover"
                data-testid="participant-photo"
              />
            </div>
            
            {/* Mobile CTA */}
            <Link to="/zapis-na-priem" className="md:hidden mt-6 w-full">
              <button className="btn-gold w-full px-8 py-3 text-base font-body font-semibold" data-testid="participant-book-btn-mobile">
                Записаться на приём
              </button>
            </Link>
          </div>

          {/* Content column */}
          <div className="md:col-span-2">
            {/* Name */}
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-gold mb-2" data-testid="participant-name">
              {participant.name}
            </h1>
            
            {/* Title */}
            {participant.title && (
              <p className="text-white/70 font-body text-base mb-4" data-testid="participant-title">
                {participant.title}
              </p>
            )}

            {/* Specializations */}
            {participant.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6" data-testid="participant-specializations">
                {participant.specializations.map((s, i) => (
                  <span key={i} className="badge-spec">{s}</span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="text-white/60 font-body leading-relaxed space-y-4 mb-8" data-testid="participant-description">
              {(participant.full_description || participant.description || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            {/* Desktop CTA */}
            <Link to="/zapis-na-priem" className="hidden md:inline-block">
              <button className="btn-gold px-10 py-3 text-base font-body font-semibold" data-testid="participant-book-btn">
                Записаться на приём к {participant.name.split(' ')[0]}
              </button>
            </Link>
          </div>
        </div>

        {/* Reviews section */}
        {reviews.length > 0 && (
          <>
            <div className="section-divider mb-12" />
            <section data-testid="participant-reviews-section">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-8 text-center">
                Отзывы о работе {participant.name.split(' ')[0]}
              </h2>
              <div className="space-y-4">
                {visibleReviews.map((review, idx) => (
                  <article
                    key={review.id || idx}
                    className="teal-card p-5 md:p-6"
                    data-testid={`review-card-${idx}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-body font-semibold text-white" data-testid={`review-author-${idx}`}>
                          {review.author_name}
                        </p>
                        {review.author_city && (
                          <p className="font-body text-sm text-white/40" data-testid={`review-city-${idx}`}>
                            {review.author_city}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-0.5 shrink-0" data-testid={`review-rating-${idx}`}>
                        {Array.from({ length: review.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-gold fill-gold" />
                        ))}
                      </div>
                    </div>
                    <p className="font-body text-white/60 leading-relaxed" data-testid={`review-text-${idx}`}>
                      {review.text}
                    </p>
                  </article>
                ))}
              </div>

              {/* Show more button */}
              {hasMore && !showAllReviews && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="btn-outline-gold px-8 py-3 font-body inline-flex items-center gap-2"
                    data-testid="show-more-reviews-btn"
                  >
                    Показать ещё ({reviews.length - INITIAL_REVIEWS})
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {/* Application form section */}
        <div className="section-divider my-12" />
        
        <div className="max-w-md mx-auto">
          <div className="teal-card p-6 md:p-8">
            <ApplicationForm
              title={`Записаться к ${participant.name.split(' ')[0]}`}
              subtitle="Заполните форму и мы свяжемся с вами"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
