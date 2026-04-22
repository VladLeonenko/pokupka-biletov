/**
 * Развёрнутое описание мероприятия для публичной страницы: секции, минимум MIN_TOTAL символов.
 * Шаблоны — нейтральные, без выдуманных фактов о конкретном составе/сюжете; опираются на название и тип.
 */

import { buildProgrammaticAboutParagraphs } from './eventTitleNarrative.js';

/** @param {string} s */
function norm(s) {
  return (s || '').trim();
}

export const MIN_TOTAL = 3000;

/** @param {{ title: string, paragraphs: string[] }[]} sections */
export function sectionsToPlain(sections) {
  return sections
    .map((s) => {
      const body = s.paragraphs.join('\n\n');
      return `${s.title}\n\n${body}`;
    })
    .join('\n\n');
}

const SERVICE_SECTION_RX =
  /^(Билеты|Как подготовиться|Вопросы|Сервис|Редакционная|Ещё о событии)/i;

const BAD_LEAD_RX =
  /категория «мероприятие»|детали программы раскрываются на месте|задаёт общую рамку|повод собраться впечатлениями вживую/i;

/**
 * Текст для лида героя: без заголовков секций и без шаблонных абзацев.
 * @param {{ sections: { title: string; paragraphs: string[] }[] }} pack
 * @param {{ heroLead?: string | null }} [extras]
 */
export function extractHeroLeadFromPack(pack, extras = {}) {
  const fromAi = extras.heroLead != null ? String(extras.heroLead).trim() : '';
  if (fromAi && !BAD_LEAD_RX.test(fromAi)) return fromAi;

  for (const s of pack.sections || []) {
    const tit = (s.title || '').trim();
    if (SERVICE_SECTION_RX.test(tit)) continue;
    const p = (s.paragraphs && s.paragraphs[0] ? String(s.paragraphs[0]).trim() : '') || '';
    if (!p || BAD_LEAD_RX.test(p)) continue;
    return p;
  }
  return '';
}

/**
 * @param {string} text
 * @returns {{ title: string | null, paragraphs: string[] }[]}
 */
