import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/#ekstrasensy', label: 'Экстрасенсы' },
  { path: '/#uslugi', label: 'Услуги' },
  { path: '/otzyvy', label: 'Отзывы' },
  { path: '/foto-galereya', label: 'Фотогалерея' },
  { path: '/video', label: 'Видео' },
  { path: '/voprosy-i-otvety', label: 'Вопросы-Ответы' },
];

// Дефолтные значения на случай если настройки не загрузились
const DEFAULT_LOGO = {
  url: 'https://customer-assets.emergentagent.com/job_f7eeb759-9e5b-4f73-9fda-0f824d4e9d83/artifacts/usmcyqqy_bitva%20%281%29.png',
  alt: 'Битва Экстрасенсов',
  heightDesktop: 56,
  heightMobile: 48,
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(() => {});
  }, []);

  // Handle hash scroll after navigation
  useEffect(() => {
    if (location.hash) {
      const hash = location.hash.substring(1);
      const tryScroll = (attempts) => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else if (attempts > 0) {
          setTimeout(() => tryScroll(attempts - 1), 200);
        }
      };
      setTimeout(() => tryScroll(5), 300);
    }
  }, [location]);

  const handleNavClick = (e, item) => {
    if (item.path.startsWith('/#')) {
      e.preventDefault();
      const hash = item.path.substring(2);
      if (location.pathname === '/') {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
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
      data-testid="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'teal-glass shadow-lg' : 'md:bg-transparent'
      } max-md:bg-teal-darker/95 max-md:backdrop-blur-md max-md:shadow-lg`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Desktop layout */}
        <div className="hidden md:flex items-center justify-between h-20">
          <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
            <img 
              src={logoUrl} 
              alt={logoAlt} 
              className="w-auto rounded-xl"
              style={{ height: `${logoHeightDesktop}px` }}
              data-testid="header-logo"
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
              <img 
                src={logoUrl} 
                alt={logoAlt} 
                className="w-auto rounded-xl"
                style={{ height: `${logoHeightMobile}px` }}
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
                className="text-[15px] font-body text-white/90 hover:text-gold transition-colors"
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
                className={`text-[13px] font-body transition-colors whitespace-nowrap ${
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
  useEffect(() => { api.get('/settings').then((res) => setSettings(res.data)).catch(() => {}); }, []);

  // Логотип из настроек
  const logoUrl = settings?.logo_url || DEFAULT_LOGO.url;
  const logoAlt = settings?.logo_alt || DEFAULT_LOGO.alt;

  return (
    <footer data-testid="main-footer" className="border-t border-teal-light/20 bg-teal-darker/95 mt-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-3">
              <img 
                src={logoUrl} 
                alt={logoAlt} 
                className="h-12 w-auto rounded-lg"
                data-testid="footer-logo"
              />
            </Link>
            <p className="text-xs text-white/40 leading-relaxed font-body">
              Официальный сайт помощи участников проекта «Битва Экстрасенсов»
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-gold mb-4">Навигация</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-white/50 hover:text-gold transition-colors font-body">Главная</Link>
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

          {/* Contacts */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-gold mb-4">Контакты</h4>
            <div className="flex flex-col gap-2 text-sm text-white/50 font-body">
              {settings.email && <p>{settings.email}</p>}
              {settings.working_hours && <p>{settings.working_hours}</p>}
              <p>Приём по предварительной записи</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-gold mb-4">Информация</h4>
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
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="h-0 max-md:h-[220px]" aria-hidden="true" />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
