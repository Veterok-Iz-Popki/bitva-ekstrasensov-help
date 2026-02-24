import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function SettingsAdmin() {
  const [form, setForm] = useState({ email: '', phone: '', address: '', notification_email: '', working_hours: '', copyright_text: '' });
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
      });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      toast.success('Настройки сохранены');
    } catch { toast.error('Ошибка'); }
    finally { setSaving(false); }
  };

  return (
    <div data-testid="admin-settings">
      <h1 className="font-heading text-3xl font-bold text-white mb-6">Настройки сайта</h1>

      <div className="space-y-5 p-6 border border-white/5 bg-[#0a0a0a] max-w-2xl">
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Email (отображается на сайте)</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" data-testid="settings-email" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Телефон</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Адрес</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Email для уведомлений о заявках</Label>
          <Input value={form.notification_email} onChange={(e) => setForm({ ...form, notification_email: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" data-testid="settings-notification-email" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Часы работы</Label>
          <Input value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70 font-body text-sm">Текст копирайта</Label>
          <Input value={form.copyright_text} onChange={(e) => setForm({ ...form, copyright_text: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="save-settings-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
