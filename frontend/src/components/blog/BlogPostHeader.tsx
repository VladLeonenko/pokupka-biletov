import { resolveImageUrl } from '@/utils/resolveImageUrl';

interface BlogPostHeaderProps {
  title: string;
  date?: string | null;
  categoryName?: string | null;
  coverImageUrl?: string | null;
}

/**
 * Заголовок статьи блога
 */
export function BlogPostHeader({ title, date, categoryName, coverImageUrl }: BlogPostHeaderProps) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return '';
    }
  };

  const coverImage = coverImageUrl ? resolveImageUrl(coverImageUrl, '') : null;

  return (
    <div className="blog-post-header">
      {date && <div className="blog-post-date">{formatDate(date)}</div>}
      <h1>{title}</h1>
      {categoryName && <div className="blog-post-category">Категория: {categoryName}</div>}
      {coverImage && (
        <div className="blog-post-image">
          <img src={coverImage} alt={title} />
        </div>
      )}
    </div>
  );
}

