import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowRight, Shield, Eye, Star, Heart, Sparkles, Users, Lock, Monitor } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO, setJsonLd } from '../lib/api';

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
      setParticipants(partRes.data?.slice(0, 4) || []);
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

  const BENEFIT_ICONS = [Shield, Users, Heart, Monitor, Lock];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        data-testid="hero-section"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(https://images.unsplash.com/photo-1737816473252-b7b8b60ae7b6?q=85&w=1920&auto=format&fit=crop)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/70 via-[#050505]/60 to-[#050505]" />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="animate-fade-up stagger-1">
            <p className="text-gold text-sm uppercase tracking-[0.3em] mb-6 font-body">
              Официальный сайт помощи
            </p>
          </div>
          <h1 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 text-shadow-hero animate-fade-up stagger-2 tracking-tight">
            Битва экстрасенсов
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-10 font-body leading-relaxed animate-fade-up stagger-3 max-w-2xl mx-auto">
            {blocks.hero_subtitle || 'Запись на консультацию сильнейших участников проекта'}
          </p>
          <div className="animate-fade-up stagger-4">
            <Link to="/zapis-na-priem">
              <Button
                data-testid="hero-cta-btn"
                className="bg-burgundy hover:bg-burgundy-light text-white px-10 py-6 text-lg uppercase tracking-widest font-body transition-all duration-300 shadow-[0_0_15px_rgba(107,21,37,0.5)] hover:shadow-[0_0_30px_rgba(107,21,37,0.8)]"
              >
                Оставить заявку
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 md:py-32 px-6 md:px-12" data-testid="about-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-8 tracking-tight">
            {blocks.about_title || 'О проекте'}
          </h2>
          <div className="section-divider mb-8" />
          <p className="text-base md:text-lg text-white/60 leading-relaxed font-body">
            {blocks.about_text || ''}
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-[#0a0a0a]" data-testid="services-section">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-12 text-center tracking-tight">
            {blocks.services_title || 'С какими вопросами помогают'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servicesList.map((item, i) => {
              const [title, desc] = item.split(' — ');
              return (
                <div
                  key={i}
                  className="p-6 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-burgundy/20 transition-all duration-500"
                  data-testid={`service-item-${i}`}
                >
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-5 h-5 text-gold shrink-0 mt-1" />
                    <div>
                      <h3 className="font-heading text-lg font-medium text-white mb-1">{title}</h3>
                      {desc && <p className="text-sm text-white/50 font-body">{desc}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 md:py-32 px-6 md:px-12" data-testid="benefits-section">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-12 text-center tracking-tight">
            {blocks.benefits_title || 'Преимущества'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefitsList.map((item, i) => {
              const [title, desc] = item.split(' — ');
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <div
                  key={i}
                  className="p-8 border border-white/5 text-center hover:border-gold/30 transition-all duration-500"
                  data-testid={`benefit-item-${i}`}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 border border-gold/30 mb-4">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-heading text-xl font-medium text-white mb-2">{title}</h3>
                  {desc && <p className="text-sm text-white/50 font-body">{desc}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Participants Preview */}
      {participants.length > 0 && (
        <section className="py-24 md:py-32 px-6 md:px-12 bg-[#0a0a0a]" data-testid="participants-preview">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-heading text-4xl md:text-5xl font-semibold text-white mb-12 text-center tracking-tight">
              Наши специалисты
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {participants.map((p) => (
                <Link
                  key={p.id}
                  to={`/uchastniki/${p.slug}`}
                  className="participant-card group border border-white/5 bg-[#0a0a0a] overflow-hidden"
                  data-testid={`participant-preview-${p.slug}`}
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-lg font-medium text-white">{p.name}</h3>
                    <p className="text-sm text-gold/80 font-body mt-1">{p.title}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/uchastniki">
                <Button
                  variant="outline"
                  data-testid="view-all-participants-btn"
                  className="border-gold text-gold hover:bg-gold hover:text-black px-8 py-5 text-sm uppercase tracking-widest font-body"
                >
                  Все участники
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Application Form Section */}
      <section className="py-24 md:py-32 px-6 md:px-12" data-testid="form-section">
        <div className="max-w-2xl mx-auto">
          <ApplicationForm
            title={blocks.form_title || 'Оставить заявку на консультацию'}
            subtitle={blocks.form_subtitle || 'Заполните форму, и мы свяжемся с вами в ближайшее время'}
          />
        </div>
      </section>

      {/* SEO Text Section */}
      {blocks.seo_text && (
        <section className="py-24 md:py-32 px-6 md:px-12 bg-[#0a0a0a]" data-testid="seo-section">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-8">
              {blocks.seo_text_title || ''}
            </h2>
            <div className="text-white/50 font-body leading-relaxed space-y-4">
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
