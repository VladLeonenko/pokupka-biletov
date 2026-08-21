import assert from 'node:assert/strict';
import test from 'node:test';

import { isEditorLabeledBundle } from '../utils/luzhnikiGrayCloudLabeledIndex.js';

test('editor-svg-extract: worker payload без geodesySource всё ещё editor bundle', () => {
  assert.equal(
    isEditorLabeledBundle({
      mode: 'editor-svg-extract',
      seats: [{ sector: 'Сектор D 124', row: '10', seat: '1', xPct: 85.1, yPct: 43.2 }],
    }),
    true,
  );
});

test('editor-svg-extract: manualEditor принимается', () => {
  assert.equal(
    isEditorLabeledBundle({
      mode: 'editor-svg-extract',
      seats: [
        {
          sector: 'Сектор A 207',
          row: '8',
          seat: '4',
          xPct: 20,
          yPct: 30,
          geodesySource: 'manualEditor',
        },
      ],
    }),
    true,
  );
});

test('fieldGrid mode не считается editor bundle', () => {
  assert.equal(
    isEditorLabeledBundle({
      mode: 'fieldGrid',
      seats: [{ sector: 'Сектор D 124', row: '1', seat: '1', xPct: 1, yPct: 1 }],
    }),
    false,
  );
});
