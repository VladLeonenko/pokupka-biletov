import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEventTitle, shortEventTitle } from '../services/eventTitleHeuristics.js';

test('football derby', () => {
  const r = classifyEventTitle('Спартак (Москва) — ЦСКА (Москва). Футбол');
  assert.equal(r.kind, 'football');
  assert.equal(r.categoryLabel, 'Футбол');
});

test('concert artists', () => {
  const r = classifyEventTitle('Баста — Guf');
  assert.equal(r.kind, 'concert');
  assert.equal(r.categoryLabel, 'Концерт');
});

test('theater', () => {
  const r = classifyEventTitle('Чайка. Спектакль');
  assert.equal(r.kind, 'theater');
});

test('football from subtitle when title is team vs team only', () => {
  const r = classifyEventTitle('Клуб А (Город) — Клуб Б (Город)', {
    subtitle: 'Турнир. Футбол. Премьер-лига',
  });
  assert.equal(r.kind, 'football');
});

test('gala ballet from subtitle (not concert)', () => {
  const r = classifyEventTitle('Эйфман-Гала', {
    subtitle: 'Гала-концерт Театра балета Бориса Эйфмана',
  });
  assert.equal(r.kind, 'theater');
  assert.match(r.categoryLabel, /Балет|Театр/);
});

test('KHL: ЦСКА — Авангард не помечается как футбол из-за одной аббревиатуры ЦСКА', () => {
  const r = classifyEventTitle('ЦСКА (Москва) - Авангард (Омская область)');
  assert.equal(r.kind, 'sport');
  assert.equal(r.categoryLabel, 'Хоккей');
});

test('hockey from keywords in full title', () => {
  const r = classifyEventTitle('ХК. ЦСКА — Динамо. КХЛ');
  assert.equal(r.categoryLabel, 'Хоккей');
});

test('эстрада в жанре API — концерт, не театр и не спорт', () => {
  const r = classifyEventTitle('Михаил Шуфутинский', { genre: 'Эстрада' });
  assert.equal(r.kind, 'concert');
  assert.equal(r.categoryLabel, 'Концерт');
});

test('Sqwoz Bab latin artist → концерт, не Мероприятие', () => {
  const r = classifyEventTitle('Sqwoz Bab');
  assert.equal(r.kind, 'concert');
  assert.equal(r.categoryLabel, 'Концерт');
  assert.doesNotMatch(r.descriptionBlurb, /удобный выбор мест/i);
});

test('shortEventTitle режет длинные названия по — / скобкам', () => {
  const long =
    '«БеспринцЫпные чтения» — «Два по пятьдесят». Константин Хабенский и Александр Цыпкин';
  const s = shortEventTitle(long, 48);
  assert.ok(s.length <= 48);
  assert.ok(s.includes('БеспринцЫпные') || s.includes('чтения'));
});

test('Шуфутинский: жанр «Спорт» в API не делает событие спортом', () => {
  const r = classifyEventTitle('Михаил Шуфутинский', { genre: 'Спорт' });
  assert.equal(r.kind, 'concert');
  assert.equal(r.categoryLabel, 'Концерт');
});
