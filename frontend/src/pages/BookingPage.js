import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO } from '../lib/api';

export default function BookingPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/pages/booking'), api.get('/seo/booking')])
      .then(([pageRes, seoRes]) => { setPage(pageRes.data); if (seoRes.data) setSEO(seoRes.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};
  const steps = (blocks.process_steps || '').split('\n').filter(Boolean);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="booking-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-3">
            {blocks.page_title || 'Запись на приём к экстрасенсу'}
          </h1>
          <p className="text-white/50 font-body">{blocks.page_subtitle || ''}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="teal-card p-8">
            <ApplicationForm />
          </div>
          <div className="space-y-8">
            {steps.length > 0 && (
              <div data-testid="process-steps">
                <h2 className="font-heading text-2xl font-semibold text-gold mb-5">
                  {blocks.process_title || 'Как проходит консультация'}
                </h2>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3" data-testid={`process-step-${i}`}>
                      <div className="flex items-center justify-center w-7 h-7 rounded-full border border-gold/50 text-gold text-xs font-body shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-white/60 font-body text-sm leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="teal-card p-5" data-testid="confidentiality-block">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-heading text-lg font-medium text-gold mb-1">{blocks.confidentiality_title || 'Гарантия конфиденциальности'}</h3>
                  <p className="text-white/50 font-body text-sm leading-relaxed">{blocks.confidentiality_text || ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
