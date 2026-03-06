const { v4: uuidv4 } = require('uuid');

async function runSeed(db) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Check if participants already exist
  const [[{ c: partCount }]] = await db.query('SELECT COUNT(*) as c FROM participants');
  if (partCount === 0) {
    // Load from dump or run migration
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const dumpFile = path.join(__dirname, 'dump.sql');
    if (fs.existsSync(dumpFile)) {
      console.log('Restoring from dump.sql...');
      const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
      const passArg = DB_PASSWORD ? `-p${DB_PASSWORD}` : '';
      try {
        execSync(`mysql -h ${DB_HOST || 'localhost'} -u ${DB_USER || 'root'} ${passArg} ${DB_NAME} < ${dumpFile}`, { shell: true });
        console.log('Dump restored');
        return;
      } catch (e) {
        console.log('Dump restore failed, seeding manually...');
      }
    }
  }

  // FAQ
  const [[{ c: faqCount }]] = await db.query('SELECT COUNT(*) as c FROM faq');
  if (faqCount === 0) {
    const faqs = [
      ["Как записаться на приём к экстрасенсу?", "Для записи на приём заполните форму на нашем сайте, указав ваше имя, телефон и краткое описание ситуации. Наш администратор свяжется с вами в течение 24 часов.", 1],
      ["Сколько стоит консультация экстрасенса?", "Стоимость зависит от специалиста и формата проведения. Первичная консультация длится 60 минут. Точную стоимость уточняйте у администратора.", 2],
      ["Можно ли получить консультацию онлайн?", "Да, большинство специалистов проводят консультации как очно, так и онлайн.", 3],
      ["Гарантируете ли вы результат?", "Мы гарантируем, что с вами будет работать проверенный специалист. Наши экстрасенсы всегда честны в прогнозах.", 4],
      ["Конфиденциальна ли информация?", "Абсолютно. Мы строго соблюдаем конфиденциальность всех обращений.", 5],
      ["С какими проблемами можно обратиться?", "Наши экстрасенсы помогают в широком спектре вопросов: любовь, здоровье, бизнес, поиск пропавших и многое другое.", 6],
      ["Как подготовиться к консультации?", "Специальной подготовки не требуется. Рекомендуем заранее сформулировать вопросы.", 7],
      ["Все ли участники — настоящие экстрасенсы?", "Все специалисты прошли строгий отбор и подтвердили свои способности.", 8],
    ];
    for (const [q, a, o] of faqs) {
      await db.query('INSERT INTO faq (id, question, answer, `order`, is_active) VALUES (?,?,?,?,?)', [uuidv4(), q, a, o, true]);
    }
  }

  // Pages
  const { getSeedPages } = require('./seed_pages');
  const pages = getSeedPages(now);
  for (const p of pages) {
    const [existing] = await db.query('SELECT id FROM pages WHERE page_slug = ?', [p.page_slug]);
    if (!existing.length) {
      await db.query('INSERT INTO pages (id, page_slug, blocks, updated_at) VALUES (?,?,?,?)',
        [uuidv4(), p.page_slug, JSON.stringify(p.blocks), now]);
    }
  }

  // SEO
  const { getSeedSEO } = require('./seed_pages');
  const seoItems = getSeedSEO();
  for (const s of seoItems) {
    const [existing] = await db.query('SELECT id FROM seo_settings WHERE page_slug = ?', [s.page_slug]);
    if (!existing.length) {
      await db.query('INSERT INTO seo_settings (id, page_slug, title, description, keywords, h1, og_title, og_description) VALUES (?,?,?,?,?,?,?,?)',
        [uuidv4(), s.page_slug, s.title, s.description, s.keywords, s.h1, s.og_title || '', s.og_description || '']);
    }
  }

  // Site settings
  const [[{ c: settingsCount }]] = await db.query("SELECT COUNT(*) as c FROM site_settings WHERE id = 'site_settings'");
  if (settingsCount === 0) {
    await db.query(`INSERT INTO site_settings (id, email, phone, address, notification_email, working_hours, copyright_text, email_notifications_enabled, logo_url, logo_alt, logo_height_desktop, logo_height_mobile) VALUES ('site_settings', 'info@example.com', '+7 (800) 123-45-67', 'Москва, Россия', '', 'Пн-Вс: 9:00 — 21:00', '2024 Битва экстрасенсов. Все права защищены.', true, '', 'Битва Экстрасенсов', 56, 48)`);
  }

  console.log('Seed complete');
}

module.exports = { runSeed };
