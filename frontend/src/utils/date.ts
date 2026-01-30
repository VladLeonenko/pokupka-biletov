export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ru-RU');
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('ru-RU');
}

export function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

