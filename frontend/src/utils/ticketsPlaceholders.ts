/** Детерминированный фон-постер без внешних URL (пока нет imageUrl в API). */
export function posterGradientFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h + id.charCodeAt(i) * 17) % 360;
  }
  const h2 = (h + 48) % 360;
  return `linear-gradient(165deg, hsl(${h} 32% 22%) 0%, hsl(${h2} 28% 14%) 45%, hsl(${(h + 120) % 360} 22% 12%) 100%)`;
}
