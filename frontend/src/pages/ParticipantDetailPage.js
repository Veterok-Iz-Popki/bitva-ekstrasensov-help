import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import api, { setSEO, setJsonLd } from '../lib/api';
import ApplicationForm from '../components/ApplicationForm';

function getFirstName(name) {
  return (name || '').trim().split(' ')[0];
}

/* Simple Russian genitive for common name patterns */
function toGenitive(fullName) {
  if (!fullName) return fullName;
  const [first = '', last = ''] = fullName.trim().split(' ');
  let gF = first;
  if (first.endsWith('ия')) gF = first.slice(0, -1) + 'и';
  else if (first.endsWith('а')) gF = first.slice(0, -1) + 'ы';
  else if (first.endsWith('я')) gF = first.slice(0, -1) + 'и';
  else if (first.endsWith('й')) gF = first.slice(0, -1) + 'я';
  else if (first.endsWith('д') || first.endsWith('г') || first.endsWith('р') || first.endsWith('к') || first.endsWith('л')) gF = first + 'а';
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
  else if (first.endsWith('д') || first.endsWith('г') || first.endsWith('р')) iF = first + 'ом';
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const INITIAL_REVIEWS = 5;

  useEffect(() => {
    setLoading(true);
    setShowAllReviews(false);
    window.scrollTo(0, 0);
    Promise.all([
      api.get(`/participants/${slug}`),
      api.get(`/participants/${slug}/reviews`),
    ]).then(([partRes, revRes]) => {
      setParticipant(partRes.data);
      setReviews(revRes.data || []);
      const p = partRes.data;
      setSEO({
        title: `Экстрасенс ${p.name} - Официальный сайт помощи | Битва Экстрасенсов`,
        description: p.description,
        keywords: `${p.name}, экстрасенс, консультация, битва экстрасенсов, помощь, прием`,
      });
      setJsonLd({
        "@context": "https://schema.org",
        "@type": "Person",
        name: p.name,
        description: p.description,
        image: p.photo_url,
        jobTitle: p.title,
      });
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (showForm) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

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
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, INITIAL_REVIEWS);
  const hasMore = reviews.length > INITIAL_REVIEWS;

  const ReviewsBlock = ({ testIdPrefix = 'review' }) => (
    <>
      <div className="profile-reviews-header">Отзывы</div>
      {visibleReviews.map((r, i) => (
        <div key={r.id || i} className="mb-5" data-testid={`${testIdPrefix}-card-${i}`}>
          <div className="profile-review-author" data-testid={`${testIdPrefix}-author-${i}`}>
            {r.author_name}{r.author_city ? `, ${r.author_city}` : ''}
          </div>
          <div className="profile-review-text" data-testid={`${testIdPrefix}-text-${i}`}>
            &laquo;{r.text}&raquo;
          </div>
        </div>
      ))}
      {hasMore && !showAllReviews && (
        <button
          onClick={() => setShowAllReviews(true)}
          className="btn-outline-gold px-6 py-2 font-body text-sm inline-flex items-center gap-2 mt-2"
          data-testid={`${testIdPrefix}-show-more-btn`}
        >
          Показать ещё ({reviews.length - INITIAL_REVIEWS})
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
      <p className="profile-disclaimer mt-6">
        Мы не даём гарантии помощи без ознакомления с ситуацией. Результаты могут отличаться в зависимости от обстоятельств. Мы не несём ответственности за отзывы и рекомендации клиентов.
      </p>
    </>
  );

  return (
    <div className="pt-24 md:pt-32 pb-16" data-testid="participant-detail-page">
      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="application-modal">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative z-10 w-full max-w-lg teal-card p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
            <ApplicationForm
              title={`Обратиться к ${datName}`}
              subtitle="Заполните форму и мы свяжемся с вами"
            />
          </div>
        </div>
      )}

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
              <img
                src={participant.photo_url}
                alt={`Официальный сайт ${genName}, фото`}
                className="w-full h-auto object-cover rounded-lg"
              />
            </div>

            {/* Reviews - desktop only */}
            {reviews.length > 0 && (
              <div className="hidden md:block mt-8" data-testid="reviews-desktop">
                <ReviewsBlock testIdPrefix="review" />
              </div>
            )}
          </div>

          {/* === RIGHT COLUMN: Status, Specs, Services, CTA, Description === */}
          <div className="profile-right">
            {/* Status */}
            <div className="profile-section-label">Статус</div>
            <p className="font-body text-white/80 text-base mb-4" data-testid="participant-status">
              {participant.name} — {participant.title || 'участник проекта «Битва Экстрасенсов»'}.
            </p>
            <div className="profile-hr" />

            {/* Specialization */}
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

            {/* Service boxes */}
            <div className="space-y-3 mb-4">
              <div className="profile-service-box" data-testid="service-help">
                Помощь<br />{genName}.
              </div>
              <div className="profile-service-box" data-testid="service-consultation">
                Консультация<br />{genName}.
              </div>
              <div className="profile-service-box" data-testid="service-appointment">
                Записаться на Личный Приём<br />к {datName}.
              </div>
            </div>
            <div className="profile-hr" />

            {/* CTA Block */}
            <div className="profile-cta-block" data-testid="cta-block">
              <p className="font-heading text-xl md:text-2xl font-bold text-white mb-4">
                Не упустите свой шанс
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-gold px-8 py-3 text-lg font-body font-semibold rounded-full"
                data-testid="cta-apply-btn-top"
              >
                Обратиться
              </button>
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

            {/* How to section */}
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

            {/* Bottom CTA */}
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="btn-gold px-10 py-4 text-lg md:text-xl font-body font-semibold rounded-full"
                data-testid="cta-apply-btn-bottom"
              >
                Обратиться
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Reviews */}
        {reviews.length > 0 && (
          <div className="md:hidden mt-10" data-testid="reviews-mobile">
            <ReviewsBlock testIdPrefix="review-mobile" />
          </div>
        )}
      </div>
    </div>
  );
}
