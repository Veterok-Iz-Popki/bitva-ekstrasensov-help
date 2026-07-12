import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { setSiteUrl } from '../lib/api';
import PictureImg from './PictureImg';

// Shared module-level cache для `/settings` — используется Header + Footer одновременно,
// чтобы не делать 2 одинаковых запроса на каждой странице.
let _settingsPromise = null;
function fetchSettings() {
  if (!_settingsPromise) {
    _settingsPromise = api.get('/settings').then(res => {
      // Зафиксировать production site_url для всех setSEO/setJsonLd вызовов
      if (res.data?.site_url) setSiteUrl(res.data.site_url);
      return res.data;
    }).catch(() => ({}));
  }
  return _settingsPromise;
}

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/#ekstrasensy', label: 'Экстрасенсы' },
  { path: '/#uslugi', label: 'Услуги' },
  { path: '/foto-galereya', label: 'Фотогалерея' },
  { path: '/video', label: 'Видео' },
  { path: '/voprosy-i-otvety', label: 'Вопросы-Ответы' },
];

// Дефолтные значения на случай если настройки не загрузились.
// URL — на локальный uploads, чтобы PictureImg мог подтянуть AVIF/WebP варианты.
const DEFAULT_LOGO = {
  url: '/api/uploads/logo-bitva.png',
  alt: 'Битва Экстрасенсов',
  heightDesktop: 56,
  heightMobile: 48,
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState(null);
  const headerRef = useRef(null);

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        rafId = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  // Measure header height for CSS variable spacer (используется в @media max-md spacer)
  // Чтение layout — обёрнуто в requestAnimationFrame для избежания forced reflow на resize.
  useEffect(() => {
    let rafId = 0;
    const measure = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (headerRef.current) {
          const h = headerRef.current.offsetHeight;
          document.documentElement.style.setProperty('--mobile-header-height', `${h}px`);
        }
      });
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', measure);
    };
  }, [settings]);

  // Handle hash scroll after navigation.
  //
  // Проблема: на мобильных устройствах после первого smooth-scroll к якорю
  // часто срабатывает layout-shift (lazy-загрузка изображений в
  // ReviewsCarousel/Suspense, динамическая высота шрифтов, отложенные iframes),
  // и пользователь оказывается выше/ниже целевой секции. CSS
  // `scroll-margin-top` на iOS Safari тоже работает нестабильно.
  //
  // Решение — единая функция scrollToAnchor с MULTI-PASS коррекцией:
  // после первичного smooth-scroll выполняем 4 проверки через 250/500/900/1400ms
  // и корректируем позицию, если секция сдвинулась более чем на 4px.
  // Последняя коррекция — мгновенная (behavior:'auto'), чтобы гарантированно
  // зафиксировать пользователя на нужном якоре.
  const scrollToAnchor = (hash) => {
    const el = document.getElementById(hash);
    if (!el) return false;

    const computeOffset = () => {
      const h = headerRef.current;
      if (!h) return 16;
      const style = window.getComputedStyle(h);
      const isFixed = style.position === 'fixed' || style.position === 'sticky';
      return (isFixed ? h.getBoundingClientRect().height : 0) + 16;
    };

    const computeTargetY = () => {
      const offset = computeOffset();
      return Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    };

    // 1) Первичный smooth scroll
    requestAnimationFrame(() => {
      window.scrollTo({ top: computeTargetY(), behavior: 'smooth' });
    });

    // 2) Multi-pass коррекция — ловим layout-shift от lazy-загрузки
    const delays = [350, 700, 1100, 1600];
    delays.forEach((delay, idx) => {
      setTimeout(() => {
        const stillEl = document.getElementById(hash);
        if (!stillEl) return;
        const targetY = computeTargetY();
        const drift = Math.abs(window.scrollY - targetY);
        if (drift > 4) {
          // Последний проход — мгновенный, без smooth, чтобы юзер точно
          // оказался на якоре, даже если изображения ещё догружаются.
          const behavior = idx === delays.length - 1 ? 'auto' : 'smooth';
          window.scrollTo({ top: targetY, behavior });
        }
      }, delay);
    });
    return true;
  };

  useEffect(() => {
    if (!location.hash) return;
    const hash = location.hash.substring(1);
    // 300ms — даём React'у домонтировать секцию (если переход с другой страницы).
    let attempts = 8;
    const tryScroll = () => {
      if (scrollToAnchor(hash)) return;
      if (attempts-- > 0) setTimeout(tryScroll, 150);
    };
    const t = setTimeout(tryScroll, 300);
    return () => clearTimeout(t);
  }, [location]);

  const handleNavClick = (e, item) => {
    if (item.path.startsWith('/#')) {
      e.preventDefault();
      const hash = item.path.substring(2);
      if (location.pathname === '/') {
        // Тот же URL — useEffect выше не сработает (location не меняется).
        // Запускаем тот же scroll вручную через общую функцию.
        scrollToAnchor(hash);
      } else {
        navigate(`/#${hash}`);
      }
    }
  };

  const isActive = (itemPath) => {
    if (itemPath === '/') return location.pathname === '/' && !location.hash;
    if (itemPath.startsWith('/#')) return false;
    return location.pathname === itemPath;
  };

  // Получаем данные логотипа из настроек или используем дефолт
  const logoUrl = settings?.logo_url || DEFAULT_LOGO.url;
  const logoAlt = settings?.logo_alt || DEFAULT_LOGO.alt;
  const logoHeightDesktop = settings?.logo_height_desktop || DEFAULT_LOGO.heightDesktop;
  const logoHeightMobile = settings?.logo_height_mobile || DEFAULT_LOGO.heightMobile;

  return (
    <header
      ref={headerRef}
      data-testid="main-header"
      className={`w-full transition-all duration-300 md:fixed md:top-0 md:left-0 md:right-0 md:z-[9999] max-md:relative max-md:z-auto ${
        scrolled ? 'teal-glass shadow-lg' : 'md:bg-transparent'
      } max-md:bg-teal-darker/95`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-between h-20">
          <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
            <PictureImg
              src={logoUrl}
              alt={logoAlt}
              className="w-auto rounded-xl"
              style={{ height: `${logoHeightDesktop}px` }}
              data-testid="header-logo"
              loading="eager"
              fetchPriority="high"
            />
          </Link>

          <nav className="flex items-center justify-center flex-1 mx-4" data-testid="desktop-nav">
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  data-testid={`nav-${item.path.replace(/[\/#]/g, '') || 'home'}`}
                  className={`px-5 py-2 text-base font-body transition-colors duration-300 ${
                    isActive(item.path) ? 'text-gold' : 'text-white/80 hover:text-gold'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="shrink-0">
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-5 py-2 text-sm font-body" data-testid="header-cta">
                Заказать звонок
              </button>
            </Link>
          </div>
        </div>

        {/* Mobile layout — no burger, all visible */}
        <div className="md:hidden py-3 space-y-2" data-testid="mobile-header">
          {/* Row 1: Logo centered */}
          <div className="flex items-center justify-center">
            <Link to="/" data-testid="mobile-logo-link">
              <PictureImg
                src={logoUrl}
                alt={logoAlt}
                className="w-auto rounded-xl"
                style={{ height: `${logoHeightMobile}px` }}
                loading="eager"
                fetchPriority="high"
              />
            </Link>
          </div>

          {/* Row 2: Primary nav — Экстрасенсы + Услуги */}
          <div className="flex items-center justify-center gap-8" data-testid="mobile-nav-primary">
            {NAV_ITEMS.filter(i => i.path === '/#ekstrasensy' || i.path === '/#uslugi').map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className="inline-flex items-center min-h-[44px] px-2 text-[15px] font-body text-white/90 hover:text-gold transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Row 3: Secondary nav — wrap into 2 lines if needed */}
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1" data-testid="mobile-nav-secondary">
            {NAV_ITEMS.filter(i => i.path !== '/#ekstrasensy' && i.path !== '/#uslugi').map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={`inline-flex items-center min-h-[40px] px-2 text-[13px] font-body transition-colors whitespace-nowrap ${
                  isActive(item.path) ? 'text-gold' : 'text-white/60 hover:text-gold'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Row 4: CTA */}
          <div className="flex justify-center pt-1">
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-8 py-2 text-[13px] font-body font-semibold" data-testid="mobile-cta">
                Заказать звонок
              </button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const [settings, setSettings] = useState({});
  useEffect(() => { fetchSettings().then(setSettings); }, []);

  // Логотип из настроек
  const logoUrl = settings?.logo_url || DEFAULT_LOGO.url;
  const logoAlt = settings?.logo_alt || DEFAULT_LOGO.alt;

  return (
    <footer data-testid="main-footer" className="border-t border-teal-light/20 bg-teal-darker/95 mt-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-3">
              <PictureImg
                src={logoUrl}
                alt={logoAlt}
                className="h-12 w-auto rounded-lg"
                data-testid="footer-logo"
                loading="lazy"
              />
            </Link>
            <p className="text-xs text-white/40 leading-relaxed font-body">
              Официальный сайт помощи участников проекта «Битва Экстрасенсов»
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold mb-4">Навигация</h3>
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link key={item.path} to={item.path} className="text-sm text-white/50 hover:text-gold transition-colors font-body">
                  {item.label}
                </Link>
              ))}
              <Link to="/zapis-na-priem" className="text-sm text-gold hover:text-gold-light transition-colors font-body">
                Записаться на приём
              </Link>
            </nav>
          </div>

          {/* Disclaimer */}
          <div>
            <h3 className="font-heading text-sm font-semibold text-gold mb-4">Информация</h3>
            <p className="text-xs text-white/35 font-body leading-relaxed">
              Сайт носит информационный характер и не является медицинским учреждением. 
              Результаты могут отличаться в зависимости от индивидуальных особенностей. 
              Данные не передаются третьим лицам.
            </p>
          </div>
        </div>

        <div className="section-divider mt-8 mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30 font-body">
            {settings.copyright_text || 'Битва экстрасенсов — официальный сайт помощи'} © {new Date().getFullYear()}
          </p>
          <p className="text-xs text-white/20 font-body">
            Все права защищены
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) return <>{children}</>;
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
