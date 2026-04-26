import test from 'node:test';
import assert from 'node:assert/strict';
import { descPackFromStoredJson } from '../services/eventDescriptionPackStored.js';

test('descPackFromStoredJson: null / invalid', () => {
  assert.equal(descPackFromStoredJson(null), null);
  assert.equal(descPackFromStoredJson({}), null);
  assert.equal(descPackFromStoredJson({ sections: [] }), null);
});

test('descPackFromStoredJson: valid v1 shape', () => {
  const raw = {
    v: 1,
    heroKicker: 'Спектакль · Драма · 16+',
    heroSubline: 'Москва · Театр',
    heroLead: 'Короткий лид для героя.',
    eventMeta: [{ label: 'Площадка', value: 'МХТ' }],
    sections: [
      { id: 'ai-about', title: 'О событии', paragraphs: ['Первый абзац.', 'Второй.'] },
      { id: 'x', title: 'Дополнительно', paragraphs: ['Ещё текст.'] },
    ],
    totalChars: 5000,
  };
  const p = descPackFromStoredJson(raw);
  assert.ok(p);
  assert.equal(p.sections.length, 2);
  assert.equal(p.heroLead, 'Короткий лид для героя.');
  assert.equal(p.eventMeta.length, 1);
  assert.equal(p.sections[0].id, 'ai-about');
});

test('descPackFromStoredJson: fills id when missing', () => {
  const p = descPackFromStoredJson({
    sections: [{ title: 'О событии', paragraphs: ['a'] }],
    totalChars: 100,
  });
  assert.ok(p);
  assert.equal(p.sections[0].id, 'stored-1');
});
