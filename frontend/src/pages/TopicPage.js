import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, AlertTriangle, HelpCircle, Phone } from 'lucide-react';
import api, { setSEO, setJsonLd, setBreadcrumbJsonLd, getSiteUrl } from '../lib/api';

// SEO-оптимизированные H1 для topic-страниц
const TOPIC_H1 = {
  'porcha': 'Снятие порчи — помощь экстрасенса',
  'proklyatie': 'Снятие проклятия — помощь экстрасенса',
  'sglaz': 'Снятие сглаза — помощь экстрасенса',
  'venets-bezbrachiya': 'Снятие венца безбрачия — помощь экстрасенса',
  'privorot': 'Снятие приворота — помощь экстрасенса',
  'zaklyatie': 'Снятие заклятия — помощь экстрасенса',
};

// Cross-linking: связанные темы (для блока «Похожие услуги»)
const TOPIC_RELATED = {
  'porcha':       [{slug:'sglaz', name:'Снятие сглаза'}, {slug:'proklyatie', name:'Снятие проклятия'}, {slug:'zaklyatie', name:'Снятие заклятия'}],
  'proklyatie':   [{slug:'porcha', name:'Снятие порчи'}, {slug:'zaklyatie', name:'Снятие заклятия'}, {slug:'venets-bezbrachiya', name:'Венец безбрачия'}],
  'sglaz':        [{slug:'porcha', name:'Снятие порчи'}, {slug:'proklyatie', name:'Снятие проклятия'}, {slug:'zaklyatie', name:'Снятие заклятия'}],
  'venets-bezbrachiya': [{slug:'privorot', name:'Снятие приворота'}, {slug:'proklyatie', name:'Снятие проклятия'}],
  'privorot':     [{slug:'venets-bezbrachiya', name:'Венец безбрачия'}, {slug:'porcha', name:'Снятие порчи'}, {slug:'zaklyatie', name:'Снятие заклятия'}],
  'zaklyatie':    [{slug:'porcha', name:'Снятие порчи'}, {slug:'sglaz', name:'Снятие сглаза'}, {slug:'proklyatie', name:'Снятие проклятия'}],
};

// Маппинг slug -> название темы (fallback для breadcrumb / описаний)
const TOPIC_NAMES = {
  'porcha': 'Порча',
  'proklyatie': 'Проклятие',
  'sglaz': 'Сглаз',
  'venets-bezbrachiya': 'Венец безбрачия',
  'privorot': 'Приворот',
  'zaklyatie': 'Заклятие',
};

const TOPIC_CTA = {
  'porcha': 'Снять порчу',
  'proklyatie': 'Снять проклятие',
  'sglaz': 'Снять сглаз',
  'venets-bezbrachiya': 'Снять венец безбрачия',
  'privorot': 'Снять приворот',
  'zaklyatie': 'Снять заклятие',
};

export default function TopicPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/pages/topic-${slug}`),
      api.get(`/seo/topic-${slug}`),
    ]).then(([pageRes, seoRes]) => {
      if (!pageRes.data) {
        setNotFound(true);
        return;
      }
      setPage(pageRes.data);
      const seo = seoRes.data;
      if (seo) {
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
        "@type": "WebPage",
        "name": seo?.title || TOPIC_NAMES[slug],
        "description": seo?.description || "",
        "url": `${getSiteUrl()}/${slug}`
      });
      setBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: TOPIC_NAMES[slug] || 'Тема', path: `/${slug}` },
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
        <Link to="/" className="btn-outline-gold px-6 py-2 font-body">
          На главную
        </Link>
      </div>
    );
  }

  const b = page?.blocks || {};
  const topicName = b.title || TOPIC_NAMES[slug] || 'Тема';
  const h1Text = b.h1 || TOPIC_H1[slug] || topicName;
  const relatedTopics = TOPIC_RELATED[slug] || [];

  // Парсим симптомы (каждый с новой строки)
  const symptoms = (b.symptoms || '').split('\n').filter(Boolean);
  // Парсим когда обращаться
  const whenToContact = (b.when_to_contact || '').split('\n').filter(Boolean);
  // Парсим процесс консультации
  const consultationSteps = (b.consultation_process || '').split('\n').filter(Boolean);

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid={`topic-page-${slug}`}>
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm font-body">
          <Link to="/" className="text-white/40 hover:text-gold transition-colors">Главная</Link>
          <span className="text-white/30 mx-2">/</span>
          <span className="text-gold">{topicName}</span>
        </nav>

        {/* H1 */}
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6" data-testid="topic-title">
          {h1Text}
        </h1>

        {/* Описание проблемы */}
        {b.description && (
          <section className="mb-10" data-testid="topic-description">
            <div className="text-white/70 font-body text-lg leading-relaxed space-y-4">
              {b.description.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Признаки / Симптомы */}
        {symptoms.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="topic-symptoms">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <AlertTriangle className="w-7 h-7" />
              {b.symptoms_title || 'Типичные признаки и симптомы'}
            </h2>
            <ul className="space-y-3">
              {symptoms.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 font-body">
                  <CheckCircle className="w-5 h-5 text-gold/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Когда стоит обратиться */}
        {whenToContact.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="topic-when">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <HelpCircle className="w-7 h-7" />
              {b.when_title || 'В каких случаях стоит обратиться'}
            </h2>
            <ul className="space-y-3">
              {whenToContact.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70 font-body">
                  <ArrowRight className="w-5 h-5 text-gold/70 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Как проходит консультация */}
        {consultationSteps.length > 0 && (
          <section className="mb-10 teal-card p-6 md:p-8" data-testid="topic-consultation">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-6 flex items-center gap-3">
              <Phone className="w-7 h-7" />
              {b.consultation_title || 'Как проходит консультация'}
            </h2>
            <div className="space-y-4">
              {consultationSteps.map((step, i) => (
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

        {/* Дополнительный текст */}
        {b.additional_text && (
          <section className="mb-10" data-testid="topic-additional">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-gold mb-4">
              {b.additional_title || 'Важно знать'}
            </h2>
            <div className="text-white/60 font-body leading-relaxed space-y-4">
              {b.additional_text.split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="text-center py-8 teal-card p-6 md:p-8" data-testid="topic-cta">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-4">
            {b.cta_title || 'Нужна помощь?'}
          </h2>
          <p className="text-white/60 font-body mb-6 max-w-xl mx-auto">
            {b.cta_text || 'Запишитесь на консультацию к нашим специалистам. Мы поможем разобраться в вашей ситуации.'}
          </p>
          <Link to="/zapis-na-priem">
            <button className="btn-gold px-10 py-4 text-lg font-body font-semibold" data-testid="topic-cta-btn">
              {b.cta_button || TOPIC_CTA[slug] || 'Получить консультацию'}
            </button>
          </Link>
        </section>

        {/* Похожие услуги — internal cross-linking для SEO */}
        {relatedTopics.length > 0 && (
          <section className="mt-12" data-testid="topic-related">
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-gold/90 mb-5">Похожие услуги</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    to={`/${t.slug}`}
                    className="block teal-card p-4 hover:border-gold/50 transition-colors text-white/80 hover:text-gold font-body text-sm"
                    data-testid={`topic-related-${t.slug}`}
                  >
                    {t.name} →
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
