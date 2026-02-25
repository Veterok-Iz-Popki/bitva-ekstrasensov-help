import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const PAGE_NAMES = {
  home: 'Главная',
  participants: 'Участники',
  booking: 'Запись на приём',
  reviews: 'Отзывы',
  faq: 'Вопросы (FAQ)',
  contacts: 'Контакты',
  'topic-porcha': 'Порча',
  'topic-proklyatie': 'Проклятие',
  'topic-sglaz': 'Сглаз',
  'topic-venets-bezbrachiya': 'Венец безбрачия',
  'topic-privorot': 'Приворот',
  'topic-zaklyatie': 'Заклятие',
  'service-finansovaya-magiya': 'Финансовая магия',
  'service-lyubovnaya-magiya': 'Любовная магия',
  'service-magiya-zhizni': 'Магия жизни',
  'service-magicheskaya-zashchita': 'Магическая защита',
};

export default function SEOAdmin() {
  const [selectedPage, setSelectedPage] = useState('home');
  const [form, setForm] = useState({ title: '', description: '', keywords: '', h1: '', og_title: '', og_description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/seo/${selectedPage}`).then((res) => {
      const d = res.data || {};
      setForm({
        title: d.title || '',
        description: d.description || '',
        keywords: d.keywords || '',
        h1: d.h1 || '',
        og_title: d.og_title || '',
        og_description: d.og_description || '',
      });
    }).catch(() => {});
  }, [selectedPage]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/seo/${selectedPage}`, form);
      toast.success('SEO сохранено');
    } catch { toast.error('Ошибка'); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="admin-seo">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">SEO настройки</h1>
      </div>

      <div className="mb-6">
        <Select value={selectedPage} onValueChange={setSelectedPage}>
          <SelectTrigger className="w-64 bg-teal-dark/70 border-teal-light/30 text-white h-10" data-testid="seo-page-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-teal-dark border-teal-light/30">
            {Object.entries(PAGE_NAMES).map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-5 p-6 border border-teal-light/20 bg-teal-dark/70">
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Title (заголовок страницы)</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" data-testid="seo-title" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Description (описание)</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[80px]" data-testid="seo-description" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Keywords (ключевые слова)</Label>
          <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" data-testid="seo-keywords" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">H1 (основной заголовок)</Label>
          <Input value={form.h1} onChange={(e) => setForm({ ...form, h1: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">OG Title</Label>
          <Input value={form.og_title} onChange={(e) => setForm({ ...form, og_title: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">OG Description</Label>
          <Textarea value={form.og_description} onChange={(e) => setForm({ ...form, og_description: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[60px]" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-gold text-teal-darker hover:bg-gold text-teal-darker-light text-white font-body" data-testid="save-seo-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
