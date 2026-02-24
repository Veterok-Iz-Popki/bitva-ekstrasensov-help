import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const PAGE_SCHEMAS = {
  home: [
    { key: 'hero_subtitle', label: 'Подзаголовок (Hero)' },
    { key: 'about_title', label: 'Заголовок «О проекте»' },
    { key: 'about_text', label: 'Текст «О проекте»' },
    { key: 'services_title', label: 'Заголовок «Услуги»' },
    { key: 'services_list', label: 'Список услуг (каждая с новой строки)' },
    { key: 'benefits_title', label: 'Заголовок «Преимущества»' },
    { key: 'benefits_list', label: 'Список преимуществ (каждое с новой строки)' },
    { key: 'form_title', label: 'Заголовок формы' },
    { key: 'form_subtitle', label: 'Подзаголовок формы' },
    { key: 'seo_text_title', label: 'Заголовок SEO-текста' },
    { key: 'seo_text', label: 'SEO-текст' },
  ],
  participants: [
    { key: 'page_title', label: 'Заголовок страницы' },
    { key: 'page_subtitle', label: 'Подзаголовок' },
  ],
  booking: [
    { key: 'page_title', label: 'Заголовок страницы' },
    { key: 'page_subtitle', label: 'Подзаголовок' },
    { key: 'process_title', label: 'Заголовок «Процесс»' },
    { key: 'process_steps', label: 'Шаги процесса (каждый с новой строки)' },
    { key: 'confidentiality_title', label: 'Заголовок «Конфиденциальность»' },
    { key: 'confidentiality_text', label: 'Текст конфиденциальности' },
  ],
  reviews: [
    { key: 'page_title', label: 'Заголовок страницы' },
    { key: 'page_subtitle', label: 'Подзаголовок' },
    { key: 'trust_title', label: 'Заголовок блока доверия' },
    { key: 'trust_text', label: 'Текст блока доверия' },
  ],
  faq: [
    { key: 'page_title', label: 'Заголовок страницы' },
    { key: 'page_subtitle', label: 'Подзаголовок' },
  ],
  contacts: [
    { key: 'page_title', label: 'Заголовок страницы' },
    { key: 'page_subtitle', label: 'Подзаголовок' },
    { key: 'appointment_text', label: 'Текст о записи' },
  ],
};

const PAGE_NAMES = {
  home: 'Главная',
  participants: 'Участники',
  booking: 'Запись на приём',
  reviews: 'Отзывы',
  faq: 'Вопросы (FAQ)',
  contacts: 'Контакты',
};

export default function PagesAdmin() {
  const [selectedPage, setSelectedPage] = useState('home');
  const [blocks, setBlocks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/pages/${selectedPage}`).then((res) => {
      setBlocks(res.data?.blocks || {});
    }).catch(() => setBlocks({}));
  }, [selectedPage]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/pages/${selectedPage}`, { blocks });
      toast.success('Страница сохранена');
    } catch { toast.error('Ошибка'); }
    finally { setSaving(false); }
  };

  const schema = PAGE_SCHEMAS[selectedPage] || [];

  return (
    <div data-testid="admin-pages">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Страницы</h1>
      </div>

      <div className="mb-6">
        <Select value={selectedPage} onValueChange={setSelectedPage}>
          <SelectTrigger className="w-64 bg-teal-dark/70 border-white/10 text-white h-10" data-testid="page-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0f0f0f] border-white/10">
            {Object.entries(PAGE_NAMES).map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-5 p-6 border border-teal-light/20 bg-teal-dark/70">
        {schema.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-white/70 font-body text-sm">{field.label}</Label>
            <Textarea
              value={blocks[field.key] || ''}
              onChange={(e) => setBlocks({ ...blocks, [field.key]: e.target.value })}
              className="bg-black/50 border-white/10 text-white min-h-[80px] font-body text-sm"
              data-testid={`page-block-${field.key}`}
            />
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="save-page-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
