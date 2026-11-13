/**
 * Meta V3 catalog — ручные override title/description/H1 для money ticket URL.
 * Ключ: repertoireId или ЧПУ-slug. Catalog побеждает auto-generated meta в SSR/CSR.
 *
 * Плейсхолдеры:
 *   {{price}}      → « от 6800 ₽» | ''
 *   {{priceNum}}   → «6800» | ''
 *   {{venue}}      → площадка
 *   {{date}}       → «28 августа 2026»
 *   {{time}}       → «22:00»
 *   {{when}}       → «28 августа 2026, 22:00»
 *   {{dateShort}}  → «28 авг»
 *
 * defaults.beginDateTime / defaults.venue — если API не отдал дату/площадку.
 */

import { shortEventTitle } from '../services/eventTitleHeuristics.js';

/** @typedef {{
 *   title: string;
 *   description: string;
 *   h1: string;
 *   keywords?: string;
 *   aliases?: string[];
 *   defaults?: { venue?: string; beginDateTime?: string };
 *   preferOverDb?: boolean;
 * }} TicketSeoEntry */
const MECHANICS =
  'Схема зала, выбор мест онлайн, оплата, электронный билет';

/** @type {Record<string, TicketSeoEntry>} */
export const TICKET_SEO = {
  // --- Футбол / арены ---
  'olimpbet-superkubok-rossii': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      'Суперкубок России Спартак — Зенит{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Суперкубок России: Спартак — Зенит',
    keywords: 'суперкубок россии билеты, спартак зенит билеты, совкомбанк арена',
    aliases: ['6a46656d46a4d000309ed0a2'],
    defaults: {
      venue: 'Совкомбанк Арена, Нижний Новгород',
    },
  },
  '6a46656d46a4d000309ed0a2': {
    title: 'Суперкубок Спартак — Зенит{{dateShort}}: билеты{{price}}',
    description:
      'Суперкубок России Спартак — Зенит{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Суперкубок России: Спартак — Зенит',
    keywords: 'суперкубок россии билеты, спартак зенит билеты',
    defaults: {
      venue: 'Совкомбанк Арена, Нижний Новгород',
    },
  },
  'luzhniki-cup-final-2026': {
    title: 'Финал Кубка России{{dateShort}} — Лужники{{price}}',
    description:
      'Финал Кубка России 2026{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Финал Кубка России 2026 — Лужники',
    keywords: 'финал кубка россии билеты, лужники билеты футбол',
    defaults: {
      venue: 'Стадион «Лужники», Москва',
    },
  },
  '69e0cfa246a4d000309ecdd7': {
    title: 'Бивол vs Айферт{{dateShort}}: билеты{{price}}',
    description:
      'Бой Дмитрий Бивол — Михаэль Айферт (RCC){{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Бивол vs Айферт: вечер бокса RCC',
    keywords: 'бивол бой билеты, rcc бокс билеты',
  },

  // --- Концерты ---
  'basta-guf': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      'Билеты на Баста — Guf{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Баста — Guf в Лужниках',
    keywords: 'баста гуф билеты, basta guf билеты, концерт баста лужники 28 августа',
    aliases: ['69ac1c5246a4d000309ecd5c'],
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  '69ac1c5246a4d000309ecd5c': {
    title: 'Баста и Guf{{dateShort}} — билеты{{price}}',
    description:
      'Билеты на Баста — Guf{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Баста — Guf в Лужниках',
    keywords: 'баста гуф билеты, basta guf билеты, концерт баста лужники 28 августа',
    defaults: {
      venue: 'БСА «Лужники», Москва',
      beginDateTime: '2026-08-28T19:00:00+03:00',
    },
  },
  '6735c3a7569a15f2087b852b': {
    title: 'Курентзис / MusicAeterna{{dateShort}}{{price}}',
    description:
      'Теодор Курентзис и MusicAeterna{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Теодор Курентзис и MusicAeterna',
    keywords: 'курентзис билеты, musicaeterna билеты',
  },
  '67de5b9e58f79d0030278720': {
    title: 'Пресняков{{dateShort}} — концерт, билеты{{price}}',
    description:
      'Концерт Владимира Преснякова{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт Владимира Преснякова',
    keywords: 'пресняков билеты, концерт пресняков',
  },
  '69e7bdaa46a4d000309ece1d': {
    title: '«Песни Победы»{{dateShort}}: билеты{{price}}',
    description:
      'Концерт «Песни Победы»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Концерт «Песни Победы»',
    keywords: 'песни победы билеты, концерт песни победы',
  },
  '6735c3a8569a15f2087b9e5f': {
    title: 'Ансамбль Моисеева{{dateShort}}: билеты{{price}}',
    description:
      'Ансамбль народного танца Игоря Моисеева{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Ансамбль танца Игоря Моисеева',
    keywords: 'моисеев билеты, ансамбль моисеева билеты',
  },

  // --- Театр ---
  'romeo-dzhuletta-2026-10-29': {
    title: 'Ромео и Джульетта{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Балет Прокофьева «Ромео и Джульетта»{{price}} — {{when}}, {{venue}}. Даты 29–31 октября, 6+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на балет «Ромео и Джульетта»',
    keywords:
      'ромео и джульетта большой театр билеты, купить билеты ромео джульетта большой, балет ромео джульетта историческая сцена, большой театр билеты октябрь',
    aliases: ['romeo-dzhuletta-2026-10-30', 'romeo-dzhuletta-2026-10-31'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-29T19:00:00+03:00',
    },
  },
  'karmen-2026-10-26': {
    title: 'Кармен{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Опера Бизе «Кармен»{{price}} — {{when}}, {{venue}}. Даты 26–27 октября, 12+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на оперу «Кармен»',
    keywords:
      'кармен большой театр билеты, купить билеты кармен большой театр, опера кармен москва историческая сцена',
    aliases: ['karmen-2026-10-27'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-26T19:00:00+03:00',
    },
  },
  'rigoletto-2026-10-13': {
    title: 'Риголетто{{dateShort}} — Историческая сцена Большого{{price}}',
    description:
      'Опера Верди «Риголетто»{{price}} — {{when}}, {{venue}}. Даты 13–15 октября, 12+. ' +
      'Предзаказ по секторам зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на оперу «Риголетто»',
    keywords:
      'риголетто большой театр билеты, купить билеты риголетто большой, опера риголетто москва',
    aliases: ['rigoletto-2026-10-14', 'rigoletto-2026-10-15'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-10-13T15:00:00+03:00',
    },
  },
  'karmen-syuita-2026-10-16': {
    title: 'Билеты на «Кармен-сюиту» — Большой, Новая сцена{{price}}',
    description:
      'Купить билеты на балет «Кармен-сюита. Дивертисмент» в Большом{{price}} — {{when}}, {{venue}}. ' +
      '16–18 октября, 12+. Партер середина, оплата онлайн, электронный билет.',
    h1: '«Кармен-сюита» — билеты на Новую сцену Большого',
    keywords:
      'кармен сюита большой театр, кармен сюита большой театр дивертисмент, кармен сюита балет большой театр, кармен сюита балет купить билеты, новая сцена большого театра билеты',
    aliases: [
      'karmen-syuita-2026-10-17-12',
      'karmen-syuita-2026-10-17-19',
      'karmen-syuita-2026-10-18',
    ],
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-10-16T19:00:00+03:00',
    },
  },
  'ivan-grozny-2026-11-11': {
    title: 'Билеты на балет «Иван Грозный» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Иван Грозный» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '11 и 26 ноября, 6+. Сектора Исторической сцены, оплата онлайн, электронный билет.',
    h1: 'Балет «Иван Грозный» — билеты на Историческую сцену',
    keywords:
      'балет иван грозный, иван грозный балет большой театр, иван грозный большой театр, купить билеты иван грозный большой театр, иван грозный балет билеты',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-11T13:00:00+03:00',
    },
  },
  'doch-faraona-2026-11-28': {
    title: '«Дочь Фараона» — Большой, 28.11{{price}}',
    description:
      'Балет «Дочь Фараона» — Большой, Историческая{{price}} — {{when}}. ' +
      'Места на схеме, оплата онлайн, электронный билет.',
    h1: '«Дочь Фараона» — Большой, Историческая сцена',
    keywords:
      'дочь фараона балет, дочь фараона большой театр, балет дочь фараона большой театр, дочь фараона билеты, купить билеты дочь фараона большой',
        defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-28T12:00:00+03:00',
    },
  },
  'petrushka-shekherazada-zhar-ptica-2026-11-24': {
    title: 'Билеты на «Петрушка. Шехеразада. Жар-птица» — Большой{{price}}',
    description:
      'Купить билеты на вечер балетов «Петрушка», «Шехеразада», «Жар-птица»{{price}} — {{when}}, {{venue}}. ' +
      '24–25 ноября, 19:00, 6+. Историческая сцена, оплата онлайн, электронный билет.',
    h1: '«Петрушка. Шехеразада. Жар-птица» — билеты в Большой театр',
    keywords:
      'петрушка большой театр, жар птица купить билеты, шехеразада билеты, петрушка шехеразада жар птица большой, балет петрушка большой театр',
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-24T19:00:00+03:00',
    },
  },
  'turandot-2026-11-20': {
    title: 'Опера «Турандот» — Большой, 20.11{{price}}',
    description:
      'Купить билеты на оперу «Турандот» в Большом{{price}} — {{when}}, Историческая сцена. ' +
      '20–22 ноября, 12+. Оплата онлайн, электронный билет.',
    h1: 'Опера «Турандот» — Большой, 20 ноября',
    keywords:
      'турандот билеты, турандот купить билеты, турандот опера билеты, турандот большой театр билеты, купить билеты турандот большой, опера турандот москва',
        defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-20T19:00:00+03:00',
    },
  },
  'bayaderka-2026-11-13': {
    title: 'Купить билеты «Баядерка» — Большой, 13.11{{price}}',
    description:
      'Балет «Баядерка» — Большой, Историческая сцена, 13 ноября{{price}}. ' +
      'Срочно: сеансы 13–15.11. Сектора на схеме, оплата онлайн, e-билет.',
    h1: 'Баядерка — билеты в Большой, Историческая',
    keywords:
      'баядерка билеты, баядерка купить билет, баядерка балет, балет баядерка большой театр, баядерка большой театр купить билеты, баядерка балет билеты',
    preferOverDb: true,
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-11-13T19:00:00+03:00',
    },
  },
  'novogodniy-balet-chaykovskogo-2026-12': {
    title: 'Купить билеты «Щелкунчик» — Большой{{price}}',
    description:
      'Балет «Щелкунчик» Чайковского в Большом{{price}} — {{when}}, {{venue}}. ' +
      '18 декабря — 10 января, 6+. Схема зала, оплата онлайн, электронный билет.',
    h1: 'Щелкунчик — билеты в Большой театр',
    keywords:
      'щелкунчик большой театр билеты, щелкунчик купить билеты, большой театр щелкунчик купить билет, щелкунчик балет купить билеты, новогодний балет чайковского, новогодний балет большой театр',
    preferOverDb: true,
    aliases: ['schelkunchik-bolshoy', 'shelkunchik-bolshoi', 'shelkunchik-bolshoi-teatr'],
    defaults: {
      venue: 'Большой театр — Историческая сцена, Москва',
      beginDateTime: '2026-12-18T19:00:00+03:00',
    },
  },
  'koppelia-2026-11-22': {
    title: 'Билеты на балет «Коппелия» — Большой театр, Новая сцена{{price}}',
    description:
      'Купить билеты на балет «Коппелия» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '22 ноября, 12:00 и 18:00, 6+. Партер середина, оплата онлайн, электронный билет.',
    h1: 'Балет «Коппелия» — билеты на Новую сцену Большого',
    keywords:
      'коппелия балет, балет коппелия большой театр, коппелия большой театр, балет коппелия купить билет, новая сцена большого театра билеты, делиб коппелия',
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-22T12:00:00+03:00',
    },
  },
  'chaika-2026-11-18': {
    title: 'Балет «Чайка» — Большой, Новая сцена{{price}}',
    description:
      'Балет «Чайка» Большого театра (не Сатирикон){{price}} — {{when}}, Новая сцена. ' +
      '18–19 ноября, 16+. Партер от 80 000 ₽, электронный билет.',
    h1: 'Балет «Чайка» — Большой, Новая сцена',
    keywords:
      'чайка большой театр билеты, балет чайка большой театр, купить билеты чайка большой театр, балет чайка, новая сцена большого театра билеты',
    preferOverDb: true,
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-18T19:00:00+03:00',
    },
  },
  'evgeniy-onegin-2026-11-26': {
    title: 'Опера «Евгений Онегин» — Большой театр{{price}}',
    description:
      'Опера «Евгений Онегин» в Большом (не Вахтангова){{price}} — {{when}}, Новая сцена. ' +
      '26–28 ноября, 12+. От 70 000 ₽, оплата онлайн, e-билет.',
    h1: '«Евгений Онегин» — Большой, Новая сцена',
    keywords:
      'евгений онегин большой театр билеты, онегин большая новая сцена билеты, опера евгений онегин большой билеты, онегин большой театр, опера евгений онегин купить билеты',
    preferOverDb: true,
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-26T19:00:00+03:00',
    },
  },
  'chipollino-2026-11-06': {
    title: 'Билеты на балет «Чиполлино» — Большой театр{{price}}',
    description:
      'Купить билеты на балет «Чиполлино» в Большом театре{{price}} — {{when}}, {{venue}}. ' +
      '6–8 ноября, 6+. Партер середина Новой сцены, оплата онлайн, электронный билет.',
    h1: 'Балет «Чиполлино» — билеты на Новую сцену Большого',
    keywords:
      'балет чиполлино, чиполлино большой театр, балет чиполлино большой театр, балет чиполлино купить билеты, чиполлино большой театр купить билет, билеты на чиполлино',
    aliases: [
      'chipollino-2026-11-07-12',
      'chipollino-2026-11-07-19',
      'chipollino-2026-11-08-12',
      'chipollino-2026-11-08-18',
    ],
    defaults: {
      venue: 'Большой театр — Новая сцена, Москва',
      beginDateTime: '2026-11-06T19:00:00+03:00',
    },
  },
  'kabala-svyatosh': {
    title: 'Купить билеты на «Кабала святош»',
    description:
      'Купить билеты на спектакль «Кабала святош» — {{venue}}. ' +
      'Схема зала, выбор мест онлайн, оплата, электронный билет.',
    h1: 'Билеты на «Кабала святош»',
    keywords:
      'купить билеты кабала святош, кабала святош билеты, кабала святош мхт билеты, спектакль кабала святош билеты, кабала святош купить билет',
        aliases: ['686cd69c58f79d0030278b9d'],
    defaults: {
      venue: 'МХТ им. А. П. Чехова, Москва',
      beginDateTime: '2026-11-20T19:00:00+03:00',
    },
  },
  gamlet: {
    title: 'Билеты на «Гамлет» — МХТ им. Чехова{{price}}',
    description:
      'Купить билеты на «Гамлет» в МХТ им. Чехова{{price}} — {{when}}. ' +
      'Схема зала, оплата онлайн, электронный билет.',
    h1: 'Билеты на «Гамлет» — МХТ',
    keywords:
      'гамлет мхт билеты, купить билеты гамлет мхт, гамлет мхт чехова билеты, билеты на гамлет мхт, гамлет купить билеты',
        aliases: ['6735c3a8569a15f2087ba5ee'],
    defaults: {
      venue: 'МХТ им. А. П. Чехова, Москва',
      beginDateTime: '2026-11-25T19:00:00+03:00',
    },
  },
  '6735c3a7569a15f2087b8069': {
    title: '«Три сестры»{{dateShort}} — билеты{{price}}',
    description:
      'Спектакль «Три сестры»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Три сестры»',
    keywords: 'три сестры билеты, спектакль три сестры',
  },
  '69e7bbaa46a4d000309ece18': {
    title: '«Честная женщина»{{dateShort}}: билеты{{price}}',
    description:
      '«Честная женщина» (гастроли Александринки){{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Честная женщина» — Александринский театр',
    keywords: 'честная женщина билеты, александринский театр билеты',
  },
  '69cfdf2246a4d000309ecdb4': {
    title: '«Призраки»{{dateShort}} — билеты{{price}}',
    description:
      'Спектакль «Призраки»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Призраки»',
    keywords: 'призраки спектакль билеты',
  },
  '6735c3a8569a15f2087ba146': {
    title: '«Летучая мышь»{{dateShort}}: билеты{{price}}',
    description:
      'Оперетта «Летучая мышь»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Оперетта «Летучая мышь»',
    keywords: 'летучая мышь билеты, оперетта летучая мышь',
  },
  '6735c3a7569a15f2087b8b16': {
    title: '«Ночь перед Рождеством»{{dateShort}}{{price}}',
    description:
      '«Ночь перед Рождеством»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Ночь перед Рождеством»',
    keywords: 'ночь перед рождеством билеты',
  },
  '69e8d6f046a4d000309ece81': {
    title: '«День закрытых дверей»{{dateShort}}{{price}}',
    description:
      '«День закрытых дверей» (Театр Наций){{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«День закрытых дверей» — Театр Наций',
    keywords: 'день закрытых дверей билеты, театр наций билеты',
  },
  '69e8d68346a4d000309ece7d': {
    title: '«Тартюф»{{dateShort}} — билеты{{price}}',
    description:
      '«Тартюф» (гастроли Театра Наций){{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Тартюф» — Театр Наций',
    keywords: 'тартюф билеты, театр наций тартюф',
  },
  '69e7bd3146a4d000309ece1b': {
    title: '«Иов»{{dateShort}} — билеты{{price}}',
    description:
      '«Иов» (гастроли Александринки){{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Иов» — Александринский театр',
    keywords: 'иов спектакль билеты, александринский театр',
  },
  '6735c3a7569a15f2087b8b9b': {
    title: '«Кролик Эдвард»{{dateShort}}: билеты{{price}}',
    description:
      '«Кролик Эдвард»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: 'Спектакль «Кролик Эдвард»',
    keywords: 'кролик эдвард билеты',
  },
  '6735c3a7569a15f2087b806d': {
    title: '«Красная Шапочка»{{dateShort}}: билеты{{price}}',
    description:
      '«Красная Шапочка»{{price}} — {{when}}, {{venue}}. ' + MECHANICS + '.',
    h1: '«Красная Шапочка»',
    keywords: 'красная шапочка билеты детский спектакль',
  },
};

