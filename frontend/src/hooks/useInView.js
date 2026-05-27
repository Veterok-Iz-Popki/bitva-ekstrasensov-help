import { useEffect, useRef, useState } from 'react';

/**
 * Возвращает true, когда отслеживаемый элемент впервые попал в viewport
 * (плюс заданный rootMargin для предзагрузки до фактической видимости).
 *
 * Используется для defer-mount тяжёлых below-the-fold секций главной.
 *
 * После первого попадания значение остаётся true (не сбрасывается при выходе).
 *
 *   const [ref, inView] = useInView({ rootMargin: '300px' });
 *   return <div ref={ref}>{inView && <HeavySection />}</div>;
 */
export default function useInView({ rootMargin = '200px', threshold = 0 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // SSR / Safari fallback
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
          break;
        }
      }
    }, { rootMargin, threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView];
}
