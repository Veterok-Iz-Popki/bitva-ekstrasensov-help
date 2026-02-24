import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';

export default function ParticipantDetailPage() {
  const { slug } = useParams();
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/participants/${slug}`)
      .then((res) => {
        setParticipant(res.data);
        setSEO({
          title: `${res.data.name} — участник Битвы экстрасенсов | Запись на консультацию`,
          description: res.data.description,
          keywords: `${res.data.name}, экстрасенс, консультация, битва экстрасенсов`,
        });
        setJsonLd({ "@context": "https://schema.org", "@type": "Person", "name": res.data.name, "description": res.data.description, "image": res.data.photo_url, "jobTitle": res.data.title });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;

  if (notFound || !participant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-white/50 font-body text-lg">Участник не найден</p>
        <Link to="/uchastniki" className="btn-outline-gold px-6 py-2 font-body text-sm">К списку участников</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="participant-detail-page">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <Link to="/uchastniki" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold transition-colors font-body mb-8" data-testid="back-to-participants">
          <ArrowLeft className="w-4 h-4" />Все участники
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="aspect-square overflow-hidden rounded border border-teal-light/30">
              <img src={participant.photo_url} alt={participant.name} className="w-full h-full object-cover" data-testid="participant-photo" />
            </div>
          </div>
          <div className="md:col-span-2">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-gold mb-2" data-testid="participant-name">{participant.name}</h1>
            <p className="text-white/70 font-body mb-4" data-testid="participant-title">{participant.title}</p>
            {participant.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-6" data-testid="participant-specializations">
                {participant.specializations.map((s, i) => (
                  <span key={i} className="badge-spec">{s}</span>
                ))}
              </div>
            )}
            <div className="text-white/60 font-body leading-relaxed space-y-3 mb-8" data-testid="participant-description">
              {(participant.full_description || participant.description || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <Link to="/zapis-na-priem">
              <button className="btn-gold px-8 py-3 text-base font-body" data-testid="participant-book-btn">
                Записаться на приём
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
