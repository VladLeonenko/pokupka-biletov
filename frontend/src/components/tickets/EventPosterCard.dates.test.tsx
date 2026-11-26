import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { EventPosterCard } from './EventPosterCard';
import type { NormalizedBiletEvent } from '@/services/biletPublicApi';

function html(event: NormalizedBiletEvent): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EventPosterCard event={event} />
    </MemoryRouter>,
  );
}

const onegin: NormalizedBiletEvent = {
  id: 'rep::2026-12-07T19:00',
  repertoireId: 'rep',
  publicSlug: 'evgeniy-onegin-vahtangova',
  title: 'Евгений Онегин',
  subtitle: '31 янв · 19:00',
  isoDate: '2026-12-07T19:00',
  venue: 'Театр им. Вахтангова',
  venueAddress: 'Москва, улица Арбат, 26',
  genre: 'Опера',
};

describe('EventPosterCard dates and venue', () => {
  it('сеанс и последний показ подписаны, площадка ведёт в афишу', () => {
    const out = html(onegin);
    expect(out).toContain('Ближайшая');
    expect(out).not.toContain('Сеанс');
    expect(out).toContain('понедельник, 7 декабря · 19:00');
    expect(out).toContain('Ещё даты до 31 января');
    expect(out).toContain('7 дек · 19:00');
    expect(out).not.toContain('31 янв ·');
    expect(out).toContain('href="/events/venue/teatr-im-vahtangova"');
    expect(out).toContain('Афиша: Театр им. Вахтангова');
    expect(out).toContain('href="/ticket/evgeniy-onegin-vahtangova"');
  });
});
