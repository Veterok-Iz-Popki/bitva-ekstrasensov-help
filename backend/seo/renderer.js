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

function renderHomeContent(pageData, participants) {
  const p = pageData || {};
  const h1 = p.hero_h1 || 'Битва экстрасенсов — официальный сайт помощи';
  const parts = [
    `<h1>${esc(h1)}</h1>`,
    p.hero_subtitle ? `<p>${esc(p.hero_subtitle)}</p>` : '',
    p.hero_unique ? `<p><strong>${esc(p.hero_unique)}</strong></p>` : '',
    p.hero_text1 ? `<p>${esc(p.hero_text1)}</p>` : '',
    p.hero_text2 ? `<p>${esc(p.hero_text2)}</p>` : '',
  ];
  if (p.hero_subheading || p.hero_intro || p.hero_main) {
    if (p.hero_subheading) parts.push(`<h2>${esc(p.hero_subheading)}</h2>`);
    if (p.hero_intro) parts.push(`<p>${esc(p.hero_intro)}</p>`);
    if (p.hero_main) parts.push(`<p>${esc(p.hero_main)}</p>`);
  }
  if (participants && participants.length) {
    parts.push(`<h2>Участники проекта</h2>`);
    parts.push(`<ul>${participants.map(pt =>
      `<li><a href="/uchastniki/${esc(pt.slug)}">${esc(pt.name)}${pt.title ? ' — ' + esc(pt.title) : ''}</a></li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderBookingContent(pageData, seo, participants) {
  const h1 = seo?.h1 || pageData?.page_title || 'Запись на приём к экстрасенсу';
  const parts = [
    `<h1>${esc(h1)}</h1>`,
    pageData?.page_subtitle ? `<p>${esc(pageData.page_subtitle)}</p>` : '',
    seo?.description ? `<p>${esc(seo.description)}</p>` : '',
  ];
  if (participants && participants.length) {
    parts.push(`<h2>Выберите экстрасенса</h2>`);
    parts.push(`<ul>${participants.map(pt =>
      `<li><a href="/uchastniki/${esc(pt.slug)}">${esc(pt.name)}${pt.title ? ' — ' + esc(pt.title) : ''}</a></li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderFaqContent(seo, faqList) {
  const h1 = seo?.h1 || 'Частые вопросы';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (seo?.description) parts.push(`<p>${esc(seo.description)}</p>`);
  if (faqList && faqList.length) {
    for (const q of faqList) {
      parts.push(`<h3>${esc(q.question || '')}</h3>`);
      if (q.answer) parts.push(`<p>${esc(q.answer)}</p>`);
    }
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderGalleryContent(seo, participants) {
  const h1 = seo?.h1 || 'Фотогалерея экстрасенсов';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (seo?.description) parts.push(`<p>${esc(seo.description)}</p>`);
  if (participants && participants.length) {
    parts.push(`<ul>${participants.map(pt =>
      `<li><a href="/uchastniki/${esc(pt.slug)}">${esc(pt.name)}</a></li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderVideoContent(seo, videos) {
  const h1 = seo?.h1 || 'Видео';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (seo?.description) parts.push(`<p>${esc(seo.description)}</p>`);
  if (videos && videos.length) {
    parts.push(`<ul>${videos.map(v =>
      `<li>${v.url ? `<a href="${esc(v.url)}" rel="noopener">${esc(v.title || v.url)}</a>` : esc(v.title || '')}</li>`
    ).join('')}</ul>`);
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

function renderParticipantContent(seo, participant) {
  const p = participant || {};
  const h1 = seo?.h1 || p.name || '';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (p.title) parts.push(`<p><strong>${esc(p.title)}</strong></p>`);
  if (p.description) parts.push(`<p>${esc(p.description)}</p>`);
  // full_description может содержать переносы — сохраняем как параграфы.
  if (p.full_description) {
    for (const para of splitLines(p.full_description)) {
      parts.push(`<p>${esc(para)}</p>`);
    }
  }
  // specializations — JSON array
  let specs = [];
  try {
    if (p.specializations) {
      const parsed = typeof p.specializations === 'string' ? JSON.parse(p.specializations) : p.specializations;
      if (Array.isArray(parsed)) specs = parsed;
    }
  } catch (_) { /* ignore */ }
  if (specs.length) {
    parts.push(`<h2>Специализации</h2>`);
    parts.push(renderList(specs));
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
}

// Общий рендер для service/topic — они имеют одинаковую структуру blocks.
function renderPageBlocks(seo, pageData, fallbackH1) {
  const p = pageData || {};
  const h1 = seo?.h1 || p.title || fallbackH1 || '';
  const parts = [`<h1>${esc(h1)}</h1>`];
  if (p.description) parts.push(`<p>${esc(p.description)}</p>`);

  // Все возможные секции — рендерим только те, которые есть в конкретной странице.
  // Порядок соответствует ServicePage/TopicPage.
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
  if (p.cta_title || p.cta_text) {
    if (p.cta_title) parts.push(`<h2>${esc(p.cta_title)}</h2>`);
    if (p.cta_text) parts.push(`<p>${esc(p.cta_text)}</p>`);
  }
  if (p.additional_title || p.additional_text) {
    if (p.additional_title) parts.push(`<h2>${esc(p.additional_title)}</h2>`);
    if (p.additional_text) {
      for (const para of splitLines(p.additional_text)) {
        parts.push(`<p>${esc(para)}</p>`);
      }
    }
  }
  return { h1, body: parts.filter(Boolean).join('\n') };
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
  const { route, pathname, seo, pageData, participant, participants, faq, videos, indexingEnabled } = args;

  let content;
  let effectiveSeo = seo || {};

  switch (route.type) {
    case 'home':
      content = renderHomeContent(pageData, participants);
      break;
    case 'booking':
      content = renderBookingContent(pageData, effectiveSeo, participants);
      break;
    case 'faq':
      content = renderFaqContent(effectiveSeo, faq);
      break;
    case 'gallery':
      content = renderGalleryContent(effectiveSeo, participants);
      break;
    case 'video':
      content = renderVideoContent(effectiveSeo, videos);
      break;
    case 'participant': {
      // Если seo_settings не задан для участника — используем fallback из данных participant.
      if (!seo || !seo.title) {
        effectiveSeo = { ...buildParticipantFallbackSeo(participant), ...(seo || {}) };
      }
      content = renderParticipantContent(effectiveSeo, participant);
      break;
    }
    case 'service':
      content = renderPageBlocks(effectiveSeo, pageData, effectiveSeo.h1 || '');
      break;
    case 'topic':
      content = renderPageBlocks(effectiveSeo, pageData, effectiveSeo.h1 || '');
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
    bodyHtml: `${breadcrumbsHtml}\n${content.body}`,
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
