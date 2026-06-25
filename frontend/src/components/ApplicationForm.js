import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { X, Phone } from 'lucide-react';
import api from '../lib/api';

const PREFIX = '+7';
const API_URL = process.env.REACT_APP_BACKEND_URL || '';
// Дефолтный номер для всплывающего окна успеха («Спасибо! Ваша заявка отправлена»).
// Используется, когда в админке поле «Телефон после отправки заявки» пустое.
const DEFAULT_POPUP_PHONE = '+7 928 421-73-58';

// Превращает «+7 928 421-73-58» → «+79284217358» для tel: ссылки.
function phoneToTelLink(phone) {
  if (!phone) return '';
  return phone.replace(/[^+\d]/g, '');
}

function isIPhone() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPod/.test(ua) && !/android/i.test(ua);
}

function isMobilePhone() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android.*Mobile|iPhone|iPod/i.test(ua) && window.innerWidth < 768;
}

function formatDigits(digits) {
  if (!digits) return PREFIX;
  let f = PREFIX + ' (';
  f += digits.slice(0, 3);
  if (digits.length > 3) {
    f += ') ' + digits.slice(3, 6);
  }
  if (digits.length > 6) f += '-' + digits.slice(6, 8);
  if (digits.length > 8) f += '-' + digits.slice(8, 10);
  return f;
}

function extractDigitsAfter7(value) {
  const all = value.replace(/\D/g, '');
  if (all.startsWith('7')) return all.slice(1).slice(0, 10);
  if (all.startsWith('8')) return all.slice(1).slice(0, 10);
  return all.slice(0, 10);
}

