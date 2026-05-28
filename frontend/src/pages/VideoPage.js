import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';
import PictureImg from '../components/PictureImg';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';
const fullUrl = (u) => u && u.startsWith('/') ? API_URL + u : u;

function LazyVideo({ video, idx }) {
  const [active, setActive] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const posterSrc = fullUrl(video.thumbnail_url);
  const videoSrc = fullUrl(video.video_url);

  return (
    <article className="teal-card overflow-hidden group" data-testid={`video-card-${idx}`}>
      <div className="relative aspect-video bg-black/50">
        {active ? (
          <>
            {/* src задаётся через атрибут на mount — браузер сразу делает один range-запрос
                и начинает потоковое воспроизведение (без переинициализации loader'а). */}
            <video
              key={video.id}
              src={videoSrc}
              poster={posterSrc || undefined}
              controls
              autoPlay
              playsInline
              preload="auto"
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onCanPlay={() => setBuffering(false)}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              data-testid={`video-player-${idx}`}
            />
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
      setVideos(videosRes.data || []);
      const seo = seoRes.data;
      if (seo?.title) setSEO({ title: seo.title, description: seo.description, keywords: seo.keywords });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "VideoGallery",
        "name": seo?.title || "Видео",
        "url": window.location.href,
      });
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
          Видео
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
