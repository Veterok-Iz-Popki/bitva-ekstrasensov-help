#!/usr/bin/env node
/**
 * Диагностический скрипт для проверки отправки email через Resend.
 *
 * Использование:
 *   npm run test:email                             # получатель берётся из site_settings.notification_email
 *   npm run test:email -- user@example.com         # получатель передан аргументом
 *   node scripts/test-email.js user@example.com    # то же самое без npm-обёртки
 *
 * Скрипт печатает пошагово:
 *   1) какие ENV прочитаны (RESEND_API_KEY маскируется до последних 4 символов);
 *   2) какой получатель используется (из аргумента / из БД);
 *   3) полный ответ от Resend API (data + error + headers-подобные поля);
 *   4) exit code 0 при успехе, 1 при любой ошибке — удобно для CI/логов.
 *
 * Не изменяет БД. Не влияет на работу сайта.
 */
require('dotenv').config();
const { Resend } = require('resend');

const mask = (s) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '<empty>');

async function main() {
  const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
  const SENDER_EMAIL = process.env.SENDER_EMAIL || '';
  const argRecipient = (process.argv[2] || '').trim();

  console.log('===== TEST EMAIL DIAGNOSTIC =====');
  console.log(`RESEND_API_KEY:   ${mask(RESEND_API_KEY)} (${RESEND_API_KEY.length} chars)`);
  console.log(`SENDER_EMAIL:     ${SENDER_EMAIL || '<empty>'}`);

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is empty in ENV — Resend client cannot be created.');
    process.exit(1);
  }
  if (!SENDER_EMAIL) {
    console.error('❌ SENDER_EMAIL is empty in ENV — Resend will reject the request.');
    process.exit(1);
  }

  let recipient = argRecipient;
  let source = 'CLI arg';
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
    console.error('❌ Некому отправлять — recipient пустой. Передай email аргументом или заполни site_settings.notification_email.');
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
