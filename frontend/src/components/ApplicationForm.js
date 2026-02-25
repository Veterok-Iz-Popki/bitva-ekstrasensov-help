import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ApplicationForm({ title, subtitle }) {
  const [form, setForm] = useState({ name: '', phone: '', age: '', city: '', description: '', honeypot: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Заполните обязательные поля'); return; }
    setLoading(true);
    try {
      await api.post('/applications', form);
      toast.success('Заявка успешно отправлена! Мы свяжемся с вами.');
      setForm({ name: '', phone: '', age: '', city: '', description: '', honeypot: '' });
    } catch (err) {
      toast.error(err.response?.status === 429 ? 'Слишком много запросов.' : 'Ошибка. Попробуйте позже.');
    } finally { setLoading(false); }
  };

  return (
    <div data-testid="application-form-wrapper">
      {title && <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-1 text-center">{title}</h2>}
      {subtitle && <p className="text-white/50 text-center mb-5 font-body text-sm">{subtitle}</p>}
      <form onSubmit={handleSubmit} className="space-y-3" data-testid="application-form">
        <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
          <Input name="honeypot" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Ваше имя <span className="text-red-400">*</span></Label>
            <Input data-testid="form-name" placeholder="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm" required />
          </div>
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Телефон <span className="text-red-400">*</span></Label>
            <Input data-testid="form-phone" placeholder="+7 (___) ___-__-__" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Возраст</Label>
            <Input data-testid="form-age" placeholder="Ваш возраст" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Город</Label>
            <Input data-testid="form-city" placeholder="Ваш город" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-white/60 text-xs font-body">Опишите вашу проблему</Label>
          <Textarea data-testid="form-description" placeholder="Кратко опишите ситуацию..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 min-h-[80px] resize-none text-sm" />
        </div>

        <p className="text-xs text-white/25 font-body text-center">Данные не будут передаваться третьим лицам</p>

        <button type="submit" data-testid="form-submit-btn" disabled={loading} className="btn-gold w-full py-3 text-sm font-body uppercase tracking-wide">
          {loading ? 'Отправка...' : 'Записаться на консультацию'}
        </button>
      </form>
    </div>
  );
}
