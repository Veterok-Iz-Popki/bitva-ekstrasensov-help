const express = require('express');
const compression = require('compression');
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
// SMTP-конфиг. Обязательные ENV на prod: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SENDER_EMAIL.
const SENDER_EMAIL = process.env.SENDER_EMAIL || '';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

// Uploads dir
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Middleware
app.use(cors({ origin: true, credentials: true }));
// Gzip compression для всех текстовых ресурсов (JS/CSS/HTML/JSON).
// Бинарные форматы (WebP, PNG, JPG) skip — они уже сжаты.
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // не сжимать ответы < 1KB
}));
app.use(express.json({ limit: '10mb' }));

// ===== X-Robots-Tag middleware =====
// На ВСЕХ публичных ответах ставим noindex/nofollow, если seo_indexing_enabled = 0.
// Исключаем /admin/*, /api/admin/* и /api/auth/* (внутренние endpoints).
// Регистрируем ДО app.use('/api', api), чтобы middleware прошёл и для /api/* запросов.
// getSeoIndexingEnabled / invalidateSeoCache определены ниже (hoisting не нужен — middleware
// async и фактически читает их в момент request, а не при регистрации).
app.use(async (req, res, next) => {
  try {
    const p = req.path || '';
    if (p.startsWith('/admin') || p.startsWith('/api/admin') || p.startsWith('/api/auth')) return next();
    const enabled = await getSeoIndexingEnabled();
    if (!enabled) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  } catch (_) {}
  next();
});

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

// SMTP-отправка через nodemailer. Единственный транспорт — с prod-сервера
// доступен SMTP хостинга (порт 465, SSL/TLS). Возвращает { ok, id? } или
// { ok: false, error }. Роут решает, что делать при неудаче.
async function sendViaSmtp({ to, subject, html }) {
  const nodemailer = require('nodemailer');
  // secure=true для 465/2465 (SMTPS сразу TLS); false для 587/2587 (STARTTLS).
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465 || SMTP_PORT === 2465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const info = await transporter.sendMail({
    from: SENDER_EMAIL,
    to: [to],
    subject,
    html,
  });
  return { id: info.messageId || null, response: info.response || null };
}

// Общие guard'ы для обеих email-функций.
async function checkEmailPreconditions() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    return { ok: false, error: 'SMTP настройки не заданы (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD)' };
  }
  if (!SENDER_EMAIL) return { ok: false, error: 'SENDER_EMAIL env is empty' };
  const [rows] = await db.query("SELECT notification_email, email_notifications_enabled FROM site_settings WHERE id = 'site_settings'");
  const settings = rows[0] || {};
  if (!settings.notification_email) return { ok: false, error: 'site_settings.notification_email is empty (заполни в админке → Настройки сайта)' };
  if (!settings.email_notifications_enabled) return { ok: false, error: 'email-уведомления выключены в админке' };
  return { ok: true, notification_email: settings.notification_email };
}

// Email notification (заявка).
async function sendNotificationEmail(application) {
  const pre = await checkEmailPreconditions();
  if (!pre.ok) {
    console.warn(`[email] sendNotificationEmail FAILED: ${pre.error}`);
    return pre;
  }
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
  const subject = application.psychic_name
    ? `Новая заявка от ${fullName} к ${application.psychic_name} — Битва экстрасенсов`
    : `Новая заявка от ${fullName} — Битва экстрасенсов`;

  try {
    const info = await sendViaSmtp({ to: pre.notification_email, subject, html });
    console.log(`Notification email sent to ${pre.notification_email} (id=${info.id || 'n/a'})`);
    return { ok: true, id: info.id };
  } catch (e) {
    const err = `SMTP failed [${e.code || '?'}]: ${e.message}`;
    console.error(`sendNotificationEmail SMTP error: ${err}`);
    return { ok: false, error: err };
  }
}

