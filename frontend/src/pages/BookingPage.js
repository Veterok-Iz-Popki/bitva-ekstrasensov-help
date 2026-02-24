import { useState, useEffect } from 'react';
import { CheckCircle, Lock, ArrowRight } from 'lucide-react';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO } from '../lib/api';

export default function BookingPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/pages/booking'),
      api.get('/seo/booking'),
    ]).then(([pageRes, seoRes]) => {
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};
  const steps = (blocks.process_steps || '').split('\n').filter(Boolean);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div className="pt-24 md:pt-32 pb-24" data-testid="booking-page">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4 font-body">Запись на консультацию</p>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {blocks.page_title || 'Запись на приём к экстрасенсу'}
          </h1>
          <p className="text-base md:text-lg text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || 'Заполните форму для записи на консультацию'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Form */}
          <div className="order-1">
            <div className="p-8 border border-white/5 bg-[#0a0a0a]">
              <ApplicationForm />
            </div>
          </div>

          {/* Info */}
          <div className="order-2 space-y-10">
            {/* Process Steps */}
            {steps.length > 0 && (
              <div data-testid="process-steps">
                <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-6">
                  {blocks.process_title || 'Как проходит консультация'}
                </h2>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-4" data-testid={`process-step-${i}`}>
                      <div className="flex items-center justify-center w-8 h-8 border border-gold/30 text-gold text-sm font-body shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-white/60 font-body leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidentiality */}
            <div className="p-6 border border-gold/20 bg-burgundy/10" data-testid="confidentiality-block">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-gold shrink-0 mt-1" />
                <div>
                  <h3 className="font-heading text-xl font-medium text-white mb-2">
                    {blocks.confidentiality_title || 'Гарантия конфиденциальности'}
                  </h3>
                  <p className="text-sm text-white/50 font-body leading-relaxed">
                    {blocks.confidentiality_text || ''}
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
