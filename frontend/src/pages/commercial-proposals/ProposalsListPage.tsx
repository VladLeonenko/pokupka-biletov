import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { listCommercialProposals, deleteCommercialProposal, generateProposalShareLink, createCommercialProposal } from '@/services/cmsApi';
import { getProductMatrix } from '@/services/salesAcademyApi';
import { useAuth } from '@/auth/AuthProvider';
import { buildProposalTemplate } from '@/utils/proposalTemplate';
import { CommercialProposal } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  draft: 'default',
  sent: 'info',
  viewed: 'primary',
  accepted: 'success',
  rejected: 'error',
};

export function ProposalsListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProposal, setSelectedProposal] = useState<CommercialProposal | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ clientName: '', company: '', projectDescription: '', goals: '' });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['commercial-proposals'],
    queryFn: () => listCommercialProposals(),
  });

  const { data: productMatrix } = useQuery({
    queryKey: ['product-matrix-template'],
    queryFn: getProductMatrix,
  });

  const createFromTemplateMut = useMutation({
    mutationFn: async () => {
      const products = (productMatrix?.products || []).map((p: any) => ({
        title: p.title,
        price: p.price,
        period: p.period || '',
        summary: p.summary || '',
        features: p.categories || [],
      }));
      const slides = buildProposalTemplate({
        clientName: templateForm.clientName.trim() || 'Клиент',
        company: templateForm.company.trim() || undefined,
        projectDescription: templateForm.projectDescription.trim() || undefined,
        goals: templateForm.goals.split('\n').map((s) => s.trim()).filter(Boolean),
        fromName: user?.name || user?.email || 'PrimeCoder',
        products,
      });
      const proposal = await createCommercialProposal({
        title: `КП для ${templateForm.clientName.trim() || 'Клиент'}`,
        clientName: templateForm.clientName.trim() || undefined,
        description: templateForm.projectDescription.trim() || undefined,
        status: 'draft',
        slides: slides.map((s, i) => ({ ...s, sortOrder: i })),
      });
      return proposal;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-proposals'] });
      showToast('КП создано по шаблону. Можно отредактировать.', 'success');
      setTemplateDialogOpen(false);
      setTemplateForm({ clientName: '', company: '', projectDescription: '', goals: '' });
      navigate(`/admin/commercial-proposals/${data.id}/edit`);
    },
    onError: (err: any) => showToast(err?.message || 'Ошибка создания', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCommercialProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-proposals'] });
      showToast('Предложение удалено', 'success');
      setAnchorEl(null);
      setSelectedProposal(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при удалении', 'error');
    },
  });

  const generateShareMutation = useMutation({
    mutationFn: (id: number) => generateProposalShareLink(id),
    onSuccess: (data, proposalId) => {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/commercial-proposals/${proposalId}?token=${data.shareToken}`;
      setShareLink(link);
      setShareDialogOpen(true);
      setAnchorEl(null);
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при генерации ссылки', 'error');
    },
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, proposal: CommercialProposal) => {
    setAnchorEl(event.currentTarget);
    setSelectedProposal(proposal);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProposal(null);
  };

  const handleView = (proposal: CommercialProposal) => {
    navigate(`/admin/commercial-proposals/${proposal.id}`);
    handleMenuClose();
  };

  const handleEdit = (proposal: CommercialProposal) => {
    navigate(`/admin/commercial-proposals/${proposal.id}/edit`);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedProposal) {
      if (window.confirm('Вы уверены, что хотите удалить это предложение?')) {
        deleteMutation.mutate(selectedProposal.id);
      }
    }
  };

  const handleShare = () => {
    if (selectedProposal) {
      generateShareMutation.mutate(selectedProposal.id);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    showToast('Ссылка скопирована', 'success');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Коммерческие предложения</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => setTemplateDialogOpen(true)}
          >
            По шаблону (быстро)
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/commercial-proposals/new')}
          >
            Пустое предложение
          </Button>
        </Box>
      </Box>

      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать КП по шаблону</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Заполните основные поля — блоки О нас, пакеты из каталога, контакты и дополнения подставятся автоматически. Редактирование доступно после создания.
          </Typography>
          <TextField
            fullWidth
            label="Кому (имя контактного лица)"
            value={templateForm.clientName}
            onChange={(e) => setTemplateForm({ ...templateForm, clientName: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="Виктория"
          />
          <TextField
            fullWidth
            label="Компания"
            value={templateForm.company}
            onChange={(e) => setTemplateForm({ ...templateForm, company: e.target.value })}
            sx={{ mb: 2 }}
            placeholder="event агентство"
          />
          <TextField
            fullWidth
            label="Описание проекта"
            value={templateForm.projectDescription}
            onChange={(e) => setTemplateForm({ ...templateForm, projectDescription: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            placeholder="Разработка корпоративного сайта"
          />
          <TextField
            fullWidth
            label="Цели и задачи (каждый с новой строки)"
            value={templateForm.goals}
            onChange={(e) => setTemplateForm({ ...templateForm, goals: e.target.value })}
            multiline
            rows={3}
            placeholder={'Вёрстка по макету\nНастройка SEO\nПодключение аналитики'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={() => createFromTemplateMut.mutate()}
            disabled={createFromTemplateMut.isPending}
          >
            {createFromTemplateMut.isPending ? 'Создание...' : 'Создать и редактировать'}
          </Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Клиент</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Просмотры</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {proposals.map((proposal) => (
              <TableRow key={proposal.id} hover>
                <TableCell>{proposal.title}</TableCell>
                <TableCell>{proposal.clientName || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={proposal.status === 'draft' ? 'Черновик' : 
                           proposal.status === 'sent' ? 'Отправлено' :
                           proposal.status === 'viewed' ? 'Просмотрено' :
                           proposal.status === 'accepted' ? 'Принято' : 'Отклонено'}
                    color={statusColors[proposal.status] || 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{proposal.viewCount || 0}</TableCell>
                <TableCell>
                  {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString('ru-RU') : '-'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, proposal)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleView(selectedProposal!)}>
          <VisibilityIcon sx={{ mr: 1 }} fontSize="small" />
          Просмотреть
        </MenuItem>
        <MenuItem onClick={() => handleEdit(selectedProposal!)}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Редактировать
        </MenuItem>
        <MenuItem onClick={handleShare}>
          <ShareIcon sx={{ mr: 1 }} fontSize="small" />
          Поделиться
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Удалить
        </MenuItem>
      </Menu>

      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Ссылка для просмотра</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            value={shareLink}
            InputProps={{ readOnly: true }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Закрыть</Button>
          <Button onClick={handleCopyLink} variant="contained">
            Копировать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