// Email notification (contact / обратный звонок).
async function sendContactNotification(msg) {
  const pre = await checkEmailPreconditions();
  if (!pre.ok) {
    console.warn(`[email] sendContactNotification FAILED: ${pre.error}`);
    return pre;
  }
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d3040; padding: 20px; text-align: center;">
        <h1 style="color: #d4a637; margin: 0;">Новое сообщение / звонок</h1>
        <p style="color: #ffffff; margin: 5px 0 0 0;">Битва экстрасенсов — сайт помощи</p>
      </div>
      <div style="background: #f5f5f5; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold;width:130px">Имя:</td><td style="padding:10px;border-bottom:1px solid #ddd">${msg.name || '-'}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #ddd;font-weight:bold">Контакт:</td><td style="padding:10px;border-bottom:1px solid #ddd">${msg.email || '-'}</td></tr>
          <tr><td style="padding:10px;font-weight:bold;vertical-align:top">Сообщение:</td><td style="padding:10px">${msg.message || '-'}</td></tr>
        </table>
        <p style="color:#666;font-size:12px;margin-top:20px">Дата: ${msg.created_at || '-'}</p>
      </div>
    </div>`;
  const subject = `Новое сообщение от ${msg.name || 'клиента'} — Битва экстрасенсов`;
  try {
    const info = await sendViaSmtp({ to: pre.notification_email, subject, html });
    console.log(`Contact notification sent to ${pre.notification_email} (id=${info.id || 'n/a'})`);
    return { ok: true, id: info.id };
  } catch (e) {
    const err = `SMTP failed [${e.code || '?'}]: ${e.message}`;
    console.error(`sendContactNotification SMTP error: ${err}`);
    return { ok: false, error: err };
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

// vCard contact — inline (iPhone Safari opens "Add Contact").
// Номер берётся из site_settings.popup_phone (тот же источник, что и popup после
// отправки заявки). Если в БД пусто — fallback на дефолтный номер.
const DEFAULT_VCARD_PHONE = '+7 928 421-73-58';
function phoneToVcfDigits(phone) {
  if (!phone) return '';
  return phone.replace(/[^+\d]/g, '');
}
api.get('/contact.vcf', async (req, res) => {
  let phoneFromDb = '';
  try {
    const [rows] = await db.query("SELECT popup_phone FROM site_settings WHERE id='site_settings' LIMIT 1");
    if (rows.length && typeof rows[0].popup_phone === 'string') phoneFromDb = rows[0].popup_phone.trim();
  } catch (e) {
    // если БД недоступна — отдаём fallback ниже
  }
  const phoneRaw = phoneFromDb || DEFAULT_VCARD_PHONE;
  const phoneDigits = phoneToVcfDigits(phoneRaw);
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N;CHARSET=UTF-8:;Битва Экстрасенсов;;;',
    'FN;CHARSET=UTF-8:Битва Экстрасенсов',
    `TEL;TYPE=CELL:${phoneDigits}`,
    'END:VCARD',
  ].join('\r\n');
  res.set({
    'Content-Type': 'text/vcard; charset=utf-8',
    'Content-Disposition': 'inline; filename="contact.vcf"',
    // Не кэшировать на CDN/браузере, чтобы изменения из админки применялись сразу.
    'Cache-Control': 'no-store, no-cache, must-revalidate',
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
  const limit = parseInt(req.query.limit) || 40;
  // Get reviews evenly from all psychics: 5 random per psychic
  const [slugs] = await db.query('SELECT DISTINCT slug FROM participants');
  let allReviews = [];
  for (const s of slugs) {
    const [rows] = await db.query(
      'SELECT r.*, p.name as participant_name FROM reviews r LEFT JOIN participants p ON r.participant_slug = p.slug WHERE r.participant_slug = ? AND r.is_published = TRUE ORDER BY RAND() LIMIT 5',
      [s.slug]
    );
    allReviews = allReviews.concat(rows);
  }
  // Shuffle all collected reviews
  for (let i = allReviews.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allReviews[i], allReviews[j]] = [allReviews[j], allReviews[i]];
  }
  return res.json(allReviews.slice(0, limit));
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
  // Публичный production URL — отдаём из env, чтобы фронт строил canonical / og:url / JSON-LD
  // независимо от того, на каком домене (preview / production) загружена страница.
  const site_url = process.env.PUBLIC_SITE_URL || '';
  if (!rows.length) return res.json({ email: '', phone: '', working_hours: '', copyright_text: '', site_url, seo_indexing_enabled: 1 });
  return res.json({ ...rows[0], site_url });
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

  // ⚠ Сохранение заявок в БД отключено по требованию.
  // Email/мессенджер-уведомления продолжают работать через sendNotificationEmail().
  // Раздел «Заявки» в админке остаётся доступным для просмотра старых записей,
  // но новые заявки в нём появляться НЕ будут.
  // Если потребуется вернуть сохранение — восстановить INSERT INTO applications с полями выше.

  // Ждём результат отправки. Если письмо не ушло — 500 с человеческим текстом.
  // Технические детали остаются в логах backend (не показываем публично).
  const emailResult = await sendNotificationEmail({ ...data, name: fullName, psychic_slug: data.psychic_slug, psychic_name: data.psychic_name, created_at: now });
  if (!emailResult.ok) {
    return res.status(500).json({
      status: 'error',
      detail: 'Не удалось отправить уведомление о заявке. Попробуйте позже.',
    });
  }
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
  // Сообщение уже сохранено в contact_messages. Если письмо не ушло — 500.
  const emailResult = await sendContactNotification({ ...data, created_at: now });
  if (!emailResult.ok) {
    return res.status(500).json({
      status: 'error',
      detail: 'Сообщение сохранено, но письмо-уведомление не отправлено. Попробуйте позже.',
    });
  }
  return res.json({ status: 'success', message: 'Сообщение отправлено' });
});

// ===== ADMIN AUTH =====

api.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  // Brute-force protection: 5 попыток за 60 секунд на IP (использует существующий checkRateLimit).
  // 401 ответы возвращаются с фиксированной задержкой ~300ms, чтобы исключить timing attacks.
  const clientIp = req.ip || 'unknown';
  if (!checkRateLimit(`login:${clientIp}`, 5, 60)) {
    return res.status(429).json({ detail: 'Слишком много попыток входа. Попробуйте через минуту.' });
  }
  const failResponse = () => new Promise((r) => setTimeout(() => r(res.status(401).json({ detail: 'Неверный логин или пароль' })), 300));
  const [rows] = await db.query('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (!rows.length) return failResponse();
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return failResponse();
  const token = createToken(username);
  return res.json({ token, username });
});

api.get('/admin/me', requireAdmin, (req, res) => {
  return res.json({ username: req.admin.username });
});

// ===== ADMIN EMAIL DIAGNOSTICS =====
// Диагностика SMTP-отправки: DNS lookup + TCP connect + AUTH + реальная отправка.
// Позволяет админу проверить настройки SMTP не роняя реальную форму заявки.
api.post('/admin/email-probe', requireAdmin, async (req, res) => {
  const out = {
    env: {
      SENDER_EMAIL: SENDER_EMAIL || '<empty>',
      SMTP_HOST: SMTP_HOST || '<empty>',
      SMTP_PORT,
      SMTP_USER: SMTP_USER || '<empty>',
      SMTP_PASSWORD_set: !!SMTP_PASSWORD,
      NODE_VERSION: process.version,
    },
    dns_lookup: null,
    tcp_connect: null,
    smtp_verify: null,
    smtp_send: null,
  };

  // 1) DNS lookup SMTP_HOST
  if (SMTP_HOST) {
    try {
      const dns = require('dns').promises;
      const t0 = Date.now();
      const r = await dns.lookup(SMTP_HOST, { all: true });
      out.dns_lookup = { ok: true, addresses: r, ms: Date.now() - t0 };
    } catch (e) {
      out.dns_lookup = { ok: false, error: `${e.code || ''}: ${e.message}` };
    }
  }

  // 2) Raw TCP connect SMTP_HOST:SMTP_PORT
  if (SMTP_HOST && SMTP_PORT) {
    const net = require('net');
    out.tcp_connect = await new Promise((resolve) => {
      const t0 = Date.now();
      const sock = new net.Socket();
      let done = false;
      const finish = (r) => { if (done) return; done = true; try { sock.destroy(); } catch (_) {} resolve({ ...r, ms: Date.now() - t0 }); };
      sock.setTimeout(6000);
      sock.on('connect', () => finish({ ok: true }));
      sock.on('error', (e) => finish({ ok: false, code: e.code || null, message: e.message }));
      sock.on('timeout', () => finish({ ok: false, code: 'ETIMEDOUT', message: 'timeout 6s' }));
      sock.connect(SMTP_PORT, SMTP_HOST);
    });
  }

  // 3) SMTP verify (TCP + EHLO + AUTH, БЕЗ отправки письма)
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465 || SMTP_PORT === 2465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    const t0 = Date.now();
    await transporter.verify();
    out.smtp_verify = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    out.smtp_verify = {
      ok: false,
      code: e.code || null,          // ECONNREFUSED, ETIMEDOUT, EAUTH, EDNS, ...
      command: e.command || null,    // CONN, EHLO, AUTH LOGIN, ...
      response: e.response || null,
      responseCode: e.responseCode || null,
      message: e.message,
    };
  }

  // 4) Реальная отправка тестового письма
  try {
    const [rows] = await db.query("SELECT notification_email FROM site_settings WHERE id = 'site_settings'");
    const recipient = (rows[0] && rows[0].notification_email) || '';
    if (!recipient) {
      out.smtp_send = { ok: false, error: 'notification_email пуст в site_settings' };
    } else {
      const stamp = new Date().toISOString();
      const t0 = Date.now();
      const info = await sendViaSmtp({
        to: recipient,
        subject: `SMTP probe from admin (${stamp})`,
        html: `<p>Диагностическое письмо через SMTP (${SMTP_HOST}:${SMTP_PORT}).</p><p>Timestamp: ${stamp}</p>`,
      });
      out.smtp_send = { ok: true, id: info.id, response: info.response, ms: Date.now() - t0, recipient };
    }
  } catch (e) {
    out.smtp_send = { ok: false, code: e.code || null, command: e.command || null, error: e.message };
  }

  return res.json(out);
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

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      cb(null, uuidv4() + ext);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Неподдерживаемый тип файла'));
    cb(null, true);
  },
});

api.post('/admin/upload-video', requireAdmin, videoUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'poster', maxCount: 1 },
]), async (req, res) => {
  const result = {};
  if (req.files?.video?.[0]) {
    result.video_url = `/api/uploads/${req.files.video[0].filename}`;
  }
  if (req.files?.poster?.[0]) {
    const posterFile = req.files.poster[0];
    result.poster_url = `/api/uploads/${posterFile.filename}`;
    // Генерируем .webp для постера видео (если ещё не webp) — иначе <picture> на public-стороне
    // получит 404 на .webp и в некоторых браузерах отрисует broken-image.
    const ext = path.extname(posterFile.filename).toLowerCase().slice(1);
    if (ext && ext !== 'webp') {
      try {
        const sharp = require('sharp');
        const webpName = posterFile.filename.replace(/\.[^.]+$/, '.webp');
        await sharp(posterFile.path)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(path.join(UPLOADS_DIR, webpName));
      } catch (e) {
        console.error('Poster WebP generation failed:', e.message);
      }
    }
  }
  return res.json({ status: 'success', ...result });
});

api.get('/admin/gallery/videos', requireAdmin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM gallery_videos ORDER BY `order` ASC LIMIT 200');
  return res.json(rows);
});

// ===== Video upload: NO server-side processing =====
// По требованию: видео сохраняется как есть, без ffmpeg/transcoding/optimization.
// processing_status хранится в БД (legacy column) для совместимости со старыми записями,
// но больше не используется для логики. Новые видео получают processing_status='done'
// сразу при создании, чтобы фронт не показывал никаких индикаторов обработки.

api.post('/admin/gallery/videos', requireAdmin, async (req, res) => {
  const d = req.body;
  const id = uuidv4();
  const now = dbNow();
  await db.query('INSERT INTO gallery_videos (id, video_url, title, description, thumbnail_url, `order`, is_published, processing_status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, d.video_url || '', d.title || '', d.description || '', d.thumbnail_url || '', d.order || 0, d.is_published !== false, 'done', now]);
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
  const seoIndexing = (d.seo_indexing_enabled === false || d.seo_indexing_enabled === 0) ? 0 : 1;
  const [existing] = await db.query("SELECT id FROM site_settings WHERE id = 'site_settings'");
  if (existing.length) {
    await db.query(`UPDATE site_settings SET email=?, phone=?, popup_phone=?, address=?, notification_email=?, working_hours=?, copyright_text=?, email_notifications_enabled=?, logo_url=?, logo_alt=?, logo_height_desktop=?, logo_height_mobile=?, seo_indexing_enabled=? WHERE id='site_settings'`,
      [d.email || '', d.phone || '', d.popup_phone || '', d.address || '', d.notification_email || '', d.working_hours || '', d.copyright_text || '', d.email_notifications_enabled !== false, d.logo_url || '', d.logo_alt || 'Битва Экстрасенсов', d.logo_height_desktop || 56, d.logo_height_mobile || 48, seoIndexing]);
  } else {
    await db.query(`INSERT INTO site_settings (id, email, phone, popup_phone, address, notification_email, working_hours, copyright_text, email_notifications_enabled, logo_url, logo_alt, logo_height_desktop, logo_height_mobile, seo_indexing_enabled) VALUES ('site_settings',?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.email || '', d.phone || '', d.popup_phone || '', d.address || '', d.notification_email || '', d.working_hours || '', d.copyright_text || '', d.email_notifications_enabled !== false, d.logo_url || '', d.logo_alt || 'Битва Экстрасенсов', d.logo_height_desktop || 56, d.logo_height_mobile || 48, seoIndexing]);
  }
  const [rows] = await db.query("SELECT * FROM site_settings WHERE id = 'site_settings'");
  invalidateSeoCache();
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

    // Also generate .webp variant for non-webp originals (for <picture> fallback)
    if (!['webp'].includes(ext.toLowerCase())) {
      try {
        const webpName = filename.replace(/\.[^.]+$/, '.webp');
        await sharp(req.file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(path.join(UPLOADS_DIR, webpName));
      } catch (e) {
        console.error('WebP generation failed:', e.message);
      }
    }
  } catch {
    fs.writeFileSync(filepath, req.file.buffer);
  }

  return res.json({ status: 'success', filename, url: `/api/uploads/${filename}` });
});

