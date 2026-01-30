import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { ProposalSlide, ProposalSlideType } from '@/types/cms';
import { SlideContentEditor } from './SlideContentEditor';

const SLIDE_TYPES: { value: ProposalSlideType; label: string }[] = [
  { value: 'hero', label: 'Главный слайд' },
  { value: 'services', label: 'Услуги' },
  { value: 'metrics', label: 'Метрики' },
  { value: 'roadmap', label: 'План действий' },
  { value: 'guarantees', label: 'Гарантии' },
  { value: 'contacts', label: 'Контакты' },
  { value: 'problems', label: 'Проблемы' },
  { value: 'pricing', label: 'Цены/Пакеты' },
];

interface ProposalVisualEditorProps {
  slides: ProposalSlide[];
  onChange: (slides: ProposalSlide[]) => void;
}

export function ProposalVisualEditor({ slides, onChange }: ProposalVisualEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSlideDialogOpen, setNewSlideDialogOpen] = useState(false);
  const [newSlideType, setNewSlideType] = useState<ProposalSlideType>('hero');

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSlides = [...slides];
    const draggedSlide = newSlides[draggedIndex];
    newSlides.splice(draggedIndex, 1);
    newSlides.splice(index, 0, draggedSlide);

    // Обновляем sortOrder
    const updatedSlides = newSlides.map((slide, idx) => ({
      ...slide,
      sortOrder: idx,
    }));

    onChange(updatedSlides);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Удалить этот слайд?')) {
      const newSlides = slides.filter((_, i) => i !== index);
      const updatedSlides = newSlides.map((slide, idx) => ({
        ...slide,
        sortOrder: idx,
      }));
      onChange(updatedSlides);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (content: any) => {
    if (editingIndex === null) return;
    const newSlides = [...slides];
    newSlides[editingIndex] = { ...newSlides[editingIndex], content };
    onChange(newSlides);
  };

  const handleCloseEdit = () => {
    setEditingIndex(null);
  };

  const handleAddSlide = () => {
    const newSlide: ProposalSlide = {
      slideType: newSlideType,
      sortOrder: slides.length,
      content: {},
    };
    onChange([...slides, newSlide]);
    setNewSlideDialogOpen(false);
    setNewSlideType('hero');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Слайды ({slides.length})</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => setNewSlideDialogOpen(true)}
        >
          Добавить слайд
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {slides.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Нет слайдов. Добавьте первый слайд для начала работы.
            </Typography>
          </Paper>
        ) : (
          slides.map((slide, index) => {
            const isDragging = draggedIndex === index;
            const slideTypeLabel = SLIDE_TYPES.find(t => t.value === slide.slideType)?.label || slide.slideType;

            return (
              <Paper
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  p: 2,
                  cursor: 'move',
                  opacity: isDragging ? 0.5 : 1,
                  border: '2px solid',
                  borderColor: isDragging ? 'primary.main' : 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 2,
                  },
                  transition: 'all 0.2s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <DragIndicatorIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {index + 1}. {slideTypeLabel}
                    </Typography>
                    {slide.content.title && (
                      <Typography variant="body2" color="text.secondary">
                        {slide.content.title}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => handleEdit(index)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* Диалог добавления нового слайда */}
      <Dialog open={newSlideDialogOpen} onClose={() => setNewSlideDialogOpen(false)}>
        <DialogTitle>Добавить слайд</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Тип слайда</InputLabel>
            <Select
              value={newSlideType}
              onChange={(e) => setNewSlideType(e.target.value as ProposalSlideType)}
            >
              {SLIDE_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSlideDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddSlide} variant="contained">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования слайда */}
      {editingIndex !== null && (
        <Dialog
          open={editingIndex !== null}
          onClose={() => setEditingIndex(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Редактирование слайда: {SLIDE_TYPES.find(t => t.value === slides[editingIndex].slideType)?.label}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <SlideContentEditor
                slideType={slides[editingIndex].slideType}
                content={slides[editingIndex].content}
                onChange={handleSaveEdit}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

