/**
 * Площадка для UI — только из полей API после enrich (PlaceName, PlaceAddress).
 * Подсказки из названия отключены: «гастроли …» не адрес покупки билета.
 */
export function venueFromApiOnly(venue: string | undefined): string | null {
  const v = typeof venue === 'string' ? venue.trim() : '';
  return v || null;
}
