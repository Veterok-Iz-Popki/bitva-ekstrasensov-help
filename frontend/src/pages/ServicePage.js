import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Sparkles, HelpCircle, Phone, Star } from 'lucide-react';
import api, { setSEO, setJsonLd, setBreadcrumbJsonLd, getSiteUrl } from '../lib/api';

const SERVICE_NAMES = {
  'finansovaya-magiya': 'Финансовая магия',
  'lyubovnaya-magiya': 'Любовная магия',
  'magiya-zhizni': 'Магия жизни',
  'magicheskaya-zashchita': 'Магическая защита',
};

// SEO-оптимизированные H1
const SERVICE_H1 = {
  'finansovaya-magiya': 'Финансовая магия — помощь экстрасенса',
  'lyubovnaya-magiya': 'Любовная магия — помощь экстрасенса',
  'magiya-zhizni': 'Магия жизни — помощь экстрасенса',
  'magicheskaya-zashchita': 'Магическая защита — помощь экстрасенса',
};

// Cross-linking
const SERVICE_RELATED = {
  'finansovaya-magiya':      [{slug:'magiya-zhizni', name:'Магия жизни'}, {slug:'magicheskaya-zashchita', name:'Магическая защита'}],
  'lyubovnaya-magiya':       [{slug:'magiya-zhizni', name:'Магия жизни'}, {slug:'magicheskaya-zashchita', name:'Магическая защита'}],
  'magiya-zhizni':           [{slug:'magicheskaya-zashchita', name:'Магическая защита'}, {slug:'finansovaya-magiya', name:'Финансовая магия'}],
  'magicheskaya-zashchita':  [{slug:'magiya-zhizni', name:'Магия жизни'}, {slug:'lyubovnaya-magiya', name:'Любовная магия'}],
};

export default function ServicePage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    Promise.all([
      api.get(`/pages/service-${slug}`),
      api.get(`/seo/service-${slug}`),
    ]).then(([pageRes, seoRes]) => {
      if (!pageRes.data || !pageRes.data.blocks || Object.keys(pageRes.data.blocks).length === 0) {
        setNotFound(true);
        return;
      }
      setPage(pageRes.data);
      const seo = seoRes.data;
      if (seo && seo.title) {
        setSEO({
          title: seo.title,
          description: seo.description,
          keywords: seo.keywords,
          canonicalPath: `/${slug}`,
          ogTitle: seo.og_title,
          ogDescription: seo.og_description,
        });
      }
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": seo?.title || SERVICE_NAMES[slug],
        "description": seo?.description || "",
        "url": `${getSiteUrl()}/${slug}`
      });
      setBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: SERVICE_NAMES[slug] || 'Услуга', path: `/${slug}` },
      ]);
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-white/50 font-body text-lg">Страница не найдена</p>
        <Link to="/" className="btn-outline-gold px-6 py-2 font-body">На главную</Link>
      </div>
    );
  }

  const b = page?.blocks || {};
  const title = b.title || SERVICE_NAMES[slug] || 'Услуга';
  const h1Text = b.h1 || SERVICE_H1[slug] || title;
  const relatedServices = SERVICE_RELATED[slug] || [];

  const parseList = (text) => (text || '').split('\n').filter(Boolean);

  const directions = parseList(b.directions);
  const situations = parseList(b.situations);
  const steps = parseList(b.how_it_works);
  const results = parseList(b.results);

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid={`service-page-${slug}`}>
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm font-body">
          <Link to="/" className="text-white/40 hover:text-gold transition-colors">Главная</Link>
          <span className="text-white/30 mx-2">/</span>
          <span className="text-gold">{title}</span>
        </nav>

        {/* H1 */}
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6" data-testid="service-title">
          {h1Text}
        </h1>

        {/* Описание услуги */}
        {b.description && (
          <section className="mb-10" data-testid="service-description">
            <div className="text-white/70 font-body text-lg leading-relaxed space-y-4">
              {b.description.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Направления услуги */}
        {directions.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="service-directions">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <Sparkles className="w-7 h-7" />
              {b.directions_title || 'Направления'}
            </h2>
            <ul className="space-y-3">
              {directions.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 font-body">
                  <CheckCircle className="w-5 h-5 text-gold/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Типичные ситуации */}
        {situations.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="service-situations">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <HelpCircle className="w-7 h-7" />
              {b.situations_title || 'Когда обращаются'}
            </h2>
            <ul className="space-y-3">
              {situations.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 font-body">
                  <ArrowRight className="w-5 h-5 text-gold/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Как проходит консультация */}
        {steps.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="service-how-it-works">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <Phone className="w-7 h-7" />
              {b.how_it_works_title || 'Как проходит консультация'}
            </h2>
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gold/50 text-gold font-body font-semibold shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-white/70 font-body pt-1">{step}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Результаты */}
        {results.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="service-results">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <Star className="w-7 h-7" />
              {b.results_title || 'Что вы получите'}
            </h2>
            <ul className="space-y-3">
              {results.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 font-body">
                  <CheckCircle className="w-5 h-5 text-gold/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Дополнительный текст */}
        {b.additional_text && (
          <section className="mb-10" data-testid="service-additional">
            <h3 className="font-heading text-xl md:text-2xl font-semibold text-gold mb-4">
              {b.additional_title || 'Важно знать'}
            </h3>
            <div className="text-white/60 font-body leading-relaxed space-y-4">
              {b.additional_text.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8 teal-card p-6 md:p-8" data-testid="service-cta">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-4">
            {b.cta_title || 'Нужна помощь?'}
          </h2>
          <p className="text-white/60 font-body mb-6 max-w-xl mx-auto">
            {b.cta_text || 'Запишитесь на консультацию к нашим специалистам.'}
          </p>
          <Link to="/zapis-na-priem">
            <button className="btn-gold px-10 py-4 text-lg font-body font-semibold" data-testid="service-cta-btn">
              {b.cta_button || 'Получить консультацию'}
            </button>
          </Link>
        </section>

        {/* Похожие услуги — internal cross-linking для SEO */}
        {relatedServices.length > 0 && (
          <section className="mt-12" data-testid="service-related">
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-gold/90 mb-5">Похожие услуги</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedServices.map((s) => (
                <li key={s.slug}>
                  <Link
                    to={`/${s.slug}`}
                    className="block teal-card p-4 hover:border-gold/50 transition-colors text-white/80 hover:text-gold font-body text-sm"
                    data-testid={`service-related-${s.slug}`}
                  >
                    {s.name} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
