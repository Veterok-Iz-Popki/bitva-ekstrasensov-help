import { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="booking-page">
      <div className="max-w-md mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white">
            {blocks.page_title || 'Запись на приём к экстрасенсу'}
          </h1>
        </div>

        {/* Application form */}
        <div className="teal-card p-6 md:p-8">
          <ApplicationForm />
        </div>

        <p className="text-center text-white/30 font-body text-xs mt-4">
          Данные не будут переданы третьим лицам. Все обращения конфиденциальны.
        </p>
      </div>
    </div>
  );
}
