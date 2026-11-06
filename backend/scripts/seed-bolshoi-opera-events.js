#!/usr/bin/env node
/**
 * События Большого театра (без GetBilet, предзаказ по секторам) — как футбольный матч.
 * Один спектакль = один repertoire id, несколько дат = несколько EventDateTime в офферах.
 * npm run seed:bolshoi-opera-events
 */
import ticketPool from '../ticketDb.js';
import {
  bolshoiSellableSeatsByRow,
  expandBolshoiOffersByRows,
  remapBolshoiSeatsToSellableLabels,
} from '../utils/bolshoiSellableSectors.js';
import { collapseBolshoiNewStageToParterMid } from '../utils/bolshoiNewStageParterCheckout.js';

const HISTORICAL_STAGE_ID = process.env.BOLSHOI_HISTORICAL_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-historical-stage';

/**
 * Продаваемые зоны (лейблы = bolshoiSellableSectors.js). SeatList — страховка
 * на случай, если expand по схеме не прошёл; обычно его заменяют реальные места.
 * Правые ложи — по одной зоне на ложу (все 3 ряда). Левые VIP — целиком.
 */
const SECTORS = [
  { key: 'parter_mid',        label: 'Партер (середина)',            seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'beletazh_right_4',  label: 'Бельэтаж правая ложа 4',       seatList: ['1','3','5'], box: false },
  { key: 'beletazh_right_5',  label: 'Бельэтаж правая ложа 5',       seatList: ['1','3','5'], box: false },
  { key: 'beletazh_right_6',  label: 'Бельэтаж правая ложа 6',       seatList: ['1','3','5'], box: false },
  { key: 'lozha1_right_5',    label: '1 ярус правая ложа 5',         seatList: ['1','3','5'], box: false },
  { key: 'lozha1_right_6',    label: '1 ярус правая ложа 6',         seatList: ['1','3','5'], box: false },
  { key: 'lozha1_right_7',    label: '1 ярус правая ложа 7',         seatList: ['1','3','5'], box: false },
  { key: 'lozha1_right_8',    label: '1 ярус правая ложа 8',         seatList: ['1','3','5'], box: false },
  { key: 'balkon2_left',      label: 'Балкон 2 яруса левая',         seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'balkon3_left',      label: 'Балкон 3 яруса левая',         seatList: ['1','2','3','4','5','6','7','8'], box: false },
  { key: 'beletazh_box',      label: 'Ложа бельэтажа (левая 4)',     seatList: ['1','2','3','4','5','6','7','8'], box: true },
  { key: 'lozha1_box',        label: 'Ложа 1 яруса (левая 9)',       seatList: ['1','2','3','4','5','6','7','8'], box: true },
  { key: 'vip_parter',        label: 'Партер ряд А (Вип)',           seatList: ['5','6','7','8','9','10','11','12'], box: false },
];

/** prices[i] соответствует SECTORS[i]. Правые ложи одного яруса — одна цена. */
function expandPrices(p) {
  /** Старый формат из 8 цен → 13. */
  if (Array.isArray(p) && p.length === 8) {
    const [parter, bel, y1, b2, b3, belBox, y1Box, vip] = p;
    return [parter, bel, bel, bel, y1, y1, y1, y1, b2, b3, belBox, y1Box, vip];
  }
  return p;
}

/**
 * Историческая сцена: один id на спектакль, sessions[] — даты/цены.
 * siblingIds — старые отдельные карточки (снимаем с публикации при сиде).
 */
