import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { BlockType } from '@/types/pageBuilder';

interface BlockTypeSelectorProps {
  onSelect: (type: BlockType) => void;
  label?: string;
}

const blockTypeLabels: Partial<Record<BlockType, string>> = {
  cover: 'Hero секция',
  text: 'Текстовый блок',
  content: 'Контент',
  features: 'Преимущества',
  pricing: 'Тарифы',
  calculator: 'Калькулятор',
  testimonials: 'Отзывы',
  faq: 'FAQ',
  cta: 'Призыв к действию',
  image: 'Изображение',
  video: 'Видео',
  forms: 'Форма',
  gallery: 'Галерея',
  menu: 'Меню',
  shop: 'Магазин',
  social: 'Социальные сети',
  spacer: 'Отступ',
};

export function BlockTypeSelector({ onSelect, label = 'Добавить блок' }: BlockTypeSelectorProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (type: BlockType) => {
    onSelect(type);
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleClick}
        size="small"
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 200, maxHeight: 400 },
        }}
      >
        {Object.entries(blockTypeLabels).map(([value, label]) => (
          <MenuItem key={value} onClick={() => handleSelect(value as BlockType)}>
            {label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
