import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, HelpCircle, Globe, MessageCircle, UserCheck } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';
import ReviewsCarousel from '../components/ReviewsCarousel';
import PictureImg from '../components/PictureImg';

const PROBLEM_CATEGORIES = [
  { label: 'Порча', path: '/porcha' },
  { label: 'Проклятие', path: '/proklyatie' },
  { label: 'Сглаз', path: '/sglaz' },
  { label: 'Венец безбрачия', path: '/venets-bezbrachiya' },
  { label: 'Приворот', path: '/privorot' },
  { label: 'Заклятие', path: '/zaklyatie' },
];

const BENEFITS = [
  { label: 'Помощь всем нуждающимся', icon: UserCheck },
  { label: 'Только лучшие экстрасенсы', icon: Users },
  { label: 'Решение любых проблем', icon: HelpCircle },
  { label: 'Сайт помощи', icon: Globe },
  { label: 'Помощь и Консультация Экстрасенса', icon: MessageCircle },
  { label: 'Лично пообщаться с экстрасенсом', icon: Shield },
];

const SERVICE_LINKS = [
  '/finansovaya-magiya',
  '/lyubovnaya-magiya',
  '/magiya-zhizni',
  '/magicheskaya-zashchita',
];

export default function HomePage() {
  const [page, setPage] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/pages/home'),
      api.get('/seo/home'),
      api.get('/participants'),
      api.get('/reviews?limit=40'),
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
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-fade-up">
            {b.hero_h1 || 'Помощь сильнейших экстрасенсов, ясновидящих, целителей, магов и ведьм России'}
          </h1>

          {/* Subtitle with decoration */}
          <h2 className="font-heading text-xl md:text-2xl text-gold font-medium mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            {b.hero_subtitle || 'Сайт помощи экстрасенсов'}
          </h2>

          {/* Логотипы Битва + ТНТ - из CMS */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-6 animate-fade-up" style={{ animationDelay: '0.15s' }} data-testid="hero-logos">
            {b.hero_logo_bitva_url && (
              <PictureImg
                src={b.hero_logo_bitva_url}
                alt={b.hero_logo_bitva_alt || 'Битва экстрасенсов'}
                className="w-auto object-contain"
                style={{ height: `${b.hero_logo_bitva_height_mobile || 40}px` }}
                data-testid="logo-bitva"
                loading="eager"
                fetchpriority="high"
              />
            )}
            {b.hero_logo_tnt_url && (
              <PictureImg
                src={b.hero_logo_tnt_url}
                alt={b.hero_logo_tnt_alt || 'ТНТ'}
                className="w-auto object-contain"
                style={{ height: `${b.hero_logo_tnt_height_mobile || 40}px` }}
                data-testid="logo-tnt"
                loading="eager"
                fetchpriority="high"
              />
            )}
            <style>{`
              @media (min-width: 768px) { 
                [data-testid="logo-bitva"] { height: ${b.hero_logo_bitva_height_desktop || 56}px !important; }
                [data-testid="logo-tnt"] { height: ${b.hero_logo_tnt_height_desktop || 56}px !important; }
              }
            `}</style>
          </div>

          {/* TNT logo placeholder + Unique opportunity text */}
          <div className="max-w-3xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-gold font-heading text-lg md:text-xl font-semibold italic mb-4">
              {b.hero_unique || 'Уникальная возможность!'}
            </p>
            <p className="text-white/80 font-body leading-relaxed mb-2 text-base md:text-lg">
              {b.hero_text1 || 'Лично обратиться к любому участнику «Битва экстрасенсов».'}
            </p>
            <p className="text-white/60 font-body leading-relaxed text-base mb-6">
              {b.hero_text2 || 'И получить диагностику и консультацию экстрасенсов, ясновидящих, магов, целителей и ведьм'}
            </p>
          </div>

          {/* Subheading */}
          <h3 className="font-heading text-xl md:text-2xl text-gold mb-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            {b.hero_subheading || 'помощь и консультация экстрасенса'}
          </h3>

          {/* Description text */}
          <p className="text-white/50 font-body text-base leading-relaxed max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
            {b.about_text || 'Вам лично помогут сильнейшие и самые лучшие экстрасенсы России решить ваши проблемы и получить ответы на ваши вопросы.'}
          </p>

          {/* CTA Block */}
          <div className="max-w-sm mx-auto teal-card p-6 mb-10 animate-fade-up" style={{ animationDelay: '0.5s' }} data-testid="cta-block">
            <p className="text-white font-body font-medium mb-4 text-base">
              {b.cta_text || 'Количество заявок на помощь ограничено!'}
            </p>
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-8 py-3 text-base font-body font-semibold mb-3 w-full md:w-auto" data-testid="hero-cta-btn">
                {b.cta_button || 'Получить помощь экстрасенса!'}
              </button>
            </Link>
            <p className="text-white/40 font-body text-sm">
              {b.cta_subtext || 'Не упустите свой шанс!'}
            </p>
          </div>

          {/* Problem categories */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-5" data-testid="categories-row">
            {PROBLEM_CATEGORIES.map((cat, i) => (
              <Link
                key={i}
                to={cat.path}
                className="text-gold/80 hover:text-gold font-body text-base transition-colors border-b border-gold/30 hover:border-gold pb-0.5"
                data-testid={`category-${i}`}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARTICIPANTS GRID ===== */}
      {participants.length > 0 && (
        <section id="ekstrasensy" className="py-12 px-4" data-testid="participants-section">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-white text-center mb-10">
              {b.participants_title || 'Лучшие экстрасенсы России'}
            </h2>

            {/* Participant cards grid - horizontal 2-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="teal-card flex flex-row items-start gap-4 md:gap-5 p-4"
                  data-testid={`participant-card-${p.slug}`}
                >
                  {/* Square photo */}
                  <Link to={`/uchastniki/${p.slug}`} className="shrink-0">
                    <div className="w-28 h-32 md:w-36 md:h-40 rounded-md overflow-hidden border-2 border-white/20">
                      <PictureImg
                        src={p.photo_url}
                        alt={p.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        width="144"
                        height="160"
                      />
                    </div>
                  </Link>

                  {/* Text content */}
                  <div className="flex flex-col justify-between min-h-[130px] md:min-h-[160px]">
                    <div>
                      <Link to={`/uchastniki/${p.slug}`}>
                        <h3 className="font-heading text-lg md:text-xl font-bold text-gold hover:text-gold/80 transition-colors mb-2">
                          {p.name}
                        </h3>
                      </Link>

                      {/* Specialization badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(Array.isArray(p.specializations) ? p.specializations : []).slice(0, 2).map((s, j) => (
                          <span key={j} className="px-2.5 py-0.5 rounded-full border border-gold/40 text-gold/80 font-body text-xs">
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Short description */}
                      <p className="text-white/50 font-body text-sm leading-relaxed line-clamp-2 mb-3">
                        {p.title}
                      </p>
                    </div>

                    {/* CTA button */}
                    <div>
                      <Link to={`/uchastniki/${p.slug}`} aria-label={`Обратиться к экстрасенсу ${p.name}`}>
                        <span className="inline-block bg-gold hover:bg-gold/85 text-teal-dark font-body font-semibold text-sm md:text-base px-6 py-2.5 rounded-lg transition-colors" data-testid={`participant-cta-${p.slug}`}>Обратиться</span>
                      </Link>
                    </div>
                  </div>
                </div>
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
                <Link key={i} to="/zapis-na-priem" className="flex flex-col items-center text-center group cursor-pointer no-underline" data-testid={`benefit-card-${i}`}>
                  <div className="benefit-icon-circle mb-3 group-hover:border-gold group-hover:shadow-[0_0_16px_rgba(212,175,55,0.3)] transition-all duration-300">
                    <Icon className="w-7 h-7" />
                  </div>
                  <p className="text-white/60 font-body text-sm leading-snug max-w-[120px] group-hover:text-gold/80 transition-colors">{item.label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== REVIEWS CAROUSEL ===== */}
      {reviews.length > 0 && (
        <section id="otzyvy" className="py-10 px-4" data-testid="reviews-section">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-white text-center mb-10">
              {b.reviews_title || 'Отзывы'}
            </h2>
            <ReviewsCarousel reviews={reviews} />
          </div>
        </section>
      )}

      {/* ===== CTA BETWEEN REVIEWS AND SERVICES ===== */}
      <section className="py-6 md:py-8 px-4" data-testid="cta-mid-section">
        <div className="max-w-sm mx-auto teal-card p-6 text-center">
          <p className="text-white font-body font-medium mb-4 text-base">
            {b.cta_text || 'Количество заявок на помощь ограничено!'}
          </p>
          <Link to="/zapis-na-priem">
            <button className="btn-gold px-8 py-3 text-base font-body font-semibold mb-3 w-full md:w-auto" data-testid="cta-mid-btn">
              {b.cta_button || 'Получить помощь экстрасенса!'}
            </button>
          </Link>
          <p className="text-white/40 font-body text-sm">
            {b.cta_subtext || 'Не упустите свой шанс!'}
          </p>
        </div>
      </section>

      {/* ===== SERVICES SECTION ===== */}
      {serviceCats.length > 0 && (
        <section id="uslugi" className="py-10 px-4" data-testid="services-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-white text-center mb-10">
              {b.services_title || 'Услуги экстрасенсов'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceCats.map((cat, i) => (
                <div key={i} className="service-card p-5" data-testid={`service-card-${i}`}>
                  <h3 className="font-heading text-lg font-bold text-gold">{cat.title}</h3>
                  {cat.subtitle && (
                    <p className="font-heading text-base text-gold/70 mb-3">{cat.subtitle}</p>
                  )}
                  <div className="section-divider mb-3" />
                  <ul className="space-y-2">
                    {cat.items.map((item, j) => (
                      <li key={j} className="text-white/50 font-body text-sm leading-relaxed flex items-start gap-2">
                        <span className="text-gold/50 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to={SERVICE_LINKS[i] || '/zapis-na-priem'} className="block mt-4">
                    <button className="btn-outline-gold-sm w-full" data-testid={`service-link-${i}`}>Подробнее</button>
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
            <h2 className="font-heading text-2xl md:text-4xl font-semibold text-gold mb-6 text-center">
              {b.seo_text_title || 'Экстрасенс онлайн — возможность изменить вашу жизнь!'}
            </h2>
            <div className="text-white/45 font-body text-base leading-relaxed space-y-4 text-center">
              {b.seo_text.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="text-center mt-8">
              <div className="max-w-sm mx-auto teal-card p-6">
                <p className="text-white font-body font-medium mb-4 text-base">
                  {b.cta_text || 'Количество заявок на помощь ограничено!'}
                </p>
                <Link to="/zapis-na-priem">
                  <button className="btn-gold px-8 py-3 text-base font-body font-semibold mb-3 w-full md:w-auto" data-testid="seo-cta-btn">
                    {b.cta_button || 'Получить помощь экстрасенса!'}
                  </button>
                </Link>
                <p className="text-white/40 font-body text-sm">
                  {b.cta_subtext || 'Не упустите свой шанс!'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
