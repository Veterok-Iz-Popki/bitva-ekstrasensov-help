import { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Play, Upload, Film, Image } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const emptyForm = { video_url: '', title: '', description: '', thumbnail_url: '', order: 0, is_published: true };

export default function VideoAdmin() {
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState(null); // { name, size, type }
  const [selectedPoster, setSelectedPoster] = useState(null); // { name, size, type, previewUrl }
  const videoInputRef = useRef(null);
  const posterInputRef = useRef(null);

  const load = () => { api.get('/admin/gallery/videos').then(r => setItems(r.data || [])).catch(() => {}); };
  useEffect(() => { load(); }, []);

  // Polling статуса оптимизации — если есть видео в обработке, обновляемся каждые 3с
  useEffect(() => {
    const hasProcessing = items.some(i => i.processing_status === 'processing');
    if (!hasProcessing) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [items]);

  // Cleanup blob URLs при размонтировании / смене обложки
  useEffect(() => {
    return () => {
      if (selectedPoster?.previewUrl) URL.revokeObjectURL(selectedPoster.previewUrl);
    };
  }, [selectedPoster?.previewUrl]);

  const resetSelections = () => {
    if (selectedPoster?.previewUrl) URL.revokeObjectURL(selectedPoster.previewUrl);
    setSelectedVideo(null);
    setSelectedPoster(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
    if (posterInputRef.current) posterInputRef.current.value = '';
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, order: items.length });
    resetSelections();
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
    resetSelections();
    setDialogOpen(true);
  };

  // Forматирование размера: 1234567 -> "1.18 MB"
  const formatBytes = (b) => {
    if (!b && b !== 0) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  // Извлекаем формат из MIME / имени файла
  const formatType = (file) => {
    if (!file) return '';
    const ext = file.name?.split('.').pop()?.toUpperCase();
    if (ext) return ext;
    const m = file.type?.split('/')[1]?.toUpperCase();
    return m || '';
  };

  const onVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedVideo({ name: file.name, size: file.size, type: file.type });
  };

  const onPosterChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (selectedPoster?.previewUrl) URL.revokeObjectURL(selectedPoster.previewUrl);
    setSelectedPoster({
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl: URL.createObjectURL(file),
    });
  };

  const uploadFiles = async (videoFile, posterFile) => {
    if (!videoFile && !posterFile) return {};
    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    if (videoFile) fd.append('video', videoFile);
    if (posterFile) fd.append('poster', posterFile);
    try {
      const token = localStorage.getItem('admin_token');
      const xhr = new XMLHttpRequest();
      const result = await new Promise((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', `${API_URL}/api/admin/upload-video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(fd);
      });
      return result;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!form.video_url && !videoInputRef.current?.files?.[0]) {
      toast.error('Загрузите видеофайл');
      return;
    }
    try {
      const videoFile = videoInputRef.current?.files?.[0];
      const posterFile = posterInputRef.current?.files?.[0];
      let videoUrl = form.video_url;
      let posterUrl = form.thumbnail_url;

      if (videoFile || posterFile) {
        const uploaded = await uploadFiles(videoFile, posterFile);
        if (uploaded.video_url) videoUrl = uploaded.video_url;
        if (uploaded.poster_url) posterUrl = uploaded.poster_url;
      }

      const payload = { ...form, video_url: videoUrl, thumbnail_url: posterUrl };
      if (editId) {
        await api.put(`/admin/gallery/videos/${editId}`, payload);
        toast.success('Видео обновлено');
      } else {
        await api.post('/admin/gallery/videos', payload);
        toast.success('Видео добавлено');
      }
      setDialogOpen(false);
      resetSelections();
      load();
    } catch {
      toast.error('Ошибка загрузки');
    }
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

  const fullUrl = (u) => u && u.startsWith('/') ? API_URL + u : u;

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
              <TableHead className="text-white/40 font-body w-32">Обработка</TableHead>
              <TableHead className="text-white/40 font-body w-20">Порядок</TableHead>
              <TableHead className="text-white/40 font-body w-24">Статус</TableHead>
              <TableHead className="text-white/40 font-body text-right w-32">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-teal-light/20 hover:bg-teal/30">
                <TableCell>
                  {item.thumbnail_url ? (
                    <img src={fullUrl(item.thumbnail_url)} alt="" className="w-16 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-10 bg-teal-dark/80 rounded flex items-center justify-center">
                      <Film className="w-4 h-4 text-white/20" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-body text-white text-sm">{item.title || '—'}</TableCell>
                <TableCell>
                  {item.processing_status === 'processing' && (
                    <span className="inline-flex items-center gap-1 text-xs font-body text-gold/90" data-testid={`video-status-${item.id}`}>
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse" /> Обрабатывается
                    </span>
                  )}
                  {item.processing_status === 'done' && (
                    <span className="inline-flex items-center gap-1 text-xs font-body text-green-400/80" data-testid={`video-status-${item.id}`}>
                      <span className="w-2 h-2 rounded-full bg-green-400" /> Оптимизировано
                    </span>
                  )}
                  {item.processing_status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-xs font-body text-red-400/80" data-testid={`video-status-${item.id}`}>
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Ошибка обработки
                    </span>
                  )}
                  {(!item.processing_status || item.processing_status === 'idle') && (
                    <span className="text-xs font-body text-white/30" data-testid={`video-status-${item.id}`}>—</span>
                  )}
                </TableCell>
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
        {items.length === 0 && <p className="text-white/30 font-body text-center py-8">Нет видео</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-teal-dark/70 border-teal-light/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white text-xl">{editId ? 'Редактировать' : 'Добавить'} видео</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Video file upload */}
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Видеофайл (MP4, WebM)</Label>

              {/* Существующий загруженный файл (edit mode) */}
              {form.video_url && !selectedVideo && (
                <div className="flex items-center gap-2 p-2 rounded bg-teal-dark/60 border border-teal-light/20" data-testid="video-existing">
                  <Film className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="text-xs font-body min-w-0 flex-1">
                    <p className="text-green-400/80">Файл уже загружен</p>
                    <p className="text-white/40 truncate">{form.video_url.split('/').pop()}</p>
                  </div>
                </div>
              )}

              {/* Новый выбранный файл */}
              {selectedVideo && (
                <div className="flex items-start gap-2 p-2 rounded bg-teal-dark/60 border border-gold/40" data-testid="video-selected">
                  <Film className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  <div className="text-xs font-body min-w-0 flex-1">
                    <p className="text-gold">Видео выбрано</p>
                    <p className="text-white truncate" title={selectedVideo.name}>{selectedVideo.name}</p>
                    <p className="text-white/40">Размер: {formatBytes(selectedVideo.size)} · Формат: {formatType(selectedVideo)}</p>
                  </div>
                </div>
              )}

              <div
                className="border-2 border-dashed border-teal-light/30 rounded-lg p-4 text-center cursor-pointer hover:border-gold/50 transition-colors"
                onClick={() => videoInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-white/30 mx-auto mb-2" />
                <p className="text-white/50 text-xs font-body">
                  {selectedVideo
                    ? 'Выбрать другое видео'
                    : (form.video_url ? 'Заменить видео' : 'Нажмите для загрузки видео')}
                </p>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={onVideoChange}
                  data-testid="video-file-input"
                />
              </div>
            </div>

            {/* Poster upload */}
            <div className="space-y-2">
              <Label className="text-white/70 font-body text-sm">Обложка / превью (JPG, PNG)</Label>

              {/* Существующая обложка (edit mode, новая не выбрана) */}
              {form.thumbnail_url && !selectedPoster && (
                <div className="flex items-center gap-2 p-2 rounded bg-teal-dark/60 border border-teal-light/20" data-testid="poster-existing">
                  <img src={fullUrl(form.thumbnail_url)} alt="preview" className="w-20 h-12 object-cover rounded shrink-0" />
                  <div className="text-xs font-body min-w-0 flex-1">
                    <p className="text-green-400/80">Обложка уже загружена</p>
                    <p className="text-white/40 truncate">{form.thumbnail_url.split('/').pop()}</p>
                  </div>
                </div>
              )}

              {/* Новая выбранная обложка */}
              {selectedPoster && (
                <div className="flex items-start gap-2 p-2 rounded bg-teal-dark/60 border border-gold/40" data-testid="poster-selected">
                  <img src={selectedPoster.previewUrl} alt="preview" className="w-20 h-12 object-cover rounded shrink-0" />
                  <div className="text-xs font-body min-w-0 flex-1">
                    <p className="text-gold">Обложка выбрана</p>
                    <p className="text-white truncate" title={selectedPoster.name}>{selectedPoster.name}</p>
                    <p className="text-white/40">Размер: {formatBytes(selectedPoster.size)} · Формат: {formatType(selectedPoster)}</p>
                  </div>
                </div>
              )}

              <div
                className="border-2 border-dashed border-teal-light/30 rounded-lg p-3 text-center cursor-pointer hover:border-gold/50 transition-colors"
                onClick={() => posterInputRef.current?.click()}
              >
                <Image className="w-5 h-5 text-white/30 mx-auto mb-1" />
                <p className="text-white/50 text-xs font-body">
                  {selectedPoster
                    ? 'Выбрать другую обложку'
                    : (form.thumbnail_url ? 'Заменить обложку' : 'Загрузить обложку')}
                </p>
                <input
                  ref={posterInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPosterChange}
                  data-testid="poster-file-input"
                />
              </div>
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
                <Label className="text-white/70 font-body text-sm">Порядок</Label>
                <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="bg-teal-dark/80 border-teal-light/30 text-white h-10" />
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_published} onCheckedChange={(val) => setForm({ ...form, is_published: val })} />
                  <Label className="text-white/70 font-body text-sm">Опубликовано</Label>
                </div>
              </div>
            </div>

            {uploading && (
              <div className="space-y-1">
                <div className="h-2 bg-teal-dark/80 rounded-full overflow-hidden">
                  <div className="h-full bg-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-white/50 text-xs font-body text-center">Загрузка: {uploadProgress}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 font-body">Отмена</Button>
            <Button onClick={handleSave} disabled={uploading} className="bg-gold text-teal-darker hover:bg-gold/90 font-body" data-testid="save-video-btn">
              {uploading ? 'Загрузка...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
