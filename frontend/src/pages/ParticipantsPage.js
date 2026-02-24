import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
    <div className="pt-24 md:pt-32 pb-24" data-testid="participants-page">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <p className="text-gold text-sm uppercase tracking-[0.3em] mb-4 font-body">Наши специалисты</p>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {blocks.page_title || 'Участники проекта'}
          </h1>
          <p className="text-base md:text-lg text-white/50 font-body max-w-2xl mx-auto">
            {blocks.page_subtitle || 'Сильнейшие экстрасенсы, медиумы и ясновидящие'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {participants.map((p, i) => (
            <Link
              key={p.id}
              to={`/uchastniki/${p.slug}`}
              className={`participant-card group border border-white/5 bg-[#0a0a0a] overflow-hidden ${
                i === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
              data-testid={`participant-card-${p.slug}`}
            >
              <div className={`${i === 0 ? 'aspect-[4/3]' : 'aspect-[3/4]'} overflow-hidden relative`}>
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="font-heading text-2xl font-semibold text-white mb-1">{p.name}</h2>
                  <p className="text-sm text-gold/80 font-body mb-3">{p.title}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(p.specializations || []).slice(0, 3).map((s, j) => (
                      <Badge key={j} variant="outline" className="border-white/20 text-white/60 text-xs font-body">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-white/50 font-body line-clamp-2">{p.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
