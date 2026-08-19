/**
 * Server-side SEO renderer для React SPA.
 *
 * Цель: любой клиент (пользователь, curl, Яндекс, Google, no-JS браузер)
 * должен получить ОДИН И ТОТ ЖЕ HTML с корректными для конкретного URL:
 *   - <title>, meta description, canonical, robots, OG-теги
 *   - видимый H1, breadcrumbs, intro, основной текст внутри <div id="root">…</div>
 *
 * React (createRoot) при mount перерисует #root тем же контентом из тех же
 * данных БД → это НЕ клоакинг, просто ранний server-side render + client replace.
 *
 * Никакой User-Agent detection, никаких скрытых блоков, никакого разного контента.
 */
const fs = require('fs');
const path = require('path');
const S = require('./shared');

const PROD_ORIGIN = 'https://bitva-ekstrasensov-help.com';
const DEFAULT_OG_IMAGE = `${PROD_ORIGIN}/favicon.svg`;

// HTML entity escape для безопасной вставки любых строк из БД в HTML.
// Экранирует & < > " ' — покрывает все контексты (текст + атрибуты).
function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL для canonical: только основной домен + pathname (без query/fragment).
// Trailing slash убираем (кроме корня) для избежания дублей.
function buildCanonical(pathname) {
  let p = pathname || '/';
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return `${PROD_ORIGIN}${p}`;
}

// Абсолютный URL для OG (тот же canonical по умолчанию).
function absoluteUrl(pathname) {
  return buildCanonical(pathname);
}

// Разбиение многострочного текста из pages.blocks на массив строк, отбрасывая пустые.
function splitLines(raw) {
  if (!raw) return [];
  return String(raw).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// Fallback SEO для участника, если в seo_settings нет записи.
// Реплика логики из frontend/src/lib/participantSeoFallback.js — должно совпадать.
function buildParticipantFallbackSeo(participant) {
  const p = participant || {};
  const name = (p.name || '').trim();
  const achievement = (p.title || '').trim();

  const title = achievement
    ? `${name} — ${achievement} | Битва Экстрасенсов`
    : (name ? `Экстрасенс ${name} — приём и консультация | Битва Экстрасенсов` : '');

  const description = achievement
    ? `${name} — ${achievement}. Личный приём экстрасенса, онлайн-консультация, диагностика жизненных ситуаций, помощь в сложных вопросах.`
    : (name ? `Личный приём экстрасенса ${name}. Онлайн-консультация, диагностика жизненных ситуаций.` : '');

  return {
    title,
    description,
    h1: name,
    og_title: achievement ? `${name} — ${achievement}` : (name ? `${name} — приём экстрасенса` : ''),
    og_description: description,
  };
}

// Хлебные крошки для конкретного маршрута.
function buildBreadcrumbs(route, extra) {
  const HOME = { href: '/', label: 'Главная' };
  switch (route.type) {
    case 'home':          return [HOME];
    case 'booking':       return [HOME, { href: null, label: 'Запись на приём' }];
    case 'faq':           return [HOME, { href: null, label: 'Вопросы-Ответы' }];
    case 'gallery':       return [HOME, { href: null, label: 'Фотогалерея' }];
    case 'video':         return [HOME, { href: null, label: 'Видео' }];
    case 'participant':   return [HOME, { href: null, label: extra?.name || 'Участник' }];
    case 'service':       return [HOME, { href: '/', label: 'Услуги' }, { href: null, label: extra?.title || route.slug }];
    case 'topic':         return [HOME, { href: null, label: extra?.title || route.slug }];
    default:              return [HOME];
  }
}

// Рендер простой HTML-разметки для крошек. Без inline-стилей — CSS из бандла применится к React-версии; server-side у нас минимальный вид.
function renderBreadcrumbs(crumbs) {
  if (!crumbs || crumbs.length <= 1) return '';
  const items = crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    if (c.href && !last) return `<a href="${esc(c.href)}">${esc(c.label)}</a>`;
    return `<span>${esc(c.label)}</span>`;
  }).join(' <span aria-hidden="true">/</span> ');
  return `<nav aria-label="Хлебные крошки">${items}</nav>`;
}

