/**
 * Универсальный компонент <picture> с приоритетом форматов:
 *   AVIF → WebP → JPG/PNG fallback
 *
 * Стратегия выбора форматов:
 *  - WebP: backend (upload pipeline через sharp) гарантированно создаёт `.webp`
 *    для всех загружаемых JPG/PNG, поэтому WebP source включается для всех
 *    `/api/uploads/<id>.(jpg|jpeg|png)` URL.
 *  - AVIF: создаётся вручную только для специально подготовленного набора —
 *    фото участников (`*-new`) и логотипов (`logo-bitva`, `logo-tnt`).
 *    Для CMS-uploads (UUID-style имена в галерее, видео, страницах) AVIF
 *    отсутствует — добавление `<source type="image/avif">` приводило бы к 404.
 *  - `<img src>` — всегда оригинальный JPG/PNG (рабочий fallback).
 *
 * Если нужно явно указать наличие AVIF для не входящих в whitelist URL —
 * передайте проп `hasAvif={true}` или конкретный `avifSrc="..."`.
 *
 * Для внешних URL, SVG, .webp/.avif как src — рендерится обычный <img>.
 */

// Известные паттерны uploads, для которых вручную сгенерированы AVIF-версии.
// При добавлении новой пакетной AVIF-конвертации — расширить регулярку.
const KNOWN_AVIF_PATTERNS = /(?:-new|^logo-bitva|^logo-tnt)$/;

export default function PictureImg({
  src,
  alt = '',
  className,
  style,
  loading = 'lazy',
  width,
  height,
  fetchPriority,
  hasAvif,
  avifSrc: explicitAvifSrc,
  webpSrc: explicitWebpSrc,
  ...rest
}) {
  if (!src) return null;

  const isOurUpload = typeof src === 'string' && /\/api\/uploads\/[^/?#]+\.(jpg|jpeg|png)(\?.*)?$/i.test(src);
  const m = isOurUpload ? src.match(/^(.*\/)([^/]+)\.(jpg|jpeg|png)(\?.*)?$/i) : null;
  const baseName = m ? m[2] : null;
  const webpSrc = explicitWebpSrc || (m ? `${m[1]}${m[2]}.webp${m[4] || ''}` : null);
  // AVIF включаем только если:
  //   1) явно передан avifSrc или hasAvif=true (компонент-владелец гарантирует наличие)
  //   2) baseName матчит белый список известных AVIF-паттернов
  const allowAvif = explicitAvifSrc || hasAvif || (baseName && KNOWN_AVIF_PATTERNS.test(baseName));
  const avifSrc = allowAvif ? (explicitAvifSrc || `${m[1]}${m[2]}.avif${m[4] || ''}`) : null;

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
