import { useState } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ApplicationForm({ title, subtitle }) {
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    patronymic: '',
    phone: '',
    age: '',
    city: '',
    problem: '',
    honeypot: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!form.lastName.trim()) {
      toast.error('Укажите фамилию');
      return;
    }
    if (!form.firstName.trim()) {
      toast.error('Укажите имя');
      return;
    }
    if (!form.patronymic.trim()) {
      toast.error('Укажите отчество');
      return;
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Укажите корректный номер телефона');
      return;
    }
    if (!form.problem.trim()) {
      toast.error('Опишите вашу проблему');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/applications', form);
      toast.success('Заявка успешно отправлена! Мы свяжемся с вами.');
      setForm({
        lastName: '',
        firstName: '',
        patronymic: '',
        phone: '',
        age: '',
        city: '',
        problem: '',
        honeypot: ''
      });
    } catch (err) {
      if (err.response?.status === 429) {
        toast.error('Слишком много запросов. Попробуйте позже.');
      } else if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error('Ошибка. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="application-form-wrapper">
      {title && <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-1 text-center">{title}</h2>}
      {subtitle && <p className="text-white/50 text-center mb-5 font-body text-sm">{subtitle}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-3" data-testid="application-form">
        {/* Honeypot - скрытое поле от спама */}
        <div className="absolute opacity-0 pointer-events-none" aria-hidden="true" tabIndex={-1}>
          <Input
            name="honeypot"
            value={form.honeypot}
            onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Фамилия, Имя */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Фамилия <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-lastName"
              placeholder="Иванов"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Имя <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-firstName"
              placeholder="Иван"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
              required
            />
          </div>
        </div>

        {/* Отчество, Телефон */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Отчество <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-patronymic"
              placeholder="Иванович"
              value={form.patronymic}
              onChange={(e) => setForm({ ...form, patronymic: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Телефон <span className="text-red-400">*</span></Label>
            <Input
              data-testid="form-phone"
              type="tel"
              placeholder="+7 (999) 999-99-99"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
              required
            />
          </div>
        </div>

        {/* Возраст, Город */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Возраст</Label>
            <Input
              data-testid="form-age"
              placeholder="Ваш возраст"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-white/60 text-xs font-body">Город</Label>
            <Input
              data-testid="form-city"
              placeholder="Ваш город"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 h-10 text-sm"
            />
          </div>
        </div>

        {/* Описание проблемы */}
        <div className="space-y-1">
          <Label className="text-white/60 text-xs font-body">Опишите вашу проблему <span className="text-red-400">*</span></Label>
          <Textarea
            data-testid="form-problem"
            placeholder="Кратко опишите ситуацию, с которой вам нужна помощь..."
            value={form.problem}
            onChange={(e) => setForm({ ...form, problem: e.target.value })}
            className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 min-h-[100px] resize-none text-sm"
            required
          />
        </div>

        <p className="text-xs text-white/25 font-body text-center">Данные не будут передаваться третьим лицам</p>

        <button
          type="submit"
          data-testid="form-submit-btn"
          disabled={loading}
          className="btn-gold w-full py-3 text-sm font-body uppercase tracking-wide"
        >
          {loading ? 'Отправка...' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
