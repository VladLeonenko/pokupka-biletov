import { Navigate, useSearchParams } from 'react-router-dom';

/** Каталог PrimeCoder не используется на витрине билетов — поиск ведёт на афишу */
export function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q');
  const to = q?.trim() ? `/events?q=${encodeURIComponent(q.trim())}` : '/events';
  return <Navigate to={to} replace />;
}