// ===== ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ ENDPOINT (Шаг 0 аудита редиректов) =====
// Показывает, какие proxy-заголовки реально доходят до Express через
// BitNinja → Caddy → Plesk/Passenger. Отдаёт ТОЛЬКО заголовки маршрутизации,
// никаких секретов. УДАЛИТЬ сразу после снятия замеров на production.
api.get('/debug/proxy', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    host: req.headers.host || null,
    xForwardedHost: req.headers['x-forwarded-host'] || null,
    xForwardedProto: req.headers['x-forwarded-proto'] || null,
    xForwardedSsl: req.headers['x-forwarded-ssl'] || null,
    xForwardedPort: req.headers['x-forwarded-port'] || null,
    xForwardedFor: req.headers['x-forwarded-for'] ? 'present' : null,
    frontEndHttps: req.headers['front-end-https'] || null,
    xUrlScheme: req.headers['x-url-scheme'] || null,
    reqProtocol: req.protocol,
    reqSecure: req.secure,
    socketEncrypted: !!req.socket.encrypted,
    reqHostname: req.hostname,
    originalUrl: req.originalUrl,
    trustProxySetting: app.get('trust proxy') || false,
  });
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
  // Long-term cache: file names are UUIDs/slugs, content is immutable
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(filepath);
});

