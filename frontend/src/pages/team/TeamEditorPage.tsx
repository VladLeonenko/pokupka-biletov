import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Grid, TextField, Typography, Paper, IconButton, Chip, Stack,
  CircularProgress, Autocomplete, Switch, FormControlLabel
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { getTeamMember, createTeamMember, updateTeamMember, uploadImage } from '@/services/cmsApi';
import { TeamMember } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

export default function TeamEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isInitialized = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ['teamMember', id],
    queryFn: () => (id && !isNew ? getTeamMember(Number(id)) : Promise.resolve(undefined)),
    enabled: !!id && !isNew,
  });

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    isInitialized.current = false;
  }, [id]);

  useEffect(() => {
    if (data && !isInitialized.current) {
      setName(data.name);
      setRole(data.role);
      setImageUrl(data.imageUrl || '');
      setBio(data.bio || '');
      setSkills(data.skills || []);
      setPortfolioUrls(data.portfolioUrls || []);
      setIsActive(data.isActive !== false);
      setSortOrder(data.sortOrder || 0);
      isInitialized.current = true;
    } else if (isNew && !isInitialized.current) {
      // Reset for new member
      setName('');
      setRole('');
      setImageUrl('');
      setBio('');
      setSkills([]);
      setPortfolioUrls([]);
      setIsActive(true);
      setSortOrder(0);
      isInitialized.current = true;
    }
  }, [data, isNew]);

  const handleImageUpload = async (field: 'imageUrl') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const result = await uploadImage(file);
        if (field === 'imageUrl') {
          setImageUrl(result.url);
        }
        showToast('Изображение загружено', 'success');
      } catch (error: any) {
        showToast(error?.message || 'Ошибка загрузки изображения', 'error');
      }
    };
    input.click();
  };

  const saveMutation = useMutation({
    mutationFn: async (member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (isNew) {
        return await createTeamMember(member);
      } else {
        return await updateTeamMember(Number(id), member);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      queryClient.invalidateQueries({ queryKey: ['teamMember', id] });
      showToast(isNew ? 'Сотрудник создан' : 'Сотрудник обновлен', 'success');
      navigate('/admin/team');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Ошибка при сохранении', 'error');
    },
  });

  const handleSave = () => {
    if (!name.trim() || !role.trim()) {
      showToast('Заполните имя и должность', 'error');
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      role: role.trim(),
      imageUrl: imageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
      skills,
      portfolioUrls,
      isActive,
      sortOrder,
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {isNew ? 'Новый сотрудник' : `Редактирование: ${name || 'Сотрудник'}`}
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/admin/team')}>
          Отмена
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Основная информация</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Должность *"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    label="URL фото"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="/uploads/team/photo.jpg"
                  />
                  <Button variant="outlined" onClick={() => handleImageUpload('imageUrl')}>
                    Загрузить
                  </Button>
                </Box>
                {imageUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={resolveImageUrl(imageUrl)}
                      alt="Preview"
                      style={{ maxWidth: 200, maxHeight: 200, objectFit: 'cover', borderRadius: 8 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </Box>
                )}
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Биография"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Краткое описание сотрудника..."
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Навыки</Typography>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={skills}
              onChange={(_, newValue) => setSkills(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Навыки"
                  placeholder="Введите навык и нажмите Enter"
                />
              )}
            />
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Портфолио (ссылки)</Typography>
            {portfolioUrls.map((url, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={`Ссылка ${idx + 1}`}
                  value={url}
                  onChange={(e) => {
                    const newUrls = [...portfolioUrls];
                    newUrls[idx] = e.target.value;
                    setPortfolioUrls(newUrls);
                  }}
                  placeholder="https://..."
                />
                <IconButton
                  onClick={() => setPortfolioUrls(portfolioUrls.filter((_, i) => i !== idx))}
                  color="error"
                >
                  <Delete />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => setPortfolioUrls([...portfolioUrls, ''])}
            >
              Добавить ссылку
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Настройки</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Активен"
              sx={{ mb: 2, display: 'block' }}
            />
            <TextField
              fullWidth
              type="number"
              label="Порядок сортировки"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              sx={{ mt: 2 }}
            >
              {saveMutation.isPending ? <CircularProgress size={24} /> : 'Сохранить'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

