import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { Eye, Lock } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/login', form);
      localStorage.setItem('admin_token', res.data.token);
      toast.success('Вход выполнен');
      navigate('/admin');
    } catch {
      toast.error('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{background: 'linear-gradient(180deg, #0b2a38 0%, #0d3040 100%)'}} data-testid="admin-login-page">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 benefit-icon-circle mb-4">
            <Eye className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">Вход в CMS</h1>
          <p className="text-sm text-white/40 font-body">Панель управления сайтом</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8 teal-card" data-testid="admin-login-form">
          <div className="space-y-2">
            <Label className="text-white/70 text-sm uppercase tracking-wider font-body">Логин</Label>
            <Input
              data-testid="admin-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white h-12"
              placeholder="admin"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70 text-sm uppercase tracking-wider font-body">Пароль</Label>
            <Input
              data-testid="admin-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="bg-teal-dark/80 border-teal-light/30 focus:border-gold text-white h-12"
              placeholder="********"
              required
            />
          </div>
          <Button
            type="submit"
            data-testid="admin-login-btn"
            disabled={loading}
            className="w-full bg-gold text-teal-darker hover:bg-gold text-teal-darker-light text-white h-12 uppercase tracking-widest font-body"
          >
            <Lock className="w-4 h-4 mr-2" />
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  );
}
