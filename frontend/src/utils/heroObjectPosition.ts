/**
 * Куда смотрит широкий hero (object-position).
 * Кадр 1:1 или портрет на 100svh режется по вертикали: центр откусывает головы,
 * если лицо в верхней трети. Ключ — кусок URL той картинки, что реально в hero.
 * Новое событие: одна строка, без общего сдвига на всех.
 */
const HERO_FOCUS: ReadonlyArray<readonly [string, string]> = [
  // Лицо и корона в верхней трети квадрата.
  ['bolshoi-turandot', 'center top'],
  // Портрет поддержки: головы выше середины, ноги можно отдать виньетке.
  ['chaika-bolshoi', 'center 16%'],
  // Плакат: лица в нижней половине, по центру остаётся только заголовок.
  ['raspakovka-2026', 'center 68%'],
];

export function resolveHeroObjectPosition(src: string | null | undefined): string {
  const s = (src || '').toLowerCase();
  for (const [key, position] of HERO_FOCUS) {
    if (s.includes(key)) return position;
  }
  return 'center center';
}
