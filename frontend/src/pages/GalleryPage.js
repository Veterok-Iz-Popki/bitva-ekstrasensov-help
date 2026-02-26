import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';

export default function GalleryPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(-1);

  useEffect(() => {
    Promise.all([
      api.get('/gallery/photos'),
      api.get('/seo/foto-galereya'),
    ]).then(([photosRes, seoRes]) => {
      setPhotos(photosRes.data || []);
      const seo = seoRes.data;
      if (seo?.title) setSEO({ title: seo.title, description: seo.description, keywords: seo.keywords });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        "name": seo?.title || "Фотогалерея",
        "url": window.location.href,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openLightbox = (idx) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(-1);

  const goPrev = useCallback(() => {
    setLightboxIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setLightboxIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIdx < 0) return;
    const handler = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx, goPrev, goNext]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="gallery-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <nav className="mb-8 text-sm font-body">
          <Link to="/" className="text-white/40 hover:text-gold transition-colors">Главная</Link>
          <span className="text-white/30 mx-2">/</span>
          <span className="text-gold">Фотогалерея</span>
        </nav>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-10" data-testid="gallery-title">
          Фотогалерея
        </h1>

        {photos.length === 0 ? (
          <p className="text-white/50 font-body text-center py-16" data-testid="gallery-empty">
            Фотографии скоро появятся
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" data-testid="gallery-grid">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(idx)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-teal-light/20 hover:border-gold/50 transition-all duration-300 cursor-pointer bg-teal-dark/50"
                data-testid={`gallery-photo-${idx}`}
              >
                <img
                  src={photo.image_url}
                  alt={photo.alt_text || photo.title || 'Фото'}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {photo.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-body truncate">{photo.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx >= 0 && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
          data-testid="lightbox-overlay"
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
            data-testid="lightbox-close"
          >
            <X className="w-7 h-7" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 z-10"
            data-testid="lightbox-prev"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 z-10"
            data-testid="lightbox-next"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightboxIdx].image_url}
              alt={photos[lightboxIdx].alt_text || photos[lightboxIdx].title || 'Фото'}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
              data-testid="lightbox-image"
            />
            {(photos[lightboxIdx].title || photos[lightboxIdx].description) && (
              <div className="mt-4 text-center max-w-xl">
                {photos[lightboxIdx].title && (
                  <p className="text-white font-body font-semibold">{photos[lightboxIdx].title}</p>
                )}
                {photos[lightboxIdx].description && (
                  <p className="text-white/50 font-body text-sm mt-1">{photos[lightboxIdx].description}</p>
                )}
              </div>
            )}
            <p className="text-white/30 font-body text-xs mt-3">
              {lightboxIdx + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