// Рендер списка → <ul><li>…</li></ul>
function renderList(lines) {
  if (!lines || !lines.length) return '';
  return `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

// ===== Билд контента для разных типов страниц =====

function renderHomeContent(pageData, participants, settings) {
  const p = pageData || {};
  const h1 = p.hero_h1 || 'Битва экстрасенсов — официальный сайт помощи сильнейших экстрасенсов, ясновидящих, магов и целителей России';
  const cta = () => [
    p.cta_text ? `<p>${esc(p.cta_text)}</p>` : '<p>Количество заявок на помощь ограничено!</p>',
    `<p><a href="/zapis-na-priem">${esc(p.cta_button || 'Получить помощь экстрасенса!')}</a></p>`,
    p.cta_subtext ? `<p>${esc(p.cta_subtext)}</p>` : '<p>Не упустите свой шанс!</p>',
  ].join('');

  const parts = [
    `<h1>${esc(h1)}</h1>`,
    `<h2>${esc(p.hero_subtitle || 'Официальный портал магической помощи от участников проекта «Битва экстрасенсов»')}</h2>`,
    `<p><strong>${esc(p.hero_unique || 'Уникальная возможность получить реальную помощь!')}</strong></p>`,
    `<p>${esc(p.hero_text1 || 'Обратитесь лично к любому участнику легендарного проекта «Битва экстрасенсов» — победителям, финалистам и сильнейшим экстрасенсам, чьи способности были доказаны перед миллионами зрителей.')}</p>`,
    `<p>${esc(p.hero_text2 || 'Получите персональную диагностику негатива, консультацию ясновидящей, помощь мага или медиума — онлайн или на личном приёме.')}</p>`,
    `<h3>${esc(p.hero_subheading || 'магическая помощь и консультация экстрасенса — запись на приём')}</h3>`,
    // Тот же ключ и тот же fallback, что в HomePage.js → about_text
    `<p>${esc(p.about_text || 'Вам лично помогут сильнейшие и самые лучшие экстрасенсы России решить ваши проблемы и получить ответы на ваши вопросы.')}</p>`,
  ];
  parts.push(cta());

  // Категории проблем (те же ссылки, что в PROBLEM_CATEGORIES на клиенте)
  parts.push(`<ul>${S.PROBLEM_CATEGORIES.map(c => `<li><a href="${esc(c.path)}">${esc(c.label)}</a></li>`).join('')}</ul>`);

  // Участники
  if (participants && participants.length) {
    parts.push(`<h2>${esc(p.participants_title || 'Лучшие экстрасенсы России')}</h2>`);
    parts.push(participants.map(pt => {
      // Как в HomePage.js: на карточке показываются первые две специализации
      const specs = parseSpecs(pt.specializations).slice(0, 2);
      return [
        `<div>`,
        `<h3><a href="/uchastniki/${esc(pt.slug)}">${esc(pt.name)}</a></h3>`,
        specs.length ? `<p>${specs.map(esc).join(' ')}</p>` : '',
        pt.title ? `<p>${esc(pt.title)}</p>` : '',
        `<p><a href="/uchastniki/${esc(pt.slug)}">Обратиться</a></p>`,
        `</div>`,
      ].filter(Boolean).join('');
    }).join(''));
  }

  // Преимущества (BENEFITS на клиенте — ссылки на запись)
  parts.push(`<ul>${S.BENEFITS.map(b => `<li><a href="/zapis-na-priem">${esc(b)}</a></li>`).join('')}</ul>`);
  parts.push(cta());

  // Услуги: те же 4 категории из pages.blocks (service_cat_1..4) + ссылки «Подробнее»
  const cats = [];
  for (let i = 1; i <= 4; i++) {
    const raw = p[`service_cat_${i}`] || p[`service_category_${i}`] || p[`service_${i}`];
    if (!raw) continue;
    const lines = splitLines(raw);
    if (!lines.length) continue;
    // Тот же разбор первой строки, что в HomePage.js: первое слово — заголовок, остаток — подзаголовок
    const words = lines[0].split(/\s+/).filter(Boolean);
    cats.push({
      head: words[0] || '',
      sub: words.slice(1).join(' '),
      items: lines.slice(1),
      link: S.SERVICE_LINKS[i - 1],
    });
  }
  if (cats.length) {
    parts.push(`<h2>${esc(p.services_title || 'Услуги экстрасенсов')}</h2>`);
    parts.push(cats.map(c => [
      `<div>`,
      `<h3>${esc(c.head)}</h3>`,
      c.sub ? `<p>${esc(c.sub)}</p>` : '',
      renderList(c.items),
      `<p><a href="${esc(c.link || '/zapis-na-priem')}">Подробнее</a></p>`,
      `</div>`,
    ].join('')).join(''));
  }

  // Большой SEO-текст
  if (p.seo_text) {
    parts.push(`<h2>${esc(p.seo_text_title || 'Экстрасенс онлайн — возможность изменить вашу жизнь!')}</h2>`);
    for (const para of splitLines(p.seo_text)) parts.push(`<p>${esc(para)}</p>`);
    parts.push(cta());
  }

  return { h1, body: parts.filter(Boolean).join('\n') };
}

// specializations хранится JSON-строкой
function parseSpecs(value) {
  try {
    if (!value) return [];
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function renderBookingContent(pageData, seo, participants) {
  const h1 = seo?.h1 || pageData?.page_title || 'Запись на приём к экстрасенсу';
  // BookingPage.js выводит только page_title — page_subtitle пользователю не показывается,
  // поэтому в SSR его тоже не выводим.
  const parts = [`<h1>${esc(h1)}</h1>`];
  // Список участников намеренно не рендерится: в React это <select> формы,
  // отдельного видимого блока и ссылок на участников на странице нет.
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderFaqContent(pageData, seo, faqList) {
  const h1 = seo?.h1 || 'Частые вопросы';
  const parts = [
    `<h1>${esc(h1)}</h1>`,
    // Тот же источник и тот же fallback, что в FAQPage.js
    `<p>${esc(pageData?.page_subtitle || 'Ответы на самые популярные вопросы о консультациях')}</p>`,
  ];
  if (faqList && faqList.length) {
    for (const q of faqList) {
      parts.push(`<h3>${esc(q.question || '')}</h3>`);
      if (q.answer) parts.push(`<p>${esc(q.answer)}</p>`);
    }
  }
  parts.push(`<p>Не нашли ответ на свой вопрос?</p>`);
  parts.push(`<p><a href="/zapis-na-priem">Связаться с нами</a></p>`);
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderGalleryContent(seo, participants, photos) {
  const h1 = 'Фотогалерея экстрасенсов';
  const parts = [`<h1>${esc(h1)}</h1>`];
  // Те же gallery_photos и та же сортировка, что в API/React; подпись — <p>, как в GalleryPage.js
  if (photos && photos.length) {
    for (const ph of photos) {
      const caption = ph.title || '';
      if (caption) parts.push(`<p>${esc(caption)}</p>`);
    }
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderVideoContent(seo, videos) {
  const h1 = 'Видео экстрасенсов';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (videos && videos.length) {
    parts.push(videos.map(v => `<h3>${esc(v.title || '')}</h3>${v.description ? `<p>${esc(v.description)}</p>` : ''}`).join(''));
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderParticipantContent(seo, participant, reviews, allParticipants) {
  const p = participant || {};
  const genName = S.toGenitive(p.name);
  const datName = S.toDative(p.name);
  const h1 = `Официальная страница помощи ${genName}`;
  const bookingUrl = `/zapis-na-priem?psychic=${p.slug || ''}`;
  const parts = [
    `<p><a href="/#ekstrasensy">Все участники</a></p>`,
    `<h1>${esc(h1)}</h1>`,
  ];
  // Заголовки секций в React — <div>, не заголовки (ParticipantDetailPage.js)
  if (p.title) {
    parts.push(`<div>Статус</div>`);
    parts.push(`<p>${esc(p.name)} — ${esc(p.title)}.</p>`);
  }
  const specs = parseSpecs(p.specializations);
  if (specs.length) {
    parts.push(`<div>Специализация</div>`);
    parts.push(renderList(specs));
  }
  parts.push(`<p>Помощь ${esc(genName)}.</p>`);
  parts.push(`<p>Консультация ${esc(genName)}.</p>`);
  parts.push(`<p>Записаться на Личный Приём к ${esc(datName)}.</p>`);
  parts.push(`<p>Не упустите свой шанс</p>`);
  parts.push(`<p><a href="${esc(bookingUrl)}">Обратиться</a></p>`);
  parts.push(`<p>Количество обращений ограниченно!</p>`);
  // participants.description React не выводит — в SSR тоже не выводим
  if (p.full_description) {
    for (const para of splitLines(p.full_description)) parts.push(`<p>${esc(para)}</p>`);
  }

  // Отзывы — тот же источник, что у React (/api/participants/:slug/reviews)
  if (reviews && reviews.length) {
    parts.push(`<div>Отзывы</div>`);
    parts.push(reviews.map(r => [
      `<div>`,
      `<p><strong>${esc(r.author_name || '')}${r.author_city ? ', ' + esc(r.author_city) : ''}</strong></p>`,
      `<p>${esc(r.text || '')}</p>`,
      `</div>`,
    ].join('')).join(''));
    parts.push(`<p>${esc(S.PARTICIPANT_REVIEWS_DISCLAIMER)}</p>`);
  }

  // Другие экстрасенсы — та же перелинковка, что в клиентской версии
  const others = (allParticipants || []).filter(x => x.slug !== p.slug);
  if (others.length) {
    parts.push(`<h2>Другие экстрасенсы</h2>`);
    parts.push(`<ul>${others.map(o =>
      `<li><a href="/uchastniki/${esc(o.slug)}">${esc(o.name)}</a></li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

// Общий рендер для service/topic — они имеют одинаковую структуру blocks.
function renderPageBlocks(seo, pageData, kind, slug) {
  const p = pageData || {};
  const isTopic = kind === 'topic';
  const nameMap = isTopic ? S.TOPIC_NAMES : S.SERVICE_NAMES;
  const h1Map = isTopic ? S.TOPIC_H1 : S.SERVICE_H1;
  const relatedMap = isTopic ? S.TOPIC_RELATED : S.SERVICE_RELATED;
  const title = p.title || nameMap[slug] || (isTopic ? 'Тема' : 'Услуга');
  // Тот же приоритет, что в ServicePage/TopicPage: blocks.h1 → константа → title
  const h1 = p.h1 || h1Map[slug] || title;
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (p.description) {
    for (const para of splitLines(p.description)) parts.push(`<p>${esc(para)}</p>`);
  }

  const sections = [
    ['directions_title', 'directions'],
    ['symptoms_title', 'symptoms'],
    ['situations_title', 'situations'],
    ['when_title', 'when_to_contact'],
    ['how_it_works_title', 'how_it_works'],
    ['consultation_title', 'consultation_process'],
    ['results_title', 'results'],
  ];
  for (const [titleKey, listKey] of sections) {
    if (p[titleKey] || p[listKey]) {
      if (p[titleKey]) parts.push(`<h2>${esc(p[titleKey])}</h2>`);
      parts.push(renderList(splitLines(p[listKey])));
    }
  }
  // Порядок как в ServicePage/TopicPage: доп. блок → CTA → похожие
  // Уровень заголовка доп. блока: h3 в ServicePage, h2 в TopicPage
  if (p.additional_title || p.additional_text) {
    const tag = isTopic ? 'h2' : 'h3';
    if (p.additional_title) parts.push(`<${tag}>${esc(p.additional_title)}</${tag}>`);
    if (p.additional_text) {
      for (const para of splitLines(p.additional_text)) parts.push(`<p>${esc(para)}</p>`);
    }
  }
  if (p.cta_title || p.cta_text || p.cta_button) {
    if (p.cta_title) parts.push(`<h2>${esc(p.cta_title)}</h2>`);
    if (p.cta_text) parts.push(`<p>${esc(p.cta_text)}</p>`);
    if (p.cta_button) parts.push(`<p><a href="/zapis-na-priem">${esc(p.cta_button)}</a></p>`);
  }

  // «Похожие услуги» — та же перелинковка, что в клиентской версии
  const related = relatedMap[slug] || [];
  if (related.length) {
    parts.push(`<h2>Похожие услуги</h2>`);
    parts.push(`<ul>${related.map(r =>
      `<li><a href="/${esc(r.slug)}">${esc(r.name)} →</a></li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

// Header-навигация и footer — те же ссылки и тексты, что видит пользователь (Layout.js)
function renderHeaderNav() {
  return `<nav>${S.NAV_ITEMS.map(n => `<a href="${esc(n.path)}">${esc(n.label)}</a>`).join(' ')}` +
    ` <a href="/zapis-na-priem">Заказать звонок</a></nav>`;
}

function renderFooter(settings) {
  const year = new Date().getFullYear();
  const copyright = settings?.copyright_text || 'Битва экстрасенсов. Все права защищены.';
  return [
    '<footer>',
    `<p>Официальный сайт помощи участников проекта «Битва Экстрасенсов»</p>`,
    `<h3>Навигация</h3>`,
    `<ul>${S.NAV_ITEMS.map(n => `<li><a href="${esc(n.path)}">${esc(n.label)}</a></li>`).join('')}` +
      `<li><a href="/zapis-na-priem">Записаться на приём</a></li></ul>`,
    `<h3>Информация</h3>`,
    `<p>${esc(S.FOOTER_DISCLAIMER)}</p>`,
    `<p>© ${year} ${esc(copyright)}</p>`,
    '</footer>',
  ].join('');
}

function renderNotFoundContent() {
  return {
    h1: 'Страница не найдена',
    body: `<h1>Страница не найдена</h1>
<p>Запрошенная страница не существует. Возможно, она была удалена или адрес указан неверно.</p>
<p><a href="/">Вернуться на главную</a></p>`,
  };
}

// ===== Публичный API модуля =====

/**
 * @param {object} args
 *   route: { type: 'home'|'booking'|'faq'|'gallery'|'video'|'participant'|'service'|'topic'|'notfound', slug?: string }
 *   pathname: string
 *   seo: { title, description, keywords, h1, og_title, og_description } | null (может быть null → используем fallback)
 *   pageData: pages.blocks (JSON) | null
 *   participant: participant row | null (только для participant)
 *   participants: [] — используется для home/booking/gallery как список
 *   faq: [] — для faq
 *   videos: [] — для video
 *   indexingEnabled: boolean — если false → robots:'noindex, follow'
 *
 * @returns { title, description, canonical, robots, ogTitle, ogDescription, ogUrl, ogImage, h1, bodyHtml, statusCode }
 */
function renderSeo(args) {
  const { route, pathname, seo, pageData, participant, participants, faq, videos,
    reviews, photos, settings, indexingEnabled } = args;

  let content;
  let effectiveSeo = seo || {};

  switch (route.type) {
    case 'home':
      content = renderHomeContent(pageData, participants, settings);
      break;
    case 'booking':
      content = renderBookingContent(pageData, effectiveSeo, participants);
      break;
    case 'faq':
      content = renderFaqContent(pageData, effectiveSeo, faq);
      break;
    case 'gallery':
      content = renderGalleryContent(effectiveSeo, participants, photos);
      break;
    case 'video':
      content = renderVideoContent(effectiveSeo, videos);
      break;
    case 'participant': {
      // Если seo_settings не задан для участника — используем fallback из данных participant.
      if (!seo || !seo.title) {
        effectiveSeo = { ...buildParticipantFallbackSeo(participant), ...(seo || {}) };
      }
      content = renderParticipantContent(effectiveSeo, participant, reviews, participants);
      break;
    }
    case 'service':
      content = renderPageBlocks(effectiveSeo, pageData, 'service', route.slug);
      break;
    case 'topic':
      content = renderPageBlocks(effectiveSeo, pageData, 'topic', route.slug);
      break;
    case 'notfound':
    default:
      content = renderNotFoundContent();
      break;
  }

  const title = effectiveSeo.title || content.h1 || 'Битва экстрасенсов';
  const description = effectiveSeo.description || '';
  const ogTitle = effectiveSeo.og_title || title;
  const ogDescription = effectiveSeo.og_description || description;

  // Canonical: только на 200-страницах. Для 404 canonical не выставляем.
  const isNotFound = route.type === 'notfound';
  const canonical = isNotFound ? null : buildCanonical(pathname);
  const ogUrl = isNotFound ? null : absoluteUrl(pathname);

  // Robots: если индексация выключена глобально ИЛИ страница 404 → noindex.
  let robots;
  if (isNotFound) robots = 'noindex, follow';
  else if (!indexingEnabled) robots = 'noindex, nofollow';
  else robots = 'index, follow';

  const crumbs = buildBreadcrumbs(route, { name: participant?.name, title: effectiveSeo.h1 });
  const breadcrumbsHtml = renderBreadcrumbs(crumbs);

  const statusCode = isNotFound ? 404 : 200;

  return {
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogUrl,
    ogImage: DEFAULT_OG_IMAGE,
    h1: content.h1,
    bodyHtml: [
      renderHeaderNav(),
      breadcrumbsHtml,
      content.body,
      renderFooter(args.settings),
    ].filter(Boolean).join('\n'),
    statusCode,
  };
}

// Читает свежий index.html с диска (без in-memory cache), инжектит preload
// картинок из asset-manifest.json и SEO-метаданные + контент.
function injectSeoIntoHtml(indexHtmlPath, manifestPath, seo, siteBgPreloads) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');

  // 1) <title>
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(seo.title)}</title>`);

  // 2) <meta name="description"> — удаляем ВСЕ существующие (включая default emergent) и вставляем свой.
  html = html.replace(/<meta\s+name=["']description["'][^>]*\/?>/gi, '');
  // 3) <meta name="robots"> — тоже удаляем существующие и вставляем.
  html = html.replace(/<meta\s+name=["']robots["'][^>]*\/?>/gi, '');
  // 4) <link rel="canonical"> — удаляем существующие и вставляем.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*\/?>/gi, '');
  // 5) <meta property="og:*"> — удаляем существующие OG-теги.
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*\/?>/gi, '');

  const seoTags = [];
  if (seo.description) seoTags.push(`<meta name="description" content="${esc(seo.description)}"/>`);
  seoTags.push(`<meta name="robots" content="${esc(seo.robots)}"/>`);
  if (seo.canonical) seoTags.push(`<link rel="canonical" href="${esc(seo.canonical)}"/>`);
  seoTags.push(`<meta property="og:type" content="website"/>`);
  seoTags.push(`<meta property="og:title" content="${esc(seo.ogTitle)}"/>`);
  if (seo.ogDescription) seoTags.push(`<meta property="og:description" content="${esc(seo.ogDescription)}"/>`);
  if (seo.ogUrl) seoTags.push(`<meta property="og:url" content="${esc(seo.ogUrl)}"/>`);
  if (seo.ogImage) seoTags.push(`<meta property="og:image" content="${esc(seo.ogImage)}"/>`);
  seoTags.push(`<meta property="og:locale" content="ru_RU"/>`);
  seoTags.push(`<meta property="og:site_name" content="Битва экстрасенсов"/>`);

  // Preload картинок фона (тот же паттерн, что и в старом buildEnrichedIndexHtml)
  const preloads = siteBgPreloads || '';

  html = html.replace('</head>', `${preloads}${seoTags.join('')}</head>`);

  // 6) <div id="root"></div> → <div id="root">…SEO контент…</div>
  //    React (createRoot) при mount полностью заменит содержимое.
  //    Контент виден всем одинаково (Яндекс, curl, пользователь без JS, пользователь до React-mount).
  html = html.replace(
    /<div id=["']root["']><\/div>/,
    `<div id="root">${seo.bodyHtml}</div>`
  );

  return html;
}

function buildSiteBgPreloads(manifestPath) {
  try {
    if (!fs.existsSync(manifestPath)) return '';
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const files = manifest.files || {};
    const avif = files['static/media/site-bg.avif'];
    const webp = files['static/media/site-bg.webp'];
    const arr = [];
    if (avif) arr.push(`<link rel="preload" as="image" type="image/avif" href="${esc(avif)}" fetchpriority="high">`);
    if (webp) arr.push(`<link rel="preload" as="image" type="image/webp" href="${esc(webp)}">`);
    return arr.join('');
  } catch (_) {
    return '';
  }
}

module.exports = {
  renderSeo,
  injectSeoIntoHtml,
  buildSiteBgPreloads,
  buildParticipantFallbackSeo,
  esc,
  PROD_ORIGIN,
};
