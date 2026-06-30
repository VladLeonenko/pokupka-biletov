/** Настройки category-checkout стадиона (Portalbilet-style) в layout_json. */

export type StadiumSectorLayoutRow = {
  id: string;
  label: string;
  path?: string;
  previewImageUrl?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  availableSeats?: number;
};

export type StadiumCategoryCheckoutLayout = {
  pbiletCategoryCheckout?: boolean;
  hideSeatList?: boolean;
  categoryCheckoutDefaults?: { previewImageUrl?: string | null };
  sectorMode?: { enabled?: boolean; sectors?: StadiumSectorLayoutRow[] };
  pbilet?: Record<string, unknown>;
};

export function parseLayoutJsonText(text: string): StadiumCategoryCheckoutLayout {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as StadiumCategoryCheckoutLayout;
  } catch {
    return {};
  }
}

export function isCategoryCheckoutLayout(layout: StadiumCategoryCheckoutLayout): boolean {
  return (
    layout.pbiletCategoryCheckout === true &&
    Array.isArray(layout.sectorMode?.sectors) &&
    layout.sectorMode.sectors.length > 0
  );
}

export function patchCategoryCheckoutLayout(
  layoutText: string,
  patch: {
    hideSeatList: boolean;
    defaultPreviewImageUrl: string;
    sectorPreviewImages: Record<string, string>;
  },
): string {
  const layout = parseLayoutJsonText(layoutText) as Record<string, unknown>;
  layout.hideSeatList = patch.hideSeatList;
  const defaults =
    layout.categoryCheckoutDefaults && typeof layout.categoryCheckoutDefaults === 'object'
      ? { ...(layout.categoryCheckoutDefaults as Record<string, unknown>) }
      : {};
  const defUrl = patch.defaultPreviewImageUrl.trim();
  if (defUrl) defaults.previewImageUrl = defUrl;
  else delete defaults.previewImageUrl;
  layout.categoryCheckoutDefaults = defaults;

  const sm = layout.sectorMode;
  if (sm && typeof sm === 'object' && Array.isArray((sm as Record<string, unknown>).sectors)) {
    const sectors = (sm as { sectors: Record<string, unknown>[] }).sectors.map((s) => {
      const id = String(s.id ?? '').trim();
      const url = (patch.sectorPreviewImages[id] ?? '').trim();
      const next = { ...s };
      if (url) next.previewImageUrl = url;
      else delete next.previewImageUrl;
      return next;
    });
    layout.sectorMode = { ...(sm as Record<string, unknown>), sectors };
  }

  return JSON.stringify(layout, null, 2);
}

export function sectorPreviewImagesFromLayout(layout: StadiumCategoryCheckoutLayout): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of layout.sectorMode?.sectors ?? []) {
    const id = String(s.id ?? '').trim();
    const url = String(s.previewImageUrl ?? '').trim();
    if (id && url) out[id] = url;
  }
  return out;
}
