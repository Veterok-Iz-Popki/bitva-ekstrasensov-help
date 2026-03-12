import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ApplicationForm from '../components/ApplicationForm';
import api, { setSEO } from '../lib/api';

function toDative(fullName) {
  if (!fullName) return fullName;
  const [first = '', last = ''] = fullName.trim().split(' ');
  let dF = first;
  if (first.endsWith('ия')) dF = first.slice(0, -1) + 'и';
  else if (first.endsWith('а')) dF = first.slice(0, -1) + 'е';
  else if (first.endsWith('я')) dF = first.slice(0, -1) + 'е';
  else if (first.endsWith('й')) dF = first.slice(0, -1) + 'ю';
  else if (/[бвгджзклмнпрстфхцчшщ]$/.test(first)) dF = first + 'у';
  let dL = last;
  if (last.endsWith('ова') || last.endsWith('ева')) dL = last.slice(0, -1) + 'ой';
  else if (last.endsWith('ов') || last.endsWith('ев')) dL = last + 'у';
  else if (last.endsWith('ый')) dL = last.slice(0, -2) + 'ому';
  else if (last.endsWith('ий')) dL = last.slice(0, -2) + 'ому';
  else if (last.endsWith('ая')) dL = last.slice(0, -2) + 'ой';
  else if (last.endsWith('ко')) dL = last;
  else if (last.endsWith('с')) dL = last + 'у';
  return `${dF} ${dL}`.trim();
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const psychicSlug = searchParams.get('psychic') || '';
  const [page, setPage] = useState(null);
  const [psychic, setPsychic] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle Google Contacts callback
  useEffect(() => {
    const contactStatus = searchParams.get('contact');
    if (contactStatus === 'success') {
      toast.success('Контакт успешно добавлен в Google Контакты');
    } else if (contactStatus === 'error') {
      toast.error('Не удалось добавить контакт');
    } else if (contactStatus === 'cancelled') {
      toast.info('Авторизация отменена');
    }
    if (contactStatus) {
      // Clean URL without reloading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('contact');
      const newUrl = window.location.pathname + (newParams.toString() ? '?' + newParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetches = [
      api.get('/pages/booking'),
      api.get('/seo/booking'),
    ];
    if (psychicSlug) fetches.push(api.get(`/participants/${psychicSlug}`));

    Promise.all(fetches).then(([pageRes, seoRes, psychicRes]) => {
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
      if (psychicRes?.data) setPsychic(psychicRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [psychicSlug]);

  const blocks = page?.blocks || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  const title = psychic
    ? `Обратиться к ${toDative(psychic.name)}`
    : (blocks.page_title || 'Запись на приём к экстрасенсу');

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="booking-page">
      <div className="max-w-md mx-auto px-4 md:px-8">
        {/* Back link when coming from psychic page */}
        {psychic && (
          <Link
            to={`/uchastniki/${psychicSlug}`}
            className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold transition-colors font-body mb-6"
            data-testid="back-to-psychic"
          >
            <ArrowLeft className="w-4 h-4" />
            {psychic.name}
          </Link>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white"
            data-testid="booking-title"
          >
            {title}
          </h1>
          {psychic && (
            <p className="text-white/50 font-body text-sm mt-3" data-testid="booking-psychic-info">
              {psychic.title}
            </p>
          )}
        </div>

        {/* Application form */}
        <div className="teal-card p-6 md:p-8">
          <ApplicationForm
            psychicSlug={psychicSlug}
            psychicName={psychic?.name || ''}
          />
        </div>

        <p className="text-center text-white/30 font-body text-xs mt-4">
          Данные не будут переданы третьим лицам. Все обращения конфиденциальны.
        </p>
      </div>
    </div>
  );
}
