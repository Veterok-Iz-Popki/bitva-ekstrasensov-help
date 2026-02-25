import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import api from '../lib/api';

const NAV_ITEMS = [
  { path: '/uchastniki', label: 'Экстрасенсы' },
  { path: '/otzyvy', label: 'Отзывы' },
  { path: '/voprosy-i-otvety', label: 'FAQ' },
  { path: '/kontakty', label: 'Контакты' },
];

function Header() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <header
      data-testid="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'teal-glass shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center" data-testid="logo-link">
            <img src="https://customer-assets.emergentagent.com/job_ekstrasensov-sajt/artifacts/oj9nxlpi_IMG_6061.JPEG" alt="Битва Экстрасенсов" className="h-12 md:h-14 w-auto rounded-xl" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                className={`px-4 py-2 text-sm font-body transition-colors duration-300 ${
                  location.pathname === item.path ? 'text-gold' : 'text-white/80 hover:text-gold'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-5 py-2 text-sm font-body ml-3" data-testid="header-cta">
                Заказать звонок
              </button>
            </Link>
          </nav>

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

  return (
    <footer data-testid="main-footer" className="border-t border-teal-light/20 bg-teal-darker/90 mt-12">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <span className="font-heading text-base font-bold text-gold">Битва Экстрасенсов</span>
            <p className="text-xs text-white/40 mt-2 leading-relaxed font-body">Официальный сайт помощи участников проекта</p>
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-gold mb-2 uppercase tracking-wider">Навигация</h4>
            <nav className="flex flex-col gap-1">
              <Link to="/" className="text-xs text-white/40 hover:text-gold transition-colors font-body">Главная</Link>
              {NAV_ITEMS.map((item) => (
                <Link key={item.path} to={item.path} className="text-xs text-white/40 hover:text-gold transition-colors font-body">{item.label}</Link>
              ))}
            </nav>
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-gold mb-2 uppercase tracking-wider">Контакты</h4>
            <div className="flex flex-col gap-1 text-xs text-white/40 font-body">
              {settings.email && <p>{settings.email}</p>}
              {settings.working_hours && <p>{settings.working_hours}</p>}
              <p>Приём по предварительной записи</p>
            </div>
          </div>
          <div>
            <h4 className="font-body text-xs font-semibold text-gold mb-2 uppercase tracking-wider">Информация</h4>
            <p className="text-xs text-white/30 font-body leading-relaxed">
              Сайт носит информационный характер и не является медицинским учреждением. Результаты могут отличаться в зависимости от индивидуальных особенностей.
            </p>
          </div>
        </div>
        <div className="section-divider mt-6 mb-4" />
        <p className="text-center text-xs text-white/25 font-body">
          {settings.copyright_text || 'Битва экстрасенсов — официальный сайт помощи'} | {new Date().getFullYear()}
        </p>
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
