#!/usr/bin/env node
/**
 * Диагностический скрипт для проверки отправки email через Resend.
 *
 * Использование:
 *   npm run test:email                                            # получатель из site_settings.notification_email, ключи из ENV
 *   npm run test:email -- user@example.com                        # получатель позиционно
 *   npm run test:email -- --to=user@example.com                   # получатель именованным флагом
 *   npm run test:email -- --to=user@example.com --sender=noreply@yourdomain.ru --key=re_xxx
 *   node scripts/test-email.js --to=... --sender=... --key=...    # то же без npm-обёртки
 *
 * Флаги CLI (все опциональны, порядок не важен):
 *   --to=<email>         получатель (переопределяет позиционный аргумент и БД)
 *   --sender=<email>     переопределяет SENDER_EMAIL из ENV/.env
 *   --key=<resend-key>   переопределяет RESEND_API_KEY из ENV/.env
 *
 * Приоритет источников:  CLI flag  >  REAL ENV (platform/shell)  >  .env file
 *
 * Скрипт печатает пошагово:
 *   1) какие ENV прочитаны (RESEND_API_KEY маскируется до последних 4 символов);
 *   2) источник каждой ключевой переменной (CLI / ENV / .env / <NOT SET>);
 *   3) какой получатель используется (из аргумента / из БД);
 *   4) полный ответ от Resend API (data + error);
 *   5) exit code 0 при успехе, 1 при любой ошибке — удобно для CI/логов.
 *
 * Не изменяет БД. Не влияет на работу сайта.
 */
// Захватываем значения ДО загрузки dotenv — это то, что реально проставлено
// платформой (Emergent Deploy Settings / docker env / shell export).
// dotenv.config() по умолчанию НЕ переопределяет уже существующие переменные —
// поэтому если prod env что-то задал, оно приоритетнее .env файла.
const before = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENDER_EMAIL:   process.env.SENDER_EMAIL,
};

const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');
const envFileExists = fs.existsSync(envPath);

const dotenvResult = require('dotenv').config({ path: envPath });
const { Resend } = require('resend');

const after = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SENDER_EMAIL:   process.env.SENDER_EMAIL,
};

// -------- Парсинг CLI аргументов --------
// Поддерживаемые формы: --flag=value  |  --flag value  |  позиционный email
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}
const { flags: cliFlags, positional: cliPositional } = parseArgs(process.argv.slice(2));

// CLI overrides (пустые строки игнорируем, чтобы не затирать ENV)
const cliKey    = typeof cliFlags.key    === 'string' && cliFlags.key.trim()    ? cliFlags.key.trim()    : '';
const cliSender = typeof cliFlags.sender === 'string' && cliFlags.sender.trim() ? cliFlags.sender.trim() : '';
const cliTo     = typeof cliFlags.to     === 'string' && cliFlags.to.trim()     ? cliFlags.to.trim()
                 : (cliPositional[0] || '').trim();

// Финальный источник для каждой переменной
function whichSource(key, cliValue) {
  if (cliValue) return 'CLI flag';
  if (before[key] && after[key] === before[key]) return 'REAL ENV (platform/shell) — dotenv left as-is';
  if (!before[key] && after[key])                return `.env file (${envPath})`;
  if (!after[key])                                return '<NOT SET anywhere>';
  return 'REAL ENV (overrode .env)';
}

const mask = (s) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '<empty>');

