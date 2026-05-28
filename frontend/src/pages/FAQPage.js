import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import api, { setSEO, setBreadcrumbJsonLd } from '../lib/api';

export default function FAQPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/faq'),
      api.get('/pages/faq'),
      api.get('/seo/faq')
    ]).then(([faqRes, pageRes, seoRes]) => {
      setItems(faqRes.data || []);
      setPage(pageRes.data);
      const seo = seoRes.data;
      if (seo) setSEO({
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        canonicalPath: '/voprosy-i-otvety',
        ogTitle: seo.og_title,
        ogDescription: seo.og_description,
      });
      // FAQPage JSON-LD schema — даёт rich snippets в Google SERP
      if (faqRes.data?.length) {
        const script = document.querySelector('#json-ld') || (() => {
          const s = document.createElement('script');
          s.id = 'json-ld'; s.type = 'application/ld+json';
          document.head.appendChild(s);
          return s;
        })();
        script.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqRes.data.map(it => ({
            "@type": "Question",
            "name": it.question,
            "acceptedAnswer": { "@type": "Answer", "text": it.answer },
          })),
        });
      }
      setBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: 'Вопросы-Ответы', path: '/voprosy-i-otvety' },
      ]);
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
    <div className="pt-24 md:pt-32 pb-16" data-testid="faq-page">
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4">
            {blocks.page_title || 'Частые вопросы о помощи экстрасенсов'}
          </h1>
          <p className="text-white/50 font-body text-sm md:text-base">
            {blocks.page_subtitle || 'Ответы на самые популярные вопросы о консультациях'}
          </p>
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
          {items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="teal-card px-5 data-[state=open]:border-gold/40"
              data-testid={`faq-item-${item.id}`}
            >
              <AccordionTrigger className="text-left font-heading text-sm md:text-base font-medium text-white hover:text-gold py-4 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-white/60 font-body text-sm leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 font-body">Вопросы скоро появятся</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-white/50 font-body text-sm mb-4">Не нашли ответ на свой вопрос?</p>
          <Link to="/zapis-na-priem">
            <button className="btn-outline-gold px-8 py-3 font-body text-sm" data-testid="faq-contact-btn">
              Связаться с нами
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
