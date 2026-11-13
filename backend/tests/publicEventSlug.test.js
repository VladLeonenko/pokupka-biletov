import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPublicSlug, stripDatesFromTitle, slugContainsDate } from '../utils/publicEventSlug.js';

test('щелкунчик: дата из id не попадает в ЧПУ', () => {
  assert.equal(
    buildPublicSlug({
      repertoireId: 'novogodniy-balet-chaykovskogo-2026-12',
      title: 'Новогодний балет Чайковского',
      venue: 'Большой театр — Историческая сцена',
    }),
    'schelkunchik-bolshoy',
  );
});

test('балет Большого: название + площадка, без месяца', () => {
  assert.equal(
    buildPublicSlug({
      repertoireId: 'bayaderka-2026-11-13',
      title: 'Баядерка',
      venue: 'Большой театр — Историческая сцена',
    }),
    'bayaderka-bolshoy',
  );
});

test('рекламный ЧПУ без года остаётся каноном', () => {
  assert.equal(
    buildPublicSlug({
      repertoireId: '686cd69c58f79d0030278b9d',
      title: 'Кабала святош. 20 ноября 2026',
      venue: 'МХТ им. А. П. Чехова',
    }),
    'kabala-svyatosh',
  );
  assert.equal(
    buildPublicSlug({
      repertoireId: '6a46656d46a4d000309ed0a2',
      title: 'Суперкубок России 2026',
      venue: 'Нижний Новгород',
    }),
    'olimpbet-superkubok-rossii',
  );
});

test('дата в названии срезается, площадка остаётся', () => {
  assert.equal(stripDatesFromTitle('Рассказы Шукшина 14 ноября 2026'), 'Рассказы Шукшина');
  assert.equal(
    buildPublicSlug({
      repertoireId: '6735c3a7569a15f2087b7f27',
      title: 'Рассказы Шукшина 14 ноября 2026',
      venue: 'Театр Наций',
    }),
    'rasskazy-shukshina-teatr-natsiy',
  );
});

test('год в slug', () => {
  assert.equal(slugContainsDate('bayaderka-2026-11-13'), true);
  assert.equal(slugContainsDate('bayaderka-bolshoy'), false);
});
