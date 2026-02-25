import { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Save, Upload, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const PAGE_SCHEMAS = {
  home: [
    { key: 'hero_h1', label: 'Главный заголовок (H1)', type: 'text' },
    { key: 'hero_subtitle', label: 'Подзаголовок (Hero)', type: 'text' },
    // Изображения логотипов
    { key: 'hero_logo_bitva_url', label: 'Логотип «Битва экстрасенсов» — URL', type: 'image' },
    { key: 'hero_logo_bitva_alt', label: 'Логотип «Битва» — ALT-текст', type: 'text' },
    { key: 'hero_logo_bitva_height_desktop', label: 'Логотип «Битва» — Высота Desktop (px)', type: 'number' },
    { key: 'hero_logo_bitva_height_mobile', label: 'Логотип «Битва» — Высота Mobile (px)', type: 'number' },
    { key: 'hero_logo_tnt_url', label: 'Логотип «ТНТ» — URL', type: 'image' },
    { key: 'hero_logo_tnt_alt', label: 'Логотип «ТНТ» — ALT-текст', type: 'text' },
    { key: 'hero_logo_tnt_height_desktop', label: 'Логотип «ТНТ» — Высота Desktop (px)', type: 'number' },
    { key: 'hero_logo_tnt_height_mobile', label: 'Логотип «ТНТ» — Высота Mobile (px)', type: 'number' },
    { key: 'hero_unique', label: 'Текст «Уникальная возможность»', type: 'text' },
    { key: 'hero_text1', label: 'Hero текст 1', type: 'textarea' },
    { key: 'hero_text2', label: 'Hero текст 2', type: 'textarea' },
    { key: 'hero_subheading', label: 'Подзаголовок Hero', type: 'text' },
    { key: 'about_text', label: 'Текст «О проекте»', type: 'textarea' },
    { key: 'cta_text', label: 'CTA текст', type: 'text' },
    { key: 'cta_button', label: 'Текст кнопки CTA', type: 'text' },
    { key: 'cta_subtext', label: 'CTA подтекст', type: 'text' },
    { key: 'participants_title', label: 'Заголовок «Участники»', type: 'text' },
    { key: 'services_title', label: 'Заголовок «Услуги»', type: 'text' },
    { key: 'service_cat_1', label: 'Услуги — категория 1', type: 'textarea' },
    { key: 'service_cat_2', label: 'Услуги — категория 2', type: 'textarea' },
    { key: 'service_cat_3', label: 'Услуги — категория 3', type: 'textarea' },
    { key: 'service_cat_4', label: 'Услуги — категория 4', type: 'textarea' },
    { key: 'reviews_title', label: 'Заголовок «Отзывы»', type: 'text' },
    { key: 'form_title', label: 'Заголовок формы', type: 'text' },
    { key: 'form_subtitle', label: 'Подзаголовок формы', type: 'text' },
    { key: 'seo_text_title', label: 'Заголовок SEO-текста', type: 'text' },
    { key: 'seo_text', label: 'SEO-текст', type: 'textarea' },
  ],
  participants: [
    { key: 'page_title', label: 'Заголовок страницы', type: 'text' },
    { key: 'page_subtitle', label: 'Подзаголовок', type: 'text' },
  ],
  booking: [
    { key: 'page_title', label: 'Заголовок страницы', type: 'text' },
    { key: 'page_subtitle', label: 'Подзаголовок', type: 'text' },
    { key: 'process_title', label: 'Заголовок «Процесс»', type: 'text' },
    { key: 'process_steps', label: 'Шаги процесса (каждый с новой строки)', type: 'textarea' },
    { key: 'confidentiality_title', label: 'Заголовок «Конфиденциальность»', type: 'text' },
    { key: 'confidentiality_text', label: 'Текст конфиденциальности', type: 'textarea' },
  ],
  reviews: [
    { key: 'page_title', label: 'Заголовок страницы', type: 'text' },
    { key: 'page_subtitle', label: 'Подзаголовок', type: 'text' },
    { key: 'trust_title', label: 'Заголовок блока доверия', type: 'text' },
    { key: 'trust_text', label: 'Текст блока доверия', type: 'textarea' },
  ],
  faq: [
    { key: 'page_title', label: 'Заголовок страницы', type: 'text' },
    { key: 'page_subtitle', label: 'Подзаголовок', type: 'text' },
  ],
  contacts: [
    { key: 'page_title', label: 'Заголовок страницы', type: 'text' },
    { key: 'page_subtitle', label: 'Подзаголовок', type: 'text' },
    { key: 'appointment_text', label: 'Текст о записи', type: 'textarea' },
  ],
};

// Общая схема для страниц тем
const TOPIC_SCHEMA = [
  { key: 'title', label: 'Заголовок (H1)', type: 'text' },
  { key: 'description', label: 'Описание проблемы', type: 'textarea' },
  { key: 'symptoms_title', label: 'Заголовок блока «Признаки»', type: 'text' },
  { key: 'symptoms', label: 'Признаки (каждый с новой строки)', type: 'textarea' },
  { key: 'when_title', label: 'Заголовок «Когда обращаться»', type: 'text' },
  { key: 'when_to_contact', label: 'Когда обращаться (каждый с новой строки)', type: 'textarea' },
  { key: 'consultation_title', label: 'Заголовок «Процесс»', type: 'text' },
  { key: 'consultation_process', label: 'Процесс консультации (каждый с новой строки)', type: 'textarea' },
  { key: 'additional_title', label: 'Доп. заголовок (необязательно)', type: 'text' },
  { key: 'additional_text', label: 'Доп. текст (необязательно)', type: 'textarea' },
  { key: 'cta_title', label: 'Заголовок CTA', type: 'text' },
  { key: 'cta_text', label: 'Текст CTA', type: 'textarea' },
  { key: 'cta_button', label: 'Текст кнопки CTA', type: 'text' },
];

// Добавляем схемы для каждой страницы темы
const TOPIC_SLUGS = {
  'topic-porcha': 'Порча',
  'topic-proklyatie': 'Проклятие',
  'topic-sglaz': 'Сглаз',
  'topic-venets-bezbrachiya': 'Венец безбрачия',
  'topic-privorot': 'Приворот',
  'topic-zaklyatie': 'Заклятие',
};

Object.keys(TOPIC_SLUGS).forEach(slug => {
  PAGE_SCHEMAS[slug] = TOPIC_SCHEMA;
});

// Общая схема для страниц услуг
const SERVICE_SCHEMA = [
  { key: 'title', label: 'Заголовок (H1)', type: 'text' },
  { key: 'description', label: 'Описание услуги', type: 'textarea' },
  { key: 'directions_title', label: 'Заголовок «Направления»', type: 'text' },
  { key: 'directions', label: 'Направления (каждое с новой строки)', type: 'textarea' },
  { key: 'situations_title', label: 'Заголовок «Когда обращаются»', type: 'text' },
  { key: 'situations', label: 'Ситуации (каждая с новой строки)', type: 'textarea' },
  { key: 'how_it_works_title', label: 'Заголовок «Как проходит»', type: 'text' },
  { key: 'how_it_works', label: 'Шаги консультации (каждый с новой строки)', type: 'textarea' },
  { key: 'results_title', label: 'Заголовок «Результаты»', type: 'text' },
  { key: 'results', label: 'Результаты (каждый с новой строки)', type: 'textarea' },
  { key: 'additional_title', label: 'Доп. заголовок (необязательно)', type: 'text' },
  { key: 'additional_text', label: 'Доп. текст (необязательно)', type: 'textarea' },
  { key: 'cta_title', label: 'Заголовок CTA', type: 'text' },
  { key: 'cta_text', label: 'Текст CTA', type: 'textarea' },
  { key: 'cta_button', label: 'Текст кнопки CTA', type: 'text' },
];

const SERVICE_SLUGS = {
  'service-finansovaya-magiya': 'Финансовая магия',
  'service-lyubovnaya-magiya': 'Любовная магия',
  'service-magiya-zhizni': 'Магия жизни',
  'service-magicheskaya-zashchita': 'Магическая защита',
};

Object.keys(SERVICE_SLUGS).forEach(slug => {
  PAGE_SCHEMAS[slug] = SERVICE_SCHEMA;
});

const PAGE_NAMES = {
  home: 'Главная',
  participants: 'Участники',
  booking: 'Запись на приём',
  reviews: 'Отзывы',
  faq: 'Вопросы (FAQ)',
  contacts: 'Контакты',
  ...TOPIC_SLUGS,
  ...SERVICE_SLUGS,
};

// Компонент для загрузки изображения
function ImageField({ fieldKey, value, onChange, label }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const baseUrl = process.env.REACT_APP_BACKEND_URL;
      onChange(`${baseUrl}${res.data.url}`);
      toast.success('Изображение загружено');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 p-3 bg-teal-darker/30 rounded-lg border border-teal-light/10">
      <Label className="text-white/70 font-body text-sm flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-gold/60" />
        {label}
      </Label>
      
      <div className="flex gap-3 items-start">
        {/* Preview */}
        <div className="w-20 h-14 rounded border border-teal-light/20 overflow-hidden flex-shrink-0 bg-teal-darker/50 flex items-center justify-center">
          {value ? (
            <img src={value} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <ImageIcon className="w-5 h-5 text-white/20" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border-gold/50 text-gold hover:bg-gold/10 font-body h-8 text-xs"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
              {uploading ? '' : 'Загрузить'}
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange('')}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="bg-teal-dark/80 border-teal-light/30 text-white h-8 text-xs"
            placeholder="или URL изображения"
          />
        </div>
      </div>
    </div>
  );
}

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

  const renderField = (field) => {
    const value = blocks[field.key] || '';
    const onChange = (val) => setBlocks({ ...blocks, [field.key]: val });

    switch (field.type) {
      case 'image':
        return (
          <ImageField
            key={field.key}
            fieldKey={field.key}
            value={value}
            onChange={onChange}
            label={field.label}
          />
        );
      case 'number':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-white/70 font-body text-sm">{field.label}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value) || 0)}
              className="bg-teal-dark/80 border-teal-light/30 text-white h-9 w-32"
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-white/70 font-body text-sm">{field.label}</Label>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[80px] font-body text-sm"
            />
          </div>
        );
      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label className="text-white/70 font-body text-sm">{field.label}</Label>
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="bg-teal-dark/80 border-teal-light/30 text-white h-9"
            />
          </div>
        );
    }
  };

  return (
    <div data-testid="admin-pages">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Страницы</h1>
      </div>

      <div className="mb-6">
        <Select value={selectedPage} onValueChange={setSelectedPage}>
          <SelectTrigger className="w-64 bg-teal-dark/70 border-teal-light/30 text-white h-10" data-testid="page-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-teal-dark border-teal-light/30">
            {Object.entries(PAGE_NAMES).map(([slug, name]) => (
              <SelectItem key={slug} value={slug}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg max-w-3xl">
        {schema.map(renderField)}

        <Button onClick={handleSave} disabled={saving} className="bg-gold hover:bg-gold-light text-teal-darker font-body font-semibold mt-4" data-testid="save-page-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить страницу'}
        </Button>
      </div>
    </div>
  );
}