/** @deprecated используйте seo-site-meta-catalog.js */
export { lookupStaticLandingSeo } from './seo-site-meta-catalog.js';

/**
 * @param {string | null | undefined} iso
 */
export function parseEventDateParts(iso) {
  if (!iso) return { date: '', time: '', when: '', dateShort: '' };
  let raw = String(iso).trim();
  // «2026-08-28T19:00» / без зоны → Москва
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) raw = `${raw}:00+03:00`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) raw = `${raw}+03:00`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: '', time: '', when: '', dateShort: '' };
  const date = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
  const time = d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
  const dateShort = d
    .toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Moscow',
    })
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    date,
    time,
    when: `${date}, ${time}`,
    dateShort: dateShort ? `, ${dateShort}` : '',
  };
}

/**
 * @param {{
 *   minPrice?: number | null;
 *   venueLabel?: string | null;
 *   beginDateTime?: string | null;
 *   defaults?: { venue?: string; beginDateTime?: string };
 * }} opts
 */
export function buildTicketSeoFacts(opts = {}) {
  const minPrice =
    opts.minPrice != null && Number.isFinite(Number(opts.minPrice))
      ? Math.round(Number(opts.minPrice))
      : null;
  const begin =
    opts.beginDateTime || opts.defaults?.beginDateTime || null;
  const parts = parseEventDateParts(begin);
  const venue = String(opts.venueLabel || opts.defaults?.venue || '').trim();
  return {
    minPrice,
    price: minPrice != null ? ` от ${minPrice} ₽` : '',
    priceNum: minPrice != null ? String(minPrice) : '',
    venue,
    date: parts.date,
    time: parts.time,
    when: parts.when,
    dateShort: parts.dateShort,
    beginDateTime: begin,
  };
}

