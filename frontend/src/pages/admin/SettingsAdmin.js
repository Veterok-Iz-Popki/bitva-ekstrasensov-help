import { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Save, Mail, Image as ImageIcon, Upload, Loader2, Trash2, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function SettingsAdmin() {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    address: '',
    notification_email: '',
    working_hours: '',
    copyright_text: '',
    email_notifications_enabled: true,
    // Логотип
    logo_url: '',
    logo_alt: 'Битва Экстрасенсов',
    logo_height_desktop: 56,
    logo_height_mobile: 48,
    seo_indexing_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/admin/settings').then((res) => {
      const d = res.data || {};
      setForm({
        email: d.email || '',
        phone: d.phone || '',
        address: d.address || '',
        notification_email: d.notification_email || '',
        working_hours: d.working_hours || '',
        copyright_text: d.copyright_text || '',
        email_notifications_enabled: d.email_notifications_enabled !== false,
        logo_url: d.logo_url || '',
        logo_alt: d.logo_alt || 'Битва Экстрасенсов',
        logo_height_desktop: d.logo_height_desktop || 56,
        logo_height_mobile: d.logo_height_mobile || 48,
        seo_indexing_enabled: d.seo_indexing_enabled === undefined ? true : !!d.seo_indexing_enabled,
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      toast.success('Настройки сохранены');
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимальный размер: 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Сохраняем ОТНОСИТЕЛЬНЫЙ путь (/api/uploads/...), а не абсолютный URL,
      // привязанный к текущему backend-домену. Это критично для SEO:
      // абсолютный URL с preview-домена попал бы в Organization JSON-LD,
      // og:image и <img src="..."> на production, ломая консистентность доменов.
      // Backend `api` инстанс уже добавляет REACT_APP_BACKEND_URL к относительным
      // путям при запросах, а <img src="/api/uploads/..."> на любом домене
      // разрешится в текущий origin → работает и в preview, и в production.
      setForm({ ...form, logo_url: res.data.url });
      toast.success('Логотип загружен');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setForm({ ...form, logo_url: '' });
    toast.info('Логотип удалён. Сохраните настройки.');
  };

  return (
    <div data-testid="admin-settings">
      <h1 className="font-heading text-3xl font-bold text-white mb-6">Настройки сайта</h1>

      <div className="space-y-6 max-w-2xl">
        {/* Логотип сайта */}
        <div className="p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg">
          <h2 className="font-heading text-lg font-semibold text-gold mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Логотип сайта (шапка и подвал)
          </h2>
          
          <div className="flex gap-4 items-start mb-4">
            {/* Preview */}
            <div className="w-32 h-20 rounded-lg border border-teal-light/30 overflow-hidden flex-shrink-0 bg-teal-darker/50 flex items-center justify-center">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Логотип" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-white/20" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="border-gold/50 text-gold hover:bg-gold/10 font-body"
                  data-testid="upload-logo-btn"
                >
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка...</> : <><Upload className="w-4 h-4 mr-2" />Загрузить</>}
                </Button>
                {form.logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeLogo}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-body"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                placeholder="или введите URL изображения"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-white/60 text-xs font-body">ALT-текст</Label>
              <Input
                value={form.logo_alt}
                onChange={(e) => setForm({ ...form, logo_alt: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                placeholder="Битва Экстрасенсов"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/60 text-xs font-body">Высота Desktop (px)</Label>
              <Input
                type="number"
                value={form.logo_height_desktop}
                onChange={(e) => setForm({ ...form, logo_height_desktop: parseInt(e.target.value) || 56 })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-white/60 text-xs font-body">Высота Mobile (px)</Label>
              <Input
                type="number"
                value={form.logo_height_mobile}
                onChange={(e) => setForm({ ...form, logo_height_mobile: parseInt(e.target.value) || 48 })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Contact info section */}
        <div className="p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg">
          <h2 className="font-heading text-lg font-semibold text-gold mb-4">Контактная информация</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Email (отображается на сайте)</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="info@example.com"
                data-testid="settings-email"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Адрес</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="г. Москва, ул. ..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Часы работы</Label>
              <Input
                value={form.working_hours}
                onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="Ежедневно с 10:00 до 20:00"
              />
            </div>
          </div>
        </div>

        {/* Email notifications section */}
        <div className="p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg">
          <h2 className="font-heading text-lg font-semibold text-gold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email-уведомления
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-teal-darker/50 rounded">
              <div>
                <p className="text-white font-body text-sm">Отправлять уведомления о новых заявках</p>
                <p className="text-white/50 font-body text-xs">Письмо будет отправлено на указанный email</p>
              </div>
              <Switch
                checked={form.email_notifications_enabled}
                onCheckedChange={(checked) => setForm({ ...form, email_notifications_enabled: checked })}
                data-testid="email-notifications-toggle"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Email для уведомлений о заявках</Label>
              <Input
                value={form.notification_email}
                onChange={(e) => setForm({ ...form, notification_email: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="admin@example.com"
                data-testid="settings-notification-email"
              />
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg">
          <h2 className="font-heading text-lg font-semibold text-gold mb-4">Подвал сайта</h2>
          <div className="space-y-2">
            <Label className="text-white/70 font-body text-sm">Текст копирайта</Label>
            <Input
              value={form.copyright_text}
              onChange={(e) => setForm({ ...form, copyright_text: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
              placeholder="© 2024 Название сайта"
            />
          </div>
        </div>

        {/* SEO Indexing section */}
        <div className="p-6 border border-teal-light/20 bg-teal-dark/70 rounded-lg" data-testid="seo-indexing-section">
          <h2 className="font-heading text-lg font-semibold text-gold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Индексация поисковыми системами
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-teal-darker/50 rounded">
              <div className="pr-4">
                <p className="text-white font-body text-sm flex items-center gap-2">
                  Индексация сайта{' '}
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-semibold ${form.seo_indexing_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                    data-testid="seo-indexing-status"
                  >
                    {form.seo_indexing_enabled ? '🟢 Включена' : '🔴 Отключена'}
                  </span>
                </p>
                <p className="text-white/50 font-body text-xs mt-1">
                  Управляет: <code className="text-gold/70">robots.txt</code>, <code className="text-gold/70">meta robots</code>, HTTP header <code className="text-gold/70">X-Robots-Tag</code>.
                </p>
              </div>
              <Switch
                checked={form.seo_indexing_enabled}
                onCheckedChange={(checked) => setForm({ ...form, seo_indexing_enabled: checked })}
                data-testid="seo-indexing-toggle"
              />
            </div>
            {!form.seo_indexing_enabled && (
              <div
                className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded"
                data-testid="seo-indexing-warning"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-body text-sm font-semibold">Поисковые системы перестанут индексировать сайт</p>
                  <p className="text-red-300/70 font-body text-xs mt-1">
                    Google, Яндекс и Bing увидят <code>noindex, nofollow</code> и в течение нескольких дней удалят страницы из выдачи. Не забудьте включить обратно после работ.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold hover:bg-gold-light text-teal-darker font-body font-semibold"
          data-testid="save-settings-btn"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить все настройки'}
        </Button>
      </div>
    </div>
  );
}
