// Единый генератор fallback SEO для страниц участников.
// Используется:
//   - на публичной ParticipantDetailPage, если в seo_settings нет записи для участника;
//   - в админке (ParticipantsAdmin) при первом открытии формы и в кнопке
//     «Заполнить автоматически» — чтобы админ сразу видел то же самое,
//     что реально показывается на сайте, и не путался.
//
// Единая функция гарантирует, что расхождений в будущем не появится.
export const buildFallbackSeo = (participant) => {
  const p = participant || {};
  const name = (p.name || '').trim();
  const achievement = (p.title || '').trim(); // реальное звание из БД (например "Финалистка 13 сезона «Битвы экстрасенсов»")

  const seoTitle = achievement
    ? `${name} — ${achievement} | Битва Экстрасенсов`
    : (name ? `Экстрасенс ${name} — приём и консультация | Битва Экстрасенсов` : '');

  const desc = achievement
    ? `${name} — ${achievement}. Личный приём экстрасенса, онлайн-консультация, диагностика жизненных ситуаций, помощь в сложных вопросах.`
    : (name ? `Личный приём экстрасенса ${name}. Онлайн-консультация, диагностика жизненных ситуаций.` : '');

  const keywords = name
    ? [name, achievement, 'экстрасенс', 'консультация', 'битва экстрасенсов', 'приём', 'помощь']
        .filter(Boolean).join(', ')
    : '';

  return {
    title: seoTitle,
    description: desc,
    keywords,
    h1: name,
    og_title: achievement ? `${name} — ${achievement}` : (name ? `${name} — приём экстрасенса` : ''),
    og_description: desc,
  };
};
