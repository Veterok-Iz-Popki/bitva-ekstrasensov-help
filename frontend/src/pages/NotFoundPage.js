import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setSEO } from '../lib/api';

export default function NotFoundPage() {
  useEffect(() => {
    setSEO({
      title: 'Страница не найдена',
      description: 'Страница не найдена или была удалена',
    });

    // noindex, nofollow — поисковики не будут индексировать 404
    const ensure = (selector, create) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = create();
        document.head.appendChild(el);
      }
      return el;
    };
    const robotsMeta = ensure('meta[name="robots"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'robots');
      return m;
    });
    robotsMeta.setAttribute('content', 'noindex, nofollow');

    // Чистим JSON-LD от предыдущей страницы — на 404 структурированных данных не должно быть
    const stale = document.querySelector('#json-ld');
    if (stale) stale.remove();
    const staleBc = document.querySelector('#json-ld-breadcrumb');
    if (staleBc) staleBc.remove();

    return () => {
      // При уходе со страницы убираем noindex, чтобы остальные страницы остались индексируемыми
      const m = document.querySelector('meta[name="robots"]');
      if (m) m.remove();
    };
  }, []);

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="not-found-page">
      <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
        <p className="font-heading text-7xl md:text-8xl text-gold/70 mb-6" data-testid="not-found-code">
          404
        </p>
        <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4" data-testid="not-found-title">
          Страница не найдена
        </h1>
        <p className="text-white/50 font-body text-base md:text-lg leading-relaxed mb-8" data-testid="not-found-description">
          К сожалению, страница не существует или была удалена. Проверьте адрес или перейдите на главную.
        </p>
        <Link to="/">
          <button className="btn-gold px-8 py-3 text-base font-body font-semibold" data-testid="not-found-home-btn">
            На главную
          </button>
        </Link>
      </div>
    </div>
  );
}
