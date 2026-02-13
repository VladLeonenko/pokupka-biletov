/** Убирает дубли фразы типа "30 дней 30 дней" → "30 дней" */
export function dedupeRepeatedPhrase(str: string): string {
  if (!str || typeof str !== 'string') return str;
  const parts = str.trim().split(/\s+/);
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const half = parts.length / 2;
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) {
      return parts.slice(0, half).join(' ');
    }
  }
  return str.trim();
}
