/**
 * Эвристики категории события — лента витрины, поиск, фильтры.
 * Дублируется в backend/services/eventTitleHeuristics.js (обновлять вместе).
 *
 * Подсказки из subtitle/description и из поля genre API сильно повышают попадание,
 * когда в названии только «Команда А — Команда Б» или нейтральная формулировка.
 */

export type EventTitleKind =
  | 'sport'
  | 'football'
  | 'concert'
  | 'theater'
  | 'kids'
  | 'default';

export type ClassifyContext = {
  subtitle?: string;
  /** Нормальный текст жанра из билетной системы (не ObjectId) */
  genre?: string;
};

function norm(s: string | undefined): string {
  return (s || '').trim();
}

/** Объединённый текст для regex (название + описание + жанр API) */
export function buildClassificationCorpus(title: string, ctx?: ClassifyContext): string {
  const parts = [norm(title)];
  const sub = norm(ctx?.subtitle);
  const g = norm(ctx?.genre);
  if (sub) parts.push(sub);
  if (g) parts.push(g);
  return parts.join('\n');
}

function lo(s: string): string {
  return s.toLowerCase();
}

/** Явные маркеры «не спорт» в строке дня (название целиком) */
function looksTheaterishNotSport(title: string): boolean {
  return /спектакль|читает\s|театр\.?\s*$|опера\.?\s*$|лекци|экскурс|чехов|гоголь|пьес|актёр|трагед|комедия\s*$/i.test(
    title,
  );
}

/**
 * Два непустых фрагмента по длинному/среднему тире — типичный шаблон матча.
 * Отсекаем театр/лекции по ключевым словам.
 */
function likelyTeamVersusTitle(title: string): boolean {
  const t = norm(title);
  if (!/[—–-]/.test(t)) return false;
  if (looksTheaterishNotSport(t)) return false;
  const chunks = t.split(/\s*[—–-]\s*/).map((x) => x.trim()).filter(Boolean);
  if (chunks.length < 2) return false;
  const a = chunks[0].replace(/[()]/g, ' ').trim();
  const b = chunks[1].replace(/[()]/g, ' ').trim();
  if (a.length < 2 || b.length < 2) return false;
  if (a.length > 90 || b.length > 90) return false;
  return true;
}

function genreHintsSport(genre: string | undefined): boolean {
  const g = lo(norm(genre));
  if (!g) return false;
  return /спорт|футбол|футзал|хоккей|баскет|волейб|теннис|гандбол|регби|сборн|матч|match|soccer|football|hockey|ufc|mma|khl|nhl|\bnba\b|\bnfl\b/i.test(
    g,
  );
}

function genreHintsTheater(genre: string | undefined): boolean {
  const g = lo(norm(genre));
  if (!g) return false;
  return /театр|спектакль|балет|опера|мюзикл|цирк|постановк|драма|комедия|трагикомед|эстрадн\w*\s+(театр|постанов|трупп)/i.test(
    g,
  );
}

function genreHintsConcert(genre: string | undefined): boolean {
  const g = lo(norm(genre));
  if (!g) return false;
  return /^эстрада$|эстрада\b|шансон|эстрадн\w*\s+концерт|поп\s*-?\s*рок|chanson/i.test(g);
}

