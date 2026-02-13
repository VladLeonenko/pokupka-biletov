import { useState } from 'react';
import { Box, Chip, Button, Menu, MenuItem } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';

interface Category {
  slug: string;
  name: string;
}

interface BlogFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const chipSx = (isActive: boolean) => ({
  bgcolor: isActive ? 'rgba(255,187,0,0.15)' : 'rgba(255,255,255,0.04)',
  color: isActive ? '#ffbb00' : 'rgba(255,255,255,0.6)',
  border: '1px solid',
  borderColor: isActive ? 'rgba(255,187,0,0.4)' : 'transparent',
  fontWeight: 600,
  fontSize: '0.9rem',
  py: 1.5,
  '&:hover': { bgcolor: 'rgba(255,187,0,0.1)' },
});

/**
 * Фильтры категорий: chips на десктопе, dropdown на мобильных
 */
export function BlogFilters({ categories, selectedCategory, onCategoryChange }: BlogFiltersProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (slug: string) => {
    onCategoryChange(slug);
    handleClose();
  };

  const selectedLabel = selectedCategory === 'all'
    ? 'Все темы'
    : categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory;

  const menuSx = {
    '& .MuiPaper-root': {
      bgcolor: 'rgba(18,18,24,0.98)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 2,
      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      mt: 1.5,
      minWidth: 200,
    },
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* Десктоп: chips */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Chip
          label="Все темы"
          onClick={() => onCategoryChange('all')}
          sx={chipSx(selectedCategory === 'all')}
        />
        {categories.map((cat) => (
          <Chip
            key={cat.slug}
            label={cat.name}
            onClick={() => onCategoryChange(cat.slug)}
            sx={chipSx(selectedCategory === cat.slug)}
          />
        ))}
      </Box>

      {/* Мобильные: dropdown */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Button
          onClick={handleOpen}
          aria-expanded={open ? 'true' : undefined}
          aria-haspopup="true"
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            />
          }
          sx={{
            width: '100%',
            justifyContent: 'space-between',
            py: 1.5,
            px: 2,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
            color: selectedCategory === 'all' ? '#ffbb00' : 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            fontSize: '0.95rem',
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'rgba(255,187,0,0.1)',
              borderColor: 'rgba(255,187,0,0.3)',
            },
          }}
        >
          {selectedLabel}
        </Button>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            backdrop: {
              sx: { bgcolor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' },
            },
          }}
          TransitionProps={{
            timeout: 200,
            enter: true,
            exit: true,
          }}
          sx={menuSx}
        >
          <MenuItem
            onClick={() => handleSelect('all')}
            sx={{
              color: selectedCategory === 'all' ? '#ffbb00' : 'rgba(255,255,255,0.85)',
              py: 1.5,
              gap: 1,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
              {selectedCategory === 'all' && <CheckIcon sx={{ color: '#ffbb00', fontSize: 20 }} />}
            </Box>
            Все темы
          </MenuItem>
          {categories.map((cat) => (
            <MenuItem
              key={cat.slug}
              onClick={() => handleSelect(cat.slug)}
              sx={{
                color: selectedCategory === cat.slug ? '#ffbb00' : 'rgba(255,255,255,0.85)',
                py: 1.5,
                gap: 1,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Box sx={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                {selectedCategory === cat.slug && (
                  <CheckIcon sx={{ color: '#ffbb00', fontSize: 20 }} />
                )}
              </Box>
              {cat.name}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}
