import { useState } from 'react';
import { Box, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography, IconButton, Chip, Menu, MenuItem } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useToast } from '@/components/common/ToastProvider';
import { TemplateSelector } from '@/components/page-builder/library/TemplateSelector';
import { PageTemplate } from '@/types/pageBuilder';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

import { getAuthToken } from '@/utils/authStorage';

function getToken(): string | null {
  try {
    return getAuthToken();
  } catch {
    return null;
  }
}

async function apiFetch(endpoint: string, options?: RequestInit) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Ошибка запроса');
  }
  return res.json();
}

export function PageBuilderListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['page-builder-pages'],
    queryFn: () => apiFetch('/api/page-builder/pages'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/page-builder/pages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-builder-pages'] });
      showToast('Страница удалена', 'success');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Page Builder</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            endIcon={<ArrowDropDownIcon />}
            onClick={(e) => setCreateMenuAnchor(e.currentTarget)}
          >
            Создать из шаблона
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/page-builder/new')}
          >
            Создать страницу
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={createMenuAnchor}
        open={Boolean(createMenuAnchor)}
        onClose={() => setCreateMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setCreateMenuAnchor(null);
          setTemplateDialogOpen(true);
        }}>
          Выбрать шаблон
        </MenuItem>
      </Menu>

      <TemplateSelector
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSelect={(template: PageTemplate) => {
          // TODO: Создать страницу из шаблона
          navigate('/admin/page-builder/new', { state: { template } });
        }}
      />

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Обновлено</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    Нет страниц. Создайте первую страницу.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page: any) => (
                <TableRow key={page.id} hover>
                  <TableCell>{page.title}</TableCell>
                  <TableCell>{page.slug}</TableCell>
                  <TableCell>
                    <Chip
                      label={page.published ? 'Опубликовано' : 'Черновик'}
                      color={page.published ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(page.updated_at).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/admin/page-builder/${page.id}`)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (confirm('Удалить страницу?')) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
