import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_HERO_SUBLINE_SCHEDULE_HINT,
  HERO_SUBLINE_VENUE_FALLBACK,
  resolveHeroSublineVenueFocused,
} from '../services/eventTitleNarrative.js';

test('resolveHeroSublineVenueFocused: leaves normal subline', () => {
  const s = 'Москва · суббота, 12 апреля · МХТ';
  assert.equal(resolveHeroSublineVenueFocused(s, { cityName: 'X' }, 'Y'), s);
});

test('resolveHeroSublineVenueFocused: empty uses catalog hints', () => {
  assert.equal(
    resolveHeroSublineVenueFocused('', { cityName: 'Казань' }, 'Театр Качалова'),
    'Казань · Театр Качалова',
  );
});

test('resolveHeroSublineVenueFocused: replaces legacy with hints and keeps distinct tail', () => {
  assert.equal(
    resolveHeroSublineVenueFocused(
      `${LEGACY_HERO_SUBLINE_SCHEDULE_HINT} · Корпус на Новинском`,
      { cityName: 'Москва' },
      'МХТ им. Горького',
    ),
    'Москва · МХТ им. Горького · Корпус на Новинском',
  );
});

test('resolveHeroSublineVenueFocused: legacy only + venue → venue', () => {
  assert.equal(
    resolveHeroSublineVenueFocused(LEGACY_HERO_SUBLINE_SCHEDULE_HINT, {}, 'Арена «ВТБ»'),
    'Арена «ВТБ»',
  );
});

test('resolveHeroSublineVenueFocused: legacy only, no data → fallback', () => {
  assert.equal(
    resolveHeroSublineVenueFocused(LEGACY_HERO_SUBLINE_SCHEDULE_HINT, {}, null),
    HERO_SUBLINE_VENUE_FALLBACK,
  );
});
