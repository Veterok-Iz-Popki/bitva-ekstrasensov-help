import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ApplicationForm({ title, subtitle, compact = false }) {
  const [form, setForm] = useState({ name: '', phone: '', messenger: '', description: '', honeypot: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Заполните обязательные поля');
      return;
    }
    setLoading(true);
    try {
      await api.post('/applications', form);
      toast.success('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.');
      setForm({ name: '', phone: '', messenger: '', description: '', honeypot: '' });
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Слишком много запросов. Попробуйте позже.');
      } else {
        toast.error('Произошла ошибка. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="application-form-wrapper">
      {title && (
        <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-2 text-center">{title}</h2>
      )}
      {subtitle && (
        <p className="text-white/50 text-center mb-6 font-body text-sm">{subtitle}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="application-form">
        {/* Honeypot */}
        <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
          <Input name="honeypot" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-body">Ваше имя <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-name"
              placeholder="Ваше имя"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/30 h-11"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-body">Ваш телефон <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-phone"
              placeholder="+7 (___) ___-__-__"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/30 h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs font-body">Мессенджер для связи</Label>
          <Select value={form.messenger} onValueChange={(val) => setForm({ ...form, messenger: val })}>
            <SelectTrigger data-testid="form-messenger" className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white h-11">
              <SelectValue placeholder="Выберите мессенджер" />
            </SelectTrigger>
            <SelectContent className="bg-teal-dark border-teal-light/30">
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="viber">Viber</SelectItem>
              <SelectItem value="phone">Звонок на телефон</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-xs font-body">Опишите вашу проблему</Label>
          <Textarea
            data-testid="form-description"
            placeholder="Кратко опишите вашу ситуацию..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/30 min-h-[100px] resize-none"
          />
        </div>

        <p className="text-xs text-white/30 font-body text-center">Данные не будут передаваться третьим лицам</p>

        <button
          type="submit"
          data-testid="form-submit-btn"
          disabled={loading}
          className="btn-gold w-full py-3 text-base font-body uppercase tracking-wide"
        >
          {loading ? 'Отправка...' : 'Получить помощь экстрасенса'}
        </button>
      </form>
    </div>
  );
}
