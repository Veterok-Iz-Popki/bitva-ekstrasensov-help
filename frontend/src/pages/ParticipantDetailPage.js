import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { setSEO, setJsonLd, setBreadcrumbJsonLd, getSiteUrl } from '../lib/api';
import { buildFallbackSeo } from '../lib/participantSeoFallback';
import PictureImg from '../components/PictureImg';

function getFirstName(name) {
  return (name || '').trim().split(' ')[0];
}

function toGenitive(fullName) {
  if (!fullName) return fullName;
  const [first = '', last = ''] = fullName.trim().split(' ');
  let gF = first;
  if (first.endsWith('ия')) gF = first.slice(0, -1) + 'и';
  else if (first.endsWith('а')) gF = first.slice(0, -1) + 'ы';
  else if (first.endsWith('я')) gF = first.slice(0, -1) + 'и';
  else if (first.endsWith('й')) gF = first.slice(0, -1) + 'я';
  else if (/[бвгджзклмнпрстфхцчшщ]$/.test(first)) gF = first + 'а';
  let gL = last;
  if (last.endsWith('ова') || last.endsWith('ева')) gL = last.slice(0, -1) + 'ой';
  else if (last.endsWith('ов') || last.endsWith('ев')) gL = last + 'а';
  else if (last.endsWith('ый')) gL = last.slice(0, -2) + 'ого';
  else if (last.endsWith('ий')) gL = last.slice(0, -2) + 'ого';
  else if (last.endsWith('ая')) gL = last.slice(0, -2) + 'ой';
  else if (last.endsWith('ко')) gL = last;
  else if (last.endsWith('с')) gL = last + 'а';
  return `${gF} ${gL}`.trim();
}

function toDative(fullName) {
  if (!fullName) return fullName;
  const [first = '', last = ''] = fullName.trim().split(' ');
  let dF = first;
  if (first.endsWith('ия')) dF = first.slice(0, -1) + 'и';
  else if (first.endsWith('а')) dF = first.slice(0, -1) + 'е';
  else if (first.endsWith('я')) dF = first.slice(0, -1) + 'е';
  else if (first.endsWith('й')) dF = first.slice(0, -1) + 'ю';
  else if (/[бвгджзклмнпрстфхцчшщ]$/.test(first)) dF = first + 'у';
  let dL = last;
  if (last.endsWith('ова') || last.endsWith('ева')) dL = last.slice(0, -1) + 'ой';
  else if (last.endsWith('ов') || last.endsWith('ев')) dL = last + 'у';
  else if (last.endsWith('ый')) dL = last.slice(0, -2) + 'ому';
  else if (last.endsWith('ий')) dL = last.slice(0, -2) + 'ому';
  else if (last.endsWith('ая')) dL = last.slice(0, -2) + 'ой';
  else if (last.endsWith('ко')) dL = last;
  else if (last.endsWith('с')) dL = last + 'у';
  return `${dF} ${dL}`.trim();
}

function toInstrumental(fullName) {
  if (!fullName) return fullName;
  const [first = '', last = ''] = fullName.trim().split(' ');
  let iF = first;
  if (first.endsWith('ия')) iF = first.slice(0, -1) + 'ей';
  else if (first.endsWith('а')) iF = first.slice(0, -1) + 'ой';
  else if (first.endsWith('я')) iF = first.slice(0, -1) + 'ей';
  else if (first.endsWith('й')) iF = first.slice(0, -1) + 'ем';
  else if (/[бвгджзклмнпрстфхцчшщ]$/.test(first)) iF = first + 'ом';
  let iL = last;
  if (last.endsWith('ова') || last.endsWith('ева')) iL = last.slice(0, -1) + 'ой';
  else if (last.endsWith('ов') || last.endsWith('ев')) iL = last + 'ым';
  else if (last.endsWith('ый')) iL = last.slice(0, -2) + 'ым';
  else if (last.endsWith('ий')) iL = last.slice(0, -2) + 'им';
  else if (last.endsWith('ая')) iL = last.slice(0, -2) + 'ой';
  else if (last.endsWith('ко')) iL = last;
  else if (last.endsWith('с')) iL = last + 'ом';
  return `${iF} ${iL}`.trim();
}

