import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import api, { setSEO, setJsonLd, setBreadcrumbJsonLd, getSiteUrl } from '../lib/api';
import PictureImg from '../components/PictureImg';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const fullUrl = (u) => u && u.startsWith('/') ? API_URL + u : u;

// Mime-type из расширения для подсказки браузеру в <source>
function videoTypeFromUrl(url) {
  if (!url) return undefined;
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'ogv' || ext === 'ogg') return 'video/ogg';
  return undefined;
}

function LazyVideo({ video, idx }) {
  const [active, setActive] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef(null);
  const posterSrc = fullUrl(video.thumbnail_url);
  const videoSrc = fullUrl(video.video_url);
  const videoType = videoTypeFromUrl(video.video_url);

  // Когда видео достигает HAVE_CURRENT_DATA (есть первый кадр) — пробуем play() вручную.
  // На медленных сетях этого хватает для старта progressive playback — не ждём canplaythrough
  // или полного буфера. Если autoplay со звуком блокирован, ловим promise и оставляем
  // на пользователе нажать controls Play (он всё ещё видит постер).
  const handleLoadedData = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    }
  };

  return (
    <article className="teal-card overflow-hidden group" data-testid={`video-card-${idx}`}>
      <div className="relative aspect-video bg-black/50">
        {active ? (
          <>
            <video
              key={video.id}
              ref={videoRef}
              poster={posterSrc || undefined}
              controls
              autoPlay
              playsInline
              preload="auto"
              onLoadStart={() => setBuffering(true)}
              onLoadedData={handleLoadedData}
              onPlaying={() => setBuffering(false)}
              onCanPlay={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              data-testid={`video-player-${idx}`}
            >
              {/* <source> с type-hint позволяет браузеру решить о support без HEAD-запроса.
                  Браузер начинает range fetch немедленно. */}
              <source src={videoSrc} type={videoType} />
            </video>
            {buffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" data-testid={`video-loader-${idx}`}>
                <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <button
            onClick={() => { setBuffering(true); setActive(true); }}
            className="w-full h-full relative cursor-pointer"
            data-testid={`video-play-btn-${idx}`}
            aria-label={`Воспроизвести: ${video.title || 'Видео'}`}
          >
            {posterSrc ? (
              <PictureImg
                src={posterSrc}
                alt={video.title || 'Видео'}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-teal-dark/80">
                <Play className="w-12 h-12 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
              <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 text-teal-darker ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>
      <div className="p-4">
        {video.title && (
          <h3 className="font-body font-semibold text-white text-base mb-1" data-testid={`video-title-${idx}`}>
            {video.title}
          </h3>
        )}
        {video.description && (
          <p className="font-body text-white/50 text-sm line-clamp-2">{video.description}</p>
        )}
      </div>
    </article>
  );
}

export default function VideoPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/gallery/videos'),
      api.get('/seo/video'),
    ]).then(([videosRes, seoRes]) => {
      const list = videosRes.data || [];
      setVideos(list);
      const seo = seoRes.data;
      if (seo?.title) setSEO({
        title: seo.title,
        description: seo.description,
        keywords: seo.keywords,
        canonicalPath: '/video',
        ogTitle: seo.og_title,
        ogDescription: seo.og_description,
      });
      // Schema: CollectionPage + ItemList с вложенными VideoObject (валидная Schema.org разметка)
      const SITE = getSiteUrl();
      const toAbs = (u) => {
        if (!u) return undefined;
        if (/^https?:\/\//i.test(u)) return u;
        return `${SITE}${u.startsWith('/') ? '' : '/'}${u}`;
      };
      const pageUrl = `${SITE}/video`;
      const itemListElement = list.map((v, i) => {
        const videoObject = {
          "@type": "VideoObject",
          "name": v.title || "Видео экстрасенсов",
          "description": v.description || v.title || "Видео экстрасенсов «Битва экстрасенсов»",
          "thumbnailUrl": toAbs(v.thumbnail_url) || toAbs(v.video_url),
          "contentUrl": toAbs(v.video_url),
          "uploadDate": (() => {
            const raw = v.created_at || v.upload_date;
            if (!raw) return undefined;
            // Преобразуем MySQL datetime "2026-05-29 09:35:00" в ISO 8601 для Schema.org
            const d = new Date(typeof raw === 'string' && !raw.endsWith('Z') ? raw.replace(' ', 'T') + 'Z' : raw);
            return isNaN(d.getTime()) ? undefined : d.toISOString();
          })(),
        };
        // Удаляем undefined-поля, чтобы JSON-LD был чистым
        Object.keys(videoObject).forEach((k) => videoObject[k] === undefined && delete videoObject[k]);
        return {
          "@type": "ListItem",
          "position": i + 1,
          "item": videoObject,
        };
      });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": seo?.title || "Видео",
        "url": pageUrl,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": list.length,
          "itemListElement": itemListElement,
        },
      });
      setBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: 'Видео', path: '/video' },
      ]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-white/40 font-body">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="video-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <nav className="mb-8 text-sm font-body">
          <Link to="/" className="text-white/40 hover:text-gold transition-colors">Главная</Link>
          <span className="text-white/30 mx-2">/</span>
          <span className="text-gold">Видео</span>
        </nav>

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-10" data-testid="video-title">
          Видео экстрасенсов
        </h1>

        {videos.length === 0 ? (
          <p className="text-white/50 font-body text-center py-16" data-testid="video-empty">
            Видеоматериалы скоро появятся
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="video-grid">
            {videos.map((video, idx) => (
              <LazyVideo key={video.id} video={video} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
