import { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { slug: '', name: '', title: '', description: '', full_description: '', photo_url: '', specializations: [], is_active: true, order: 0 };
const emptySeo = { title: '', description: '', keywords: '', h1: '', og_title: '', og_description: '' };

const genSeoFromParticipant = (form, specText) => {
  const name = (form.name || '').trim();
  const shortDesc = (form.description || '').trim();
  const specs = (specText || '').split(',').map((s) => s.trim()).filter(Boolean).join(', ');
  return {
    title: name ? `Экстрасенс ${name} — Официальный сайт помощи | Битва Экстрасенсов` : '',
    description: shortDesc,
    keywords: name ? [name, 'экстрасенс', 'консультация', 'битва экстрасенсов', 'помощь', 'приём', specs].filter(Boolean).join(', ') : '',
    h1: name ? `Официальная страница помощи ${name}` : '',
    og_title: name ? `${name} — приём экстрасенса` : '',
    og_description: shortDesc,
  };
};

export default function ParticipantsAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [seo, setSeo] = useState({ ...emptySeo });
  const [specText, setSpecText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    api.get('/admin/participants').then((res) => setItems(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setSeo({ ...emptySeo });
    setSpecText('');
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      slug: item.slug,
      name: item.name,
      title: item.title || '',
      description: item.description || '',
      full_description: item.full_description || '',
      photo_url: item.photo_url || '',
      specializations: item.specializations || [],
      is_active: item.is_active !== false,
      order: item.order || 0
    });
    setSpecText((item.specializations || []).join(', '));
    // Подтянуть существующие SEO поля для этого участника (если сохранены).
    // Если записи в seo_settings ещё нет — оставляем поля пустыми
    // (сайт по-прежнему будет использовать автоматическую генерацию).
    setSeo({ ...emptySeo });
    api.get(`/seo/participant-${item.slug}`).then((res) => {
      const d = res.data || {};
      setSeo({
        title: d.title || '',
        description: d.description || '',
        keywords: d.keywords || '',
        h1: d.h1 || '',
        og_title: d.og_title || '',
        og_description: d.og_description || '',
      });
    }).catch(() => {});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, specializations: specText.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      let savedSlug = form.slug;
      if (editId) {
        await api.put(`/admin/participants/${editId}`, data);
      } else {
        const created = await api.post('/admin/participants', data);
        savedSlug = created.data?.slug || form.slug;
      }
      // Сохранение SEO — только если хоть одно поле непустое.
      // Полностью пустой блок оставляем БЕЗ записи в seo_settings, тогда
      // сайт продолжает использовать fallback-автогенерацию.
      const hasAnySeo = Object.values(seo).some((v) => (v || '').trim() !== '');
      if (hasAnySeo && savedSlug) {
        await api.put(`/admin/seo/participant-${savedSlug}`, seo).catch((e) => {
          console.error('SEO save failed:', e);
          toast.error('Участник сохранён, но SEO не сохранилось');
        });
      }
      toast.success(editId ? 'Участник обновлён' : 'Участник добавлен');
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка');
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить участника?')) return;
    try { await api.delete(`/admin/participants/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Максимальный размер файла: 5MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Сохраняем ОТНОСИТЕЛЬНЫЙ путь (/api/uploads/...), а не URL с baseUrl
      // текущего backend-домена (preview). Иначе при загрузке через preview
      // в БД попадает абсолютный preview URL → попадает в Person JSON-LD
      // (image) и og:image на production-домене, ломая SEO-консистентность.
      // Браузер сам резолвит относительный путь к текущему origin.
      setForm({ ...form, photo_url: res.data.url });
      toast.success('Фото загружено');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div data-testid="admin-participants">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Участники</h1>
        <Button onClick={openCreate} className="bg-gold hover:bg-gold-light text-teal-darker font-body font-semibold" data-testid="add-participant-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="border border-teal-light/20 bg-teal-dark/70 overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-teal-light/20 hover:bg-transparent">
              <TableHead className="text-white/40 font-body">Фото</TableHead>
              <TableHead className="text-white/40 font-body">Имя</TableHead>
              <TableHead className="text-white/40 font-body">Звание</TableHead>
              <TableHead className="text-white/40 font-body">Порядок</TableHead>
              <TableHead className="text-white/40 font-body">Статус</TableHead>
              <TableHead className="text-white/40 font-body text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-teal-light/20 hover:bg-teal/30">
                <TableCell>
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-12 h-12 object-cover rounded-full border border-gold/30" />
                  ) : (
                    <div className="w-12 h-12 bg-teal-light/10 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white/30" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-body text-white font-medium">{item.name}</TableCell>
                <TableCell className="font-body text-white/70 text-sm">{item.title}</TableCell>
                <TableCell className="font-body text-white/50">{item.order}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'default' : 'secondary'} className={`font-body text-xs ${item.is_active ? 'bg-green-500/20 text-green-400' : ''}`}>
                    {item.is_active ? 'Активен' : 'Скрыт'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} data-testid={`edit-participant-${item.id}`}>
                      <Pencil className="w-4 h-4 text-white/50 hover:text-gold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} data-testid={`delete-participant-${item.id}`}>
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark border-teal-light/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Slug (URL)</Label>
                <Input
                  data-testid="participant-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                  placeholder="ivan-ivanov"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Имя</Label>
                <Input
                  data-testid="participant-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                  placeholder="Иван Иванов"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Звание / Титул</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="Финалист 20 сезона"
              />
            </div>

            {/* Photo upload section */}
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Фото участника</Label>
              <div className="flex gap-4 items-start">
                {/* Preview */}
                <div className="w-24 h-24 rounded-lg border border-teal-light/30 overflow-hidden flex-shrink-0 bg-teal-darker/50">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/20" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {/* Upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="border-gold/50 text-gold hover:bg-gold/10 font-body w-full"
                    data-testid="upload-photo-btn"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Загрузка...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Загрузить фото</>
                    )}
                  </Button>

                  {/* Or URL input */}
                  <Input
                    value={form.photo_url}
                    onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                    className="bg-teal-dark/80 border-teal-light/30 text-white h-10 text-sm"
                    placeholder="или введите URL изображения"
                  />
                  <p className="text-white/40 text-xs font-body">
                    Рекомендуемый размер: 400×400px. Макс. 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Краткое описание</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[80px]"
                placeholder="Краткое описание для карточки"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Полное описание</Label>
              <Textarea
                value={form.full_description}
                onChange={(e) => setForm({ ...form, full_description: e.target.value })}
                className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[120px]"
                placeholder="Полная биография для детальной страницы"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Специализации (через запятую)</Label>
              <Input
                value={specText}
                onChange={(e) => setSpecText(e.target.value)}
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                placeholder="Ясновидящая, Экстрасенс, Маг"
              />
            </div>

            {/* ==== SEO блок ==== */}
            <div className="space-y-3 border border-teal-light/20 rounded-lg p-4 bg-teal-dark/30" data-testid="participant-seo-block">
              <div className="flex items-center justify-between">
                <Label className="text-gold font-body text-sm font-semibold">SEO для страницы участника</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSeo(genSeoFromParticipant(form, specText))}
                  className="border-gold/50 text-gold hover:bg-gold/10 font-body text-xs h-8"
                  data-testid="seo-autofill-btn"
                >
                  Заполнить автоматически
                </Button>
              </div>
              <p className="text-white/40 text-xs font-body">
                Если поля пустые, сайт использует автогенерацию из имени и описания участника.
              </p>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">SEO Title</Label>
                <Input
                  value={seo.title}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                  placeholder="Экстрасенс {Имя} — Официальный сайт помощи | Битва Экстрасенсов"
                  data-testid="seo-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">Meta Description</Label>
                <Textarea
                  value={seo.description}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[60px] text-sm"
                  placeholder="Короткое описание для поисковой выдачи (150-160 символов)"
                  data-testid="seo-description-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">Meta Keywords</Label>
                <Input
                  value={seo.keywords}
                  onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                  placeholder="имя, экстрасенс, консультация, битва экстрасенсов"
                  data-testid="seo-keywords-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">H1</Label>
                <Input
                  value={seo.h1}
                  onChange={(e) => setSeo({ ...seo, h1: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                  placeholder="Основной заголовок H1 страницы"
                  data-testid="seo-h1-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">OG Title</Label>
                <Input
                  value={seo.og_title}
                  onChange={(e) => setSeo({ ...seo, og_title: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-9 text-sm"
                  placeholder="Заголовок для превью в соцсетях"
                  data-testid="seo-og-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/60 font-body text-xs">OG Description</Label>
                <Textarea
                  value={seo.og_description}
                  onChange={(e) => setSeo({ ...seo, og_description: e.target.value })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[60px] text-sm"
                  placeholder="Описание для превью в соцсетях"
                  data-testid="seo-og-description-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Порядок сортировки</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm({ ...form, is_active: val })}
                  data-testid="participant-active-switch"
                />
                <Label className="text-white/70 font-body text-sm">Показывать на сайте</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">
              Отмена
            </Button>
            <Button onClick={handleSave} className="bg-gold hover:bg-gold-light text-teal-darker font-body font-semibold" data-testid="save-participant-btn">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