const EVENTS = [
  {
    id: 'rigoletto-2026-10-13',
    siblingIds: ['rigoletto-2026-10-14', 'rigoletto-2026-10-15'],
    title: 'Риголетто',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '13–15 октября · 12+',
    poster: '/uploads/images/bolshoi-rigoletto-1792582486308.jpg',
    sessions: [
      { iso: '2026-10-13T12:00:00.000Z', label: 'пн 13 октября · 15:00 · 12+', prices: [60000, 50000, 40000, 30000, 25000, 500000, 400000, 150000] },
      { iso: '2026-10-14T16:00:00.000Z', label: 'вт 14 октября · 19:00 · 12+', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
      { iso: '2026-10-15T16:00:00.000Z', label: 'ср 15 октября · 19:00 · 12+', prices: [75000, 65000, 55000, 45000, 30000, 600000, 450000, 170000] },
    ],
  },
  {
    id: 'karmen-2026-10-26',
    siblingIds: ['karmen-2026-10-27'],
    title: 'Кармен',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '26–27 октября · 19:00 · 12+',
    poster: '/uploads/images/bolshoi-carmen-1792582486308.jpg',
    sessions: [
      { iso: '2026-10-26T16:00:00.000Z', label: 'пн 26 октября · 19:00 · 12+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-27T16:00:00.000Z', label: 'вт 27 октября · 19:00 · 12+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
    ],
  },
  {
    id: 'romeo-dzhuletta-2026-10-29',
    siblingIds: ['romeo-dzhuletta-2026-10-30', 'romeo-dzhuletta-2026-10-31'],
    title: 'Ромео и Джульетта',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '29–31 октября · 19:00 · 6+',
    genre: 'Балет',
    age: '6+',
    poster: '/uploads/images/bolshoi-romeo-1792582854626.jpg',
    sessions: [
      { iso: '2026-10-29T16:00:00.000Z', label: 'чт 29 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-30T16:00:00.000Z', label: 'пт 30 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
      { iso: '2026-10-31T16:00:00.000Z', label: 'сб 31 октября · 19:00 · 6+', prices: [90000, 80000, 70000, 60000, 45000, 650000, 500000, 180000] },
    ],
  },
  {
    id: 'ivan-grozny-2026-11-11',
    title: 'Иван Грозный',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '11 и 26 ноября · 6+',
    genre: 'Балет',
    age: '6+',
    /** Розница = прайс из ТЗ, без глобальной наценки GetBilet. */
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-ivan-grozny-1793952967696.jpg',
    sessions: [
      /** 11.11 13:00 МСК */
      { iso: '2026-11-11T10:00:00.000Z', label: 'ср 11 ноября · 13:00 · 6+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
      /** 11.11 19:00 МСК */
      { iso: '2026-11-11T16:00:00.000Z', label: 'ср 11 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      /** 26.11 19:00 МСК */
      { iso: '2026-11-26T16:00:00.000Z', label: 'чт 26 ноября · 19:00 · 6+', prices: [150000, 140000, 120000, 110000, 100000, 850000, 550000, 250000] },
    ],
  },
  {
    id: 'doch-faraona-2026-11-28',
    title: 'Дочь Фараона',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '28–29 ноября · 6+',
    genre: 'Балет',
    age: '6+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-doch-faraona.jpg',
    sessions: [
      { iso: '2026-11-28T09:00:00.000Z', label: 'сб 28 ноября · 12:00 · 6+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
      { iso: '2026-11-28T16:00:00.000Z', label: 'сб 28 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-29T11:00:00.000Z', label: 'вс 29 ноября · 14:00 · 6+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
    ],
  },
  {
    id: 'petrushka-shekherazada-zhar-ptica-2026-11-24',
    title: 'Петрушка. Шехеразада. Жар-птица',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '24–25 ноября · 19:00 · 6+',
    genre: 'Балет',
    age: '6+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-petrushka-trilogy.jpg',
    sessions: [
      { iso: '2026-11-24T16:00:00.000Z', label: 'вт 24 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-25T16:00:00.000Z', label: 'ср 25 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
    ],
  },
  {
    id: 'turandot-2026-11-20',
    title: 'Турандот',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '20–22 ноября · 12+',
    genre: 'Опера',
    age: '12+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-turandot.jpg',
    sessions: [
      { iso: '2026-11-20T16:00:00.000Z', label: 'пт 20 ноября · 19:00 · 12+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-21T09:00:00.000Z', label: 'сб 21 ноября · 12:00 · 12+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
      { iso: '2026-11-21T16:00:00.000Z', label: 'сб 21 ноября · 19:00 · 12+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-22T09:00:00.000Z', label: 'вс 22 ноября · 12:00 · 12+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
    ],
  },
  {
    id: 'bayaderka-2026-11-13',
    title: 'Баядерка',
    venue: 'Большой театр — Историческая сцена',
    address: 'Театральная пл., 1, Москва',
    cardSubtitle: '13–15 ноября · 6+',
    genre: 'Балет',
    age: '6+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-bayaderka.jpg',
    sessions: [
      { iso: '2026-11-13T16:00:00.000Z', label: 'пт 13 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-14T09:00:00.000Z', label: 'сб 14 ноября · 12:00 · 6+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
      { iso: '2026-11-14T16:00:00.000Z', label: 'сб 14 ноября · 19:00 · 6+', prices: [120000, 110000, 90000, 80000, 70000, 700000, 450000, 190000] },
      { iso: '2026-11-15T11:00:00.000Z', label: 'вс 15 ноября · 14:00 · 6+', prices: [70000, 65000, 60000, 50000, 40000, 450000, 300000, 120000] },
    ],
  },
];

const NEW_STAGE_ID = process.env.BOLSHOI_NEW_STAGE_EXTERNAL_ID?.trim() || 'bolshoi-new-stage';

/** Новая сцена: 1 продаваемый сектор — Партер середина (ряды 1–8 блоком). */
const NEW_SECTORS = [
  { key: 'parter_mid', label: 'Партер (середина)', seatList: ['1', '2', '3', '4', '5', '6', '7', '8'], box: false },
];

/** Кармен-сюита — одна карточка, 4 сеанса. */
const NEW_EVENTS = [
  {
    id: 'karmen-syuita-2026-10-16',
    siblingIds: ['karmen-syuita-2026-10-17-12', 'karmen-syuita-2026-10-17-19', 'karmen-syuita-2026-10-18'],
    title: 'Кармен-сюита. Дивертисмент',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '16–18 октября · 12+',
    sessions: [
      { iso: '2026-10-16T16:00:00.000Z', label: 'чт 16 октября · 19:00 · 12+', prices: [65000] },
      { iso: '2026-10-17T09:00:00.000Z', label: 'пт 17 октября · 12:00 · 12+', prices: [65000] },
      { iso: '2026-10-17T16:00:00.000Z', label: 'пт 17 октября · 19:00 · 12+', prices: [65000] },
      { iso: '2026-10-18T11:00:00.000Z', label: 'сб 18 октября · 14:00 · 12+', prices: [65000] },
    ],
  },
  {
    id: 'chipollino-2026-11-06',
    siblingIds: [
      'chipollino-2026-11-07-12',
      'chipollino-2026-11-07-19',
      'chipollino-2026-11-08-12',
      'chipollino-2026-11-08-18',
    ],
    title: 'Чиполлино',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '6–8 ноября · 6+',
    genre: 'Балет',
    age: '6+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-chipollino-1793952967696.jpg',
    sessions: [
      { iso: '2026-11-06T16:00:00.000Z', label: 'пт 6 ноября · 19:00 · 6+', prices: [50000] },
      { iso: '2026-11-07T09:00:00.000Z', label: 'сб 7 ноября · 12:00 · 6+', prices: [50000] },
      { iso: '2026-11-07T16:00:00.000Z', label: 'сб 7 ноября · 19:00 · 6+', prices: [50000] },
      { iso: '2026-11-08T09:00:00.000Z', label: 'вс 8 ноября · 12:00 · 6+', prices: [50000] },
      { iso: '2026-11-08T15:00:00.000Z', label: 'вс 8 ноября · 18:00 · 6+', prices: [50000] },
    ],
  },
  {
    id: 'koppelia-2026-11-22',
    title: 'Коппелия',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '22 ноября · 12:00 и 18:00 · 6+',
    genre: 'Балет',
    age: '6+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-koppelia.jpg',
    sessions: [
      { iso: '2026-11-22T09:00:00.000Z', label: 'вс 22 ноября · 12:00 · 6+', prices: [50000] },
      { iso: '2026-11-22T15:00:00.000Z', label: 'вс 22 ноября · 18:00 · 6+', prices: [50000] },
    ],
  },
  {
    id: 'chaika-2026-11-18',
    title: 'Чайка',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '18–19 ноября · 19:00 · 16+',
    genre: 'Балет',
    age: '16+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-chaika.jpg',
    sessions: [
      { iso: '2026-11-18T16:00:00.000Z', label: 'ср 18 ноября · 19:00 · 16+', prices: [80000] },
      { iso: '2026-11-19T16:00:00.000Z', label: 'чт 19 ноября · 19:00 · 16+', prices: [80000] },
    ],
  },
  {
    id: 'evgeniy-onegin-2026-11-26',
    title: 'Евгений Онегин',
    venue: 'Большой театр — Новая сцена',
    address: 'ул. Большая Дмитровка, 4/2, Москва',
    cardSubtitle: '26–28 ноября · 12+',
    genre: 'Опера',
    age: '12+',
    fixedRetail: true,
    poster: '/uploads/images/bolshoi-evgeniy-onegin.jpg',
    sessions: [
      { iso: '2026-11-26T16:00:00.000Z', label: 'чт 26 ноября · 19:00 · 12+', prices: [70000] },
      { iso: '2026-11-27T16:00:00.000Z', label: 'пт 27 ноября · 19:00 · 12+', prices: [70000] },
      { iso: '2026-11-28T09:00:00.000Z', label: 'сб 28 ноября · 12:00 · 12+', prices: [70000] },
      { iso: '2026-11-28T16:00:00.000Z', label: 'сб 28 ноября · 19:00 · 12+', prices: [70000] },
    ],
  },
];
function sessionsOf(ev) {
  if (Array.isArray(ev.sessions) && ev.sessions.length) return ev.sessions;
  return [{ iso: ev.iso, label: ev.cardSubtitle, prices: ev.prices }];
}

/** Развёрнутые тексты для description_pack / description_manual (по id события). */
const EVENT_COPY = {
  'romeo-dzhuletta-2026-10-29': {
    composer: 'Сергей Прокофьев',
    about: [
      'Балет Сергея Прокофьева по трагедии Шекспира — одна из визитных карточек Большого театра. История вражды Монтекки и Капулетти и любви Ромео и Джульетты звучит в полной партитуре на Исторической сцене.',
      'В программе — классическая хореография и оркестр Большого театра. Возрастной ценз 6+: подходит и для первого знакомства с балетом.',
    ],
    how: [
      'Билеты оформляются предзаказом по секторам зала: выберите зону на схеме и количество мест — номера мест подтвердим при отправке билетов.',
      'После оплаты электронный билет придёт на email. Даты: 29, 30 и 31 октября, начало в 19:00.',
    ],
  },
  'karmen-2026-10-26': {
    composer: 'Жорж Бизе',
    about: [
      'Опера Жоржа Бизе «Кармен» — история свободолюбивой цыганки, солдата Хосе и тореро Эскамильо. Одна из самых исполняемых опер мира в постановке Большого театра на Исторической сцене.',
      'В спектакле — оркестр, хор и солисты Большого. Возраст 12+.',
    ],
    how: [
      'Предзаказ по секторам: клик по зоне на схеме → количество билетов. Места в секторе закрепляет система после оплаты.',
      'Сеансы 26 и 27 октября, начало в 19:00. Электронный билет на email.',
    ],
  },
  'rigoletto-2026-10-13': {
    composer: 'Джузеппе Верди',
    about: [
      'Опера Верди «Риголетто» — драма шута при дворе герцога Мантуанского, дочери Джильды и проклятия Монтероне. Классика итальянского bel canto на Исторической сцене Большого театра.',
      'В постановке участвуют солисты, хор и оркестр Большого. Возраст 12+.',
    ],
    how: [
      'Оформление — предзаказ по секторам зала без выбора конкретного места на схеме.',
      'Даты 13–15 октября. Электронный билет после оплаты.',
    ],
  },
  'karmen-syuita-2026-10-16': {
    composer: 'Жорж Бизе / Родион Щедрин',
    about: [
      '«Кармен-сюита» — балет на музыку Бизе в оркестровке Родиона Щедрина, визитная карточка Новой сцены Большого. В программе также дивертисмент: компактный вечер без пятичасовой оперы, но с узнаваемой пластикой и оркестром театра.',
      'Запросы «кармен сюита большой театр» и «кармен сюита большой театр дивертисмент» ведут именно сюда. Если цель — купить билеты на «Кармен-сюиту» в Большом, берите партер середины (ряды 1–8): 65 000 ₽, вид на сцену прямой.',
      'Возраст 12+. Сеансы 16–18 октября: вечерние и дневные. Цена на витрине финальная.',
    ],
    forWhom: [
      'Тем, кто хочет «Кармен» в балетном формате, без полного оперного вечера Бизе на Исторической.',
      'Удобный вход в репертуар Новой сцены: короче классического гранд-балета, но с тем же оркестром Большого.',
    ],
    how: [
      'На схеме кликните «Партер (середина)» → количество → оплата онлайн. Электронный билет на email после оплаты.',
      'Адрес: Большая Дмитровка, 4/2 — Новая сцена Большого театра.',
    ],
  },
  'ivan-grozny-2026-11-11': {
    composer: 'Сергей Прокофьев',
    about: [
      'Балет «Иван Грозный» Юрия Григоровича на музыку Сергея Прокофьева — драма Ивана IV, царицы Анастасии и Курбского. Партитура из музыки к Эйзенштейну и других сочинений; декорации Симона Вирсаладзе. Историческая сцена Большого.',
      'Ищут «балет иван грозный» и «иван грозный балет большой театр»: это не фильм и не драма — полноценный балетный вечер. 11 ноября — дневной 13:00 и вечерний 19:00; 26 ноября — 19:00. Возраст 6+.',
      'Предзаказ по секторам: партер середина от 70 000 ₽ (день) / от 120 000 ₽ (вечер 11.11) / от 150 000 ₽ (26.11); бельэтаж, 1 ярус, балконы, ложи целиком, VIP-партер.',
    ],
    forWhom: [
      'Любителям Григоровича и мощной драмы в танце — не «лёгкий» семейный вечер вроде «Чиполлино».',
      'Дневной сеанс 11 ноября дешевле вечернего: тот же зал, ниже вход в партер.',
    ],
    how: [
      'Клик по зоне на схеме Исторической сцены → количество → оплата. Номера мест подтвердим при отправке билетов на email.',
      'Зоны: партер (середина) ряды 1–8, бельэтаж и 1 ярус (1 ряд лож), балконы 2–3 яруса, ложи целиком, VIP-партер ряд 1.',
    ],
  },
  'doch-faraona-2026-11-28': {
    composer: 'Чезаре Пуньи',
    about: [
      'Балет «Дочь Фараона» — египетская фантазия XIX века в Большом: двор фараона, охота, любовная интрига, классическая хореография на Исторической сцене. Музыка Чезаре Пуньи, восстановленный гранд-балет.',
      'Часто ищут вариации «из Дочери Фараона» и «дочь фараона балет» — здесь полный спектакль, не учебный номер. Целевой хвост: «дочь фараона большой театр», «балет дочь фараона большой театр».',
      'Возраст 6+. 28 ноября — 12:00 и 19:00; 29 ноября — 14:00. Партер середина от 70 000 ₽ (день) / от 120 000 ₽ (вечер).',
    ],
    forWhom: [
      'Тем, кто хочет зрелищный исторический балет с декорациями и кордебалетом, а не камерную новинку.',
      'Дневные сеансы удобны семьям: тот же зал, ниже цена партера.',
    ],
    how: [
      'Выберите сеанс и зону на схеме → количество → оплата онлайн. Электронный билет на email.',
      'Продаём партер 1–8, бельэтаж и 1 ярус (1 ряд лож), балконы 2–3 яруса, ложи целиком, VIP-партер ряд 1.',
    ],
  },
  'petrushka-shekherazada-zhar-ptica-2026-11-24': {
    composer: 'Игорь Стравинский / Николай Римский-Корсаков',
    about: [
      'Вечер «Русских сезонов» на Исторической сцене: «Петрушка» и «Жар-птица» Стравинского плюс «Шехеразада» Римского-Корсакова — три легендарных партитуры в одном билете. Не концерт и не «только Петрушка»: полный балетный триптих Большого.',
      'Отдельные запросы «петрушка билеты» / «жар птица купить билеты» часто ведут в другие форматы. Здесь — купить билеты на вечер Большого 24 и 25 ноября, начало 19:00, возраст 6+.',
      'Партер середина от 120 000 ₽; также бельэтаж, 1 ярус, балконы, ложи, VIP. Цена на витрине финальная.',
    ],
    forWhom: [
      'Тем, кто хочет Стравинского «в зале», а не в наушниках: три сюжета подряд, оркестр Большого.',
      'Подходит как подарочный вечер: узнаваемые названия, классика начала XX века.',
    ],
    how: [
      'Дата → зона на схеме Исторической сцены → количество → оплата. Билет на email после оплаты.',
      'Зоны: партер (середина), бельэтаж и 1 ярус (1 ряд лож), балконы 2–3 яруса, ложи целиком, VIP-партер.',
    ],
  },
  'turandot-2026-11-20': {
    composer: 'Джакомо Пуччини',
    about: [
      'Опера Пуччини «Турандот» — холодная принцесса, три загадки, Калаф и Nessun dorma. Зрелищный итальянский вечер Большого: солисты, хор, оркестр на Исторической сцене.',
      '«Турандот билеты» и «турандот купить билеты» часто смешивают с балом/другими площадками. Если нужна опера Большого — смотрите эту карточку: 20–22 ноября, 12+, вечерние и дневные сеансы.',
      'Партер середина от 70 000 ₽ (день) / от 120 000 ₽ (вечер). Предзаказ по секторам, электронный билет после оплаты.',
    ],
    forWhom: [
      'Любителям большого оперного звука и хора — не камерная «Новая опера» и не драматическая «принцесса Турандот».',
      'Дневные сеансы 21 и 22 ноября — тот же зал дешевле вечернего партера.',
    ],
    how: [
      'Выберите дату и зону на схеме → количество → оплата онлайн. Номера мест подтвердим при отправке на email.',
      'Зоны Исторической сцены: партер 1–8, бельэтаж и 1 ярус, балконы 2–3 яруса, ложи целиком, VIP-партер ряд 1.',
    ],
  },
  'bayaderka-2026-11-13': {
    composer: 'Людвиг Минкус',
    about: [
      'Балет Минкуса «Баядерка» в линии Петипа / Григоровича — Никия, Солор, Гамзатти и знаменитое «Царство теней». Классика Исторической сцены Большого: оркестр, кордебалет, белый акт.',
      'Ищут «баядерка билеты», «баядерка купить билет», «баядерка балет» — часть уходит в Мариинский/Михайловский. Хвост «балет баядерка большой театр» / «баядерка большой театр купить билеты» = эта страница.',
      'Возраст 6+. 13–15 ноября: вечера 19:00 и дневные 12:00 / 14:00. Партер середина от 70 000 ₽ (день) / от 120 000 ₽ (вечер).',
    ],
    forWhom: [
      'Тем, кто хочет именно Большой, а не «Баядерку» другого театра. Белый акт теней лучше смотреть из партера или бельэтажа, не с галёрки «наугад».',
      'Дневные сеансы — ниже вход в партер при том же зале.',
    ],
    how: [
      'Дата → зона на схеме → количество → оплата. Электронный билет на email.',
      'В продаже: партер (середина) 1–8, бельэтаж и 1 ярус (1 ряд лож), балконы 2–3 яруса, ложи целиком, VIP-партер ряд 1.',
    ],
  },
  'koppelia-2026-11-22': {
    composer: 'Лео Делиб',
    about: [
      'Балет «Коппелия» Лео Делиба — комедия заблуждений: кукольник Коппелиус, «живая» кукла Коппелия, Сванильда и Франц. На Новой сцене Большого театра — классическая хореография, оркестр, кордебалет; в партитуре те самые мазурка и вальс, которые отдельно ищут чаще, чем полный вечер.',
      'Если цель — купить билеты на балет «Коппелия» именно в Большом (а не читать краткое содержание и не смотреть учебную вариацию), берите партер середины: ряды 1–8, прямой взгляд на сцену. Запросы «балет коппелия большой театр» и «коппелия большой театр» ведут сюда.',
      'Возраст 6+. 22 ноября: дневной сеанс 12:00 и вечерний 18:00. Цена партера — 50 000 ₽ за место, финальная на витрине.',
    ],
    forWhom: [
      'Семьям и тем, кто хочет лёгкий классический вечер без тяжёлой драмы. Удобно как первый балет для ребёнка и как понятный сюжет для взрослых.',
      'Не путайте с отдельными номерами «из Коппелии»: здесь полный спектакль Большого на Новой сцене.',
    ],
    how: [
      'На схеме кликните «Партер (середина)» → количество (до 8) → оплата онлайн. Номера мест подтвердим при отправке билетов на email.',
      'Искали «новая сцена большого театра билеты» или «большой театр новая сцена купить билеты» — зал по адресу Большая Дмитровка, 4/2.',
    ],
  },
  'chaika-2026-11-18': {
    composer: 'Илья Демутский',
    about: [
      'Балет «Чайка» в Большом театре — не драма Сатирикона или МХТ и не «Чайка» Эйфмана. Постановка Юрия Посохова и Александра Молочникова на музыку Ильи Демутского по Чехову: Треплев, Нина, Аркадина, Тригорин — конфликт «новых форм» и славы, любовь и творческий крах.',
      'Когда ищут «чайка билеты» или «чайка купить билеты», чаще попадают в драму. Чтобы купить билеты на балет «Чайка» Большого, смотрите хвост «балет чайка большой театр» / «чайка большой театр»: Новая сцена, 16+, 18 и 19 ноября, начало 19:00.',
      'В продаже Партер (середина), ряды 1–8 — 80 000 ₽ за место. Имеет смысл, если хотите видеть пластику и мизансцену в лицо, а не с дальнего яруса.',
    ],
    forWhom: [
      'Тем, кто ищет именно балет «Чайка» Большого, а не спектакль Бутусова/Сатирикона и не бассейн «Чайка». Перед оплатой сверьте площадку: Новая сцена, Большая Дмитровка, 4/2.',
      'Возраст 16+: язык современный, тема взрослая — театр о театре, без детского хэппи-энда.',
    ],
    how: [
      'Клик по зоне «Партер (середина)» на схеме → число билетов → оплата картой. Места в зоне закрепляет система; электронный билет на email после оплаты.',
      'Две даты: 18 и 19 ноября. Запрос «купить билет на чайку» здесь = предзаказ партера Большого; цена на витрине финальная.',
    ],
  },
  'evgeniy-onegin-2026-11-26': {
    composer: 'Пётр Чайковский',
    about: [
      'Опера Чайковского «Евгений Онегин» — лирические сцены по Пушкину: письмо Татьяны, дуэль Ленского, бал, финальная встреча с княгиней. Солисты, хор и оркестр Большого на Новой сцене: камернее Исторической, ближе к сцене.',
      'По запросам «евгений онегин билеты» и «онегин купить билеты» часто уходят в Вахтангова. Если нужен именно Большой — смотрите «онегин большой театр», «евгений онегин большой театр», «опера евгений онегин билеты».',
      'Купить билеты на оперу «Евгений Онегин» в Большом логично в партере середины (ряды 1–8): 70 000 ₽, слышна оркестровая ткань, видна мизансцена. 26–27 ноября — 19:00, 28 ноября — дневной 12:00. Возраст 12+.',
    ],
    forWhom: [
      'Любителям оперы и тем, кто сознательно выбирает Большой, а не драму Вахтангова с тем же названием.',
      'Дневной сеанс 28 ноября — тот же партер и та же цена, если не хотите поздний выход.',
    ],
    how: [
      'На схеме выберите «Партер (середина)» → количество (до 8) → дата → оплата онлайн. Номера мест подтвердим при отправке билетов на email.',
      'Запросы «опера евгений онегин купить билеты» и «большой театр евгений онегин купить билет» закрываются на этой странице; цена на витрине финальная.',
    ],
  },
  'chipollino-2026-11-06': {
    composer: 'Карэн Хачатурян',
    about: [
      'Балет «Чиполлино» Карэна Хачатуряна в хореографии Генриха Майорова по Родари — овощная сказка с классикой, эстрадой и клоунадой на Новой сцене Большого. Не Кремлёвский дворец и не «опера Чиполлино»: именно балет труппы Большого.',
      'Частотность высокая: «балет чиполлино», «чиполлино большой театр», «балет чиполлино купить билеты». Часть запросов уходит в Кремль — перед оплатой сверьте площадку: Новая сцена, Большая Дмитровка, 4/2.',
      'Возраст 6+. Сеансы 6–8 ноября (день и вечер, в воскресенье ещё 18:00). Партер середина — 50 000 ₽ за место, финальная цена.',
    ],
    forWhom: [
      'Семьям с детьми от 6 лет: понятный сюжет, яркие костюмы, без «взрослой» драмы вроде «Чайки».',
      'Тем, кто ищет купить билеты на «Чиполлино» именно в Большом, а не кремлёвский прокат.',
    ],
    how: [
      'Клик по «Партер (середина)» → количество (до 8) → оплата онлайн. Места подберёт система; билет на email.',
      'Запросы «чиполлино большой театр купить билет» и «балет чиполлино большой театр купить билеты» закрываются здесь.',
    ],
  },
};
function buildCatalogPayload(ev, stageId, stageName, genre, age) {
  const sess = sessionsOf(ev);
  const firstIso = sess[0].iso;
  const copy = EVENT_COPY[ev.id];
  const lead = copy?.about?.[0]
    || `${genre} «${ev.title}» в ${stageName}. Предзаказ билетов по секторам (${ev.cardSubtitle}).`;
  return {
    Id: ev.id,
    RepertoireId: ev.id,
    Name: ev.title,
    ShortDescription: `${genre} «${ev.title}» · ${stageName}. ${ev.cardSubtitle}`,
    Description: lead,
    GenreName: genre,
    Age: age,
    stageId,
    StageName: stageName,
    PlaceName: ev.venue,
    PlaceAddress: ev.address,
    EventDateTime: firstIso,
    beginDateTime: firstIso,
  };
}

function buildDescriptionPack(ev, stageName, genre, age) {
  const copy = EVENT_COPY[ev.id] || {};
  const aboutParas = copy.about || [
    `${genre} «${ev.title}» в ${stageName}.`,
    'Предзаказ билетов осуществляется по секторам зала.',
  ];
  const howParas = copy.how || [
    'Выберите сектор на схеме и укажите количество билетов — места подберёт система.',
    'После оплаты электронный билет придёт на email.',
  ];
  const forWhom = Array.isArray(copy.forWhom) ? copy.forWhom.filter(Boolean) : [];
  const composer = copy.composer ? ` · ${copy.composer}` : '';
  const sections = [
    {
      id: 'about',
      title: 'О событии',
      paragraphs: aboutParas,
    },
  ];
  if (forWhom.length) {
    sections.push({
      id: 'for-whom',
      title: 'Кому подойдёт',
      paragraphs: forWhom,
    });
  }
  sections.push({
    id: 'tickets',
    title: 'Как купить билеты',
    paragraphs: howParas,
  });
  return {
    heroKicker: `${genre} · Большой театр${composer}`,
    heroSubline: `${stageName} · ${ev.cardSubtitle}`,
    heroLead: aboutParas[0],
    eventMeta: [
      { label: 'Возраст', value: age },
      { label: 'Площадка', value: stageName },
      { label: 'Адрес', value: ev.address },
      ...(copy.composer ? [{ label: 'Музыка', value: copy.composer }] : []),
    ],
    sections,
  };
}

function buildOffers(ev, sectors) {
  const out = [];
  const fixedRetail = Boolean(ev.fixedRetail);
  for (const sess of sessionsOf(ev)) {
    const prices = expandPrices(sess.prices || ev.prices || []);
    const day = String(sess.iso || '').slice(0, 10);
    for (let i = 0; i < prices.length; i++) {
      const s = sectors[i];
      if (!s) continue;
      const price = prices[i];
      out.push({
        Id: `${ev.id}-${day}-${s.key}`,
        Sector: s.label,
        Row: '1',
        SeatList: s.seatList,
        NominalPrice: String(price),
        AgentPrice: String(price),
        EventDateTime: sess.iso,
        /** Зоны Большого продаём сами, без партнёрского API. */
        LocalOffer: true,
        /** fixedRetail: витрина = цена из ТЗ (глобальная % наценка GetBilet не применяется). */
        ...(fixedRetail ? { ManualOffer: true } : {}),
      });
    }
  }
  return out;
}
async function unpublishSiblings(siblingIds) {
  if (!siblingIds?.length) return;
  await ticketPool.query(
    `UPDATE getbilet_events SET is_published = FALSE, updated_at = NOW()
     WHERE getbilet_external_id = ANY($1::text[])`,
    [siblingIds],
  );
  console.log(`[seed-bolshoi] unpublished siblings: ${siblingIds.join(', ')}`);
}

async function seedOne(ev, stageId, stageName, genre, age, sectors) {
  const catalog = buildCatalogPayload(ev, stageId, stageName, genre, age);
  const desc = buildDescriptionPack(ev, stageName, genre, age);
  const offersPayload = {
    Success: true,
    Method: 'GetOfferListByRepertoireId',
    ResultData: buildOffers(ev, sectors),
  };

  const poster = String(ev.poster || '').trim() || null;
  await ticketPool.query(
    `INSERT INTO getbilet_events (
       getbilet_external_id, title_manual, description_manual, description_pack_json,
       venue_manual, venue_address_manual, card_subtitle_manual, notes_internal,
       poster_url_manual, banner_url_manual,
       is_published, sort_order, updated_at
     ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$9,TRUE,$10,NOW())
     ON CONFLICT (getbilet_external_id) DO UPDATE SET
       title_manual=EXCLUDED.title_manual, description_manual=EXCLUDED.description_manual,
       description_pack_json=EXCLUDED.description_pack_json, venue_manual=EXCLUDED.venue_manual,
       venue_address_manual=EXCLUDED.venue_address_manual, card_subtitle_manual=EXCLUDED.card_subtitle_manual,
       notes_internal=EXCLUDED.notes_internal,
       poster_url_manual=COALESCE(EXCLUDED.poster_url_manual, getbilet_events.poster_url_manual),
       banner_url_manual=COALESCE(EXCLUDED.banner_url_manual, getbilet_events.banner_url_manual),
       is_published=TRUE, sort_order=EXCLUDED.sort_order, updated_at=NOW()`,
    [
      ev.id,
      ev.title,
      catalog.Description,
      JSON.stringify(desc),
      ev.venue,
      ev.address,
      ev.cardSubtitle,
      'OFFERS_CACHE_ONLY · ручное событие Большого (предзаказ по секторам, без GetBilet).',
      poster,
      -400,
    ],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_catalog_cache (cache_key, repertoire_external_id, stage_id, payload_json, synced_at)
     VALUES ($1,$1,$2,$3::jsonb,NOW())
     ON CONFLICT (cache_key) DO UPDATE SET stage_id=EXCLUDED.stage_id, payload_json=EXCLUDED.payload_json, synced_at=NOW()`,
    [ev.id, stageId, JSON.stringify(catalog)],
  );

  await ticketPool.query(
    `INSERT INTO getbilet_repertoire_offers_cache (repertoire_external_id, payload_json, fetched_at)
     VALUES ($1,$2::jsonb,NOW())
     ON CONFLICT (repertoire_external_id) DO UPDATE SET payload_json=EXCLUDED.payload_json, fetched_at=NOW()`,
    [ev.id, JSON.stringify(offersPayload)],
  );

  await unpublishSiblings(ev.siblingIds || []);

  const nSess = sessionsOf(ev).length;
  console.log(`[seed-bolshoi] ${ev.id} · ${ev.cardSubtitle} · sessions=${nSess} · offers=${offersPayload.ResultData.length}`);
}

/** Новая сцена: sectorMode должен совпадать с лейблом офферов «Партер (середина)». */
async function ensureNewStageParterCheckout() {
  const r = await ticketPool.query(
    `SELECT layout_json FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [NEW_STAGE_ID],
  );
  const lj = r.rows[0]?.layout_json;
  if (!lj) {
    console.warn('[seed-bolshoi] no bolshoi-new-stage map — skip parter collapse');
    return;
  }
  const { layout, changed, reason } = collapseBolshoiNewStageToParterMid(lj);
  if (reason === 'no-parter-sectors' || reason === 'parter-bbox-empty') {
    console.warn(`[seed-bolshoi] new-stage collapse failed: ${reason}`);
    return;
  }
  if (!changed) {
    console.log(`[seed-bolshoi] new-stage parter checkout already OK (${reason})`);
    return;
  }
  await ticketPool.query(
    `UPDATE getbilet_stage_maps SET layout_json = $1::jsonb, updated_at = NOW() WHERE stage_external_id = $2`,
    [JSON.stringify(layout), NEW_STAGE_ID],
  );
  console.log('[seed-bolshoi] new-stage sectorMode → Партер (середина) + hallPreviewSectorCheckout');
}

/** Expand по рядам, сохраняя EventDateTime (отдельный expand на каждый сеанс). */
async function expandHistoricalOffersFromStageMap() {
  const map = await ticketPool.query(
    `SELECT layout_json->'seats' AS seats FROM getbilet_stage_maps WHERE stage_external_id = $1`,
    [HISTORICAL_STAGE_ID],
  );
  const seats = map.rows[0]?.seats;
  if (!Array.isArray(seats) || seats.length < 50) {
    console.warn('[seed-bolshoi] нет seats в stage map — офферы без expand по рядам');
    return;
  }
  /** Сырые sector из редактора («Партер», «Бельэтаж Правая…») → sellable labels. */
  const remapped = remapBolshoiSeatsToSellableLabels(seats);
  const byLabel = bolshoiSellableSeatsByRow(remapped);
  let sellableHits = 0;
  for (const byRow of byLabel.values()) {
    for (const grp of byRow.values()) sellableHits += grp.seats.length;
  }
  console.log(`[seed-bolshoi] remap seats ${seats.length} → sellable seat-slots ${sellableHits}`);
  if (sellableHits < 10) {
    console.warn(
      '[seed-bolshoi] мало sellable после remap (часто из‑за mangled sector names в editor) — оставляем базовые SeatList из SECTORS',
    );
    return;
  }
  const onlyRaw = String(process.env.ONLY_EVENT_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;
  const ids = EVENTS.map((e) => e.id).filter((id) => !only || only.has(id));
  for (const id of ids) {
    const r = await ticketPool.query(
      `SELECT payload_json FROM getbilet_repertoire_offers_cache WHERE repertoire_external_id = $1`,
      [id],
    );
    const payload = r.rows[0]?.payload_json;
    if (!payload?.ResultData) continue;
    const base = payload.ResultData;
    /** Схлопнуть предыдущий expand: 1 оффер на сектор+дату. */
    const uniq = [];
    const seen = new Set();
    for (const off of base) {
      const key = `${off.Sector || ''}|${off.EventDateTime || ''}`;
      if (!off.Sector || seen.has(key)) continue;
      seen.add(key);
      uniq.push(off);
    }
    const byDt = new Map();
    for (const off of uniq) {
      const k = off.EventDateTime || '_';
      if (!byDt.has(k)) byDt.set(k, []);
      byDt.get(k).push(off);
    }
    const next = [];
    for (const [dt, offs] of byDt) {
      const day = String(dt).slice(0, 10);
      next.push(...expandBolshoiOffersByRows(offs, byLabel, `${id}-${day}`));
    }
    payload.ResultData = next.length ? next : uniq;
    await ticketPool.query(
      `UPDATE getbilet_repertoire_offers_cache SET payload_json = $1::jsonb, fetched_at = NOW()
       WHERE repertoire_external_id = $2`,
      [JSON.stringify(payload), id],
    );
    console.log(`[seed-bolshoi] expand offers ${id} → ${payload.ResultData.length}`);
  }
}

async function main() {
  const onlyRaw = String(process.env.ONLY_EVENT_IDS || '').trim();
  const only = onlyRaw
    ? new Set(onlyRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))
    : null;
  const allow = (id) => !only || only.has(id);

  for (const ev of EVENTS) {
    if (!allow(ev.id)) continue;
    await seedOne(
      ev,
      HISTORICAL_STAGE_ID,
      'Большой театр — Историческая сцена',
      ev.genre || 'Опера',
      ev.age || '12+',
      SECTORS,
    );
  }
  for (const ev of NEW_EVENTS) {
    if (!allow(ev.id)) continue;
    await seedOne(
      ev,
      NEW_STAGE_ID,
      'Большой театр — Новая сцена',
      ev.genre || 'Балет',
      ev.age || '12+',
      NEW_SECTORS,
    );
  }
  await expandHistoricalOffersFromStageMap();
  await ensureNewStageParterCheckout();

  try {
    const { notifySearchIndexing, publicUrl } = await import('../lib/search-indexing.js');
    const ids = [...EVENTS, ...NEW_EVENTS].map((e) => e.id).filter((id) => !only || only.has(id));
    const urls = ids.flatMap((id) => [
      publicUrl(`/ticket/${encodeURIComponent(id)}`),
    ]);
    urls.push(publicUrl('/events'));
    await notifySearchIndexing(urls);
    console.log(`[seed-bolshoi] IndexNow pinged ${urls.length} url(s)`);
  } catch (e) {
    console.warn('[seed-bolshoi] IndexNow skip:', e?.message || e);
  }
}

main()
  .then(async () => {
    await ticketPool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    try {
      await ticketPool.end();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
