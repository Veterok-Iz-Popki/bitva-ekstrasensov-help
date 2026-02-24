import { useState, useEffect } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import api, { setSEO } from '../lib/api';

export default function FAQPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/faq'),
      api.get('/pages/faq'),
      api.get('/seo/faq'),
    ]).then(([faqRes, pageRes, seoRes]) => {
      setItems(faqRes.data || []);
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div className="pt-24 md:pt-32 pb-24" data-testid="faq-page">
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4 font-body">Вопросы и ответы</p>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {blocks.page_title || 'Частые вопросы'}
          </h1>
          <p className="text-base md:text-lg text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || ''}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
          {items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border border-white/5 bg-[#0a0a0a] px-6 data-[state=open]:border-gold/20"
              data-testid={`faq-item-${item.id}`}
            >
              <AccordionTrigger className="text-left font-heading text-lg font-medium text-white hover:text-gold py-5 hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-white/60 font-body leading-relaxed pb-5">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
