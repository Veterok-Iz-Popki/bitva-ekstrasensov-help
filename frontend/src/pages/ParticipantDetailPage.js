import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
        setJsonLd({
          "@context": "https://schema.org",
          "@type": "Person",
          "name": res.data.name,
          "description": res.data.description,
          "image": res.data.photo_url,
          "jobTitle": res.data.title,
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center pt-20"><div className="text-white/40 font-body">Загрузка...</div></div>;
  }

  if (notFound || !participant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
        <p className="text-white/50 font-body text-lg">Участник не найден</p>
        <Link to="/uchastniki">
          <Button variant="outline" className="border-gold text-gold hover:bg-gold hover:text-black font-body">
            <ArrowLeft className="w-4 h-4 mr-2" />
            К списку участников
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-24" data-testid="participant-detail-page">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <Link to="/uchastniki" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold transition-colors font-body mb-8" data-testid="back-to-participants">
          <ArrowLeft className="w-4 h-4" />
          Все участники
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-12">
          {/* Photo */}
          <div className="md:col-span-2">
            <div className="aspect-[3/4] overflow-hidden border border-white/5">
              <img
                src={participant.photo_url}
                alt={participant.name}
                className="w-full h-full object-cover"
                data-testid="participant-photo"
              />
            </div>
          </div>

          {/* Info */}
          <div className="md:col-span-3">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight" data-testid="participant-name">
              {participant.name}
            </h1>
            <p className="text-gold text-lg font-body mb-6" data-testid="participant-title">{participant.title}</p>

            {participant.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8" data-testid="participant-specializations">
                {participant.specializations.map((s, i) => (
                  <Badge key={i} variant="outline" className="border-gold/30 text-gold/80 font-body px-3 py-1">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            <div className="text-white/60 font-body leading-relaxed space-y-4 mb-10" data-testid="participant-description">
              {(participant.full_description || participant.description || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <Link to="/zapis-na-priem">
              <Button
                data-testid="participant-book-btn"
                className="bg-burgundy hover:bg-burgundy-light text-white px-10 py-6 text-base uppercase tracking-widest font-body shadow-[0_0_10px_rgba(107,21,37,0.5)] hover:shadow-[0_0_20px_rgba(107,21,37,0.8)]"
              >
                Записаться на приём
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
