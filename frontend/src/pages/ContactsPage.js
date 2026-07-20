import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Mail, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import api, { setSEO } from '../lib/api';

export default function ContactsPage() {
  const [page, setPage] = useState(null);
  const [settings, setSettings] = useState({});
  const [form, setForm] = useState({ name: '', email: '', message: '', honeypot: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/pages/contacts'),
      api.get('/seo/contacts'),
      api.get('/settings')
    ]).then(([pageRes, seoRes, settingsRes]) => {
      setPage(pageRes.data);
      setSettings(settingsRes.data || {});
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error('Заполните все поля');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      toast.success('Сообщение отправлено!');
      setForm({ name: '', email: '', message: '', honeypot: '' });
    } catch (err) {
      if (err.response?.data?.error) {
        const detail = err.response.data.detail || 'Ошибка';
        toast.error(`${detail}: ${err.response.data.error}`, { duration: 15000 });
      } else if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error('Произошла ошибка.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="contacts-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-heading text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4">
            {blocks.page_title || 'Контакты'}
          </h1>
          <p className="text-white/50 font-body text-sm md:text-base">
            {blocks.page_subtitle || 'Свяжитесь с нами для записи на консультацию'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact form */}
          <div className="teal-card p-6 md:p-8">
            <h2 className="font-heading text-xl font-semibold text-gold mb-6">Обратная связь</h2>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="contact-form">
              {/* Honeypot */}
              <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
                <Input
                  name="honeypot"
                  value={form.honeypot}
                  onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs font-body">Имя <span className="text-red-400">*</span></Label>
                <Input
                  data-testid="contact-name"
                  placeholder="Ваше имя"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs font-body">Email <span className="text-red-400">*</span></Label>
                <Input
                  data-testid="contact-email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-11"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs font-body">Сообщение <span className="text-red-400">*</span></Label>
                <Textarea
                  data-testid="contact-message"
                  placeholder="Ваше сообщение..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 min-h-[120px] resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                data-testid="contact-submit-btn"
                disabled={submitting}
                className="btn-gold w-full py-3 font-body text-sm font-semibold"
              >
                {submitting ? 'Отправка...' : 'Отправить сообщение'}
              </button>
            </form>
          </div>

          {/* Contact info */}
          <div className="space-y-6">
            {blocks.appointment_text && (
              <div className="teal-card p-5">
                <p className="text-white/60 font-body text-sm leading-relaxed">{blocks.appointment_text}</p>
              </div>
            )}

            <div className="space-y-5">
              {settings.email && (
                <div className="flex items-start gap-4" data-testid="contact-email-info">
                  <div className="benefit-icon-circle w-12 h-12 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-body mb-1">Email</p>
                    <p className="text-white font-body">{settings.email}</p>
                  </div>
                </div>
              )}

              {settings.working_hours && (
                <div className="flex items-start gap-4" data-testid="contact-hours-info">
                  <div className="benefit-icon-circle w-12 h-12 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 font-body mb-1">Часы работы</p>
                    <p className="text-white font-body">{settings.working_hours}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4" data-testid="contact-appointment-info">
                <div className="benefit-icon-circle w-12 h-12 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-body mb-1">Формат приёма</p>
                  <p className="text-white font-body">По предварительной записи</p>
                  <p className="text-white/50 font-body text-sm">Онлайн или очно</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
