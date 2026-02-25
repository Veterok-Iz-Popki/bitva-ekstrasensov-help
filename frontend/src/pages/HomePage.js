import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, HelpCircle, Globe, MessageCircle, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO, setJsonLd } from '../lib/api';

const PROBLEM_CATEGORIES = [
  { label: 'Порча', href: '#' },
  { label: 'Проклятие', href: '#' },
  { label: 'Сглаз', href: '#' },
  { label: 'Венец безбрачия', href: '#' },
  { label: 'Приворот', href: '#' },
  { label: 'Заклятие', href: '#' },
];

const BENEFITS = [
  { label: 'Помощь всем нуждающимся', icon: UserCheck },
  { label: 'Только лучшие экстрасенсы', icon: Users },
  { label: 'Решение любых проблем', icon: HelpCircle },
  { label: 'Сайт помощи', icon: Globe },
  { label: 'Помощь и Консультация Экстрасенса', icon: MessageCircle },
  { label: 'Лично пообщаться с экстрасенсом', icon: Shield },
];

export default function HomePage() {
  const [page, setPage] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentReview, setCurrentReview] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/pages/home'),
      api.get('/seo/home'),
      api.get('/participants'),
      api.get('/reviews'),
    ]).then(([pageRes, seoRes, partRes, revRes]) => {
      setPage(pageRes.data);
      setParticipants(partRes.data || []);
      setReviews(revRes.data || []);
      const seo = seoRes.data;
      if (seo) setSEO({ title: seo.title, description: seo.description, keywords: seo.keywords });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "Битва экстрасенсов — официальный сайт помощи",
        "description": seo?.description || "",
        "url": window.location.origin
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const b = page?.blocks || {};

  const parseServiceCat = (text) => {
    if (!text) return { title: '', subtitle: '', items: [] };
    const lines = text.split('\n').filter(Boolean);
    const firstLine = lines[0] || '';
    const parts = firstLine.split(/\s+/).filter(Boolean);
    return {
      title: parts[0] || '',
      subtitle: parts.slice(1).join(' ') || '',
      items: lines.slice(1)
    };
  };

  const serviceCats = [
    parseServiceCat(b.service_cat_1),
    parseServiceCat(b.service_cat_2),
    parseServiceCat(b.service_cat_3),
    parseServiceCat(b.service_cat_4)
  ].filter(c => c.title);

  const prevReview = () => setCurrentReview((p) => (p === 0 ? reviews.length - 1 : p - 1));
  const nextReview = () => setCurrentReview((p) => (p === reviews.length - 1 ? 0 : p + 1));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div data-testid="home-page">
      {/* ===== HERO SECTION ===== */}
      <section className="pt-24 md:pt-32 pb-10 px-4" data-testid="hero-section">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main H1 */}
          <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight animate-fade-up">
            {b.hero_h1 || 'Помощь сильнейших экстрасенсов, ясновидящих, целителей, магов и ведьм России'}
          </h1>

          {/* Subtitle with decoration */}
          <h2 className="font-heading text-lg md:text-xl text-gold font-medium mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {b.hero_subtitle || 'Сайт помощи экстрасенсов'}
          </h2>

          {/* TNT logo placeholder + Unique opportunity text */}
          <div className="max-w-3xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-gold font-heading text-base md:text-lg font-semibold italic mb-4">
              {b.hero_unique || 'Уникальная возможность!'}
            </p>
            <p className="text-white/80 font-body leading-relaxed mb-2">
              {b.hero_text1 || 'Лично обратиться к любому участнику «Битва экстрасенсов».'}
            </p>
            <p className="text-white/60 font-body leading-relaxed text-sm mb-6">
              {b.hero_text2 || 'И получить диагностику и консультацию экстрасенсов, ясновидящих, магов, целителей и ведьм'}
            </p>
          </div>

          {/* Subheading */}
          <h3 className="font-heading text-lg md:text-xl text-gold mb-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {b.hero_subheading || 'помощь и консультация экстрасенса'}
          </h3>

          {/* Description text */}
          <p className="text-white/50 font-body text-sm leading-relaxed max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {b.about_text || 'Вам лично помогут сильнейшие и самые лучшие экстрасенсы России решить ваши проблемы и получить ответы на ваши вопросы.'}
          </p>

          {/* CTA Block */}
          <div className="max-w-sm mx-auto teal-card p-6 mb-10 animate-fade-up" style={{ animationDelay: '0.5s' }} data-testid="cta-block">
            <p className="text-white font-body font-medium mb-4 text-sm">
              {b.cta_text || 'Количество заявок на помощь ограничено!'}
            </p>
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-8 py-3 text-sm font-body font-semibold mb-3 w-full md:w-auto" data-testid="hero-cta-btn">
                {b.cta_button || 'Получить помощь экстрасенса!'}
              </button>
            </Link>
            <p className="text-white/40 font-body text-xs">
              {b.cta_subtext || 'Не упустите свой шанс!'}
            </p>
          </div>

          {/* Problem categories */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-5" data-testid="categories-row">
            {PROBLEM_CATEGORIES.map((cat, i) => (
              <span
                key={i}
                className="text-gold/80 hover:text-gold font-body text-sm transition-colors cursor-pointer border-b border-gold/30 hover:border-gold pb-0.5"
                data-testid={`category-${i}`}
              >
                {cat.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARTICIPANTS GRID ===== */}
      {participants.length > 0 && (
        <section className="py-12 px-4" data-testid="participants-section">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-white text-center mb-10">
              {b.participants_title || 'Лучшие экстрасенсы России'}
            </h2>

            {/* Participant cards grid - reference style */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 md:gap-6">
              {participants.map((p) => (
                <Link
                  key={p.id}
                  to={`/uchastniki/${p.slug}`}
                  className="participant-card-v group"
                  data-testid={`participant-card-${p.slug}`}
                >
                  {/* Circular photo */}
                  <div className="participant-photo-circle">
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>

                  {/* Name */}
                  <h3 className="font-heading text-sm md:text-base font-semibold text-gold text-center leading-tight mb-1">
                    {p.name}
                  </h3>

                  {/* Role/Specializations */}
                  <div className="flex flex-wrap justify-center gap-1 mb-3">
                    {(p.specializations || []).slice(0, 2).map((s, j) => (
                      <span key={j} className="text-gold/60 font-body text-xs">{s}</span>
                    ))}
                  </div>

                  {/* Short description */}
                  <p className="text-white/50 font-body text-xs leading-relaxed text-center line-clamp-2 mb-3">
                    {p.title || p.description?.slice(0, 60)}
                  </p>

                  {/* CTA button */}
                  <span className="btn-outline-gold-sm">Обратиться</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== BENEFITS ICONS ===== */}
      <section className="py-12 px-4" data-testid="benefits-section">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {BENEFITS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center" data-testid={`benefit-card-${i}`}>
                  <div className="benefit-icon-circle mb-3">
                    <Icon className="w-7 h-7" />
                  </div>
                  <p className="text-white/60 font-body text-xs leading-snug max-w-[120px]">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== REVIEWS CAROUSEL ===== */}
      {reviews.length > 0 && (
        <section className="py-12 px-4" data-testid="reviews-section">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-white text-center mb-8">
              {b.reviews_title || 'Отзывы'}
            </h2>

            <div className="relative teal-card p-6 md:p-8">
              <div className="min-h-[140px]">
                <p className="text-white/70 font-body leading-relaxed mb-5 text-sm md:text-base">
                  {reviews[currentReview]?.text}
                </p>
                <p className="text-gold font-body text-sm font-semibold italic">
                  — {reviews[currentReview]?.author_name}
                  {reviews[currentReview]?.author_city ? `, ${reviews[currentReview].author_city}` : ''}
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={prevReview}
                  className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
                  data-testid="review-prev"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-2">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentReview(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i === currentReview ? 'bg-gold' : 'bg-teal-light/40 hover:bg-teal-light/60'
                      }`}
                      data-testid={`review-dot-${i}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextReview}
                  className="w-10 h-10 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
                  data-testid="review-next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== SERVICES SECTION ===== */}
      {serviceCats.length > 0 && (
        <section className="py-12 px-4" data-testid="services-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-white text-center mb-10">
              {b.services_title || 'Услуги экстрасенсов'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceCats.map((cat, i) => (
                <div key={i} className="service-card p-5" data-testid={`service-card-${i}`}>
                  <h3 className="font-heading text-base font-bold text-gold">{cat.title}</h3>
                  {cat.subtitle && (
                    <p className="font-heading text-sm text-gold/70 mb-3">{cat.subtitle}</p>
                  )}
                  <div className="section-divider mb-3" />
                  <ul className="space-y-2">
                    {cat.items.map((item, j) => (
                      <li key={j} className="text-white/50 font-body text-xs leading-relaxed flex items-start gap-2">
                        <span className="text-gold/50 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/zapis-na-priem" className="block mt-4">
                    <button className="btn-outline-gold-sm w-full">Подробнее</button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SEO TEXT ===== */}
      {b.seo_text && (
        <section className="py-12 px-4" data-testid="seo-section">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-xl md:text-3xl font-semibold text-gold mb-6 text-center">
              {b.seo_text_title || 'Экстрасенс онлайн — возможность изменить вашу жизнь!'}
            </h2>
            <div className="text-white/45 font-body text-sm leading-relaxed space-y-4 text-center">
              {b.seo_text.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/zapis-na-priem">
                <button className="btn-gold px-8 py-3 font-body text-sm font-semibold" data-testid="seo-cta-btn">
                  Записаться
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== APPLICATION FORM ===== */}
      <section className="py-12 px-4" data-testid="form-section">
        <div className="max-w-md mx-auto teal-card p-6 md:p-8">
          <ApplicationForm
            title={b.form_title || 'Запишитесь на консультацию'}
            subtitle={b.form_subtitle}
          />
        </div>
      </section>
    </div>
  );
}
