import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Add,
  Delete,
  Search,
  Image as ImageIcon,
  Upload,
} from '@mui/icons-material';
import {
  listExerciseImages,
  createExerciseImage,
  updateExerciseImage,
  deleteExerciseImage,
  searchUnsplashImages,
  ExerciseImage,
  UnsplashImage,
} from '@/services/exerciseImagesApi';
import { uploadImage } from '@/services/cmsApi';
import { useToast } from '@/components/common/ToastProvider';

const categories = [
  { value: 'workout', label: 'Тренировки' },
  { value: 'book', label: 'Книги' },
  { value: 'meal', label: 'Блюда' },
  { value: 'course', label: 'Курсы' },
  { value: 'finance_tip', label: 'Финансовые советы' },
];

export default function ExerciseImagesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('workout');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ExerciseImage | null>(null);
  const [unsplashSearchQuery, setUnsplashSearchQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([]);
  const [searchingUnsplash, setSearchingUnsplash] = useState(false);
  const [selectedUnsplashImage, setSelectedUnsplashImage] = useState<UnsplashImage | null>(null);
  const [imageName, setImageName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const { data: images = [], isLoading } = useQuery({
    queryKey: ['exerciseImages', selectedCategory, searchQuery],
    queryFn: () => listExerciseImages(selectedCategory, searchQuery),
  });

  const createMutation = useMutation({
    mutationFn: createExerciseImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseImages'] });
      showToast('Изображение сохранено', 'success');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка сохранения', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ExerciseImage> }) =>
      updateExerciseImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseImages'] });
      showToast('Изображение обновлено', 'success');
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка обновления', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExerciseImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exerciseImages'] });
      showToast('Изображение удалено', 'success');
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка удаления', 'error');
    },
  });

  const resetForm = () => {
    setEditingImage(null);
    setImageName('');
    setImageUrl('');
    setUnsplashSearchQuery('');
    setUnsplashResults([]);
    setSelectedUnsplashImage(null);
  };

  const handleOpenDialog = (image?: ExerciseImage) => {
    if (image) {
      setEditingImage(image);
      setImageName(image.name);
      setImageUrl(image.image_url);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSearchUnsplash = async () => {
    if (!unsplashSearchQuery.trim()) return;
    setSearchingUnsplash(true);
    try {
      const results = await searchUnsplashImages(unsplashSearchQuery, selectedCategory);
      setUnsplashResults(results);
    } catch (error: any) {
      showToast(error.message || 'Ошибка поиска в Pixabay', 'error');
    } finally {
      setSearchingUnsplash(false);
    }
  };

  const handleSelectUnsplashImage = (image: UnsplashImage) => {
    setSelectedUnsplashImage(image);
    setImageUrl(image.url);
    if (!imageName) {
      setImageName(unsplashSearchQuery || image.description || 'Изображение');
    }
  };

  const handleUploadImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const result = await uploadImage(file);
        setImageUrl(result.url);
        showToast('Изображение загружено', 'success');
      } catch (error: any) {
        showToast(error.message || 'Ошибка загрузки', 'error');
      }
    };
    input.click();
  };

  const handleSave = () => {
    if (!imageName || !imageUrl) {
      showToast('Заполните название и URL изображения', 'error');
      return;
    }

    const imageData = {
      name: imageName,
      category: selectedCategory as ExerciseImage['category'],
      image_url: imageUrl,
      source: selectedUnsplashImage ? 'unsplash' : 'upload',
      unsplash_id: selectedUnsplashImage?.id,
    };

    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data: imageData });
    } else {
      createMutation.mutate(imageData);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Управление изображениями</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Добавить изображение
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Tabs value={selectedCategory} onChange={(_, v) => setSelectedCategory(v)}>
          {categories.map((cat) => (
            <Tab key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
              <Card>
                <CardMedia
                  component="img"
                  height="200"
                  image={image.image_url}
                  alt={image.name}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent>
                  <Typography variant="h6" noWrap>
                    {image.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={categories.find((c) => c.value === image.category)?.label || image.category} size="small" />
                    <Chip label={image.source} size="small" variant="outlined" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(image)}
                    >
                      Редактировать
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        if (confirm('Удалить изображение?')) {
                          deleteMutation.mutate(image.id);
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingImage ? 'Редактировать изображение' : 'Добавить изображение'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Название"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="Например: Приседания, Атомные привычки, Овсянка..."
            />

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="URL изображения"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={handleUploadImage}
              >
                Загрузить
              </Button>
            </Box>

            {imageUrl && (
              <Box
                component="img"
                src={imageUrl}
                alt="Preview"
                sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 1 }}
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
            )}

            <Divider>Или выберите из Pixabay</Divider>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="Поиск в Pixabay"
                value={unsplashSearchQuery}
                onChange={(e) => setUnsplashSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchUnsplash();
                  }
                }}
                placeholder="Например: squat exercise, book cover..."
              />
              <Button
                variant="outlined"
                onClick={handleSearchUnsplash}
                disabled={searchingUnsplash || !unsplashSearchQuery.trim()}
              >
                {searchingUnsplash ? <CircularProgress size={20} /> : <Search />}
              </Button>
            </Box>

            {unsplashResults.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Результаты поиска ({unsplashResults.length})
                </Typography>
                <Grid container spacing={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {unsplashResults.map((img) => (
                    <Grid item xs={6} sm={4} key={img.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: selectedUnsplashImage?.id === img.id ? 2 : 1,
                          borderColor: selectedUnsplashImage?.id === img.id ? 'primary.main' : 'divider',
                        }}
                        onClick={() => handleSelectUnsplashImage(img)}
                      >
                        <CardMedia
                          component="img"
                          height="120"
                          image={img.thumb}
                          alt={img.description}
                          sx={{ objectFit: 'cover' }}
                        />
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {selectedUnsplashImage && (
              <Alert severity="info">
                Выбрано изображение от {selectedUnsplashImage.author}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!imageName || !imageUrl || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


