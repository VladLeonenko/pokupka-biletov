import { Box, Chip } from '@mui/material';

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
 * Фильтры категорий блога в стилистике сайта
 */
export function BlogFilters({ categories, selectedCategory, onCategoryChange }: BlogFiltersProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        mt: 4,
      }}
    >
      <Chip
        label="Все темы"
        onClick={() => onCategoryChange('all')}
        sx={{
          bgcolor: selectedCategory === 'all' ? 'rgba(255,187,0,0.15)' : 'rgba(255,255,255,0.04)',
          color: selectedCategory === 'all' ? '#ffbb00' : 'rgba(255,255,255,0.6)',
          border: '1px solid',
          borderColor: selectedCategory === 'all' ? 'rgba(255,187,0,0.4)' : 'transparent',
          fontWeight: 600,
          fontSize: '0.9rem',
          py: 1.5,
          '&:hover': { bgcolor: 'rgba(255,187,0,0.1)' },
        }}
      />
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.slug;
        return (
          <Chip
            key={cat.slug}
            label={cat.name}
            onClick={() => onCategoryChange(cat.slug)}
            sx={{
              bgcolor: isActive ? 'rgba(255,187,0,0.15)' : 'rgba(255,255,255,0.04)',
              color: isActive ? '#ffbb00' : 'rgba(255,255,255,0.6)',
              border: '1px solid',
              borderColor: isActive ? 'rgba(255,187,0,0.4)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              py: 1.5,
              '&:hover': { bgcolor: 'rgba(255,187,0,0.1)' },
            }}
          />
        );
      })}
    </Box>
  );
}
