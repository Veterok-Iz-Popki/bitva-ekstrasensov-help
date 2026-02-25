import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, HelpCircle, Globe, MessageCircle, UserCheck, Flame, Zap, Eye, Heart, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO, setJsonLd } from '../lib/api';

const CATEGORIES = [
  { label: 'Порча', icon: Flame },
  { label: 'Проклятие', icon: Zap },
  { label: 'Сглаз', icon: Eye },
  { label: 'Венец безбрачия', icon: Heart },
  { label: 'Приворот', icon: Sparkles },
  { label: 'Заклятие', icon: Star },
];

const BENEFITS = [
  { label: 'Помощь всем нуждающимся', icon: UserCheck },
  { label: 'Только лучшие экстрасенсы', icon: Users },
  { label: 'Решение любых проблем', icon: HelpCircle },
  { label: 'Онлайн консультации', icon: Globe },
  { label: 'Личное общение', icon: MessageCircle },
  { label: 'Полная конфиденциальность', icon: Shield },
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
      setJsonLd({ "@context": "https://schema.org", "@type": "ProfessionalService", "name": "Битва экстрасенсов — официальный сайт помощи", "description": seo?.description || "", "url": window.location.origin });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const b = page?.blocks || {};

  const parseServiceCat = (text) => {
    if (!text) return { title: '', items: [] };
    const lines = text.split('\n').filter(Boolean);
    return { title: lines[0] || '', items: lines.slice(1) };
  };
  const serviceCats = [parseServiceCat(b.service_cat_1), parseServiceCat(b.service_cat_2), parseServiceCat(b.service_cat_3), parseServiceCat(b.service_cat_4)].filter(c => c.title);

  const prevReview = () => setCurrentReview((p) => (p === 0 ? reviews.length - 1 : p - 1));
  const nextReview = () => setCurrentReview((p) => (p === reviews.length - 1 ? 0 : p + 1));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-white/40 font-body">Загрузка...</div></div>;

  return (
    <div data-testid="home-page">
      {/* ===== HERO ===== */}
      <section className="pt-28 md:pt-36 pb-12 text-center px-4" data-testid="hero-section">
        <h1 className="font-heading text-3xl md:text-5xl lg:text-[3.2rem] font-bold text-white mb-4 leading-tight max-w-4xl mx-auto animate-fade-up stagger-1">
          {b.hero_h1 || 'Помощь сильнейших экстрасенсов, ясновидящих, целителей, магов'}
        </h1>
        <h2 className="font-heading text-xl md:text-2xl text-gold font-medium mb-8 animate-fade-up stagger-2">
          {b.hero_subtitle || 'Сайт помощи экстрасенсов'}
        </h2>

        <div className="max-w-3xl mx-auto animate-fade-up stagger-3">
          <p className="text-gold font-heading text-lg font-medium italic mb-3">{b.hero_unique || 'Уникальная возможность!'}</p>
          <p className="text-white/80 font-body leading-relaxed mb-1">{b.hero_text1 || ''}</p>
          <p className="text-white/55 font-body leading-relaxed mb-5 text-sm">{b.hero_text2 || ''}</p>
          <h3 className="text-gold font-heading text-lg md:text-xl mb-3">{b.hero_subheading || 'помощь и консультация экстрасенса'}</h3>
          <p className="text-white/50 font-body text-sm leading-relaxed mb-6 max-w-2xl mx-auto">{b.about_text || ''}</p>
        </div>

        {/* CTA Card */}
        <div className="max-w-sm mx-auto teal-card p-5 mb-8 animate-fade-up stagger-4" data-testid="cta-block">
          <p className="text-white font-body font-medium mb-3 text-sm">{b.cta_text || 'Количество заявок ограничено!'}</p>
          <Link to="/zapis-na-priem">
            <button className="btn-gold px-8 py-2.5 text-sm font-body mb-2" data-testid="hero-cta-btn">
              {b.cta_button || 'Получить помощь экстрасенса!'}
            </button>
          </Link>
          <p className="text-white/40 font-body text-xs">{b.cta_subtext || 'Не упустите свой шанс!'}</p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-4xl mx-auto" data-testid="categories-row">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-gold/70 hover:text-gold transition-colors" data-testid={`category-${i}`}>
                <Icon className="w-4 h-4" /><span className="font-body text-sm">{c.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== PARTICIPANTS ===== */}
      {participants.length > 0 && (
        <section className="py-14 px-4" data-testid="participants-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-8">
              {b.participants_title || 'Лучшие экстрасенсы России'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map((p) => (
                <Link key={p.id} to={`/uchastniki/${p.slug}`} className="participant-card-h group" data-testid={`participant-card-${p.slug}`}>
                  <div className="w-[140px] h-[140px] md:w-[160px] md:h-[160px] overflow-hidden rounded flex-shrink-0 border border-teal-light/30">
                    <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 py-1">
                    <h3 className="font-heading text-lg md:text-xl font-semibold text-gold mb-1">{p.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(p.specializations || []).map((s, j) => (
                        <span key={j} className="badge-spec">{s}</span>
                      ))}
                    </div>
                    <p className="text-white/55 font-body text-xs leading-relaxed line-clamp-3 mb-2">{p.description}</p>
                    <span className="btn-outline-gold inline-block w-fit px-4 py-1 text-xs font-body">Обратиться</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== BENEFITS ===== */}
      <section className="py-14 px-4" data-testid="benefits-section">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-8">
            {b.benefits_title || 'Почему выбирают нас'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {BENEFITS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="teal-card p-5 flex flex-col items-center text-center" data-testid={`benefit-card-${i}`}>
                  <div className="benefit-icon-circle mb-3"><Icon className="w-7 h-7" /></div>
                  <p className="text-white/70 font-body text-sm leading-snug">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== REVIEWS CAROUSEL ===== */}
      {reviews.length > 0 && (
        <section className="py-14 px-4" data-testid="reviews-section">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-8">
              {b.reviews_title || 'Отзывы'}
            </h2>
            <div className="relative teal-card p-6 md:p-8">
              <div className="min-h-[120px]">
                <p className="text-white/70 font-body leading-relaxed mb-4 text-sm md:text-base">{reviews[currentReview]?.text}</p>
                <p className="text-gold font-body text-sm font-medium italic">
                  — {reviews[currentReview]?.author_name}{reviews[currentReview]?.author_city ? `, ${reviews[currentReview].author_city}` : ''}
                </p>
              </div>
              <div className="flex items-center justify-between mt-5">
                <button onClick={prevReview} className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors" data-testid="review-prev"><ChevronLeft className="w-4 h-4" /></button>
                <div className="flex gap-1.5">
                  {reviews.map((_, i) => (
                    <button key={i} onClick={() => setCurrentReview(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentReview ? 'bg-gold' : 'bg-teal-light/40'}`} data-testid={`review-dot-${i}`} />
                  ))}
                </div>
                <button onClick={nextReview} className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/10 transition-colors" data-testid="review-next"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== SERVICES ===== */}
      {serviceCats.length > 0 && (
        <section className="py-14 px-4" data-testid="services-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-8">
              {b.services_title || 'Услуги экстрасенсов'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceCats.map((cat, i) => (
                <div key={i} className="service-card p-5" data-testid={`service-card-${i}`}>
                  <h3 className="font-heading text-base font-semibold text-gold mb-3">{cat.title}</h3>
                  <div className="section-divider mb-3" />
                  <ul className="space-y-1.5">
                    {cat.items.map((item, j) => (
                      <li key={j} className="text-white/50 font-body text-xs leading-relaxed flex items-start gap-1.5">
                        <span className="text-gold/50 mt-0.5 text-[10px]">&#9670;</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== SEO TEXT ===== */}
      {b.seo_text && (
        <section className="py-14 px-4" data-testid="seo-section">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-5">{b.seo_text_title || ''}</h2>
            <div className="text-white/45 font-body text-sm leading-relaxed space-y-3">
              {b.seo_text.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </section>
      )}

      {/* ===== FORM ===== */}
      <section className="py-14 px-4" data-testid="form-section">
        <div className="max-w-md mx-auto teal-card p-6 md:p-8">
          <ApplicationForm title={b.form_title || 'Запишитесь на консультацию'} subtitle={b.form_subtitle} />
        </div>
      </section>
    </div>
  );
}