async function main() {
  const RESEND_API_KEY = cliKey    || process.env.RESEND_API_KEY || '';
  const SENDER_EMAIL   = cliSender || process.env.SENDER_EMAIL   || '';

  console.log('===== TEST EMAIL DIAGNOSTIC =====');
  console.log(`.env file: ${envFileExists ? `FOUND at ${envPath}` : `NOT FOUND (dotenv is a no-op)`}`);
  if (dotenvResult.error && envFileExists) console.log(`  dotenv error: ${dotenvResult.error.message}`);
  console.log('');

  // Показать какие флаги распознаны
  console.log('----- CLI args -----');
  console.log(`raw argv (after script name): ${JSON.stringify(process.argv.slice(2))}`);
  console.log(`parsed flags:                 ${JSON.stringify({
    to:     cliTo || null,
    sender: cliSender || null,
    key:    cliKey ? `${mask(cliKey)} (${cliKey.length} chars)` : null,
  })}`);
  console.log('');

  // Полный дамп process.env (секреты маскируются). Полезно на prod чтобы
  // понять что реально проставлено платформой Emergent Deploy Settings.
  console.log('----- process.env dump (secrets masked) -----');
  const secretRegex = /(KEY|SECRET|TOKEN|PASSWORD|PRIVATE|AUTH|JWT|APIKEY)/i;
  const isSecret = (k) => secretRegex.test(k) && k !== 'PWD' && k !== 'OLDPWD';
  const keys = Object.keys(process.env).sort();
  console.log(`Total env variables: ${keys.length}`);
  for (const k of keys) {
    const v = process.env[k] || '';
    const shown = isSecret(k) ? `${mask(v)} (${v.length} chars)` : v;
    console.log(`  ${k} = ${shown}`);
  }
  console.log('');

  console.log('----- Key variables for email delivery -----');
  console.log(`RESEND_API_KEY:   ${mask(RESEND_API_KEY)} (${RESEND_API_KEY.length} chars)`);
  console.log(`  source:         ${whichSource('RESEND_API_KEY', cliKey)}`);
  console.log(`SENDER_EMAIL:     ${SENDER_EMAIL || '<empty>'}`);
  console.log(`  source:         ${whichSource('SENDER_EMAIL', cliSender)}`);

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY пуст: ни --key, ни ENV, ни .env не заданы. Передай --key=re_xxx.');
    process.exit(1);
  }
  if (!SENDER_EMAIL) {
    console.error('❌ SENDER_EMAIL пуст: ни --sender, ни ENV, ни .env не заданы. Передай --sender=noreply@domain.ru.');
    process.exit(1);
  }

  let recipient = cliTo;
  let source = cliTo ? (cliFlags.to ? 'CLI flag --to' : 'CLI positional arg') : '';
  if (!recipient) {
    try {
      const db = require('../db');
      const [rows] = await db.query(
        "SELECT notification_email, email_notifications_enabled FROM site_settings WHERE id='site_settings'"
      );
      const row = rows[0] || {};
      recipient = row.notification_email || '';
      source = `site_settings.notification_email (email_notifications_enabled=${row.email_notifications_enabled})`;
      if (!row.email_notifications_enabled) {
        console.warn('⚠ email_notifications_enabled=0 в БД — сайт НЕ будет слать письма из формы, но этот тест всё равно попробует.');
      }
    } catch (e) {
      console.error('❌ Не удалось прочитать site_settings из БД:', e.message);
      process.exit(1);
    }
  }
  console.log(`Recipient:        ${recipient || '<empty>'} (source: ${source})`);

  if (!recipient) {
    console.error('❌ Некому отправлять — recipient пустой. Передай --to=you@mail.com или заполни site_settings.notification_email.');
    process.exit(1);
  }

  console.log('\n----- Sending via Resend -----');
  const resend = new Resend(RESEND_API_KEY);
  const stamp = new Date().toISOString();
  try {
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [recipient],
      subject: `Diagnostic email from Битва экстрасенсов (${stamp})`,
      html: `<div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#d4a637">Диагностическое письмо</h2>
        <p>Это тест доставки Resend. Если вы видите это письмо — Resend API-ключ и SENDER_EMAIL настроены правильно.</p>
        <p style="color:#666;font-size:12px">Timestamp: ${stamp}<br>Sender: ${SENDER_EMAIL}<br>Recipient: ${recipient}</p>
      </div>`,
    });

    console.log('\n----- Resend response -----');
    console.log(JSON.stringify(result, null, 2));

    if (result && result.error) {
      console.error(`\n❌ Resend REJECTED: [${result.error.statusCode || '?'}] ${result.error.name || ''}: ${result.error.message || ''}`);
      process.exit(1);
    }
    console.log(`\n✅ SUCCESS — Resend id=${result?.data?.id || 'n/a'}. Проверь входящие (+спам) на ${recipient} в течение 1-2 минут.`);
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Исключение при вызове Resend:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
