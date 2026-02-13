/** Убирает дубли фразы: "30 дней 30 дней" или "30 дней • 30 дней" → "30 дней" */
export function dedupeRepeatedPhrase(str: string): string {
  if (!str || typeof str !== 'string') return str;
  const t = str.trim();
  // Паттерн "X • X" — разделитель точка/буллет
  const byBullet = t.split(/\s*[•·]\s*/);
  if (byBullet.length === 2) {
    const a = byBullet[0].trim();
    const b = byBullet[1].trim();
    if (a && a === b) return a;
  }
  // Паттерн "X X" — дубль через пробел
  const parts = t.split(/\s+/);
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const half = parts.length / 2;
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) {
      return parts.slice(0, half).join(' ');
    }
  }
  return t;
}
