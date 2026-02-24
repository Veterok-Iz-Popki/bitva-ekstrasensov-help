import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function ContactsAdmin() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = () => { api.get('/admin/contacts').then((res) => setItems(res.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  const deleteItem = async (id) => {
    if (!window.confirm('Удалить сообщение?')) return;
    try { await api.delete(`/admin/contacts/${id}`); toast.success('Удалено'); load(); } catch { toast.error('Ошибка'); }
  };

  return (
    <div data-testid="admin-contacts">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-3xl font-bold text-white">Сообщения</h1>
        <Badge variant="outline" className="border-gold/30 text-gold font-body">{items.length} шт.</Badge>
      </div>

      <div className="border border-white/5 bg-teal-dark/70 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-white/40 font-body">Имя</TableHead>
              <TableHead className="text-white/40 font-body">Email</TableHead>
              <TableHead className="text-white/40 font-body">Дата</TableHead>
              <TableHead className="text-white/40 font-body text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell className="font-body text-white">{item.name}</TableCell>
                <TableCell className="font-body text-white/70">{item.email}</TableCell>
                <TableCell className="font-body text-white/50 text-sm">{new Date(item.created_at).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(item)}><Eye className="w-4 h-4 text-white/40 hover:text-gold" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4 text-white/40 hover:text-red-400" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-white/30 font-body py-8">Нет сообщений</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-teal-dark/70 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">Сообщение от {selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm font-body">
              <div><span className="text-white/40">Email:</span> <span className="text-white">{selected.email}</span></div>
              <div><span className="text-white/40">Дата:</span> <span className="text-white">{new Date(selected.created_at).toLocaleString('ru-RU')}</span></div>
              <div>
                <p className="text-white/40 mb-1">Сообщение:</p>
                <p className="text-white/70 border border-white/5 p-3">{selected.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
