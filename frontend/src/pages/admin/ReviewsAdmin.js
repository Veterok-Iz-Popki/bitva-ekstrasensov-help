import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Star, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { author_name: '', author_city: '', text: '', rating: 5, is_published: true };

export default function ReviewsAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = () => { api.get('/admin/reviews').then((res) => setItems(res.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ author_name: item.author_name, author_city: item.author_city || '', text: item.text, rating: item.rating || 5, is_published: item.is_published !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) { await api.put(`/admin/reviews/${editId}`, form); toast.success('Отзыв обновлён'); }
      else { await api.post('/admin/reviews', form); toast.success('Отзыв добавлен'); }
      setDialogOpen(false); load();
    } catch { toast.error('Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try { await api.delete(`/admin/reviews/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  return (
    <div data-testid="admin-reviews">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Отзывы</h1>
        <Button onClick={openCreate} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="add-review-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="border border-white/5 bg-teal-dark/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-white/40 font-body">Автор</TableHead>
              <TableHead className="text-white/40 font-body">Город</TableHead>
              <TableHead className="text-white/40 font-body">Рейтинг</TableHead>
              <TableHead className="text-white/40 font-body">Статус</TableHead>
              <TableHead className="text-white/40 font-body text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell className="font-body text-white">{item.author_name}</TableCell>
                <TableCell className="font-body text-white/70">{item.author_city || '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-0.5">
                    {Array.from({ length: item.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-gold fill-gold" />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.is_published ? 'default' : 'secondary'} className="font-body text-xs">
                    {item.is_published ? 'Опубликован' : 'Скрыт'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4 text-white/40 hover:text-gold" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark/70 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} отзыв</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Имя автора</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Город</Label>
                <Input value={form.author_city} onChange={(e) => setForm({ ...form, author_city: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Текст отзыва</Label>
              <Textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="bg-black/50 border-white/10 text-white min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Рейтинг (1-5)</Label>
                <Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} className="bg-black/50 border-white/10 text-white h-10" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_published} onCheckedChange={(val) => setForm({ ...form, is_published: val })} />
                <Label className="text-white/70 font-body text-sm">Опубликован</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">Отмена</Button>
            <Button onClick={handleSave} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="save-review-btn">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
