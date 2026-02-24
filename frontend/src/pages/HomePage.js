import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, HelpCircle, Globe, MessageCircle, UserCheck, Heart, Zap, Star, Eye, Flame, Sparkles } from 'lucide-react';
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

const BENEFITS_ICONS = [
  { label: 'Помощь всем\nнуждающимся', icon: UserCheck },
  { label: 'Только лучшие\nэкстрасенсы', icon: Users },
  { label: 'Решение\nлюбых проблем', icon: HelpCircle },
  { label: 'Сайт\nпомощи', icon: Globe },
  { label: 'Консультация\nэкстрасенса', icon: MessageCircle },
  { label: 'Лично пообщаться\nс экстрасенсом', icon: Shield },
];

export default function HomePage() {
  const [page, setPage] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/pages/home'),
      api.get('/seo/home'),
      api.get('/participants'),
    ]).then(([pageRes, seoRes, partRes]) => {
      setPage(pageRes.data);
      setParticipants(partRes.data || []);
      const seo = seoRes.data;
      if (seo) setSEO({ title: seo.title, description: seo.description, keywords: seo.keywords });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "Битва экстрасенсов — официальный сайт помощи",
        "description": seo?.description || "",
        "url": window.location.origin,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};
  const servicesList = (blocks.services_list || '').split('\n').filter(Boolean);
  const benefitsList = (blocks.benefits_list || '').split('\n').filter(Boolean);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="pt-28 md:pt-36 pb-16 text-center px-4" data-testid="hero-section">
        <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight animate-fade-up stagger-1">
          Помощь сильнейших экстрасенсов,<br />ясновидящих, целителей, магов
        </h1>
        <h2 className="font-heading text-xl md:text-2xl text-gold font-medium mb-8 animate-fade-up stagger-2">
          Сайт помощи экстрасенсов
        </h2>

        <div className="max-w-3xl mx-auto animate-fade-up stagger-3">
          <p className="text-gold font-heading text-lg font-medium italic mb-4">Уникальная возможность!</p>
          <p className="text-white/80 font-body leading-relaxed mb-3">
            Лично обратиться к любому участнику <strong className="text-white">«Битва экстрасенсов»</strong>.
          </p>
          <p className="text-white/60 font-body leading-relaxed mb-6">
            И получить диагностику и консультацию экстрасенсов, ясновидящих, магов, целителей
          </p>
        </div>

        <div className="max-w-3xl mx-auto text-center mb-8 animate-fade-up stagger-3">
          <h3 className="text-gold font-heading text-xl md:text-2xl mb-4">помощь и консультация экстрасенса</h3>
          <p className="text-white/60 font-body text-sm leading-relaxed mb-4">
            {blocks.about_text || 'Вам лично помогут сильнейшие и самые лучшие экстрасенсы России, решить ваши проблемы и получить ответы на ваши вопросы.'}
          </p>
        </div>

        {/* CTA Block */}
        <div className="max-w-md mx-auto teal-card p-6 mb-10 animate-fade-up stagger-4" data-testid="cta-block">
          <p className="text-white font-body font-medium mb-3">Количество заявок на помощь ограниченно!</p>
          <Link to="/zapis-na-priem">
            <button className="btn-gold px-8 py-3 text-base font-body mb-2" data-testid="hero-cta-btn">
              Получить помощь экстрасенса!
            </button>
          </Link>
          <p className="text-white/50 font-body text-sm">Не упустите свой шанс!</p>
        </div>

        {/* Category Row */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-4xl mx-auto" data-testid="categories-row">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div key={i} className="flex items-center gap-2 text-gold/80 hover:text-gold transition-colors cursor-default" data-testid={`category-${i}`}>
                <Icon className="w-5 h-5" />
                <span className="font-body text-sm">{cat.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Participants Section */}
      {participants.length > 0 && (
        <section className="py-16 px-4" data-testid="participants-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-10">
              Лучшие экстрасенсы России
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {participants.map((p) => (
                <Link
                  key={p.id}
                  to={`/uchastniki/${p.slug}`}
                  className="participant-card-h group"
                  data-testid={`participant-card-${p.slug}`}
                >
                  <div className="w-[160px] h-[160px] overflow-hidden rounded flex-shrink-0 border border-teal-light/30">
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h3 className="font-heading text-xl font-semibold text-gold mb-1">{p.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(p.specializations || []).slice(0, 3).map((s, j) => (
                        <span key={j} className="badge-spec">{s}</span>
                      ))}
                    </div>
                    <p className="text-white/60 font-body text-sm line-clamp-2 mb-3">{p.description}</p>
                    <span className="btn-outline-gold inline-block w-fit px-5 py-1.5 text-sm font-body">
                      Обратиться
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Icons */}
      <section className="py-16 px-4" data-testid="benefits-section">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {BENEFITS_ICONS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex flex-col items-center text-center" data-testid={`benefit-icon-${i}`}>
                  <div className="benefit-icon-circle mb-3">
                    <Icon className="w-8 h-8" />
                  </div>
                  <p className="text-white/70 font-body text-xs leading-snug whitespace-pre-line">{item.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Section */}
      {servicesList.length > 0 && (
        <section className="py-16 px-4" data-testid="services-section">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white text-center mb-10">
              {blocks.services_title || 'Услуги экстрасенсов'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {servicesList.slice(0, 8).map((item, i) => {
                const [title, desc] = item.split(' — ');
                return (
                  <div key={i} className="service-card p-5" data-testid={`service-card-${i}`}>
                    <h3 className="font-heading text-lg text-gold font-medium mb-2">{title}</h3>
                    <div className="section-divider mb-3" />
                    {desc && <p className="text-white/50 font-body text-xs leading-relaxed">{desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Form Section */}
      <section className="py-16 px-4" data-testid="form-section">
        <div className="max-w-lg mx-auto teal-card p-8">
          <ApplicationForm
            title={blocks.form_title || 'Оставить заявку на консультацию'}
            subtitle={blocks.form_subtitle || 'Заполните форму, и мы свяжемся с вами в ближайшее время'}
          />
        </div>
      </section>

      {/* SEO Text */}
      {blocks.seo_text && (
        <section className="py-16 px-4" data-testid="seo-section">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold text-center mb-6">
              {blocks.seo_text_title || 'Экстрасенс онлайн — возможность изменить вашу жизнь!'}
            </h2>
            <div className="text-white/50 font-body text-sm leading-relaxed space-y-3 text-center">
              {blocks.seo_text.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
