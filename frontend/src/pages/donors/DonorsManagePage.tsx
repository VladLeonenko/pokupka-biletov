import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import { useToast } from '@/components/common/ToastProvider';

import { getApiBase } from '@/utils/apiBase';

const API_BASE = getApiBase();

import { getAuthToken } from '@/utils/authStorage';
function getToken(): string | null {
  return getAuthToken();
}

const CATEGORIES = [
  { value: 'advertising', label: 'Реклама' },
  { value: 'design', label: 'Дизайн' },
  { value: 'seo', label: 'SEO' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'website', label: 'Сайты' },
  { value: 'mobile', label: 'Мобильные' },
  { value: 'ai', label: 'AI' },
];

// API функции
async function fetchDonors() {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/donors`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Ошибка загрузки доноров');
  return response.json();
}

async function createDonor(donor: { category: string; url: string; sortOrder?: number }) {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/donors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(donor),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка создания донора');
  }
  return response.json();
}

async function updateDonor(id: number, donor: { category?: string; url?: string; sortOrder?: number; isActive?: boolean }) {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/donors/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(donor),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка обновления донора');
  }
  return response.json();
}

async function deleteDonor(id: number) {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/donors/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка удаления донора');
  }
  return response.json();
}

async function bulkUpdateDonors(donors: Array<{ id: number; sortOrder: number; isActive: boolean }>) {
  const token = getToken();
  const response = await fetch(`${API_BASE}/api/donors/bulk-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ donors }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Ошибка массового обновления');
  }
  return response.json();
}

export function DonorsManagePage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('advertising');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<any>(null);
  const [formData, setFormData] = useState({ category: 'advertising', url: '', sortOrder: 0 });

  const { data: donorsData, isLoading } = useQuery({
    queryKey: ['donors'],
    queryFn: fetchDonors,
  });

  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      showToast('Донор успешно создан', 'success');
      setDialogOpen(false);
      setFormData({ category: 'advertising', url: '', sortOrder: 0 });
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDonor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      showToast('Донор успешно обновлен', 'success');
      setDialogOpen(false);
      setEditingDonor(null);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donors'] });
      showToast('Донор успешно удален', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleOpenDialog = (donor?: any) => {
    if (donor) {
      setEditingDonor({ ...donor, category: selectedCategory });
      setFormData({
        category: selectedCategory,
        url: donor.url || '',
        sortOrder: donor.sortOrder || 0,
      });
    } else {
      setEditingDonor(null);
      setFormData({
        category: selectedCategory,
        url: '',
        sortOrder: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDonor(null);
    setFormData({ category: 'advertising', url: '', sortOrder: 0 });
  };

  const handleSubmit = () => {
    if (!formData.url.trim()) {
      showToast('URL обязателен', 'error');
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      showToast('Некорректный URL', 'error');
      return;
    }

    if (editingDonor) {
      updateMutation.mutate({
        id: editingDonor.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этого донора?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (donor: any) => {
    updateMutation.mutate({
      id: donor.id,
      data: { isActive: !donor.isActive },
    });
  };

  const currentDonors = donorsData?.[selectedCategory] || [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Управление донорами кейсов</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить донора
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ maxWidth: 300 }}>
          <InputLabel>Категория</InputLabel>
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            label="Категория"
          >
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>URL</TableCell>
                <TableCell align="center">Порядок</TableCell>
                <TableCell align="center">Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentDonors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">Нет доноров для этой категории</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                currentDonors.map((donor: any) => (
                  <TableRow key={donor.id}>
                    <TableCell>
                      <Typography variant="body2">{donor.url}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{donor.sortOrder}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={donor.isActive ? 'Активен' : 'Неактивен'}
                        color={donor.isActive ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleActive(donor)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(donor)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(donor.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDonor ? 'Редактировать донора' : 'Добавить донора'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Категория</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Категория"
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="URL"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://www.example.ru"
              required
            />
            <TextField
              fullWidth
              label="Порядок сортировки"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<CheckIcon />}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingDonor ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

