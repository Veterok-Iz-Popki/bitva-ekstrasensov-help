import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import api from '../lib/api';

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/uchastniki', label: 'Экстрасенсы' },
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
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  
  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(() => {});
  }, []);

  // Получаем данные логотипа из настроек или используем дефолт
  const logoUrl = settings?.logo_url || DEFAULT_LOGO.url;
  const logoAlt = settings?.logo_alt || DEFAULT_LOGO.alt;
  const logoHeightDesktop = settings?.logo_height_desktop || DEFAULT_LOGO.heightDesktop;
  const logoHeightMobile = settings?.logo_height_mobile || DEFAULT_LOGO.heightMobile;

  return (
    <header
      data-testid="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'teal-glass shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Логотип слева - из CMS */}
          <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
            <img 
              src={logoUrl} 
              alt={logoAlt} 
              className="w-auto rounded-xl"
              style={{ height: `${logoHeightMobile}px` }}
              data-testid="header-logo"
            />
            <style>{`@media (min-width: 768px) { [data-testid="header-logo"] { height: ${logoHeightDesktop}px !important; } }`}</style>
          </Link>

          {/* Навигация по центру - desktop */}
          <nav className="hidden md:flex items-center justify-center flex-1 mx-4" data-testid="desktop-nav">
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                  className={`px-5 py-2 text-base font-body transition-colors duration-300 ${
                    location.pathname === item.path ? 'text-gold' : 'text-white/80 hover:text-gold'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Кнопка справа - desktop */}
          <div className="hidden md:block shrink-0">
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-5 py-2 text-sm font-body" data-testid="header-cta">
                Заказать звонок
              </button>
            </Link>
          </div>

          {/* Мобильное меню */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="w-5 h-5 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-teal-dark border-teal-light/20 w-64">
              <nav className="flex flex-col gap-1 mt-8" data-testid="mobile-nav">
                <Link to="/" className="px-4 py-3 text-sm font-body text-white/70 hover:text-gold hover:bg-teal/30 transition-colors">Главная</Link>
                {NAV_ITEMS.map((item) => (
                  <Link key={item.path} to={item.path} className={`px-4 py-3 text-sm font-body transition-colors ${
                    location.pathname === item.path ? 'text-gold bg-teal/50' : 'text-white/70 hover:text-gold hover:bg-teal/30'
                  }`}>{item.label}</Link>
                ))}
                <Link to="/zapis-na-priem" className="px-4 py-3 text-sm font-body text-gold">Записаться</Link>
              </nav>
            </SheetContent>
          </Sheet>
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
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