export default function ApplicationForm({ title, subtitle, psychicSlug, psychicName }) {
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    patronymic: '',
    phone: PREFIX,
    age: '',
    city: '',
    problem: '',
    honeypot: ''
  });
  const [loading, setLoading] = useState(false);
  const [showCallPopup, setShowCallPopup] = useState(false);
  // popup_phone из site_settings подгружается с /api/settings. Каждый раз когда
  // показывается success-окно — пере-загружаем (mount form), чтобы изменения
  // из админки применялись сразу без перезапуска приложения.
  const [popupPhone, setPopupPhone] = useState(DEFAULT_POPUP_PHONE);
  const phoneRef = useRef(null);
  const prevDigitsRef = useRef('');

  useEffect(() => {
    let alive = true;
    api.get('/settings').then((res) => {
      if (!alive) return;
      const fromBackend = (res.data && typeof res.data.popup_phone === 'string') ? res.data.popup_phone.trim() : '';
      if (fromBackend) setPopupPhone(fromBackend);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const handlePhoneChange = useCallback((e) => {
    const raw = e.target.value;
    let digits = extractDigitsAfter7(raw);
    
    // If the raw value got shorter than prefix, reset
    if (raw.length <= 2) {
      setForm(prev => ({ ...prev, phone: PREFIX }));
      requestAnimationFrame(() => {
        if (phoneRef.current) phoneRef.current.setSelectionRange(2, 2);
      });
      prevDigitsRef.current = '';
      return;
    }
    
    const formatted = formatDigits(digits);
    prevDigitsRef.current = digits;
    setForm(prev => ({ ...prev, phone: formatted }));

    requestAnimationFrame(() => {
      if (phoneRef.current) {
        const len = formatted.length;
        phoneRef.current.setSelectionRange(len, len);
      }
    });
  }, []);

  const handlePhoneKeyDown = useCallback((e) => {
    const input = e.target;
    const { selectionStart, selectionEnd, value } = input;
    
    if (e.key === 'Backspace') {
      // Prevent deleting +7
      if (selectionStart <= 2 && selectionEnd <= 2) {
        e.preventDefault();
        return;
      }
      
      // If there's a selection that includes +7, handle specially
      if (selectionStart < 2) {
        e.preventDefault();
        const digits = extractDigitsAfter7(value.slice(selectionEnd));
        const formatted = formatDigits(digits);
        prevDigitsRef.current = digits;
        setForm(prev => ({ ...prev, phone: formatted || PREFIX }));
        requestAnimationFrame(() => {
          if (phoneRef.current) phoneRef.current.setSelectionRange(2, 2);
        });
        return;
      }

      // If cursor is right after a formatting char, skip over it
      const charBefore = value[selectionStart - 1];
      if (selectionStart === selectionEnd && (charBefore === ' ' || charBefore === '(' || charBefore === ')' || charBefore === '-')) {
        e.preventDefault();
        // Find the nearest digit before cursor and remove it
        const currentDigits = extractDigitsAfter7(value);
        if (currentDigits.length === 0) return;
        const newDigits = currentDigits.slice(0, -1);
        const formatted = formatDigits(newDigits) || PREFIX;
        prevDigitsRef.current = newDigits;
        setForm(prev => ({ ...prev, phone: formatted }));
        requestAnimationFrame(() => {
          if (phoneRef.current) {
            const len = formatted.length;
            phoneRef.current.setSelectionRange(len, len);
          }
        });
        return;
      }
    }
    
    // Ctrl+A → Delete/Backspace: onChange will handle it, but we need to ensure +7 stays
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectionStart === 0 && selectionEnd === value.length) {
      e.preventDefault();
      prevDigitsRef.current = '';
      setForm(prev => ({ ...prev, phone: PREFIX }));
      requestAnimationFrame(() => {
        if (phoneRef.current) phoneRef.current.setSelectionRange(2, 2);
      });
      return;
    }
    
    if (e.key === 'Delete' && selectionStart < 2) {
      e.preventDefault();
    }
  }, []);

  const handlePhoneFocus = useCallback(() => {
    setForm(prev => {
      if (!prev.phone || prev.phone.length < 2) return { ...prev, phone: PREFIX };
      return prev;
    });
  }, []);

  const handlePhoneBlur = useCallback(() => {
    setForm(prev => {
      const digits = extractDigitsAfter7(prev.phone);
      if (!digits) return { ...prev, phone: PREFIX };
      return prev;
    });
  }, []);

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
    if (!form.phone || form.phone.replace(/\D/g, '').length < 11) {
      toast.error('Укажите корректный номер телефона');
      return;
    }
    if (!form.problem.trim()) {
      toast.error('Опишите вашу проблему');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/applications', {
        ...form,
        psychic_slug: psychicSlug || '',
        psychic_name: psychicName || '',
      });
      toast.success('Заявка успешно отправлена! Мы свяжемся с вами.');
      setForm({
        lastName: '',
        firstName: '',
        patronymic: '',
        phone: PREFIX,
        age: '',
        city: '',
        problem: '',
        honeypot: ''
      });
      setShowCallPopup(true);
      // Дополнительно перезапрашиваем popup_phone прямо перед показом окна,
      // чтобы свежие изменения из админки применялись без обновления страницы.
      api.get('/settings').then((res) => {
        const fromBackend = (res.data && typeof res.data.popup_phone === 'string') ? res.data.popup_phone.trim() : '';
        setPopupPhone(fromBackend || DEFAULT_POPUP_PHONE);
      }).catch(() => {});
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
            <input
              ref={phoneRef}
              data-testid="form-phone"
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              onKeyDown={handlePhoneKeyDown}
              onFocus={handlePhoneFocus}
              onBlur={handlePhoneBlur}
              className="flex h-10 w-full rounded-md border px-3 py-2 text-sm bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-gold"
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

      {showCallPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          data-testid="call-popup-overlay"
          onClick={() => setShowCallPopup(false)}
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm teal-card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
            data-testid="call-popup"
          >
            <button
              onClick={() => setShowCallPopup(false)}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
              data-testid="call-popup-close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading text-xl font-bold text-gold mb-2">
              Спасибо! Ваша заявка отправлена
            </h3>

            {isIPhone() ? (
              <>
                <p className="font-body text-white/60 text-sm mb-5">
                  Сохраните наш номер, чтобы не пропустить звонок
                </p>
                <a
                  href={`${API_URL}/api/contact.vcf`}
                  className="btn-gold w-full py-3 text-sm font-body font-semibold uppercase tracking-wide flex items-center justify-center gap-2 no-underline"
                  data-testid="save-contact-btn"
                >
                  Сохранить контакт
                </a>
              </>
            ) : (
              <>
                <p className="font-body text-white/60 text-sm mb-4">
                  Вы можете сразу связаться с нами по телефону
                </p>
                <p className="font-body text-2xl font-bold text-white mb-5" data-testid="call-popup-phone">
                  {popupPhone}
                </p>
                <a
                  href={`tel:${phoneToTelLink(popupPhone)}`}
                  className="btn-gold w-full py-3 text-sm font-body font-semibold uppercase tracking-wide items-center justify-center gap-2 no-underline flex md:hidden"
                  data-testid="call-popup-call-btn"
                >
                  <Phone className="w-4 h-4" />
                  Позвонить
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
