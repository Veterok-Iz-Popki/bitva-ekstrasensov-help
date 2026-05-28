import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export function setSEO({ title, description, keywords, canonicalPath, ogTitle, ogDescription, ogImage }) {
  if (title) document.title = title;

  const setMeta = (name, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  const setOG = (property, content) => {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };
  const setLink = (rel, href) => {
    if (!href) return;
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  setMeta('description', description);
  setMeta('keywords', keywords);

  // Production-canonical URL строим из REACT_APP_SITE_URL (build-time env),
  // чтобы canonical всегда указывал на prod-домен независимо от того, через какой
  // domain открыта страница (preview / production).
  const base = (_SITE_URL_FROM_ENV || window.__SITE_URL__ || '').replace(/\/$/, '');
  const path = canonicalPath || (window.location.pathname + window.location.search);
  if (base) {
    const fullUrl = `${base}${path}`;
    setLink('canonical', fullUrl);
    setOG('og:url', fullUrl);
  }
  setOG('og:title', ogTitle || title);
  setOG('og:description', ogDescription || description);
  setOG('og:type', 'website');
  if (ogImage) setOG('og:image', ogImage);
}

// Production-canonical URL строим из REACT_APP_SITE_URL (build-time env),
// чтобы canonical всегда указывал на prod-домен, даже когда страница открыта на preview.
// Fallback на window.__SITE_URL__ (из API /settings) или window.location.origin.
const _SITE_URL_FROM_ENV = (process.env.REACT_APP_SITE_URL || '').replace(/\/$/, '');

export function setSiteUrl(url) {
  if (url) window.__SITE_URL__ = url;
}

export function getSiteUrl() {
  return (_SITE_URL_FROM_ENV || window.__SITE_URL__ || window.location.origin).replace(/\/$/, '');
}

export function setJsonLd(data) {
  let script = document.querySelector('#json-ld');
  if (!script) {
    script = document.createElement('script');
    script.id = 'json-ld';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

/**
 * Добавляет JSON-LD BreadcrumbList schema. Принимает массив [{name, path}].
 * path относительный (например, '/uchastniki/aleksandr-sheps').
 * Использует production site_url (getSiteUrl) — поисковики получают канонические prod-URL.
 */
export function setBreadcrumbJsonLd(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const base = getSiteUrl();
  let script = document.querySelector('#json-ld-breadcrumb');
  if (!script) {
    script = document.createElement('script');
    script.id = 'json-ld-breadcrumb';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": `${base}${item.path}`,
    })),
  });
}

export default api;
