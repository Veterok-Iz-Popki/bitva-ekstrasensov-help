import { useState, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Mail, Clock, Send, MapPin } from 'lucide-react';
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
      api.get('/settings'),
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
      toast.error('Заполните все обязательные поля');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      toast.success('Сообщение отправлено!');
      setForm({ name: '', email: '', message: '', honeypot: '' });
    } catch {
      toast.error('Произошла ошибка. Попробуйте позже.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div className="pt-24 md:pt-32 pb-24" data-testid="contacts-page">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4 font-body">Свяжитесь с нами</p>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {blocks.page_title || 'Контакты'}
          </h1>
          <p className="text-base md:text-lg text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="p-8 border border-white/5 bg-[#0a0a0a]">
            <h2 className="font-heading text-2xl font-semibold text-white mb-6">Обратная связь</h2>
            <form onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
              <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
                <Input
                  name="honeypot"
                  value={form.honeypot}
                  onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
                  Имя <span className="text-red-400">*</span>
                </Label>
                <Input
                  data-testid="contact-name"
                  placeholder="Ваше имя"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  data-testid="contact-email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
                  Сообщение <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  data-testid="contact-message"
                  placeholder="Ваше сообщение..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 min-h-[120px] resize-none"
                  required
                />
              </div>
              <Button
                type="submit"
                data-testid="contact-submit-btn"
                disabled={submitting}
                className="w-full bg-burgundy hover:bg-burgundy-light text-white h-12 uppercase tracking-widest font-body transition-all duration-300 shadow-[0_0_10px_rgba(107,21,37,0.5)] hover:shadow-[0_0_20px_rgba(107,21,37,0.8)]"
              >
                {submitting ? 'Отправка...' : (
                  <span className="flex items-center gap-2"><Send className="w-4 h-4" />Отправить</span>
                )}
              </Button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            {blocks.appointment_text && (
              <div className="p-6 border border-gold/20 bg-burgundy/10">
                <p className="text-white/60 font-body leading-relaxed">{blocks.appointment_text}</p>
              </div>
            )}

            <div className="space-y-6">
              {settings.email && (
                <div className="flex items-start gap-4" data-testid="contact-email-info">
                  <div className="flex items-center justify-center w-10 h-10 border border-gold/30 shrink-0">
                    <Mail className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-white/40 font-body uppercase tracking-wider mb-1">Email</p>
                    <p className="text-white font-body">{settings.email}</p>
                  </div>
                </div>
              )}
              {settings.working_hours && (
                <div className="flex items-start gap-4" data-testid="contact-hours-info">
                  <div className="flex items-center justify-center w-10 h-10 border border-gold/30 shrink-0">
                    <Clock className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-white/40 font-body uppercase tracking-wider mb-1">Часы работы</p>
                    <p className="text-white font-body">{settings.working_hours}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4" data-testid="contact-appointment-info">
                <div className="flex items-center justify-center w-10 h-10 border border-gold/30 shrink-0">
                  <MapPin className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-white/40 font-body uppercase tracking-wider mb-1">Приём</p>
                  <p className="text-white font-body">По предварительной записи</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
