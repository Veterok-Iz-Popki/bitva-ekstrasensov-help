const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: __dirname + '/.env' });

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8001;

// Config
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRY = '24h';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

// Uploads dir
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting (in-memory)
const rateLimits = {};
function checkRateLimit(ip, maxReqs = 5, windowSec = 60) {
  const now = Date.now() / 1000;
  if (!rateLimits[ip]) rateLimits[ip] = [];
  rateLimits[ip] = rateLimits[ip].filter(t => now - t < windowSec);
  if (rateLimits[ip].length >= maxReqs) return false;
  rateLimits[ip].push(now);
  return true;
}

// Auth helpers
function createToken(username) {
  return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ detail: 'Требуется авторизация' });
  try {
    const payload = verifyToken(auth.slice(7));
    const [rows] = await db.query('SELECT username FROM admin_users WHERE username = ?', [payload.sub]);
    if (!rows.length) return res.status(401).json({ detail: 'Пользователь не найден' });
    req.admin = rows[0];
    next();
  } catch {
    return res.status(401).json({ detail: 'Недействительный токен' });
  }
}

// Email notification
async function sendNotificationEmail(application) {
  if (!RESEND_API_KEY) return;
  try {
    const { Resend } = require('resend');
    const resend = new Resend(RESEND_API_KEY);
    const [rows] = await db.query("SELECT notification_email, email_notifications_enabled FROM site_settings WHERE id = 'site_settings'");
    const settings = rows[0] || {};
    if (!settings.notification_email || !settings.email_notifications_enabled) return;

    const fullName = application.name || `${application.lastName} ${application.firstName} ${application.patronymic}`.trim();
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d3040; padding: 20px; text-align: center;">
        <h1 style="color: #d4a637; margin: 0;">Новая заявка</h1>
        <p style="color: #ffffff; margin: 5px 0 0 0;">Битва экстрасенсов — сайт помощи</p>
      </div>
      <div style="background: #f5f5f5; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold;width:130px">Фамилия:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.lastName || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Имя:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.firstName || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Отчество:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.patronymic || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Телефон:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.phone || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Возраст:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.age || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Город:</td><td style="padding:10px;border-bottom:1px solid #ddd">${application.city || '-'}</td></tr>
          <tr><td style="padding:10px;font-weight:bold;vertical-align:top">Проблема:</td><td style="padding:10px">${application.problem || '-'}</td></tr>
          ${application.psychic_name ? `<tr><td style="padding:10px;border-top:1px solid #ddd;font-weight:bold;color:#d4a637">Экстрасенс:</td><td style="padding:10px;border-top:1px solid #ddd;font-weight:bold">${application.psychic_name}</td></tr>` : ''}
        </table>
        <p style="color:#666;font-size:12px;margin-top:20px">Дата заявки: ${application.created_at || '-'}</p>
      </div>
    </div>`;

    await resend.emails.send({
      from: SENDER_EMAIL,
      to: [settings.notification_email],
      subject: application.psychic_name
        ? `Новая заявка от ${fullName} к ${application.psychic_name} — Битва экстрасенсов`
        : `Новая заявка от ${fullName} — Битва экстрасенсов`,
      html,
    });
    console.log(`Notification email sent to ${settings.notification_email}`);
  } catch (e) {
    console.error('Failed to send email:', e.message);
  }
}

// Helper: format date for MariaDB
function dbNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// Helper: parse JSON fields from DB rows
function parseRow(row, jsonFields = []) {
  if (!row) return null;
  const r = { ...row };
  for (const f of jsonFields) {
    if (r[f] && typeof r[f] === 'string') {
      try { r[f] = JSON.parse(r[f]); } catch { /* keep as string */ }
    }
  }
  return r;
}

// ===== API ROUTER =====
const api = express.Router();

// ===== PUBLIC ROUTES =====

api.get('/', (req, res) => res.json({ message: 'Битва экстрасенсов API' }));

// vCard contact — inline (iPhone Safari opens "Add Contact")
api.get('/contact.vcf', (req, res) => {
  const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Экстрасенсов;Битва;;;\r\nFN:Битва Экстрасенсов\r\nTEL;TYPE=CELL:+79284217358\r\nEND:VCARD';
  res.set({
    'Content-Type': 'text/vcard; charset=utf-8',
    'Content-Disposition': 'inline; filename="contact.vcf"',
  });
  res.send(vcf);
});

// vCard contact — attachment (Android Chrome downloads then opens via system)
api.get('/contact-download.vcf', (req, res) => {
  const vcf = 'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Экстрасенсов;Битва;;;\r\nFN:Битва Экстрасенсов\r\nTEL;TYPE=CELL:+79284217358\r\nEND:VCARD';
  res.set({
    'Content-Type': 'text/x-vcard',
    'Content-Disposition': 'attachment; filename="contact.vcf"',
  });
  res.send(vcf);
});

api.get('/pages/:slug', async (req, res) => {
  const [rows] = await db.query('SELECT page_slug, blocks, updated_at FROM pages WHERE page_slug = ?', [req.params.slug]);
  if (!rows.length) return res.json({ page_slug: req.params.slug, blocks: {} });
  return res.json(parseRow(rows[0], ['blocks']));
});

api.get('/participants', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM participants WHERE is_active = TRUE ORDER BY `order` ASC LIMIT 100');
  return res.json(rows.map(r => parseRow(r, ['specializations'])));
});

api.get('/participants/:slug', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM participants WHERE slug = ? AND is_active = TRUE', [req.params.slug]);
  if (!rows.length) return res.status(404).json({ detail: 'Участник не найден' });
  return res.json(parseRow(rows[0], ['specializations']));
});

api.get('/reviews', async (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const [rows] = await db.query('SELECT r.*, p.name as participant_name FROM reviews r LEFT JOIN participants p ON r.participant_slug = p.slug WHERE r.is_published = TRUE ORDER BY r.created_at DESC LIMIT ?', [limit]);
  // Shuffle
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return res.json(rows);
});

api.get('/participants/:slug/reviews', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM reviews WHERE participant_slug = ? AND is_published = TRUE ORDER BY created_at DESC LIMIT 100', [req.params.slug]);
  return res.json(rows);
});

api.get('/faq', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM faq WHERE is_active = TRUE ORDER BY `order` ASC LIMIT 100');
  return res.json(rows);
});

api.get('/gallery/photos', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gallery_photos WHERE is_published = TRUE ORDER BY `order` ASC LIMIT 200');
  return res.json(rows);
});

api.get('/gallery/videos', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gallery_videos WHERE is_published = TRUE ORDER BY `order` ASC LIMIT 200');
  return res.json(rows);
});

api.get('/seo/:slug', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM seo_settings WHERE page_slug = ?', [req.params.slug]);
  if (!rows.length) return res.json({ page_slug: req.params.slug, title: '', description: '', keywords: '', h1: '' });
  return res.json(rows[0]);
});

api.get('/settings', async (req, res) => {
  const [rows] = await db.query("SELECT * FROM site_settings WHERE id = 'site_settings'");
  if (!rows.length) return res.json({ email: '', phone: '', working_hours: '', copyright_text: '' });
  return res.json(rows[0]);
});

// ===== PUBLIC FORM SUBMISSIONS =====

api.post('/applications', async (req, res) => {
  const data = req.body;
  if (data.honeypot) return res.json({ status: 'success', message: 'Заявка принята' });

  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(clientIp)) return res.status(429).json({ detail: 'Слишком много запросов. Попробуйте позже.' });

  if (!data.lastName?.trim()) return res.status(400).json({ detail: 'Укажите фамилию' });
  if (!data.firstName?.trim()) return res.status(400).json({ detail: 'Укажите имя' });
  if (!data.patronymic?.trim()) return res.status(400).json({ detail: 'Укажите отчество' });
  if (!data.phone?.trim()) return res.status(400).json({ detail: 'Укажите телефон' });
  if (!data.problem?.trim()) return res.status(400).json({ detail: 'Опишите вашу проблему' });

  const fullName = `${data.lastName} ${data.firstName} ${data.patronymic}`.trim();
  const now = dbNow();
  const id = uuidv4();

  await db.query(
    'INSERT INTO applications (id, lastName, firstName, patronymic, name, phone, age, city, problem, psychic_slug, psychic_name, status, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, data.lastName, data.firstName, data.patronymic, fullName, data.phone, data.age || '', data.city || '', data.problem, data.psychic_slug || '', data.psychic_name || '', 'new', '', now]
  );

  sendNotificationEmail({ ...data, name: fullName, psychic_slug: data.psychic_slug, psychic_name: data.psychic_name, created_at: now }).catch(() => {});
  return res.json({ status: 'success', message: 'Заявка успешно отправлена' });
});

api.post('/contact', async (req, res) => {
  const data = req.body;
  if (data.honeypot) return res.json({ status: 'success', message: 'Сообщение отправлено' });

  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(clientIp, 3, 120)) return res.status(429).json({ detail: 'Слишком много запросов. Попробуйте позже.' });

  const id = uuidv4();
  const now = dbNow();
  await db.query(
    'INSERT INTO contact_messages (id, name, email, message, status, created_at) VALUES (?,?,?,?,?,?)',
    [id, data.name, data.email, data.message, 'new', now]
  );
  return res.json({ status: 'success', message: 'Сообщение отправлено' });
});

// ===== ADMIN AUTH =====

api.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (!rows.length) return res.status(401).json({ detail: 'Неверный логин или пароль' });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ detail: 'Неверный логин или пароль' });
  const token = createToken(username);
  return res.json({ token, username });
});

api.get('/admin/me', requireAdmin, (req, res) => {
  return res.json({ username: req.admin.username });
});

// ===== ADMIN APPLICATIONS =====

api.get('/admin/applications', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM applications ORDER BY created_at DESC LIMIT 1000');
  return res.json(rows);
});

api.put('/admin/applications/:id', requireAdmin, async (req, res) => {
  const { status, notes } = req.body;
  const sets = [];
  const vals = [];
  if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
  if (notes !== undefined) { sets.push('notes = ?'); vals.push(notes); }
  if (!sets.length) return res.status(400).json({ detail: 'Нет данных для обновления' });
  vals.push(req.params.id);
  const [result] = await db.query(`UPDATE applications SET ${sets.join(', ')} WHERE id = ?`, vals);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Заявка не найдена' });
  const [rows] = await db.query('SELECT * FROM applications WHERE id = ?', [req.params.id]);
  return res.json(rows[0]);
});

api.delete('/admin/applications/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM applications WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Заявка не найдена' });
  return res.json({ status: 'success' });
});

api.get('/admin/applications/export/csv', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM applications ORDER BY created_at DESC LIMIT 10000');
  const BOM = '\ufeff';
  const header = 'Дата;Фамилия;Имя;Отчество;Телефон;Город;Возраст;Проблема;Экстрасенс;Статус;Заметки\n';
  const lines = rows.map(r => {
    const date = r.created_at ? String(r.created_at).slice(0, 19).replace('T', ' ') : '';
    return [date, r.lastName, r.firstName, r.patronymic, r.phone, r.city, r.age, r.problem, r.psychic_name, r.status, r.notes].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(';');
  }).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=applications_export.csv');
  return res.send(BOM + header + lines);
});

// ===== ADMIN PARTICIPANTS =====

api.get('/admin/participants', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM participants ORDER BY `order` ASC LIMIT 100');
  return res.json(rows.map(r => parseRow(r, ['specializations'])));
});

api.post('/admin/participants', requireAdmin, async (req, res) => {
  const d = req.body;
  const [existing] = await db.query('SELECT id FROM participants WHERE slug = ?', [d.slug]);
  if (existing.length) return res.status(400).json({ detail: 'Участник с таким slug уже существует' });

  const id = uuidv4();
  const now = dbNow();
  const specs = JSON.stringify(d.specializations || []);
  await db.query(
    'INSERT INTO participants (id, slug, name, title, description, full_description, photo_url, specializations, is_active, `order`, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    [id, d.slug, d.name, d.title || '', d.description || '', d.full_description || '', d.photo_url || '', specs, d.is_active !== false, d.order || 0, now]
  );
  const [rows] = await db.query('SELECT * FROM participants WHERE id = ?', [id]);
  return res.json(parseRow(rows[0], ['specializations']));
});

api.put('/admin/participants/:id', requireAdmin, async (req, res) => {
  const d = req.body;
  const specs = JSON.stringify(d.specializations || []);
  const [result] = await db.query(
    'UPDATE participants SET slug=?, name=?, title=?, description=?, full_description=?, photo_url=?, specializations=?, is_active=?, `order`=? WHERE id=?',
    [d.slug, d.name, d.title || '', d.description || '', d.full_description || '', d.photo_url || '', specs, d.is_active !== false, d.order || 0, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Участник не найден' });
  const [rows] = await db.query('SELECT * FROM participants WHERE id = ?', [req.params.id]);
  return res.json(parseRow(rows[0], ['specializations']));
});

api.delete('/admin/participants/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM participants WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Участник не найден' });
  return res.json({ status: 'success' });
});

// ===== ADMIN REVIEWS =====

api.get('/admin/reviews', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM reviews ORDER BY created_at DESC LIMIT 1000');
  return res.json(rows);
});

api.post('/admin/reviews', requireAdmin, async (req, res) => {
  const d = req.body;
  const id = uuidv4();
  const now = dbNow();
  await db.query(
    'INSERT INTO reviews (id, participant_slug, author_name, author_city, text, rating, is_published, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, d.participant_slug || '', d.author_name, d.author_city || '', d.text, d.rating || 5, d.is_published !== false, now]
  );
  const [rows] = await db.query('SELECT * FROM reviews WHERE id = ?', [id]);
  return res.json(rows[0]);
});

api.put('/admin/reviews/:id', requireAdmin, async (req, res) => {
  const d = req.body;
  const [result] = await db.query(
    'UPDATE reviews SET participant_slug=?, author_name=?, author_city=?, text=?, rating=?, is_published=? WHERE id=?',
    [d.participant_slug || '', d.author_name, d.author_city || '', d.text, d.rating || 5, d.is_published !== false, req.params.id]
  );
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Отзыв не найден' });
  const [rows] = await db.query('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
  return res.json(rows[0]);
});

api.delete('/admin/reviews/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Отзыв не найден' });
  return res.json({ status: 'success' });
});

// ===== ADMIN FAQ =====

api.get('/admin/faq', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM faq ORDER BY `order` ASC LIMIT 100');
  return res.json(rows);
});

api.post('/admin/faq', requireAdmin, async (req, res) => {
  const d = req.body;
  const id = uuidv4();
  await db.query('INSERT INTO faq (id, question, answer, `order`, is_active) VALUES (?,?,?,?,?)',
    [id, d.question, d.answer, d.order || 0, d.is_active !== false]);
  const [rows] = await db.query('SELECT * FROM faq WHERE id = ?', [id]);
  return res.json(rows[0]);
});

api.put('/admin/faq/:id', requireAdmin, async (req, res) => {
  const d = req.body;
  const [result] = await db.query('UPDATE faq SET question=?, answer=?, `order`=?, is_active=? WHERE id=?',
    [d.question, d.answer, d.order || 0, d.is_active !== false, req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Вопрос не найден' });
  const [rows] = await db.query('SELECT * FROM faq WHERE id = ?', [req.params.id]);
  return res.json(rows[0]);
});

api.delete('/admin/faq/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM faq WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Вопрос не найден' });
  return res.json({ status: 'success' });
});

// ===== ADMIN GALLERY PHOTOS =====

api.get('/admin/gallery/photos', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gallery_photos ORDER BY `order` ASC LIMIT 200');
  return res.json(rows);
});

api.post('/admin/gallery/photos', requireAdmin, async (req, res) => {
  const d = req.body;
  const id = uuidv4();
  const now = dbNow();
  await db.query('INSERT INTO gallery_photos (id, image_url, title, description, alt_text, `order`, is_published, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, d.image_url || '', d.title || '', d.description || '', d.alt_text || '', d.order || 0, d.is_published !== false, now]);
  const [rows] = await db.query('SELECT * FROM gallery_photos WHERE id = ?', [id]);
  return res.json(rows[0]);
});

api.put('/admin/gallery/photos/:id', requireAdmin, async (req, res) => {
  const d = req.body;
  const [result] = await db.query('UPDATE gallery_photos SET image_url=?, title=?, description=?, alt_text=?, `order`=?, is_published=? WHERE id=?',
    [d.image_url || '', d.title || '', d.description || '', d.alt_text || '', d.order || 0, d.is_published !== false, req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Фото не найдено' });
  const [rows] = await db.query('SELECT * FROM gallery_photos WHERE id = ?', [req.params.id]);
  return res.json(rows[0]);
});

api.delete('/admin/gallery/photos/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM gallery_photos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Фото не найдено' });
  return res.json({ status: 'success' });
});

// ===== ADMIN GALLERY VIDEOS =====

api.get('/admin/gallery/videos', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gallery_videos ORDER BY `order` ASC LIMIT 200');
  return res.json(rows);
});

api.post('/admin/gallery/videos', requireAdmin, async (req, res) => {
  const d = req.body;
  const id = uuidv4();
  const now = dbNow();
  await db.query('INSERT INTO gallery_videos (id, video_url, title, description, thumbnail_url, `order`, is_published, created_at) VALUES (?,?,?,?,?,?,?,?)',
    [id, d.video_url || '', d.title || '', d.description || '', d.thumbnail_url || '', d.order || 0, d.is_published !== false, now]);
  const [rows] = await db.query('SELECT * FROM gallery_videos WHERE id = ?', [id]);
  return res.json(rows[0]);
});

api.put('/admin/gallery/videos/:id', requireAdmin, async (req, res) => {
  const d = req.body;
  const [result] = await db.query('UPDATE gallery_videos SET video_url=?, title=?, description=?, thumbnail_url=?, `order`=?, is_published=? WHERE id=?',
    [d.video_url || '', d.title || '', d.description || '', d.thumbnail_url || '', d.order || 0, d.is_published !== false, req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Видео не найдено' });
  const [rows] = await db.query('SELECT * FROM gallery_videos WHERE id = ?', [req.params.id]);
  return res.json(rows[0]);
});

api.delete('/admin/gallery/videos/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM gallery_videos WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Видео не найдено' });
  return res.json({ status: 'success' });
});

// ===== ADMIN SEO =====

api.get('/admin/seo', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM seo_settings LIMIT 100');
  return res.json(rows);
});

api.put('/admin/seo/:slug', requireAdmin, async (req, res) => {
  const d = req.body;
  const slug = req.params.slug;
  const [existing] = await db.query('SELECT id FROM seo_settings WHERE page_slug = ?', [slug]);
  if (existing.length) {
    await db.query('UPDATE seo_settings SET title=?, description=?, keywords=?, h1=?, og_title=?, og_description=? WHERE page_slug=?',
      [d.title || '', d.description || '', d.keywords || '', d.h1 || '', d.og_title || '', d.og_description || '', slug]);
  } else {
    await db.query('INSERT INTO seo_settings (id, page_slug, title, description, keywords, h1, og_title, og_description) VALUES (?,?,?,?,?,?,?,?)',
      [uuidv4(), slug, d.title || '', d.description || '', d.keywords || '', d.h1 || '', d.og_title || '', d.og_description || '']);
  }
  const [rows] = await db.query('SELECT * FROM seo_settings WHERE page_slug = ?', [slug]);
  return res.json(rows[0]);
});

// ===== ADMIN PAGES =====

api.get('/admin/pages', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM pages LIMIT 100');
  return res.json(rows.map(r => parseRow(r, ['blocks'])));
});

api.put('/admin/pages/:slug', requireAdmin, async (req, res) => {
  const slug = req.params.slug;
  const blocks = JSON.stringify(req.body.blocks || {});
  const now = dbNow();
  const [existing] = await db.query('SELECT id FROM pages WHERE page_slug = ?', [slug]);
  if (existing.length) {
    await db.query('UPDATE pages SET blocks = ?, updated_at = ? WHERE page_slug = ?', [blocks, now, slug]);
  } else {
    await db.query('INSERT INTO pages (id, page_slug, blocks, updated_at) VALUES (?,?,?,?)', [uuidv4(), slug, blocks, now]);
  }
  const [rows] = await db.query('SELECT * FROM pages WHERE page_slug = ?', [slug]);
  return res.json(parseRow(rows[0], ['blocks']));
});

// ===== ADMIN SETTINGS =====

api.get('/admin/settings', requireAdmin, async (req, res) => {
  const [rows] = await db.query("SELECT * FROM site_settings WHERE id = 'site_settings'");
  if (!rows.length) return res.json({ id: 'site_settings', email: '', phone: '', notification_email: '', working_hours: '', copyright_text: '' });
  return res.json(rows[0]);
});

api.put('/admin/settings', requireAdmin, async (req, res) => {
  const d = req.body;
  const [existing] = await db.query("SELECT id FROM site_settings WHERE id = 'site_settings'");
  if (existing.length) {
    await db.query(`UPDATE site_settings SET email=?, phone=?, address=?, notification_email=?, working_hours=?, copyright_text=?, email_notifications_enabled=?, logo_url=?, logo_alt=?, logo_height_desktop=?, logo_height_mobile=? WHERE id='site_settings'`,
      [d.email || '', d.phone || '', d.address || '', d.notification_email || '', d.working_hours || '', d.copyright_text || '', d.email_notifications_enabled !== false, d.logo_url || '', d.logo_alt || 'Битва Экстрасенсов', d.logo_height_desktop || 56, d.logo_height_mobile || 48]);
  } else {
    await db.query(`INSERT INTO site_settings (id, email, phone, address, notification_email, working_hours, copyright_text, email_notifications_enabled, logo_url, logo_alt, logo_height_desktop, logo_height_mobile) VALUES ('site_settings',?,?,?,?,?,?,?,?,?,?,?)`,
      [d.email || '', d.phone || '', d.address || '', d.notification_email || '', d.working_hours || '', d.copyright_text || '', d.email_notifications_enabled !== false, d.logo_url || '', d.logo_alt || 'Битва Экстрасенсов', d.logo_height_desktop || 56, d.logo_height_mobile || 48]);
  }
  const [rows] = await db.query("SELECT * FROM site_settings WHERE id = 'site_settings'");
  return res.json(rows[0]);
});

// ===== ADMIN CONTACTS =====

api.get('/admin/contacts', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 1000');
  return res.json(rows);
});

api.delete('/admin/contacts/:id', requireAdmin, async (req, res) => {
  const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) return res.status(404).json({ detail: 'Сообщение не найдено' });
  return res.json({ status: 'success' });
});

// ===== ADMIN STATS =====

api.get('/admin/stats', requireAdmin, async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [[{ c: totalApps }]] = await db.query('SELECT COUNT(*) as c FROM applications');
  const [[{ c: newApps }]] = await db.query("SELECT COUNT(*) as c FROM applications WHERE status = 'new'");
  const [[{ c: todayApps }]] = await db.query('SELECT COUNT(*) as c FROM applications WHERE created_at >= ?', [todayStart.toISOString()]);
  const [[{ c: totalParticipants }]] = await db.query('SELECT COUNT(*) as c FROM participants');
  const [[{ c: totalReviews }]] = await db.query('SELECT COUNT(*) as c FROM reviews');
  const [[{ c: totalContacts }]] = await db.query('SELECT COUNT(*) as c FROM contact_messages');

  return res.json({
    total_applications: totalApps,
    new_applications: newApps,
    today_applications: todayApps,
    total_participants: totalParticipants,
    total_reviews: totalReviews,
    total_contacts: totalContacts,
  });
});

// ===== FILE UPLOAD =====

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Разрешены только изображения'));
    cb(null, true);
  },
});

api.post('/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: 'Файл не загружен' });

  const ext = path.extname(req.file.originalname).slice(1) || 'jpg';
  const filename = `${uuidv4()}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  try {
    const sharp = require('sharp');
    let img = sharp(req.file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });
    if (['jpg', 'jpeg'].includes(ext.toLowerCase())) {
      img = img.jpeg({ quality: 85 });
    } else if (ext.toLowerCase() === 'png') {
      img = img.png();
    } else if (ext.toLowerCase() === 'webp') {
      img = img.webp({ quality: 85 });
    }
    await img.toFile(filepath);
  } catch {
    fs.writeFileSync(filepath, req.file.buffer);
  }

  return res.json({ status: 'success', filename, url: `/api/uploads/${filename}` });
});

// ===== ADMIN SEED =====

api.post('/admin/seed', requireAdmin, async (req, res) => {
  const { runSeed } = require('./seed');
  await runSeed(db);
  return res.json({ status: 'success', message: 'Данные успешно загружены' });
});

// ===== SERVE UPLOADS =====

api.get('/uploads/:filename', (req, res) => {
  const filepath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ detail: 'Файл не найден' });
  return res.sendFile(filepath);
});

// Mount API
app.use('/api', api);

// Serve frontend build
const BUILD_DIR = path.join(__dirname, 'build');
if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(BUILD_DIR, 'index.html'));
  });
}

// ===== STARTUP =====

async function startup() {
  console.log('Starting Node.js backend...');

  // Create default admin if none exists
  const [[{ c }]] = await db.query('SELECT COUNT(*) as c FROM admin_users');
  if (c === 0) {
    const hash = await bcrypt.hash('aspire5542gl1952tq', 10);
    await db.query('INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?,?,?,?)',
      [uuidv4(), 'nikoa2020@gmail.com', hash, dbNow()]);
    console.log('Default admin user created');
  }

  // Auto-seed
  const { runSeed } = require('./seed');
  await runSeed(db);
  console.log('Seed data loaded');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startup().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