export function classifyEventTitle(
  title: string,
  ctx?: ClassifyContext,
): {
  categoryLabel: string;
  kind: EventTitleKind;
  descriptionBlurb: string;
} {
  const t = norm(title);
  const corpus = buildClassificationCorpus(title, ctx);
  const c = lo(corpus);
  const titleOnly = lo(t);

  const musicalOrRockOpera =
    /юнона\s+и\s+авось|рок[- ]?опера|рок\s+опера|мюзикл|оперетт|мюз\.|балет\s+в\s+двух/i.test(c);

  /** Гала у балетной труппы / в театре — не «чистый концерт» */
  const galaBalletOrTheaterGala =
    /гала/i.test(c) &&
    /балет|балета|ейфман|эйфман|ейфмана|ballet|teatr|театр\s+балета|хореограф/i.test(c);

  const kids =
    /детск|кукол|сказк|мульт|семейн|для дет|kids\s|children/i.test(c) && !/детск\w*\s+футбол/i.test(c);

  /**
   * ЦСКА / «Динамо» есть и в футболе, и в хоккее — без контекста клубный список даёт ложный «футбол».
   */
  const hockeyMarkers =
    /\bхоккей\b|\bhockey\b|\bkhl\b|кхл|чемпионат\s+кхл|шайб|gagarin\s+cup|\bхк\b/i.test(c);

  const khlMatchWithoutFootballWord =
    likelyTeamVersusTitle(t) &&
    /авангард|салават\s*юлаев|ак\s+барс|металлург\s*\(|торпедо\s*\(|нефтехим|северсталь|трактор\s*\(|барыс|амур\s*\(|хк\s+сибирь/i.test(
      c,
    ) &&
    !/футбол|football|soccer|рпл\s|премьер\s*-\s*лиг/i.test(c);

  const hockeyContext = hockeyMarkers || khlMatchWithoutFootballWord;

  const football =
    !hockeyContext &&
    (/футбол|football|soccer|futbol/i.test(c) ||
      /\bрпл\b|\bрфпл\b|суперкубок\s+россии/i.test(c) ||
      (genreHintsSport(ctx?.genre) &&
        /футбол|soccer|football|рпл/i.test(c + ' ' + lo(ctx?.genre || ''))) ||
      (likelyTeamVersusTitle(t) &&
        (/футбол|матч|турнир|кубок|champions|liga|league|uefa|fifa|fc\b|серия\s+[аa]|\bсборн/i.test(c) ||
          /(спартак|цска|cska|динамо|зенит|локомотив|краснодар|рубин|урал|сочи|ахмат|ростов|крылья|оренбург|monaco|juventus|milan|inter|barcelona|real\s*madrid|liverpool|manchester|chelsea|arsenal|bayern|psg|porto|celtic)/i.test(
            c,
          ))));

  const sportCore =
    /\bхоккей\b|\bhockey\b|\bкхл\b|\bkhl\b|\bnhl\b|баскетбол|basketball|\bnba\b|волейбол|volleyball|теннис|tennis|биатлон|фигурн|самбо|борьб|единоборств|боев(ые|ых)\s+искусств|бои\b|fight|легкоатлет|лёгк(ая|ой)\s+атлет|футзал|rugby|регби|гандбол|handball|олимпиад|olympiad|champions\s+league|лига\s+чемпион|серия\s+[aа]\b|суперкубок|super\s+cup|play[\s-]?off|плей\W*оф|stadium|стадион\b|арена\s+спорт|\bufc\b|\bmma\b|бокс\b|boxing|padel|кёрлинг|curling|финал\s+кубка|derby|дерби|формула[\s-]?1|\bf1\b|мото|ралли|rally|шахмат|chess|шайб/i.test(
      c,
    );

  const sport =
    football ||
    sportCore ||
    (likelyTeamVersusTitle(t) &&
      !looksTheaterishNotSport(t) &&
      (genreHintsSport(ctx?.genre) || /матч|match|турнир|tournament|vs\.| vs |против/i.test(c))) ||
    genreHintsSport(ctx?.genre);

  const theaterWords =
    /спектакль|театр|опера\b|балет|мюзикл|премьер|мхат|сцена|постановк|режисс|режис|балетмейст|choreograph|dramatic|performance|playbill/i.test(
      c,
    ) ||
    /(драма|комедия|трагедия)\b/i.test(c) ||
    galaBalletOrTheaterGala;

  const theater = musicalOrRockOpera || theaterWords || genreHintsTheater(ctx?.genre);

  const concertCore =
    /концерт|фестиваль|фест\b|fest\b|ту[рр]\b|live\s|шоу\b|symphony|симфон|оркестр|arena\s+тур/i.test(
      c,
    ) ||
    /шуфутинск/i.test(c) ||
    (/[—\-–]/.test(t) &&
      /(basta|баста|guf|гуф|morgenshtern|морген|рэп|hip[\s-]?hop|хип[\s-]?хоп)/i.test(c));

  const concert =
    (genreHintsConcert(ctx?.genre) || concertCore) &&
    !galaBalletOrTheaterGala &&
    !musicalOrRockOpera &&
    !genreHintsTheater(ctx?.genre);

  let kind: EventTitleKind = 'default';
  let categoryLabel = 'Мероприятие';

  if (kids) {
    kind = 'kids';
    categoryLabel = 'Детям';
  } else if (musicalOrRockOpera) {
    kind = 'theater';
    categoryLabel = 'Мюзикл';
  } else if (galaBalletOrTheaterGala) {
    kind = 'theater';
    categoryLabel = /балет|ballet|эйфман|ейфман/i.test(c) ? 'Балет' : 'Театр';
  } else if (hockeyContext) {
    kind = 'sport';
    categoryLabel = 'Хоккей';
  } else if (football) {
    kind = 'football';
    categoryLabel = 'Футбол';
  } else if (theater) {
    kind = 'theater';
    if (/балет|ballet/i.test(c) && !/опера\b/i.test(titleOnly)) categoryLabel = 'Балет';
    else if (/опера\b|opera/i.test(c)) categoryLabel = 'Опера';
    else categoryLabel = 'Театр';
  } else if (concert) {
    kind = 'concert';
    categoryLabel = 'Концерт';
  } else if (sport) {
    kind = 'sport';
    categoryLabel = 'Спорт';
  }

  const descriptionBlurb =
    categoryLabel === 'Мероприятие'
      ? `${t}. Билеты онлайн — удобный выбор мест и оплата на сайте.`
      : `«${t}» — ${categoryLabel.toLowerCase()}. Билеты на событие в продаже онлайн: выберите дату и места.`;

  return { categoryLabel, kind, descriptionBlurb };
}
