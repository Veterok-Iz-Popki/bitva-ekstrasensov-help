import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const emptyForm = { question: '', answer: '', order: 0, is_active: true };

export default function FAQAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = () => { api.get('/admin/faq').then((res) => setItems(res.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm, order: items.length + 1 }); setDialogOpen(true); };
  const openEdit = (item) => {
    setEditId(item.id);
    setForm({ question: item.question, answer: item.answer, order: item.order || 0, is_active: item.is_active !== false });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) { await api.put(`/admin/faq/${editId}`, form); toast.success('Вопрос обновлён'); }
      else { await api.post('/admin/faq', form); toast.success('Вопрос добавлен'); }
      setDialogOpen(false); load();
    } catch { toast.error('Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить вопрос?')) return;
    try { await api.delete(`/admin/faq/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  return (
    <div data-testid="admin-faq">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Вопросы (FAQ)</h1>
        <Button onClick={openCreate} className="bg-gold text-teal-darker hover:bg-gold text-teal-darker-light text-white font-body" data-testid="add-faq-btn">
          <Plus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-4 p-4 border border-teal-light/20 bg-teal-dark/70 hover:border-gold/20 transition-colors" data-testid={`faq-admin-item-${item.id}`}>
            <div className="text-white/20 pt-1"><GripVertical className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gold/60 font-body">#{item.order}</span>
                {!item.is_active && <span className="text-xs text-red-400 font-body">(скрыт)</span>}
              </div>
              <h3 className="font-body text-white font-medium text-sm">{item.question}</h3>
              <p className="text-xs text-white/40 font-body mt-1 line-clamp-2">{item.answer}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="w-4 h-4 text-white/50 hover:text-gold" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" /></Button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-white/30 font-body text-center py-8">Нет вопросов</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark/70 border-teal-light/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} вопрос</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Вопрос</Label>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Ответ</Label>
              <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="bg-teal-dark/80 border-teal-light/30 text-white min-h-[120px]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70 font-body text-sm">Порядок</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(val) => setForm({ ...form, is_active: val })} />
                <Label className="text-white/70 font-body text-sm">Активен</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">Отмена</Button>
            <Button onClick={handleSave} className="bg-gold text-teal-darker hover:bg-gold text-teal-darker-light text-white font-body" data-testid="save-faq-btn">Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
