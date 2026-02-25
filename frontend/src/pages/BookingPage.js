import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO } from '../lib/api';

export default function BookingPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/pages/booking'),
      api.get('/seo/booking')
    ]).then(([pageRes, seoRes]) => {
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};
  const steps = (blocks.process_steps || '').split('\n').filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="booking-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4">
            {blocks.page_title || 'Запись на приём к экстрасенсу'}
          </h1>
          <p className="text-white/50 font-body text-sm md:text-base">
            {blocks.page_subtitle || 'Заполните форму для записи на консультацию'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Application form */}
          <div className="teal-card p-6 md:p-8">
            <ApplicationForm />
          </div>

          {/* Process steps and confidentiality */}
          <div className="space-y-8">
            {/* Process steps */}
            {steps.length > 0 && (
              <div data-testid="process-steps">
                <h2 className="font-heading text-xl md:text-2xl font-semibold text-gold mb-6">
                  {blocks.process_title || 'Как проходит консультация'}
                </h2>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4" data-testid={`process-step-${i}`}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-gold/50 text-gold text-sm font-body font-semibold shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-white/60 font-body text-sm leading-relaxed pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidentiality block */}
            <div className="teal-card p-6" data-testid="confidentiality-block">
              <div className="flex items-start gap-4">
                <div className="benefit-icon-circle w-12 h-12 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-semibold text-gold mb-2">
                    {blocks.confidentiality_title || 'Гарантия конфиденциальности'}
                  </h3>
                  <p className="text-white/50 font-body text-sm leading-relaxed">
                    {blocks.confidentiality_text || 'Ваши данные не будут переданы третьим лицам. Все обращения строго конфиденциальны.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