export default function ParticipantDetailPage() {
  const { slug } = useParams();
  const [participant, setParticipant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [allParticipants, setAllParticipants] = useState([]);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    Promise.all([
      api.get(`/participants/${slug}`),
      api.get(`/participants/${slug}/reviews`),
      api.get('/participants'),
      api.get(`/seo/participant-${slug}`).catch(() => ({ data: null })),
    ]).then(([partRes, revRes, allRes, seoRes]) => {
      setParticipant(partRes.data);
      setReviews(revRes.data || []);
      setAllParticipants(allRes.data || []);
      const p = partRes.data;
      const seo = seoRes.data;
      // Единый fallback — та же функция, что использует админка при первом открытии
      // формы участника (гарантия отсутствия расхождений между admin preview и live).
      const fb = buildFallbackSeo(p);
      setSEO({
        title: seo?.title || fb.title,
        description: seo?.description || fb.description,
        keywords: seo?.keywords || fb.keywords,
        canonicalPath: `/uchastniki/${slug}`,
        ogTitle: seo?.og_title || fb.og_title,
        ogDescription: seo?.og_description || fb.og_description,
        ogImage: p.photo_url ? (p.photo_url.startsWith('http') ? p.photo_url : `${getSiteUrl()}${p.photo_url}`) : undefined,
      });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Person",
        name: p.name,
        description: p.description,
        image: p.photo_url,
        jobTitle: p.title,
        url: `${getSiteUrl()}/uchastniki/${slug}`,
      });
      setBreadcrumbJsonLd([
        { name: 'Главная', path: '/' },
        { name: 'Экстрасенсы', path: '/#ekstrasensy' },
        { name: p.name, path: `/uchastniki/${slug}` },
      ]);
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="text-white/40 font-body">Загрузка...</div>
    </div>
  );

  if (notFound || !participant) return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-20 gap-4">
      <p className="text-white/50 font-body text-lg">Участник не найден</p>
      <Link to="/#ekstrasensy" className="btn-outline-gold px-6 py-2 font-body text-sm">К списку участников</Link>
    </div>
  );

  const firstName = getFirstName(participant.name);
  const genName = toGenitive(participant.name);
  const datName = toDative(participant.name);
  const instrName = toInstrumental(participant.name);
  const specs = participant.specializations || [];

  const bookingUrl = `/zapis-na-priem?psychic=${slug}`;

  const ReviewsBlock = ({ testIdPrefix = 'review' }) => (
    <>
      <div className="profile-reviews-header">Отзывы</div>
      {reviews.map((r, i) => (
        <div key={r.id || i} className="mb-5" data-testid={`${testIdPrefix}-card-${i}`}>
          <div className="profile-review-author" data-testid={`${testIdPrefix}-author-${i}`}>
            {r.author_name}{r.author_city ? `, ${r.author_city}` : ''}
          </div>
          <div className="profile-review-text" data-testid={`${testIdPrefix}-text-${i}`}>
            {r.text}
          </div>
        </div>
      ))}
      <p className="profile-disclaimer mt-6">
        Мы не даём гарантии помощи без ознакомления с ситуацией. Результаты могут отличаться в зависимости от обстоятельств. Мы не несём ответственности за отзывы и рекомендации клиентов.
      </p>
    </>
  );

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="participant-detail-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Back navigation */}
        <Link
          to="/#ekstrasensy"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-gold transition-colors font-body mb-6"
          data-testid="back-to-participants"
        >
          <ArrowLeft className="w-4 h-4" />
          Все участники
        </Link>

        {/* Page title */}
        <h1
          className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-gold text-center mb-8 md:mb-10"
          data-testid="participant-page-title"
        >
          Официальная страница помощи {genName}
        </h1>

        {/* Two-column layout */}
        <div className="profile-layout">
          {/* === LEFT COLUMN: Photo + Reviews (desktop) === */}
          <div className="profile-left">
            <div className="profile-photo-wrapper" data-testid="participant-photo">
              <PictureImg
                src={participant.photo_url}
                alt={`Официальный сайт ${genName}, фото`}
                className="w-full h-auto object-cover rounded-lg"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            {reviews.length > 0 && (
              <div className="profile-reviews mt-8" data-testid="reviews-desktop">
                <ReviewsBlock testIdPrefix="review" />
              </div>
            )}
          </div>

          {/* === RIGHT COLUMN: Status, Specs, Services, CTA, Description === */}
          <div className="profile-right">
            <div className="profile-section-label">Статус</div>
            <p className="font-body text-white/80 text-base mb-4" data-testid="participant-status">
              {participant.name} — {participant.title || 'участник проекта «Битва Экстрасенсов»'}.
            </p>
            <div className="profile-hr" />

            {specs.length > 0 && (
              <>
                <div className="profile-section-label">Специализация</div>
                <div className="flex flex-wrap gap-2 mb-4" data-testid="participant-specializations">
                  {specs.map((s, i) => (
                    <span key={i} className="profile-pill">{s}</span>
                  ))}
                </div>
                <div className="profile-hr" />
              </>
            )}

            <div className="space-y-3 mb-4">
              <Link to={bookingUrl} className="block no-underline" data-testid="service-help">
                <div className="profile-service-box cursor-pointer hover:border-gold/60 transition-colors">
                  Помощь<br />{genName}.
                </div>
              </Link>
              <Link to={bookingUrl} className="block no-underline" data-testid="service-consultation">
                <div className="profile-service-box cursor-pointer hover:border-gold/60 transition-colors">
                  Консультация<br />{genName}.
                </div>
              </Link>
              <Link to={bookingUrl} className="block no-underline" data-testid="service-appointment">
                <div className="profile-service-box cursor-pointer hover:border-gold/60 transition-colors">
                  Записаться на Личный Приём<br />к {datName}.
                </div>
              </Link>
            </div>
            <div className="profile-hr" />

            {/* CTA Block */}
            <div className="profile-cta-block" data-testid="cta-block">
              <p className="font-heading text-xl md:text-2xl font-bold text-white mb-4">
                Не упустите свой шанс
              </p>
              <Link to={bookingUrl}>
                <button
                  className="btn-gold px-8 py-3 text-lg font-body font-semibold rounded-full"
                  data-testid="cta-apply-btn-top"
                >
                  Обратиться
                </button>
              </Link>
              <p className="font-heading text-lg md:text-xl text-white/80 mt-3">
                Количество обращений ограниченно!
              </p>
            </div>

            {/* Main biographical text */}
            <div className="profile-description" data-testid="participant-description">
              {(participant.full_description || participant.description || '').split('\n').filter(Boolean).map((p, i) => (
                <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(new RegExp(`(${participant.name}|${firstName})`, 'gi'), '<strong>$1</strong>') }} />
              ))}
            </div>

            {/* How to section — only shown if not already in full_description */}
            {!(participant.full_description || '').includes('Данная страница') && (
            <div className="profile-description" data-testid="participant-help-info">
              <p>Данная страница является личной страницей помощи <strong>{genName}</strong>.</p>
              <p>Здесь вы имеете возможность:</p>
              <p>* Лично <strong>связаться и пообщаться</strong> с {instrName}.</p>
              <p>* Записаться на <strong>личный прием</strong> к {datName}.</p>
              <p className="mt-4">
                Для того, чтобы получить <strong>помощь</strong>, <strong>консультацию</strong> либо записаться
                на <strong>личный прием</strong> к {datName}, вам нужно:
              </p>
              <p>1. Нажать на кнопку <strong>«Обратиться»</strong>.</p>
              <p>2. <strong>Заполните форму</strong> (для того чтобы {firstName} лично с вами связался(-ась))</p>
              <p>3. <strong>Ждите звонок!!!</strong></p>
            </div>
            )}

            {/* Bottom CTA */}
            <div className="mt-6">
              <Link to={bookingUrl}>
                <button
                  className="btn-gold px-10 py-4 text-lg md:text-xl font-body font-semibold rounded-full"
                  data-testid="cta-apply-btn-bottom"
                >
                  Обратиться
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Другие экстрасенсы — internal cross-linking для SEO */}
        {allParticipants.filter(p => p.slug !== slug).length > 0 && (
          <section className="mt-12" data-testid="other-participants">
            <h2 className="font-heading text-xl md:text-2xl font-semibold text-gold/90 mb-5">Другие экстрасенсы</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allParticipants
                .filter(p => p.slug !== slug)
                .slice(0, 7)
                .map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/uchastniki/${p.slug}`}
                      className="block teal-card p-3 hover:border-gold/50 transition-colors text-white/80 hover:text-gold font-body text-sm text-center"
                      aria-label={`Перейти к экстрасенсу ${p.name}`}
                      data-testid={`other-participant-${p.slug}`}
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
