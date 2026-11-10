/**
 * Обложки площадок = фото зданий/залов, НЕ афиши спектаклей.
 * Файлы: frontend/public/images/venues/<slug>.jpg (Wikimedia Commons, resized).
 */
import { canonicalizeVenueSlug } from '@/utils/venueSlug';

/** Канонический slug → локальный путь. */
const COVER_BY_SLUG: Record<string, string> = {
  'bolshoy-teatr': '/images/venues/bolshoy-teatr.jpg',
  'bolshoy-teatr-istoricheskaya-stsena': '/images/venues/bolshoy-teatr.jpg',
  'bolshoy-teatr-novaya-stsena': '/images/venues/bolshoy-teatr.jpg',
  'mht-im-chehova': '/images/venues/mht-im-chehova.jpg',
  'mht-chehova': '/images/venues/mht-im-chehova.jpg',
  'teatr-im-vahtangova': '/images/venues/teatr-im-vahtangova.jpg',
  'teatr-natsiy': '/images/venues/teatr-natsiy.jpg',
  ramt: '/images/venues/ramt.jpg',
  lenkom: '/images/venues/lenkom.jpg',
  sovremennik: '/images/venues/sovremennik.jpg',
  'teatr-na-taganke': '/images/venues/teatr-na-taganke.jpg',
  'malyy-teatr': '/images/venues/malyy-teatr.jpg',
  'kremlevskiy-dvorets': '/images/venues/kremlevskiy-dvorets.jpg',
  'masterskaya-petra-fomenko': '/images/venues/masterskaya-petra-fomenko.jpg',
  satirikon: '/images/venues/satirikon.jpg',
  'tsirk-nikulina-na-tsvetnom-bulvare': '/images/venues/tsirk-nikulina-na-tsvetnom-bulvare.jpg',
  'bolshoy-moskovskiy-gosudarstvennyy-tsirk':
    '/images/venues/bolshoy-moskovskiy-gosudarstvennyy-tsirk.jpg',
  'vtb-arena': '/images/venues/vtb-arena.jpg',
  'teatr-im-mayakovskogo': '/images/venues/teatr-im-mayakovskogo.jpg',
  'teatr-im-pushkina': '/images/venues/teatr-im-pushkina.jpg',
  'teatr-im-ermolovoy': '/images/venues/teatr-im-ermolovoy.jpg',
  'teatr-pr-tabakova': '/images/venues/teatr-pr-tabakova.jpg',
  'teatr-na-bronnoy': '/images/venues/teatr-na-bronnoy.jpg',
  'bsa-luzhniki': '/images/venues/bsa-luzhniki.jpg',
  luzhniki: '/images/venues/bsa-luzhniki.jpg',
  'krokus-siti-holl': '/images/venues/krokus-siti-holl.jpg',
  'aleksandrinskiy-teatr': '/images/venues/aleksandrinskiy-teatr.jpg',
  'kz-zaryade': '/images/venues/kz-zaryade.jpg',
  'dom-muzyki': '/images/venues/dom-muzyki.jpg',
  'moskovskiy-teatr-operetty': '/images/venues/moskovskiy-teatr-operetty.jpg',
  'okolo-doma-stanislavskogo': '/images/venues/okolo-doma-stanislavskogo.jpg',
};

/** Нейтральный фасад/зал — если нет фото конкретной площадки. Не афиша. */
export const VENUE_COVER_FALLBACK = '/placeholders/theater.jpg';

export function venueBuildingCoverUrl(slug: string | null | undefined): string | null {
  const canon = canonicalizeVenueSlug(slug);
  if (!canon) return null;
  return COVER_BY_SLUG[canon] || COVER_BY_SLUG[String(slug || '').trim().toLowerCase()] || null;
}

export function resolveVenueCoverUrl(slug: string | null | undefined): string {
  return venueBuildingCoverUrl(slug) || VENUE_COVER_FALLBACK;
}
