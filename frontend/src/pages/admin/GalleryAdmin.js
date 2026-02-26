import { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Pencil, Trash2, Upload, ArrowUp, ArrowDown, Image } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { image_url: '', title: '', description: '', alt_text: '', order: 0, is_published: true };

export default function GalleryAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => { api.get('/admin/gallery/photos').then(r => setItems(r.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, order: items.length });
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      image_url: item.image_url || '',
      title: item.title || '',
      description: item.description || '',
      alt_text: item.alt_text || '',
      order: item.order ?? 0,
      is_published: item.is_published !== false,
    });
    setDialogOpen(true);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Максимум 5 МБ'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(prev => ({ ...prev, image_url: res.data.url }));
      toast.success('Фото загружено');
    } catch { toast.error('Ошибка загрузки'); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.image_url) { toast.error('Загрузите фото'); return; }
    try {
      if (editId) { await api.put(`/admin/gallery/photos/${editId}`, form); toast.success('Фото обновлено'); }
      else { await api.post('/admin/gallery/photos', form); toast.success('Фото добавлено'); }
      setDialogOpen(false); load();
    } catch { toast.error('Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить фото?')) return;
    try { await api.delete(`/admin/gallery/photos/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  const moveItem = async (item, dir) => {
    const newOrder = item.order + dir;
    await api.put(`/admin/gallery/photos/${item.id}`, { ...item, order: newOrder });
    load();
  };

  return (
    <div data-testid="admin-gallery">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Фотогалерея</h1>
        <Button onClick={openCreate} className="bg-gold text-teal-darker hover:bg-gold/90 font-body" data-testid="add-photo-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить фото
        </Button>
      </div>

      <div className="border border-teal-light/20 bg-teal-dark/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-teal-light/20 hover:bg-transparent">
              <TableHead className="text-white/40 font-body w-16">Фото</TableHead>
              <TableHead className="text-white/40 font-body">Название</TableHead>
              <TableHead className="text-white/40 font-body">ALT</TableHead>
              <TableHead className="text-white/40 font-body w-20">Порядок</TableHead>
              <TableHead className="text-white/40 font-body w-24">Статус</TableHead>
              <TableHead className="text-white/40 font-body text-right w-32">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-teal-light/20 hover:bg-teal/30">
                <TableCell>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.alt_text || ''} className="w-12 h-12 object-cover rounded" />
                  ) : <div className="w-12 h-12 bg-teal-dark/80 rounded flex items-center justify-center"><Image className="w-5 h-5 text-white/20" /></div>}
                </TableCell>
                <TableCell className="font-body text-white text-sm">{item.title || '—'}</TableCell>
                <TableCell className="font-body text-white/50 text-sm">{item.alt_text || '—'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item, -1)}><ArrowUp className="w-3 h-3 text-white/50" /></Button>
                    <span className="text-white/60 text-xs font-body w-4 text-center">{item.order}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(item, 1)}><ArrowDown className="w-3 h-3 text-white/50" /></Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.is_published ? 'default' : 'secondary'} className="font-body text-xs">
                    {item.is_published ? 'Видно' : 'Скрыто'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4 text-white/50 hover:text-gold" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && <p className="text-white/30 font-body text-center py-8">Нет фотографий</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark/70 border-teal-light/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} фото</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Изображение</Label>
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="w-full h-40 object-cover rounded-lg border border-teal-light/20" />
              )}
              <input type="file" ref={fileRef} accept="image/*" onChange={handleUpload} className="hidden" />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full border-teal-light/30 text-white/70 hover:text-white font-body" data-testid="upload-photo-btn">
                <Upload className="w-4 h-4 mr-2" />{uploading ? 'Загрузка...' : 'Загрузить фото (до 5 МБ)'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Название (подпись)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">ALT-текст (SEO)</Label>
                <Input value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Порядок</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_published} onCheckedChange={(val) => setForm({ ...form, is_published: val })} />
              <Label className="text-white/70 font-body text-sm">Опубликовано</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">Отмена</Button>
            <Button onClick={handleSave} className="bg-gold text-teal-darker hover:bg-gold/90 font-body" data-testid="save-photo-btn">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
