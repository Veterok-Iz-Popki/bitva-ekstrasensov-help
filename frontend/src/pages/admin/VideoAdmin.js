import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Play } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { video_url: '', title: '', description: '', thumbnail_url: '', order: 0, is_published: true };

function getYtThumb(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : null;
}

export default function VideoAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = () => { api.get('/admin/gallery/videos').then(r => setItems(r.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, order: items.length });
    setDialogOpen(true);
  };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      video_url: item.video_url || '',
      title: item.title || '',
      description: item.description || '',
      thumbnail_url: item.thumbnail_url || '',
      order: item.order ?? 0,
      is_published: item.is_published !== false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.video_url) { toast.error('Укажите ссылку на видео'); return; }
    try {
      if (editId) { await api.put(`/admin/gallery/videos/${editId}`, form); toast.success('Видео обновлено'); }
      else { await api.post('/admin/gallery/videos', form); toast.success('Видео добавлено'); }
      setDialogOpen(false); load();
    } catch { toast.error('Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить видео?')) return;
    try { await api.delete(`/admin/gallery/videos/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  const moveItem = async (item, dir) => {
    const newOrder = item.order + dir;
    await api.put(`/admin/gallery/videos/${item.id}`, { ...item, order: newOrder });
    load();
  };

  return (
    <div data-testid="admin-video">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Видео</h1>
        <Button onClick={openCreate} className="bg-gold text-teal-darker hover:bg-gold/90 font-body" data-testid="add-video-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить видео
        </Button>
      </div>

      <div className="border border-teal-light/20 bg-teal-dark/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-teal-light/20 hover:bg-transparent">
              <TableHead className="text-white/40 font-body w-20">Превью</TableHead>
              <TableHead className="text-white/40 font-body">Название</TableHead>
              <TableHead className="text-white/40 font-body">URL</TableHead>
              <TableHead className="text-white/40 font-body w-20">Порядок</TableHead>
              <TableHead className="text-white/40 font-body w-24">Статус</TableHead>
              <TableHead className="text-white/40 font-body text-right w-32">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const thumb = item.thumbnail_url || getYtThumb(item.video_url);
              return (
                <TableRow key={item.id} className="border-teal-light/20 hover:bg-teal/30">
                  <TableCell>
                    {thumb ? (
                      <img src={thumb} alt="" className="w-16 h-10 object-cover rounded" />
                    ) : <div className="w-16 h-10 bg-teal-dark/80 rounded flex items-center justify-center"><Play className="w-4 h-4 text-white/20" /></div>}
                  </TableCell>
                  <TableCell className="font-body text-white text-sm">{item.title || '—'}</TableCell>
                  <TableCell className="font-body text-white/50 text-xs max-w-[200px] truncate">{item.video_url}</TableCell>
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
              );
            })}
          </TableBody>
        </Table>
        {items.length === 0 && <p className="text-white/30 font-body text-center py-8">Нет видео</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark/70 border-teal-light/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} видео</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Ссылка на видео (YouTube / Vimeo / Rutube)</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                className="bg-teal-dark/80 border-teal-light/30 text-white h-10"
                data-testid="video-url-input"
              />
              <p className="text-white/30 text-xs font-body">Поддерживаются: YouTube, Vimeo, Rutube</p>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Название</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Превью URL (необязательно)</Label>
                <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="Авто для YouTube" className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
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
            <Button onClick={handleSave} className="bg-gold text-teal-darker hover:bg-gold/90 font-body" data-testid="save-video-btn">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
