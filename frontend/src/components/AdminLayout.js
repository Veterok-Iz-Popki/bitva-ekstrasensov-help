import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, MessageSquare, HelpCircle, Settings, Search, LogOut, Menu, ClipboardList, Globe, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import api from '../lib/api';

const ADMIN_NAV = [
  { path: '/admin', label: 'Панель управления', icon: LayoutDashboard, exact: true },
  { path: '/admin/applications', label: 'Заявки', icon: ClipboardList },
  { path: '/admin/participants', label: 'Участники', icon: Users },
  { path: '/admin/reviews', label: 'Отзывы', icon: MessageSquare },
  { path: '/admin/faq', label: 'Вопросы (FAQ)', icon: HelpCircle },
  { path: '/admin/pages', label: 'Страницы', icon: FileText },
  { path: '/admin/seo', label: 'SEO', icon: Search },
  { path: '/admin/contacts', label: 'Сообщения', icon: Mail },
  { path: '/admin/settings', label: 'Настройки', icon: Settings },
];

function Sidebar({ className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className={`flex flex-col h-full bg-[#0a0a0a] border-r border-white/5 ${className}`}>
      <div className="p-4 border-b border-white/5">
        <Link to="/" className="text-gold font-heading text-lg font-semibold" data-testid="admin-logo">
          CMS Панель
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto" data-testid="admin-sidebar-nav">
        {ADMIN_NAV.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`admin-nav-${item.path.split('/').pop()}`}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-body transition-colors rounded-sm ${
                isActive
                  ? 'admin-nav-active text-gold'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-white/5">
        <button
          onClick={handleLogout}
          data-testid="admin-logout-btn"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-body text-white/60 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    api.get('/admin/me')
      .then((res) => { setAdmin(res.data); setLoading(false); })
      .catch(() => {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      });
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white/50 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-60 shrink-0">
        <div className="fixed w-60 h-screen">
          <Sidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a]">
          <span className="text-gold font-heading font-semibold">CMS</span>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="admin-mobile-menu">
                <Menu className="w-5 h-5 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60 bg-[#0a0a0a] border-white/5">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
