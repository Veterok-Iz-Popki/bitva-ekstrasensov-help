import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
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
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-2 text-center">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-white/50 text-center mb-8 font-body">{subtitle}</p>
      )}
      <form onSubmit={handleSubmit} className={`${compact ? 'space-y-4' : 'space-y-6'}`} data-testid="application-form">
        {/* Honeypot - hidden from users */}
        <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
          <Input
            name="honeypot"
            value={form.honeypot}
            onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
          <div className="space-y-2">
            <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
              Имя <span className="text-red-400">*</span>
            </Label>
            <Input
              data-testid="form-name"
              placeholder="Ваше имя"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
              Телефон <span className="text-red-400">*</span>
            </Label>
            <Input
              data-testid="form-phone"
              placeholder="+7 (___) ___-__-__"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 h-12"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
            Мессенджер для связи
          </Label>
          <Select value={form.messenger} onValueChange={(val) => setForm({ ...form, messenger: val })}>
            <SelectTrigger
              data-testid="form-messenger"
              className="bg-black/50 border-white/10 focus:border-gold text-white h-12"
            >
              <SelectValue placeholder="Выберите мессенджер" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f0f0f] border-white/10">
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="viber">Viber</SelectItem>
              <SelectItem value="phone">Звонок на телефон</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white/70 text-sm uppercase tracking-wider font-body">
            Описание ситуации
          </Label>
          <Textarea
            data-testid="form-description"
            placeholder="Кратко опишите вашу ситуацию..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-black/50 border-white/10 focus:border-gold text-white placeholder:text-white/30 min-h-[120px] resize-none"
          />
        </div>

        <Button
          type="submit"
          data-testid="form-submit-btn"
          disabled={loading}
          className="w-full bg-burgundy hover:bg-burgundy-light text-white h-14 text-base uppercase tracking-widest font-body transition-all duration-300 shadow-[0_0_10px_rgba(107,21,37,0.5)] hover:shadow-[0_0_20px_rgba(107,21,37,0.8)]"
        >
          {loading ? (
            <span className="flex items-center gap-2">Отправка...</span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Оставить заявку
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