// Mount API
app.use('/api', api);

// ===== ROBOTS.TXT & SITEMAP.XML =====
// Эти роуты должны быть ДО express.static и SPA fallback, чтобы при production-деплое
// (backend обслуживает всё) поисковые краулеры всегда получали актуальные XML/text,
// а не SPA index.html. На preview/dev — статические копии лежат в /frontend/public/.

const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://bitva-ekstrasensov-help.com').replace(/\/$/, '');

// ===== SEO INDEXING TOGGLE =====
// Читаем seo_indexing_enabled из БД с in-memory кешем на 30 секунд,
// чтобы не делать SQL-запрос на каждый запрос (robots.txt / X-Robots-Tag middleware).
// При сохранении админкой кеш будет очищен через инвалидацию (см. PUT /admin/settings).
let _seoCache = { value: 1, fetchedAt: 0 };
async function getSeoIndexingEnabled() {
  const now = Date.now();
  if (now - _seoCache.fetchedAt < 30000) return _seoCache.value;
  try {
    const [rows] = await db.query("SELECT seo_indexing_enabled FROM site_settings WHERE id = 'site_settings'");
    _seoCache = { value: rows.length ? (rows[0].seo_indexing_enabled ? 1 : 0) : 1, fetchedAt: now };
  } catch (_) {
    _seoCache = { value: 1, fetchedAt: now };
  }
  return _seoCache.value;
}
function invalidateSeoCache() { _seoCache.fetchedAt = 0; }

