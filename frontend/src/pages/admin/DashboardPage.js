import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, MessageSquare, HelpCircle, Mail, ArrowRight } from 'lucide-react';
import api from '../../lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const cards = [
    { label: 'Всего заявок', value: stats?.total_applications || 0, icon: ClipboardList, link: '/admin/applications', color: 'text-gold' },
    { label: 'Новых заявок', value: stats?.new_applications || 0, icon: ClipboardList, link: '/admin/applications', color: 'text-red-400' },
    { label: 'Заявок сегодня', value: stats?.today_applications || 0, icon: ClipboardList, link: '/admin/applications', color: 'text-green-400' },
    { label: 'Участников', value: stats?.total_participants || 0, icon: Users, link: '/admin/participants', color: 'text-gold' },
    { label: 'Отзывов', value: stats?.total_reviews || 0, icon: MessageSquare, link: '/admin/reviews', color: 'text-gold' },
    { label: 'Сообщений', value: stats?.total_contacts || 0, icon: Mail, link: '/admin/contacts', color: 'text-gold' },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="font-heading text-3xl font-bold text-white mb-8">Панель управления</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link
              key={i}
              to={card.link}
              className="p-6 border border-white/5 bg-[#0a0a0a] hover:border-gold/20 transition-colors group"
              data-testid={`stat-card-${i}`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-5 h-5 ${card.color}`} />
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-gold transition-colors" />
              </div>
              <p className={`text-3xl font-heading font-bold ${card.color}`}>{card.value}</p>
              <p className="text-sm text-white/40 font-body mt-1">{card.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="p-6 border border-white/5 bg-[#0a0a0a]">
        <h2 className="font-heading text-xl font-semibold text-white mb-4">Быстрые действия</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/admin/applications" className="flex items-center gap-3 p-3 text-sm font-body text-white/60 hover:text-gold hover:bg-white/5 transition-colors" data-testid="quick-action-applications">
            <ClipboardList className="w-4 h-4" />
            Просмотреть заявки
          </Link>
          <Link to="/admin/participants" className="flex items-center gap-3 p-3 text-sm font-body text-white/60 hover:text-gold hover:bg-white/5 transition-colors" data-testid="quick-action-participants">
            <Users className="w-4 h-4" />
            Управление участниками
          </Link>
          <Link to="/admin/pages" className="flex items-center gap-3 p-3 text-sm font-body text-white/60 hover:text-gold hover:bg-white/5 transition-colors" data-testid="quick-action-pages">
            <HelpCircle className="w-4 h-4" />
            Редактировать страницы
          </Link>
          <Link to="/admin/seo" className="flex items-center gap-3 p-3 text-sm font-body text-white/60 hover:text-gold hover:bg-white/5 transition-colors" data-testid="quick-action-seo">
            <MessageSquare className="w-4 h-4" />
            Настройки SEO
          </Link>
        </div>
      </div>
    </div>
  );
}