function cleanupMeta(s) {
  return String(s || '')
    .replace(/\{\{[a-zA-Z]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/:\s*\./g, '.')
    .replace(/\.\s*\./g, '.')
    .replace(/\s+([,.])/g, '$1')
    .replace(/,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function clipMeta(s, max) {
  const t = cleanupMeta(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  const out = (sp > Math.floor(max * 0.6) ? cut.slice(0, sp) : cut).trim();
  return cleanupMeta(out);
}

/**
 * @param {TicketSeoEntry} entry
 * @param {{ minPrice?: number | null; venueLabel?: string | null; beginDateTime?: string | null }} [opts]
 */
export function applyTicketSeoPlaceholders(entry, opts = {}) {
  if (!entry) return null;
  const facts = buildTicketSeoFacts({ ...opts, defaults: entry.defaults });
  const fill = (s) =>
    cleanupMeta(
      String(s || '')
        .replace(/\{\{price\}\}/g, facts.price)
        .replace(/\{\{priceNum\}\}/g, facts.priceNum)
        .replace(/\{\{venue\}\}/g, facts.venue)
        .replace(/\{\{date\}\}/g, facts.date)
        .replace(/\{\{time\}\}/g, facts.time)
        .replace(/\{\{when\}\}/g, facts.when)
        .replace(/\{\{dateShort\}\}/g, facts.dateShort),
    );
  return {
    title: clipMeta(fill(entry.title), 70),
    description: clipMeta(fill(entry.description), 160),
    h1: clipMeta(fill(entry.h1), 80),
    keywords: entry.keywords || '',
    preferOverDb: Boolean(entry.preferOverDb),
    facts,
  };
}

/**
 * Авто-title money URL без «Купить» и с обрезкой длинных названий.
 * Бюджет: title ≤70; shortName оставляет место под dateShort/venue/price.
 * @param {{
 *   displayTitle: string;
 *   minPrice?: number | null;
 *   venueLabel?: string | null;
 *   beginDateTime?: string | null;
 *   genreLabel?: string | null;
 * }} p
 */
export function composeAutoTicketTitle(p) {
  const facts = buildTicketSeoFacts(p);
  const venueShort = facts.venue ? shortEventTitle(facts.venue, 28) : '';
  const suffixParts = [];
  if (facts.dateShort) suffixParts.push(facts.dateShort.replace(/^,\s*/, ''));
  if (venueShort) suffixParts.push(venueShort);
  if (facts.price) suffixParts.push(facts.price.trim());
  const suffix = suffixParts.length ? ` — ${suffixParts.join(', ')}` : '';
  const nameBudget = Math.max(18, 70 - suffix.length);
  const name = shortEventTitle(p.displayTitle || '', nameBudget) || 'Билеты';
  return clipMeta(`${name}${suffix}`, 70);
}

/**
 * Авто-description, если нет catalog.
 * @param {{
 *   displayTitle: string;
 *   minPrice?: number | null;
 *   venueLabel?: string | null;
 *   beginDateTime?: string | null;
 *   lead?: string | null;
 *   genreLabel?: string | null;
 * }} p
 */
/** Убрать внешние «ёлочки», чтобы не получить ««Название»». */
function stripOuterGuillemets(s) {
  return String(s || '')
    .trim()
    .replace(/^[«"]+/g, '')
    .replace(/[»"]+$/g, '')
    .trim();
}

export function composeAutoTicketDescription(p) {
  const facts = buildTicketSeoFacts(p);
  const short = stripOuterGuillemets(shortEventTitle(p.displayTitle || '', 42) || 'событие');
  const genre = String(p.genreLabel || '').trim();
  const when = facts.when || '';
  const venue = facts.venue ? shortEventTitle(facts.venue, 34) : '';
  const price = facts.price || '';
  const hot = String(p.wsPhrase || '').trim();
  const seed = String(p.seed || p.displayTitle || short);

  /** @type {string[]} */
  const variants = [];
  if (hot) {
    variants.push(
      `«${hot}» — ${genre ? `${genre.toLowerCase()} ` : ''}«${short}»${when ? `. ${when}` : ''}${venue ? `, ${venue}` : ''}${price}. Схема зала, оплата, электронный билет.`,
    );
    variants.push(
      `Ищете «${hot}»? «${short}»${when ? ` — ${when}` : ''}${venue ? `, ${venue}` : ''}. Места по схеме, оплата онлайн, билет на телефон.`,
    );
  }
  if (genre) {
    variants.push(
      `${genre} «${short}»${when ? `. ${when}` : ''}${venue ? `, ${venue}` : ''}${price}. Выберите места онлайн — билет электронный после оплаты.`,
    );
  }
  if (venue) {
    variants.push(
      `${venue}: «${short}»${when ? `, ${when}` : ''}${price}. Купить билеты по схеме зала — оплата на сайте, без бумаги.`,
    );
  }
  variants.push(
    `Купить билеты на «${short}»${when ? ` — ${when}` : ''}${venue ? `, ${venue}` : ''}${price}. Схема мест, оплата на сайте, электронный билет сразу.`,
  );
  variants.push(
    `Билеты на «${short}»${venue ? ` — ${venue}` : ''}${when ? `. Дата: ${when}` : ''}${price}. Онлайн-выбор мест и электронный билет после оплаты.`,
  );
  variants.push(
    `${genre ? `${genre} «${short}»` : `«${short}»`}${when ? `. ${when}` : ''}${venue ? `, ${venue}` : ''}${price}. ${MECHANICS}.`,
  );

  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const body = variants[h % variants.length] || variants[variants.length - 1];
  return clipMeta(String(body).replace(/\s+/g, ' ').trim(), 160);
}

/**
 * @param {string} key
 * @param {{ minPrice?: number | null; venueLabel?: string | null; beginDateTime?: string | null }} [opts]
 */
export function resolveTicketSeo(key, opts = {}) {
  const entry = lookupTicketSeo(key);
  if (!entry) return null;
  return applyTicketSeoPlaceholders(entry, opts);
}

/**
 * @param {string} key repertoireId или slug
 * @returns {TicketSeoEntry | null}
 */
export function lookupTicketSeo(key) {
  const k = String(key || '').trim().toLowerCase();
  if (!k) return null;
  if (TICKET_SEO[k]) return TICKET_SEO[k];
  for (const [canon, entry] of Object.entries(TICKET_SEO)) {
    const aliases = entry.aliases || [];
    if (aliases.some((a) => String(a).toLowerCase() === k)) {
      return TICKET_SEO[canon] || entry;
    }
  }
  return null;
}

