import { useEffect, useRef } from 'react';

interface Category {
  slug: string;
  name: string;
}

interface BlogFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

/**
 * Фильтры категорий блога (десктоп и мобильная карусель)
 */
export function BlogFilters({ categories, selectedCategory, onCategoryChange }: BlogFiltersProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  // Инициализация мобильной карусели через data-carousel
  useEffect(() => {
    if (carouselRef.current && !carouselRef.current.hasAttribute('data-carousel')) {
      carouselRef.current.setAttribute('data-carousel', 'blog-nonloop');
    }
  }, []);

  const handleFilterClick = (category: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCategoryChange(category);
  };

  return (
    <>
      {/* Десктопные фильтры */}
      <div className="blog-nav blog-nav-desktop">
        <div
          className={`filter ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={(e) => handleFilterClick('all', e)}
          style={{ cursor: 'pointer' }}
        >
          <h5>Все темы</h5>
        </div>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <div
              key={cat.slug}
              className={`filter ${isActive ? 'active' : ''}`}
              onClick={(e) => handleFilterClick(cat.slug, e)}
              style={{ cursor: 'pointer' }}
            >
              <h5>{cat.name}</h5>
            </div>
          );
        })}
      </div>

      {/* Мобильная карусель */}
      <div
        ref={carouselRef}
        className="owl-carousel-filter owl-carousel owl-theme"
        data-carousel="blog-nonloop"
      >
        <div className="item">
          <div
            className={`filter ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={(e) => handleFilterClick('all', e)}
            style={{ cursor: 'pointer' }}
          >
            <h5>Все темы</h5>
          </div>
        </div>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <div key={cat.slug} className="item">
              <div
                className={`filter ${isActive ? 'active' : ''}`}
                onClick={(e) => handleFilterClick(cat.slug, e)}
                style={{ cursor: 'pointer' }}
              >
                <h5>{cat.name}</h5>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

