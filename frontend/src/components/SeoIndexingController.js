import { useEffect } from 'react';
import api from '../lib/api';

/**
 * Глобальный SEO Indexing Controller.
 *
 * Один раз при загрузке приложения читает /api/settings → seo_indexing_enabled
 * и при необходимости ставит на <head> meta-теги:
 *   <meta name="robots" content="noindex, nofollow">
 *   <meta name="googlebot" content="noindex, nofollow">
 *
 * Эти теги имеют data-attribute `data-seo-toggle="global"`, чтобы:
 *   - не конфликтовать с setSEO() (он эти теги не трогает)
 *   - не конфликтовать с NotFoundPage (он ставит свой meta robots без data-attr и cleanup-ит его)
 *   - можно было однозначно убрать при включении индексации
 *
 * Компонент не рендерит ничего видимого.
 */
export default function SeoIndexingController() {
  useEffect(() => {
    let cancelled = false;

    const applyState = (enabled) => {
      if (cancelled) return;
      const existing = Array.from(document.querySelectorAll('meta[data-seo-toggle="global"]'));
      if (enabled) {
        existing.forEach((el) => el.remove());
        return;
      }
      const ensure = (name) => {
        let el = document.querySelector(`meta[name="${name}"][data-seo-toggle="global"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('name', name);
          el.setAttribute('data-seo-toggle', 'global');
          document.head.appendChild(el);
        }
        el.setAttribute('content', 'noindex, nofollow');
      };
      ensure('robots');
      ensure('googlebot');
    };

    api.get('/settings').then((res) => {
      const enabled = (res.data?.seo_indexing_enabled === undefined) ? 1 : Number(res.data.seo_indexing_enabled);
      applyState(!!enabled);
    }).catch(() => {
      // На ошибке /api/settings — оставляем индексацию включённой (default-friendly поведение)
      applyState(true);
    });

    return () => { cancelled = true; };
  }, []);

  return null;
}
