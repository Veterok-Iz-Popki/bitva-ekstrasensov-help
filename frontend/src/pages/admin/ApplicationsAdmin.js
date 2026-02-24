import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Trash2, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_MAP = {
  new: { label: 'Новая', variant: 'destructive' },
  in_progress: { label: 'В работе', variant: 'default' },
  completed: { label: 'Завершена', variant: 'secondary' },
};

export default function ApplicationsAdmin() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/admin/applications').then((res) => setItems(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/admin/applications/${id}`, { status });
      toast.success('Статус обновлён');
      load();
    } catch { toast.error('Ошибка'); }
  };

  const updateNotes = async (id, notes) => {
    try {
      await api.put(`/admin/applications/${id}`, { notes });
      toast.success('Заметки сохранены');
      load();
    } catch { toast.error('Ошибка'); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить заявку?')) return;
    try {
      await api.delete(`/admin/applications/${id}`);
      toast.success('Заявка удалена');
      load();
    } catch { toast.error('Ошибка'); }
  };

  return (
    <div data-testid="admin-applications">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Заявки</h1>
        <Badge variant="outline" className="border-gold/30 text-gold font-body">
          {items.length} шт.
        </Badge>
      </div>

      <div className="border border-white/5 bg-teal-dark/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-white/40 font-body">Имя</TableHead>
              <TableHead className="text-white/40 font-body">Телефон</TableHead>
              <TableHead className="text-white/40 font-body">Мессенджер</TableHead>
              <TableHead className="text-white/40 font-body">Статус</TableHead>
              <TableHead className="text-white/40 font-body">Дата</TableHead>
              <TableHead className="text-white/40 font-body text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell className="font-body text-white">{item.name}</TableCell>
                <TableCell className="font-body text-white/70">{item.phone}</TableCell>
                <TableCell className="font-body text-white/70">{item.messenger || '—'}</TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(val) => updateStatus(item.id, val)}>
                    <SelectTrigger className="w-32 h-8 bg-transparent border-white/10 text-xs" data-testid={`status-select-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f0f0f] border-white/10">
                      <SelectItem value="new">Новая</SelectItem>
                      <SelectItem value="in_progress">В работе</SelectItem>
                      <SelectItem value="completed">Завершена</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="font-body text-white/50 text-sm">
                  {new Date(item.created_at).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(item)} data-testid={`view-app-${item.id}`}>
                      <Eye className="w-4 h-4 text-white/40 hover:text-gold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} data-testid={`delete-app-${item.id}`}>
                      <Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-white/30 font-body py-8">Нет заявок</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-teal-dark/70 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">Заявка: {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-body">
                <div><span className="text-white/40">Телефон:</span><p className="text-white">{selected.phone}</p></div>
                <div><span className="text-white/40">Мессенджер:</span><p className="text-white">{selected.messenger || '—'}</p></div>
                <div><span className="text-white/40">Статус:</span><p className="text-white">{STATUS_MAP[selected.status]?.label || selected.status}</p></div>
                <div><span className="text-white/40">Дата:</span><p className="text-white">{new Date(selected.created_at).toLocaleString('ru-RU')}</p></div>
              </div>
              {selected.description && (
                <div>
                  <p className="text-sm text-white/40 font-body mb-1">Описание ситуации:</p>
                  <p className="text-white/70 font-body text-sm border border-white/5 p-3">{selected.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-white/40 font-body mb-1">Заметки администратора:</p>
                <Textarea
                  data-testid="app-notes-textarea"
                  defaultValue={selected.notes || ''}
                  onBlur={(e) => updateNotes(selected.id, e.target.value)}
                  className="bg-black/50 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                  placeholder="Добавить заметку..."
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
