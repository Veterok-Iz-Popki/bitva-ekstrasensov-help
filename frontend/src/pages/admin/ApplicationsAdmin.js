import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Trash2, Eye, Download, Filter } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_MAP = {
  new: { label: 'Новая', color: 'text-red-400' },
  in_progress: { label: 'В работе', color: 'text-yellow-400' },
  completed: { label: 'Завершена', color: 'text-green-400' },
};

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ApplicationsAdmin() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = () => {
    api.get('/admin/applications').then((res) => {
      const data = res.data || [];
      setItems(data);
      applyFilter(data, statusFilter);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const applyFilter = (data, filter) => {
    if (filter === 'all') {
      setFiltered(data);
    } else {
      setFiltered(data.filter(item => item.status === filter));
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyFilter(items, statusFilter);
  }, [statusFilter, items]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const exportCSV = () => {
    const token = localStorage.getItem('admin_token');
    const url = `${API_URL}/api/admin/applications/export/csv`;
    
    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.blob())
    .then(blob => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Экспорт завершён');
    })
    .catch(() => toast.error('Ошибка экспорта'));
  };

  const newCount = items.filter(i => i.status === 'new').length;

  return (
    <div data-testid="admin-applications">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Заявки</h1>
          <p className="text-white/50 font-body text-sm mt-1">
            Всего: {items.length} | Новых: <span className="text-red-400">{newCount}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 bg-teal-dark/80 border-teal-light/30 text-sm" data-testid="status-filter">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent className="bg-teal-dark border-teal-light/30">
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершённые</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Export button */}
          <Button
            onClick={exportCSV}
            variant="outline"
            className="border-gold/50 text-gold hover:bg-gold/10 font-body"
            data-testid="export-csv-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      <div className="border border-teal-light/20 bg-teal-dark/70 overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-teal-light/20 hover:bg-transparent">
              <TableHead className="text-white/40 font-body">ФИО</TableHead>
              <TableHead className="text-white/40 font-body">Телефон</TableHead>
              <TableHead className="text-white/40 font-body hidden md:table-cell">Экстрасенс</TableHead>
              <TableHead className="text-white/40 font-body hidden md:table-cell">Город</TableHead>
              <TableHead className="text-white/40 font-body hidden lg:table-cell">Возраст</TableHead>
              <TableHead className="text-white/40 font-body">Статус</TableHead>
              <TableHead className="text-white/40 font-body">Дата</TableHead>
              <TableHead className="text-white/40 font-body text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              // Собираем ФИО из новых полей или используем старое поле name
              const fullName = item.lastName 
                ? `${item.lastName} ${item.firstName || ''} ${item.patronymic || ''}`.trim()
                : item.name;
              return (
              <TableRow key={item.id} className="border-teal-light/20 hover:bg-teal/30">
                <TableCell className="font-body text-white font-medium">{fullName}</TableCell>
                <TableCell className="font-body text-white/70">{item.phone}</TableCell>
                <TableCell className="font-body text-gold/70 hidden md:table-cell">{item.psychic_name || '—'}</TableCell>
                <TableCell className="font-body text-white/50 hidden md:table-cell">{item.city || '—'}</TableCell>
                <TableCell className="font-body text-white/50 hidden lg:table-cell">{item.age || '—'}</TableCell>
                <TableCell>
                  <Select value={item.status} onValueChange={(val) => updateStatus(item.id, val)}>
                    <SelectTrigger className="w-32 h-8 bg-transparent border-teal-light/30 text-xs" data-testid={`status-select-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-teal-dark border-teal-light/30">
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
                      <Eye className="w-4 h-4 text-white/50 hover:text-gold" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)} data-testid={`delete-app-${item.id}`}>
                      <Trash2 className="w-4 h-4 text-white/50 hover:text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-white/30 font-body py-8">
                  {statusFilter === 'all' ? 'Нет заявок' : 'Нет заявок с выбранным статусом'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-teal-dark border-teal-light/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">
              Заявка: {selected?.lastName ? `${selected.lastName} ${selected.firstName}` : selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-body">
                <div>
                  <span className="text-white/40">Фамилия:</span>
                  <p className="text-white">{selected.lastName || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40">Имя:</span>
                  <p className="text-white">{selected.firstName || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40">Отчество:</span>
                  <p className="text-white">{selected.patronymic || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40">Телефон:</span>
                  <p className="text-white">{selected.phone}</p>
                </div>
                <div>
                  <span className="text-white/40">Город:</span>
                  <p className="text-white">{selected.city || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40">Возраст:</span>
                  <p className="text-white">{selected.age || '—'}</p>
                </div>
                <div>
                  <span className="text-white/40">Статус:</span>
                  <p className={STATUS_MAP[selected.status]?.color || 'text-white'}>
                    {STATUS_MAP[selected.status]?.label || selected.status}
                  </p>
                </div>
                <div>
                  <span className="text-white/40">Дата:</span>
                  <p className="text-white">{new Date(selected.created_at).toLocaleString('ru-RU')}</p>
                </div>
                {selected.psychic_name && (
                  <div className="col-span-2">
                    <span className="text-white/40">Экстрасенс:</span>
                    <p className="text-gold font-semibold">{selected.psychic_name}</p>
                  </div>
                )}
              </div>
              {(selected.problem || selected.description) && (
                <div>
                  <p className="text-sm text-white/40 font-body mb-1">Описание проблемы:</p>
                  <p className="text-white/70 font-body text-sm border border-teal-light/20 p-3 rounded bg-teal-darker/50">
                    {selected.problem || selected.description}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-white/40 font-body mb-1">Заметки администратора:</p>
                <Textarea
                  data-testid="app-notes-textarea"
                  defaultValue={selected.notes || ''}
                  onBlur={(e) => updateNotes(selected.id, e.target.value)}
                  className="bg-teal-dark/80 border-teal-light/30 text-white placeholder:text-white/30 min-h-[80px]"
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
