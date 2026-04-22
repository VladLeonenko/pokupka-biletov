import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyEventTitle } from '../services/eventTitleHeuristics.js';

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

test('Шуфутинский: жанр «Спорт» в API не делает событие спортом', () => {
  const r = classifyEventTitle('Михаил Шуфутинский', { genre: 'Спорт' });
  assert.equal(r.kind, 'concert');
  assert.equal(r.categoryLabel, 'Концерт');
});
