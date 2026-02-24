import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import api from '../lib/api';

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/uchastniki', label: 'Участники' },
  { path: '/zapis-na-priem', label: 'Запись' },
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      data-testid="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#050505]/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <Eye className="w-6 h-6 text-gold" />
            <span className="font-heading text-lg md:text-xl font-semibold text-white tracking-wide">
              Битва экстрасенсов
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                className={`px-4 py-2 text-sm font-body tracking-wide uppercase transition-colors duration-300 ${
                  location.pathname === item.path
                    ? 'text-gold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="w-5 h-5 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#0a0a0a] border-white/5 w-64">
              <nav className="flex flex-col gap-2 mt-8" data-testid="mobile-nav">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`mobile-nav-${item.path.replace('/', '') || 'home'}`}
                    className={`px-4 py-3 text-sm font-body tracking-wide uppercase transition-colors ${
                      location.pathname === item.path
                        ? 'text-gold bg-white/5'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
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

  useEffect(() => {
    api.get('/settings').then((res) => setSettings(res.data)).catch(() => {});
  }, []);

  return (
    <footer data-testid="main-footer" className="border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-gold" />
              <span className="font-heading text-lg font-semibold text-white">
                Битва экстрасенсов
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed font-body">
              Официальный сайт помощи участников проекта «Битва экстрасенсов»
            </p>
          </div>
          <div>
            <h4 className="font-heading text-base font-semibold text-gold mb-4 uppercase tracking-widest">
              Навигация
            </h4>
            <nav className="flex flex-col gap-2">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm text-white/50 hover:text-white transition-colors font-body"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h4 className="font-heading text-base font-semibold text-gold mb-4 uppercase tracking-widest">
              Контакты
            </h4>
            <div className="flex flex-col gap-2 text-sm text-white/50 font-body">
              {settings.email && <p>{settings.email}</p>}
              {settings.working_hours && <p>{settings.working_hours}</p>}
              <p>Приём по предварительной записи</p>
            </div>
          </div>
        </div>
        <div className="section-divider mt-8 mb-6" />
        <p className="text-center text-xs text-white/30 font-body">
          {settings.copyright_text || 'Битва экстрасенсов — официальный сайт помощи'} | {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
