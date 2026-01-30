import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '@/auth/AuthProvider';
import { getAwards, createAward, updateAward, deleteAward, type Award } from '@/services/awardsApi';
import { listPublicCases } from '@/services/publicApi';

export function AwardsManagePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; award: Award | null }>({
    open: false,
    award: null,
  });
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    description: '',
    caseSlug: '',
    externalUrl: '',
    sortOrder: 0,
    isActive: true,
  });

  const { data: awards = [], isLoading } = useQuery({
    queryKey: ['awards'],
    queryFn: getAwards,
    enabled: !!token,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ['public-cases'],
    queryFn: listPublicCases,
  });

  const createMutation = useMutation({
    mutationFn: (award: Partial<Award>) => createAward(award),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['public-awards'] });
      setDialog({ open: false, award: null });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, award }: { id: number; award: Partial<Award> }) => updateAward(id, award),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['public-awards'] });
      setDialog({ open: false, award: null });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      queryClient.invalidateQueries({ queryKey: ['public-awards'] });
    },
  });

  const resetForm = () => {
    setFormData({
      year: new Date().getFullYear(),
      description: '',
      caseSlug: '',
      externalUrl: '',
      sortOrder: 0,
      isActive: true,
    });
  };

  const handleOpenDialog = (award: Award | null = null) => {
    if (award) {
      setFormData({
        year: award.year,
        description: award.description,
        caseSlug: award.caseSlug || '',
        externalUrl: award.externalUrl || '',
        sortOrder: award.sortOrder,
        isActive: award.isActive,
      });
    } else {
      resetForm();
    }
    setDialog({ open: true, award });
  };

  const handleCloseDialog = () => {
    setDialog({ open: false, award: null });
    resetForm();
  };

  const handleSave = () => {
    const awardData = {
      year: formData.year,
      description: formData.description,
      caseSlug: formData.caseSlug || undefined,
      externalUrl: formData.externalUrl || undefined,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    };

    if (dialog.award) {
      updateMutation.mutate({ id: dialog.award.id, award: awardData });
    } else {
      createMutation.mutate(awardData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Удалить награду?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ color: '#fff' }}>
          Управление наградами
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog(null)}
          sx={{
            bgcolor: '#ffbb00',
            color: '#000',
            '&:hover': { bgcolor: '#ffaa00' },
          }}
        >
          Добавить награду
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#ffbb00' }} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#fff' }}>Год</TableCell>
                <TableCell sx={{ color: '#fff' }}>Описание</TableCell>
                <TableCell sx={{ color: '#fff' }}>Кейс</TableCell>
                <TableCell sx={{ color: '#fff' }}>Порядок</TableCell>
                <TableCell sx={{ color: '#fff' }}>Активна</TableCell>
                <TableCell sx={{ color: '#fff' }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {awards.map((award) => (
                <TableRow key={award.id}>
                  <TableCell sx={{ color: '#fff' }}>{award.year}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{award.description}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {award.caseSlug ? (
                      <a href={`/cases/${award.caseSlug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#ffbb00' }}>
                        {award.caseSlug}
                      </a>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: '#fff' }}>{award.sortOrder}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>
                    {award.isActive ? '✓' : '✗'}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(award)}
                      sx={{ color: '#ffbb00' }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(award.id)}
                      sx={{ color: '#f44336' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialog.open}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>
          {dialog.award ? 'Редактировать награду' : 'Добавить награду'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Год"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': { color: '#fff' },
              }}
            />
            <TextField
              label="Описание"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              sx={{
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': { color: '#fff' },
              }}
            />
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Кейс (опционально)</InputLabel>
              <Select
                value={formData.caseSlug}
                onChange={(e) => setFormData({ ...formData, caseSlug: e.target.value })}
                label="Кейс (опционально)"
                sx={{ color: '#fff' }}
              >
                <MenuItem value="">— Не выбран —</MenuItem>
                {cases.map((caseItem) => (
                  <MenuItem key={caseItem.slug} value={caseItem.slug}>
                    {caseItem.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Внешняя ссылка (опционально)"
              value={formData.externalUrl}
              onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': { color: '#fff' },
              }}
            />
            <TextField
              label="Порядок сортировки"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiOutlinedInput-root': { color: '#fff' },
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#ffbb00' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#ffbb00' },
                  }}
                />
              }
              label="Активна"
              sx={{ color: '#fff' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ color: '#fff' }}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              bgcolor: '#ffbb00',
              color: '#000',
              '&:hover': { bgcolor: '#ffaa00' },
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