function parseManualMarkdownSections(text) {
  const lines = String(text).split(/\r?\n/);
  /** @type {{ title: string | null, paragraphs: string[] }[]} */
  const out = [];
  let curTitle = /** @type {string | null} */ (null);
  let buf = /** @type {string[]} */ ([]);

  const flush = () => {
    const paras = buf
      .join('\n')
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras.length) {
      out.push({ title: curTitle, paragraphs: paras });
    }
    buf = [];
  };

  for (const line of lines) {
    const hm = line.match(/^#{2,3}\s+(.+)$/);
    if (hm) {
      flush();
      curTitle = hm[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/**
 * Универсальный «сервисный» хвост страницы: покупка билетов и визит (без художественного текста).
 * @param {string | null | undefined} venueLabel
 * @returns {{ title: string; paragraphs: string[] }[]}
 */
export function getPracticalTailSections(venueLabel) {
  const venue =
    venueLabel && venueLabel.trim()
      ? venueLabel.trim()
      : 'площадке проведения, указанной в афише и на вашем билете';

  return [
    {
      title: 'Билеты, места и сервис',
      paragraphs: [
        `На этой странице вы выбираете дату, зону зала и конкретные места — наглядно, без звонков и очередей. Цены отображаются прозрачно: вы сразу видите доступные варианты и можете сравнить секторы. После выбора места оформляйте заказ в привычном режиме: оплата проходит онлайн, подтверждение и детали брони приходят на контакты, которые вы укажете при оформлении.`,
        `Если вы покупаете несколько билетов, старайтесь выбрать места в одном ряду — так проще прийти компанией и не искать друг друга в зале. При необходимости вернитесь к списку доступных мест: иногда по мере продаж появляются новые варианты. Сохраняйте номер заказа и электронный билет: они понадобятся при входе и при обращении в поддержку.`,
        `Точные правила возврата и обмена зависят от организатора и типа события. Перед оплатой внимательно прочитайте условия на странице оформления и в письме с подтверждением. Если формат мероприятия изменится (перенос, замена площадки, существенные изменения программы), ориентируйтесь на официальные сообщения организатора и инструкции в вашем личном кабинете.`,
      ],
    },
    {
      title: 'Как подготовиться к визиту',
      paragraphs: [
        `Заложите время на дорогу и проход на ${venue.startsWith('площадке') ? venue : `«${venue}»`}: в день события рядом бывает плотнее обычного движение, а на входе возможны очереди. Возьмите документ, удобную обувь и слой одежды про запас — в зале температура может отличаться от улицы. Для семейного посещения заранее уточните возрастные рекомендации и длительность: так проще спланировать вечер без спешки.`,
        `Фотографирование и запись могут быть ограничены правилами площадки — это нормальная практика для уважения к артистам и другим зрителям. Рюкзаки и крупный багаж часто оставляют в гардеробе или камере хранения; ценные вещи лучше держать при себе. Если у вас есть особые потребности по доступности, заранее свяжитесь с организатором: многие площадки заранее подскажут вход, лифты и места для маломобильных гостей.`,
      ],
    },
  ];
}

/**
 * @param {string} title
 * @param {'sport' | 'football' | 'concert' | 'theater' | 'kids' | 'default'} kind
 * @param {string} categoryLabel
 * @param {string | null} venueLabel
 */
function kindBodySections(title, kind, categoryLabel, venueLabel) {
  const t = norm(title) || 'это мероприятие';
  const venue =
    venueLabel && venueLabel.trim()
      ? venueLabel.trim()
      : 'площадке проведения, указанной в афише и на вашем билете';

  const commonTail = getPracticalTailSections(venueLabel);

  if (kind === 'football') {
    return [
      {
        title: 'О событии',
        paragraphs: buildProgrammaticAboutParagraphs(t, 'football', categoryLabel, venueLabel),
      },
      {
        title: 'Стадион, трибуны и что учесть на месте',
        paragraphs: [
          `Событие проходит на ${venue.startsWith('площадке') ? venue : `стадионе или арене «${venue}»`}. На крупных объектах полезно заранее посмотреть схему секторов: от входа до кресла путь может занимать время, особенно если вы приходите близко к началу. Обратите внимание на номер трибуны, ряд и место — они должны совпадать с билетом; при сомнениях лучше уточнить у персонала на стойках информации.`,
          `Погода на открытых аренах влияет на комфорт: ветер и дождь ощущаются сильнее на верхних ярусах, поэтому возьмите куртку или лёгкий дождевик про запас. На крытых стадионах климат обычно стабильнее, но проходы могут быть прохладными. Питание и напитки чаще всего доступны на точках общепита; очереди пиковые в перерыве — планируйте покупку заранее, если не хотите пропустить начало второго тайма.`,
          `Транспортная доступность в день матча меняется: перекрытия, усиленные маршруты и загруженность парковок — типичная картина. Часто удобнее общественный транспорт или такси до отдалённой точки с последующей прогулкой. Возвращаясь домой, заложите 15–30 минут после финального свистка, чтобы спокойно покинуть сектор вместе с потоком зрителей.`,
        ],
      },
      ...commonTail,
    ];
  }

  if (kind === 'sport') {
    return [
      {
        title: 'О событии',
        paragraphs: buildProgrammaticAboutParagraphs(t, 'sport', categoryLabel, venueLabel),
      },
      {
        title: 'Площадка и организация зрителей',
        paragraphs: [
          `Мероприятие пройдёт на ${venue.startsWith('площадке') ? venue : `площадке «${venue}»`}. Уточните, какой вход актуален для вашего сектора: на крупных аренах несколько групп ворот, и ошибка на пять минут может стать лишней сутолокой. Приходите заранее, чтобы пройти контроль, найти гардероб и занять место без спешки.`,
          `На части спортивных форматов действуют ограничения по предметам: крупные сумки, стекло, «лишний» пластик могут быть запрещены. Список лучше перепроверить на сайте организатора в день события. Если вы фотографируете на телефон, держите вспышку выключенной и не задерживайте обзор тем, кто сидит позади.`,
        ],
      },
      ...commonTail,
    ];
  }

  if (kind === 'theater') {
    return [
      {
        title: 'О событии',
        paragraphs: buildProgrammaticAboutParagraphs(t, 'theater', categoryLabel, venueLabel),
      },
      {
        title: 'Зал, места и культура восприятия',
        paragraphs: [
          `Представление состоится в ${venue.startsWith('площадке') ? venue : `театре «${venue}»`}. От расположения ряда зависит угол обзора и акустика: ближе к сцене сильнее видно мимику, дальше — проще охватить всю картину массовых сцен. Если вы берёте места сбоку, учитывайте, что часть декораций может быть выстроена углубленно; это не брак, а особенность постановочного решения.`,
          `Дресс-код обычно умеренный: достаточно аккуратного городского стиля. Главное — комфорт на два-три часа посадки и уважение к формату. Для детей заранее объясните правило тишины: так вечер пройдёт приятнее для вашей семьи и для соседей.`,
        ],
      },
      ...commonTail,
    ];
  }

  if (kind === 'concert') {
    return [
      {
        title: 'О событии',
        paragraphs: buildProgrammaticAboutParagraphs(t, 'concert', categoryLabel, venueLabel),
      },
      {
        title: 'Площадка, слух и практические мелочи',
        paragraphs: [
          `Событие пройдёт на ${venue.startsWith('площадке') ? venue : `площадке «${venue}»`}. Проверьте, где находится ваш вход: на фестивалях и в больших залах несколько ворот, и ошибка в навигации стоит нервов. Беруши могут пригодиться, если вы чувствительны к громкости или идёте с ребёнком — это забота о комфорте, а не «слабость».`,
          `Мерч, бар и туалеты в пиковые моменты загружены: если хотите избежать очередей, используйте окно до начала или после первых песен, когда поток распределяется. Фото и видео могут быть ограничены политикой артиста — уважайте правила, чтобы не лишать себя и других удовольствия от момента «здесь и сейчас».`,
        ],
      },
      ...commonTail,
    ];
  }

  if (kind === 'kids') {
    return [
      {
        title: 'О событии',
        paragraphs: buildProgrammaticAboutParagraphs(t, 'kids', categoryLabel, venueLabel),
      },
      {
        title: 'Комфорт на площадке',
        paragraphs: [
          `Мероприятие состоится на ${venue.startsWith('площадке') ? venue : `площадке «${venue}»`}. Приходите чуть раньше, чтобы пройти адаптацию: детям спокойнее, когда они успели осмотреться. Туалеты и гардероб лучше посетить до посадки; в антракте дети могут устать быстрее взрослых — планируйте паузы и не перегружайте вечер дополнительными поездками.`,
        ],
      },
      ...commonTail,
    ];
  }

  return [
    {
      title: 'О событии',
      paragraphs: buildProgrammaticAboutParagraphs(t, 'default', categoryLabel, venueLabel),
    },
    {
      title: 'Площадка и организационные детали',
      paragraphs: [
        `Ключевая локация для этого события — ${venue.startsWith('площадке') ? venue : `«${venue}»`}. На входе может действовать контроль, поэтому имейте при себе билет и документ при необходимости. Крупные сумки иногда пропускают через отдельную линию; мелочь и телефон держите так, чтобы быстро предъявить QR-код или номер заказа.`,
        `Если вы встречаетесь с друзьями, заранее договоритесь о точке вне зала — связь внутри здания не всегда стабильна. После мероприятия люди выходят волной; иногда быстрее отойти на 200–300 метров от выхода и заказать такси оттуда.`,
      ],
    },
    ...commonTail,
  ];
}

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {'sport' | 'football' | 'concert' | 'theater' | 'kids' | 'default'} opts.kind
 * @param {string} opts.categoryLabel
 * @param {string | null | undefined} opts.venueLabel
 * @param {string | null | undefined} opts.manualText
 * @returns {{ sections: { id: string; title: string; paragraphs: string[] }[]; plainText: string; totalChars: number }}
 */
export function buildEventDescriptionSections(opts) {
  const title = norm(opts.title) || 'Мероприятие';
  const kind = opts.kind;
  const categoryLabel = norm(opts.categoryLabel) || 'Мероприятие';
  const venueLabel = opts.venueLabel != null && String(opts.venueLabel).trim() ? String(opts.venueLabel).trim() : null;
  const manualRaw = opts.manualText != null ? String(opts.manualText).trim() : '';

  /** @type {{ id: string; title: string; paragraphs: string[] }[]} */
  let sections = [];

  if (manualRaw) {
    const parsed = parseManualMarkdownSections(manualRaw);
    if (parsed.length > 0) {
      sections = parsed.map((s, i) => ({
        id: `manual-${i + 1}`,
        title: s.title || 'О событии',
        paragraphs: [...s.paragraphs],
      }));
    } else {
      sections = [
        {
          id: 'manual',
          title: 'О событии',
          paragraphs: manualRaw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
        },
      ];
    }
  }

  const generated = kindBodySections(title, kind, categoryLabel, venueLabel);
  const genPlain = sectionsToPlain(generated);
  let plain = sectionsToPlain(
    sections.map((s) => ({
      title: s.title,
      paragraphs: s.paragraphs,
    })),
  );

  if (plain.length < MIN_TOTAL) {
    if (sections.length === 1 && sections[0].title === 'О событии' && manualRaw) {
      sections[0].title = 'Аннотация';
      sections[0].id = 'annotation';
    }
    const existingPlain = plain;
    const need = MIN_TOTAL - existingPlain.length;
    if (need > 0 && genPlain.length > 0) {
      if (existingPlain.length > 0) {
        sections.push(
          ...generated.map((g, i) => ({
            id: `detail-${i + 1}`,
            title: g.title,
            paragraphs: [...g.paragraphs],
          })),
        );
      } else {
        sections = generated.map((g, i) => ({
          id: `detail-${i + 1}`,
          title: g.title,
          paragraphs: [...g.paragraphs],
        }));
      }
    }
  }

  plain = sectionsToPlain(sections.map((s) => ({ title: s.title, paragraphs: s.paragraphs })));

  if (plain.length < MIN_TOTAL) {
    const padTitle = 'Вопросы и ответы';
    const padParas = [
      `Почему стоит оформить билеты заранее? Популярные даты и удачные места разбирают быстрее, чем кажется на первый взгляд. Раннее бронирование помогает спланировать бюджет и избежать спешки в последний день, когда дорога, парковка и очереди съедают настроение.`,
      `Что делать, если планы изменились? Сохраняйте переписку, номер заказа и ссылку на правила. В большинстве случаев корректный путь — обратиться в поддержку или следовать инструкции организатора в письме подтверждения. Не передавайте билеты незнакомым посредникам и не публикуйте QR-коды в открытом доступе.`,
      `Как понять, что билет подлинный? Оформляйте покупку через официальные каналы и проверенные сервисы. Если цена выглядит нереалистично низкой, это повод насторожиться. На входе важны совпадение данных, целостность электронного документа и соответствие даты и места.`,
      `Как вести себя в зале уважительно? Приходите вовремя, уменьшайте яркость экрана, не надевайте высокие головные уборы там, где они мешают обзору, и не раскачивайте ряд соседей резкими движениями. Аплодируйте уместно: это поддерживает артистов и спортсменов и делает атмосферу теплее.`,
      `Почему описание не пересказывает сюжет или состав? Мы сознательно избегаем выдуманных деталей о конкретном матче или спектакле — вместо этого даём полезную рамку для подготовки и комфортного визита. Точные факты о программе, составе и длительности уточняйте у организатора и в официальных материалах события.`,
    ];
    sections.push({
      id: 'faq-pad',
      title: padTitle,
      paragraphs: padParas,
    });
    plain = sectionsToPlain(sections.map((s) => ({ title: s.title, paragraphs: s.paragraphs })));
  }

  if (plain.length < MIN_TOTAL) {
    const filler = `Текст сформирован автоматически, чтобы у вас на странице было полное сопровождение события: от практических советов до описания атмосферы формата. Если вы организатор и хотите заменить блоки на официальную редакцию, используйте раздел редактирования мероприятия в админ-панели: поддерживаются заголовки в формате Markdown («## Заголовок») и обычные абзацы. Название «${title}» остаётся центром страницы — все рекомендации ниже помогают зрителю спокойно подготовиться и получить удовольствие от визита, независимо от того, приходит ли он один, с партнёром или всей семьёй. Мы верим, что хорошая афиша сочетает ясность сервиса и уважение к искусству и спорту.`;
    sections.push({
      id: 'service-note',
      title: 'Редакционная справка',
      paragraphs: [filler],
    });
    plain = sectionsToPlain(sections.map((s) => ({ title: s.title, paragraphs: s.paragraphs })));
  }

  const totalChars = plain.length;
  return {
    sections,
    plainText: plain,
    totalChars,
  };
}
