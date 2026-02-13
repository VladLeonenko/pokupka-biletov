import { getUpsellsForProduct } from './upsellMatrix';

/**
 * Рекомендуемые доп.услуги для данной услуги (апсейлы).
 * Использует матрицу upsellMatrix. CMS (contentJson.relatedServices) имеет приоритет.
 */
export function getRelatedProductSlugs(productSlug: string): string[] {
  const upsells = getUpsellsForProduct(productSlug);
  return upsells.map((u) => u.slug);
}

/** Апсейлы с benefit для отображения на карточке. */
export function getRelatedProductsWithBenefits(
  productSlug: string
): { slug: string; benefit: string }[] {
  return getUpsellsForProduct(productSlug);
}
