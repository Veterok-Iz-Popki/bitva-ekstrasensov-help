import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Save, Mail } from 'lucide-react';
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
    email_notifications_enabled: true
  });
  const [saving, setSaving] = useState(false);

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

  return (
    <div data-testid="admin-settings">
      <h1 className="font-heading text-3xl font-bold text-white mb-6">Настройки сайта</h1>

      <div className="space-y-6 p-6 border border-teal-light/20 bg-teal-dark/70 max-w-2xl rounded-lg">
        {/* Contact info section */}
        <div>
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
        <div className="border-t border-teal-light/20 pt-6">
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
              <p className="text-white/40 font-body text-xs">
                На этот адрес будут приходить уведомления о новых заявках
              </p>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="border-t border-teal-light/20 pt-6">
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

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gold hover:bg-gold-light text-teal-darker font-body font-semibold"
          data-testid="save-settings-btn"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}
