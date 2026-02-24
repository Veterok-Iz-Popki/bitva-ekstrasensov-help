import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { slug: '', name: '', title: '', description: '', full_description: '', photo_url: '', specializations: [], is_active: true, order: 0 };

export default function ParticipantsAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [specText, setSpecText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/admin/participants').then((res) => setItems(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setSpecText(''); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ slug: item.slug, name: item.name, title: item.title || '', description: item.description || '', full_description: item.full_description || '', photo_url: item.photo_url || '', specializations: item.specializations || [], is_active: item.is_active !== false, order: item.order || 0 });
    setSpecText((item.specializations || []).join(', '));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, specializations: specText.split(',').map((s) => s.trim()).filter(Boolean) };
    try {
      if (editId) {
        await api.put(`/admin/participants/${editId}`, data);
        toast.success('Участник обновлён');
      } else {
        await api.post('/admin/participants', data);
        toast.success('Участник добавлен');
      }
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

  return (
    <div data-testid="admin-participants">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Участники</h1>
        <Button onClick={openCreate} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="add-participant-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="border border-white/5 bg-[#0a0a0a] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
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
              <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  {item.photo_url ? (
                    <img src={item.photo_url} alt={item.name} className="w-10 h-10 object-cover" />
                  ) : <div className="w-10 h-10 bg-white/5" />}
                </TableCell>
                <TableCell className="font-body text-white">{item.name}</TableCell>
                <TableCell className="font-body text-white/70 text-sm">{item.title}</TableCell>
                <TableCell className="font-body text-white/50">{item.order}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? 'default' : 'secondary'} className="font-body text-xs">
                    {item.is_active ? 'Активен' : 'Скрыт'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} data-testid={`edit-participant-${item.id}`}>
                      <Pencil className="w-4 h-4 text-white/40 hover:text-gold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} data-testid={`delete-participant-${item.id}`}>
                      <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Slug (URL)</Label>
                <Input data-testid="participant-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" placeholder="ivan-ivanov" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Имя</Label>
                <Input data-testid="participant-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" placeholder="Иван Иванов" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Звание / Титул</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" placeholder="Ясновидящая, участник 20 сезона" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">URL фото</Label>
              <Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className="bg-black/50 border-white/10 text-white h-10" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Краткое описание</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-black/50 border-white/10 text-white min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Полное описание</Label>
              <Textarea value={form.full_description} onChange={(e) => setForm({ ...form, full_description: e.target.value })} className="bg-black/50 border-white/10 text-white min-h-[120px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Специализации (через запятую)</Label>
              <Input value={specText} onChange={(e) => setSpecText(e.target.value)} className="bg-black/50 border-white/10 text-white h-10" placeholder="Ясновидение, Таро, Целительство" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Порядок</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="bg-black/50 border-white/10 text-white h-10" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(val) => setForm({ ...form, is_active: val })} data-testid="participant-active-switch" />
                <Label className="text-white/70 font-body text-sm">Активен</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">Отмена</Button>
            <Button onClick={handleSave} className="bg-burgundy hover:bg-burgundy-light text-white font-body" data-testid="save-participant-btn">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