app.get('/robots.txt', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  const enabled = await getSeoIndexingEnabled();
  if (!enabled) {
    // Индексация выключена через админку — полный disallow для всех ботов.
    return res.send('User-agent: *\nDisallow: /\n');
  }
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/admin\nDisallow: /api/admin/\nDisallow: /api/auth\nDisallow: /api/auth/\n\nSitemap: ${PUBLIC_SITE_URL}/sitemap.xml\n`
  );
});

// ===== LASTMOD =====
// lastmod = дата последнего СУЩЕСТВЕННОГО изменения контента конкретной страницы.
// Источники (берётся максимум): baseline из seo/lastmod.json (реальные даты, вычисленные
// по git-истории dump.sql) + доступные БД-таймстемпы (pages.updated_at обновляется при
// сохранении блоков через админку, participants.created_at, MAX(created_at) галерей).
// Ни один источник не зависит от времени запроса/рестарта/сборки, поэтому повторный
// запрос sitemap.xml и деплой сами по себе lastmod не меняют.
const LASTMOD_BASELINE = require('./seo/lastmod.json');

function toDay(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Максимальная из дат, но не в будущем относительно сегодняшнего дня.
function maxDay(...vals) {
  const today = new Date().toISOString().slice(0, 10);
  const days = vals.map(toDay).filter(Boolean).filter((d) => d <= today);
  return days.length ? days.sort().pop() : null;
}

app.get('/sitemap.xml', async (req, res) => {
  try {
    const B = LASTMOD_BASELINE;

    // Динамические источники дат из БД (каждый в своём try — отсутствие таблицы/поля
    // не должно ломать sitemap, тогда используется только baseline).
    const dbPages = {};
    try {
      const [rows] = await db.query('SELECT page_slug, updated_at FROM pages');
      (rows || []).forEach((r) => { dbPages[r.page_slug] = r.updated_at; });
    } catch (_) {}

    let participants = [];
    try {
      const [rows] = await db.query('SELECT slug, created_at FROM participants ORDER BY `order` ASC, id ASC');
      participants = rows || [];
    } catch (_) {}

    let photosMax = null, videosMax = null;
    try {
      const [r] = await db.query('SELECT MAX(created_at) AS mx FROM gallery_photos');
      photosMax = r?.[0]?.mx || null;
    } catch (_) {}
    try {
      const [r] = await db.query('SELECT MAX(created_at) AS mx FROM gallery_videos');
      videosMax = r?.[0]?.mx || null;
    } catch (_) {}

    // Дата последнего изменения состава/данных участников — влияет на страницы,
    // где список участников входит в индексируемый контент (главная, запись, фотогалерея).
    const participantsMax = maxDay(
      ...participants.map((p) => p.created_at),
      ...Object.values(B.participants || {})
    );

    // lastmod для страницы «услуга»/«тема»: контент-блоки + SEO-запись этой же страницы.
    const pageDay = (key) => maxDay(B.pages?.[key], B.seo?.[key], dbPages[key]);

    const staticUrls = [
      { loc: '/', changefreq: 'daily', priority: '1.0', lastmod: maxDay(pageDay('home'), participantsMax) },
      { loc: '/zapis-na-priem', changefreq: 'monthly', priority: '0.8', lastmod: maxDay(pageDay('booking'), participantsMax) },
      { loc: '/voprosy-i-otvety', changefreq: 'monthly', priority: '0.7', lastmod: pageDay('faq') },
      { loc: '/foto-galereya', changefreq: 'weekly', priority: '0.6', lastmod: maxDay(B.seo?.['foto-galereya'], photosMax, participantsMax) },
      { loc: '/video', changefreq: 'weekly', priority: '0.6', lastmod: maxDay(B.seo?.video, videosMax) },
      // Services
      { loc: '/finansovaya-magiya', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('service-finansovaya-magiya') },
      { loc: '/lyubovnaya-magiya', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('service-lyubovnaya-magiya') },
      { loc: '/magiya-zhizni', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('service-magiya-zhizni') },
      { loc: '/magicheskaya-zashchita', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('service-magicheskaya-zashchita') },
      // Topics
      { loc: '/porcha', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-porcha') },
      { loc: '/proklyatie', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-proklyatie') },
      { loc: '/sglaz', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-sglaz') },
      { loc: '/venets-bezbrachiya', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-venets-bezbrachiya') },
      { loc: '/privorot', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-privorot') },
      { loc: '/zaklyatie', changefreq: 'monthly', priority: '0.8', lastmod: pageDay('topic-zaklyatie') },
    ];

    const participantUrls = participants.map((p) => ({
      loc: `/uchastniki/${p.slug}`,
      changefreq: 'weekly',
      priority: '0.9',
      lastmod: maxDay(B.participants?.[p.slug], p.created_at),
    }));

    // Fallback для страницы без единого известного источника: самая свежая известная
    // дата контента сайта (НЕ today — чтобы не помечать неизменённые страницы свежими).
    const siteFallback = maxDay(
      ...Object.values(B.pages || {}),
      ...Object.values(B.seo || {}),
      ...Object.values(B.participants || {})
    );
    const all = [...staticUrls, ...participantUrls].map((u) => ({
      ...u,
      lastmod: u.lastmod || siteFallback,
    }));

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      all
        .map(
          (u) =>
            `  <url>\n    <loc>${PUBLIC_SITE_URL}${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
        )
        .join('\n') +
      '\n</urlset>\n';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    res.status(500).send('Failed to build sitemap');
  }
});

