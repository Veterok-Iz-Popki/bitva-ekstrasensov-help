/**
 * Общие константы и морфология для SSR-рендера.
 *
 * ВАЖНО: значения здесь — зеркало клиентских констант, которые НЕ хранятся в БД:
 *   - SERVICE_H1 / SERVICE_RELATED  → frontend/src/pages/ServicePage.js
 *   - TOPIC_H1 / TOPIC_RELATED      → frontend/src/pages/TopicPage.js
 *   - PROBLEM_CATEGORIES / BENEFITS / SERVICE_LINKS → frontend/src/pages/HomePage.js
 *   - toGenitive/toDative/toInstrumental/getFirstName → frontend/src/pages/ParticipantDetailPage.js
 * Приоритет всегда за данными из БД (pages.blocks / seo_settings); константы —
 * тот же fallback, что и на клиенте, поэтому SSR и React дают одинаковый текст.
 */

const SERVICE_H1 = {
  'finansovaya-magiya': 'Финансовая магия — помощь экстрасенса',
  'lyubovnaya-magiya': 'Любовная магия — помощь экстрасенса',
  'magiya-zhizni': 'Магия жизни — помощь экстрасенса',
  'magicheskaya-zashchita': 'Магическая защита — помощь экстрасенса',
};

const SERVICE_NAMES = {
  'finansovaya-magiya': 'Финансовая магия',
  'lyubovnaya-magiya': 'Любовная магия',
  'magiya-zhizni': 'Магия жизни',
  'magicheskaya-zashchita': 'Магическая защита',
};

const SERVICE_RELATED = {
  'finansovaya-magiya': [{ slug: 'magiya-zhizni', name: 'Магия жизни' }, { slug: 'magicheskaya-zashchita', name: 'Магическая защита' }],
  'lyubovnaya-magiya': [{ slug: 'magiya-zhizni', name: 'Магия жизни' }, { slug: 'magicheskaya-zashchita', name: 'Магическая защита' }],
  'magiya-zhizni': [{ slug: 'magicheskaya-zashchita', name: 'Магическая защита' }, { slug: 'finansovaya-magiya', name: 'Финансовая магия' }],
  'magicheskaya-zashchita': [{ slug: 'magiya-zhizni', name: 'Магия жизни' }, { slug: 'lyubovnaya-magiya', name: 'Любовная магия' }],
};

const TOPIC_H1 = {
  'porcha': 'Снятие порчи — помощь экстрасенса',
  'proklyatie': 'Снятие проклятия — помощь экстрасенса',
  'sglaz': 'Снятие сглаза — помощь экстрасенса',
  'venets-bezbrachiya': 'Снятие венца безбрачия — помощь экстрасенса',
  'privorot': 'Снятие приворота — помощь экстрасенса',
  'zaklyatie': 'Снятие заклятия — помощь экстрасенса',
};

const TOPIC_NAMES = {
  'porcha': 'Порча',
  'proklyatie': 'Проклятие',
  'sglaz': 'Сглаз',
  'venets-bezbrachiya': 'Венец безбрачия',
  'privorot': 'Приворот',
  'zaklyatie': 'Заклятие',
};

const TOPIC_RELATED = {
  'porcha': [{ slug: 'sglaz', name: 'Снятие сглаза' }, { slug: 'proklyatie', name: 'Снятие проклятия' }, { slug: 'zaklyatie', name: 'Снятие заклятия' }],
  'proklyatie': [{ slug: 'porcha', name: 'Снятие порчи' }, { slug: 'zaklyatie', name: 'Снятие заклятия' }, { slug: 'venets-bezbrachiya', name: 'Венец безбрачия' }],
  'sglaz': [{ slug: 'porcha', name: 'Снятие порчи' }, { slug: 'proklyatie', name: 'Снятие проклятия' }, { slug: 'zaklyatie', name: 'Снятие заклятия' }],
  'venets-bezbrachiya': [{ slug: 'privorot', name: 'Снятие приворота' }, { slug: 'proklyatie', name: 'Снятие проклятия' }],
  'privorot': [{ slug: 'venets-bezbrachiya', name: 'Венец безбрачия' }, { slug: 'porcha', name: 'Снятие порчи' }, { slug: 'zaklyatie', name: 'Снятие заклятия' }],
  'zaklyatie': [{ slug: 'porcha', name: 'Снятие порчи' }, { slug: 'sglaz', name: 'Снятие сглаза' }, { slug: 'proklyatie', name: 'Снятие проклятия' }],
};

const PROBLEM_CATEGORIES = [
  { label: 'Порча', path: '/porcha' },
  { label: 'Проклятие', path: '/proklyatie' },
  { label: 'Сглаз', path: '/sglaz' },
  { label: 'Венец безбрачия', path: '/venets-bezbrachiya' },
  { label: 'Приворот', path: '/privorot' },
  { label: 'Заклятие', path: '/zaklyatie' },
];

const BENEFITS = [
  'Помощь всем нуждающимся',
  'Только лучшие экстрасенсы',
  'Решение любых проблем',
  'Сайт помощи',
  'Помощь и Консультация Экстрасенса',
  'Лично пообщаться с экстрасенсом',
];

const SERVICE_LINKS = [
  '/finansovaya-magiya',
  '/lyubovnaya-magiya',
  '/magiya-zhizni',
  '/magicheskaya-zashchita',
];

const NAV_ITEMS = [
  { path: '/', label: 'Главная' },
  { path: '/#ekstrasensy', label: 'Экстрасенсы' },
  { path: '/#uslugi', label: 'Услуги' },
  { path: '/foto-galereya', label: 'Фотогалерея' },
  { path: '/video', label: 'Видео' },
  { path: '/voprosy-i-otvety', label: 'Вопросы-Ответы' },
];

const FOOTER_DISCLAIMER =
  'Сайт носит информационный характер и не является медицинским учреждением. ' +
  'Результаты могут отличаться в зависимости от индивидуальных особенностей. Данные не передаются третьим лицам.';

const PARTICIPANT_REVIEWS_DISCLAIMER =
  'Мы не даём гарантии помощи без ознакомления с ситуацией. Результаты могут отличаться в зависимости ' +
  'от обстоятельств. Мы не несём ответственности за отзывы и рекомендации клиентов.';

function getFirstName(fullName) {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
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

module.exports = {
  SERVICE_H1, SERVICE_NAMES, SERVICE_RELATED,
  TOPIC_H1, TOPIC_NAMES, TOPIC_RELATED,
  PROBLEM_CATEGORIES, BENEFITS, SERVICE_LINKS, NAV_ITEMS,
  FOOTER_DISCLAIMER, PARTICIPANT_REVIEWS_DISCLAIMER,
  getFirstName, toGenitive, toDative,
};
