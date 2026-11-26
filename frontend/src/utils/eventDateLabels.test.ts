import { describe, expect, it } from 'vitest';
import { explainEventCardDates } from './eventDateLabels';

describe('explainEventCardDates', () => {
  it('подписывает последнюю дату проката и не путает её с сеансом', () => {
    const copy = explainEventCardDates({
      subtitle: '31 янв · 19:00',
      isoDate: '2026-12-07T19:00',
    });
    expect(copy.sessionLine).toBe('понедельник, 7 декабря · 19:00');
    expect(copy.runLine).toBe('Ещё даты до 31 января');
    expect(copy.prose).toBeNull();
  });

  it('диапазон показывает как все даты, возраст с карточки убирает', () => {
    const copy = explainEventCardDates({
      subtitle: '26–28 ноября · 12+',
      isoDate: '2026-11-26T16:00:00.000Z',
    });
    expect(copy.sessionLine).toMatch(/26 ноября/);
    expect(copy.sessionLine).toMatch(/19:00|16:00/);
    expect(copy.runLine).toBe('Ещё даты: 26–28 ноября · 12+');
  });

  it('не дублирует подзаголовок, если это тот же день', () => {
    const copy = explainEventCardDates({
      subtitle: '7 дек · 19:00',
      isoDate: '2026-12-07T19:00',
    });
    expect(copy.sessionLine).toBe('понедельник, 7 декабря · 19:00');
    expect(copy.runLine).toBeNull();
  });

  it('оставляет обычный текст описанием', () => {
    const copy = explainEventCardDates({
      subtitle: 'Лирические сцены по Пушкину',
      isoDate: '2026-12-07T19:00',
    });
    expect(copy.prose).toBe('Лирические сцены по Пушкину');
    expect(copy.runLine).toBeNull();
  });
});
