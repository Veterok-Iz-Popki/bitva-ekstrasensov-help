/**
 * Универсальный компонент <picture> с fallback на jpg/png.
 * Если URL указывает на /api/uploads/<id>.(jpg|jpeg|png), автоматически
 * добавляет <source srcSet=".webp" type="image/webp">.
 *
 * Для прочих URL (внешние ссылки, .svg, .webp) рендерит обычный <img>.
 */
export default function PictureImg({ src, alt = '', className, style, loading = 'lazy', width, height, fetchpriority, ...rest }) {
  if (!src) return null;

  // Только для наших uploads имеется .webp пара.
  // Внешние URL и относительные пути не трогаем (там .webp может не существовать).
  const isOurUpload = typeof src === 'string' && /\/api\/uploads\/[^/?#]+\.(jpg|jpeg|png)(\?.*)?$/i.test(src);
  const m = isOurUpload ? src.match(/^(.*)\.(jpg|jpeg|png)(\?.*)?$/i) : null;
  const webpSrc = m ? `${m[1]}.webp${m[3] || ''}` : null;

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
  if (fetchpriority) imgProps.fetchpriority = fetchpriority;

  if (!webpSrc) {
    return <img {...imgProps} />;
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img {...imgProps} />
    </picture>
  );
}