// Serve frontend build
const BUILD_DIR = path.join(__dirname, 'build');
if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR, {
    maxAge: '1y',
    immutable: true,
    // index: false — отключаем автоматическое отдавание index.html для `/`,
    // потому что мы хотим инжектить SEO-теги и per-URL контент через свой роут ниже.
    index: false,
    setHeaders: (res, filePath) => {
      // index.html, sw.js, manifest.json не фингерпринтованы — должны проверяться при каждом запросе,
      // иначе пользователь застрянет на старой версии после деплоя.
      const base = path.basename(filePath);
      if (base === 'index.html' || base === 'sw.js' || base === 'manifest.json') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  // ===== Server-side SEO injection =====
  // На каждый публичный URL:
  //  1) читаем index.html С ДИСКА (без in-memory cache — иначе после `yarn build`
  //     без рестарта backend отдавался stale HTML со stale JS-hash);
  //  2) достаём из БД seo_settings + контент;
  //  3) подставляем title, meta description, canonical, robots, OG-теги;
  //  4) инжектим видимый H1 + intro + основной текст внутрь <div id="root">…</div>
  //     (React через createRoot полностью перерисует этот блок при mount).
  // НИКАКОГО клоакинга: один и тот же HTML отдаётся любому клиенту.
  const seoRenderer = require('./seo/renderer');
  // Production: build/index.html удаляется постбилд-скриптом чтобы reverse proxy
  // (Caddy/Nginx) не отдавал его напрямую для `/`. Backend читает index.template.html.
  // Dev/локально: если постбилд не запускался — используем оригинальный index.html.
  const INDEX_TEMPLATE_PATH = path.join(BUILD_DIR, 'index.template.html');
  const INDEX_FALLBACK_PATH = path.join(BUILD_DIR, 'index.html');
  const MANIFEST_PATH = path.join(BUILD_DIR, 'asset-manifest.json');

  // Вычисляется на каждый запрос — hot reload при dev (переключение с fallback на template)
  // не требует restart. Ошибка "no file at all" залогируется явно.
  function resolveIndexPath() {
    if (fs.existsSync(INDEX_TEMPLATE_PATH)) return INDEX_TEMPLATE_PATH;
    if (fs.existsSync(INDEX_FALLBACK_PATH)) return INDEX_FALLBACK_PATH;
    return null;
  }
  const initialPath = resolveIndexPath();
  if (initialPath) {
    console.log(`[seo] SPA template file: ${path.basename(initialPath)}`);
  } else {
    console.error(`[seo] WARNING: neither index.template.html nor index.html found in ${BUILD_DIR}`);
  }

  // Маппинг URL → тип страницы + ключ seo_settings + ключ pages.
  // Порядок важен — сначала точные совпадения, потом participant regex, потом 404.
  const STATIC_ROUTES = {
    '/':                        { type: 'home',     seoKey: 'home',     pageKey: 'home' },
    '/zapis-na-priem':          { type: 'booking',  seoKey: 'booking',  pageKey: 'booking' },
    '/voprosy-i-otvety':        { type: 'faq',      seoKey: 'faq',      pageKey: 'faq' },
    '/foto-galereya':           { type: 'gallery',  seoKey: 'foto-galereya', pageKey: null },
    '/video':                   { type: 'video',    seoKey: 'video',    pageKey: null },
    // Услуги
    '/finansovaya-magiya':      { type: 'service',  seoKey: 'service-finansovaya-magiya',      pageKey: 'service-finansovaya-magiya',      slug: 'finansovaya-magiya' },
    '/lyubovnaya-magiya':       { type: 'service',  seoKey: 'service-lyubovnaya-magiya',       pageKey: 'service-lyubovnaya-magiya',       slug: 'lyubovnaya-magiya' },
    '/magiya-zhizni':           { type: 'service',  seoKey: 'service-magiya-zhizni',           pageKey: 'service-magiya-zhizni',           slug: 'magiya-zhizni' },
    '/magicheskaya-zashchita':  { type: 'service',  seoKey: 'service-magicheskaya-zashchita',  pageKey: 'service-magicheskaya-zashchita',  slug: 'magicheskaya-zashchita' },
    // Тематические страницы
    '/porcha':              { type: 'topic', seoKey: 'topic-porcha',              pageKey: 'topic-porcha',              slug: 'porcha' },
    '/proklyatie':          { type: 'topic', seoKey: 'topic-proklyatie',          pageKey: 'topic-proklyatie',          slug: 'proklyatie' },
    '/sglaz':               { type: 'topic', seoKey: 'topic-sglaz',               pageKey: 'topic-sglaz',               slug: 'sglaz' },
    '/venets-bezbrachiya':  { type: 'topic', seoKey: 'topic-venets-bezbrachiya',  pageKey: 'topic-venets-bezbrachiya',  slug: 'venets-bezbrachiya' },
    '/privorot':            { type: 'topic', seoKey: 'topic-privorot',            pageKey: 'topic-privorot',            slug: 'privorot' },
    '/zaklyatie':           { type: 'topic', seoKey: 'topic-zaklyatie',           pageKey: 'topic-zaklyatie',           slug: 'zaklyatie' },
  };

  async function resolveRoute(pathname) {
    // Убираем trailing slash кроме корня для устранения дублей.
    const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    if (STATIC_ROUTES[p]) return STATIC_ROUTES[p];
    const partMatch = /^\/uchastniki\/([a-z0-9-]+)$/i.exec(p);
    if (partMatch) return { type: 'participant', slug: partMatch[1] };
    // Админка индексироваться не должна, но отдать HTML для React мы обязаны.
    if (p === '/admin' || p.startsWith('/admin/')) return { type: 'admin' };
    return { type: 'notfound' };
  }

  async function loadSeo(seoKey) {
    if (!seoKey) return null;
    try {
      const [rows] = await db.query(
        'SELECT title, description, keywords, h1, og_title, og_description FROM seo_settings WHERE page_slug = ?',
        [seoKey]
      );
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async function loadPageBlocks(pageKey) {
    if (!pageKey) return null;
    try {
      const [rows] = await db.query('SELECT blocks FROM pages WHERE page_slug = ?', [pageKey]);
      if (!rows[0] || !rows[0].blocks) return null;
      return JSON.parse(rows[0].blocks);
    } catch (_) { return null; }
  }

  async function loadParticipant(slug) {
    try {
      const [rows] = await db.query('SELECT slug, name, title, description, full_description, specializations, photo_url FROM participants WHERE slug = ? AND is_active = 1', [slug]);
      return rows[0] || null;
    } catch (_) { return null; }
  }

  async function loadParticipantsList() {
    try {
      const [rows] = await db.query('SELECT slug, name, title FROM participants WHERE is_active = 1 ORDER BY `order` ASC, name ASC');
      return rows || [];
    } catch (_) { return []; }
  }

  async function loadFaqList() {
    try {
      const [rows] = await db.query('SELECT question, answer FROM faq ORDER BY `order` ASC, id ASC');
      return rows || [];
    } catch (_) { return []; }
  }

  async function loadVideos() {
    try {
      const [rows] = await db.query('SELECT title, url FROM gallery_videos ORDER BY `order` ASC, id ASC');
      return rows || [];
    } catch (_) { return []; }
  }

  app.get('/{*splat}', async (req, res) => {
    // Определяем путь к template на КАЖДЫЙ запрос — так после yarn build
    // без restart backend'а сразу подхватится обновлённый шаблон.
    const indexPath = resolveIndexPath();
    if (!indexPath) {
      console.error('[seo] No index template file to render');
      return res.status(500).send('Internal Server Error: SPA template not found');
    }
    try {
      const pathname = req.path || '/';
      const route = await resolveRoute(pathname);

      // Админка: отдаём базовый HTML с noindex, без БД-контента.
      if (route.type === 'admin') {
        const html = seoRenderer.injectSeoIntoHtml(
          indexPath,
          MANIFEST_PATH,
          {
            title: 'Админ-панель — Битва экстрасенсов',
            description: '',
            canonical: null,
            robots: 'noindex, nofollow',
            ogTitle: 'Админ-панель',
            ogDescription: '',
            ogUrl: null,
            ogImage: null,
            bodyHtml: '',
          },
          seoRenderer.buildSiteBgPreloads(MANIFEST_PATH)
        );
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(html);
      }

      const indexingEnabled = !!(await getSeoIndexingEnabled());

      let seo = null, pageData = null, participant = null;
      let participants = null, faq = null, videos = null;

      if (route.type === 'participant') {
        participant = await loadParticipant(route.slug);
        if (!participant) {
          // Slug не найден → 404.
          route.type = 'notfound';
        } else {
          seo = await loadSeo(`participant-${route.slug}`);
        }
      }

      if (route.type !== 'notfound' && route.type !== 'participant') {
        seo = await loadSeo(route.seoKey);
        if (route.pageKey) pageData = await loadPageBlocks(route.pageKey);
      }

      // Дополнительные данные для конкретных типов страниц.
      if (route.type === 'home' || route.type === 'gallery' || route.type === 'booking') {
        participants = await loadParticipantsList();
      }
      if (route.type === 'faq') faq = await loadFaqList();
      if (route.type === 'video') videos = await loadVideos();

      const seoRender = seoRenderer.renderSeo({
        route,
        pathname,
        seo,
        pageData,
        participant,
        participants,
        faq,
        videos,
        indexingEnabled,
      });

      const html = seoRenderer.injectSeoIntoHtml(
        indexPath,
        MANIFEST_PATH,
        seoRender,
        seoRenderer.buildSiteBgPreloads(MANIFEST_PATH)
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.status(seoRender.statusCode).send(html);
    } catch (err) {
      console.error('[seo-renderer] failed:', err.message);
      // Fallback: отдать чистый template с диска (без инъекций), чтобы сайт не упал.
      try {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.send(raw);
      } catch (_) {
        return res.status(500).send('Internal Server Error');
      }
    }
  });
}

// ===== STARTUP =====

async function startup() {
  console.log('Starting Node.js backend...');

  // Создание / обновление дефолтного админа.
  // Креды берутся из ENV (ADMIN_USERNAME / ADMIN_PASSWORD), либо дефолт из кода.
  // Если БД уже содержит юзера с таким username — пароль перезаписывается из ENV (idempotent).
  // Если юзера нет — создаётся новый.
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'nikoa2020@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aspire5542gl1952tq';

  const [existing] = await db.query('SELECT id FROM admin_users WHERE username = ?', [ADMIN_USERNAME]);
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  if (existing.length) {
    await db.query('UPDATE admin_users SET password_hash = ? WHERE username = ?', [hash, ADMIN_USERNAME]);
    console.log(`Admin user ${ADMIN_USERNAME} password updated from ENV`);
  } else {
    await db.query('INSERT INTO admin_users (id, username, password_hash, created_at) VALUES (?,?,?,?)',
      [uuidv4(), ADMIN_USERNAME, hash, dbNow()]);
    console.log(`Admin user ${ADMIN_USERNAME} created`);
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

// ===== PRODUCTION STABILITY: глобальные error handlers =====
// Без них одна необработанная ошибка/promise rejection валит весь процесс.
// Supervisor рестартует backend, но текущие запросы теряются.
// С логом мы хотя бы увидим причину в /var/log/supervisor/backend.err.log

process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  // По convention для uncaughtException всё-таки безопаснее перезапуститься,
  // но мы оставляем процесс работающим — supervisor отслеживает реальные крахи.
});
