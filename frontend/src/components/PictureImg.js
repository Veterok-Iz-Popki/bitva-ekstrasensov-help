/**
 * Универсальный компонент <picture> с приоритетом форматов:
 *   AVIF → WebP → JPG/PNG fallback
 *
 * Если URL указывает на /api/uploads/<id>.(jpg|jpeg|png), автоматически
 * добавляет <source srcSet=".avif" type="image/avif">
 *      и <source srcSet=".webp" type="image/webp">.
 *
 * Для прочих URL (внешние ссылки, .svg, .webp как src) рендерит обычный <img>.
 */
export default function PictureImg({ src, alt = '', className, style, loading = 'lazy', width, height, fetchPriority, ...rest }) {
  if (!src) return null;

  // Только для наших uploads имеется .webp/.avif пара.
  // Внешние URL и относительные пути не трогаем (там вариантов может не существовать).
  const isOurUpload = typeof src === 'string' && /\/api\/uploads\/[^/?#]+\.(jpg|jpeg|png)(\?.*)?$/i.test(src);
  const m = isOurUpload ? src.match(/^(.*)\.(jpg|jpeg|png)(\?.*)?$/i) : null;
  const webpSrc = m ? `${m[1]}.webp${m[3] || ''}` : null;
  const avifSrc = m ? `${m[1]}.avif${m[3] || ''}` : null;

  const imgProps = {
    src,
    alt,
    className,
    style,
    loading,
    decoding: 'async',
    width,
    height,
    ...rest,
  };
  // React 19+ поддерживает fetchPriority как proper prop. Для совместимости
  // также добавляем lowercase HTML-атрибут (это валидный HTML5 атрибут).
  if (fetchPriority) {
    imgProps.fetchPriority = fetchPriority;
  }

  if (!webpSrc) {
    return <img {...imgProps} />;
  }

  return (
    <picture>
      {avifSrc && <source srcSet={avifSrc} type="image/avif" />}
      <source srcSet={webpSrc} type="image/webp" />
      <img {...imgProps} />
    </picture>
  );
}
