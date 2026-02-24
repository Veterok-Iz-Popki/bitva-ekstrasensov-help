import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { setSEO } from '../lib/api';

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState([]);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/participants'),
      api.get('/pages/participants'),
      api.get('/seo/participants'),
    ]).then(([partRes, pageRes, seoRes]) => {
      setParticipants(partRes.data || []);
      setPage(pageRes.data);
      if (seoRes.data) setSEO(seoRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const blocks = page?.blocks || {};

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="participants-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-white mb-3">
            {blocks.page_title || 'Лучшие экстрасенсы России'}
          </h1>
          <p className="text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || 'Сильнейшие экстрасенсы, медиумы и ясновидящие'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {participants.map((p) => (
            <Link
              key={p.id}
              to={`/uchastniki/${p.slug}`}
              className="participant-card-h group"
              data-testid={`participant-card-${p.slug}`}
            >
              <div className="w-[160px] h-[160px] overflow-hidden rounded flex-shrink-0 border border-teal-light/30">
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="font-heading text-xl font-semibold text-gold mb-1">{p.name}</h2>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(p.specializations || []).slice(0, 3).map((s, j) => (
                    <span key={j} className="badge-spec">{s}</span>
                  ))}
                </div>
                <p className="text-white/60 font-body text-sm line-clamp-3 mb-3">{p.description}</p>
                <span className="btn-outline-gold inline-block w-fit px-5 py-1.5 text-sm font-body">
                  Обратиться
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
