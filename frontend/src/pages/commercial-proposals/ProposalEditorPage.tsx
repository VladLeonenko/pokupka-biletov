import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Grid,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { getCommercialProposal, createCommercialProposal, updateCommercialProposal } from '@/services/cmsApi';
import { CommercialProposal, ProposalSlide } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';
import { ProposalVisualEditor } from '@/components/commercial-proposals/editors/ProposalVisualEditor';
import { ProposalViewer } from '@/components/commercial-proposals/ProposalViewer';

export function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isNew = id === 'new';
  const [viewMode, setViewMode] = useState<'editor' | 'preview' | 'split'>('split');

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [slides, setSlides] = useState<ProposalSlide[]>([]);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ['commercial-proposal', id],
    queryFn: () => getCommercialProposal(Number(id!)),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title || '');
      setClientName(proposal.clientName || '');
      setClientEmail(proposal.clientEmail || '');
      setDescription(proposal.description || '');
      setSlides(proposal.slides || []);
    }
  }, [proposal]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<CommercialProposal>) =>
      isNew ? createCommercialProposal(data) : updateCommercialProposal(Number(id!), data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-proposals'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-proposal', data.id] });
      showToast('Предложение сохранено', 'success');
      if (isNew) {
        navigate(`/admin/commercial-proposals/${data.id}`);
      }
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при сохранении', 'error');
    },
  });

  const handleSave = () => {
    const sortedSlides = [...slides].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    saveMutation.mutate({
      title,
      clientName,
      clientEmail,
      description,
      slides: sortedSlides,
    });
  };

  const handleSlidesChange = (newSlides: ProposalSlide[]) => {
    setSlides(newSlides);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const previewProposal: CommercialProposal = {
    id: proposal?.id || 0,
    title,
    clientName,
    clientEmail,
    description,
    slides: slides,
    status: proposal?.status || 'draft',
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            {isNew ? 'Создать коммерческое предложение' : 'Редактировать предложение'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tabs value={viewMode} onChange={(_, v) => setViewMode(v)}>
              <Tab label="Редактор" value="editor" />
              <Tab label="Раздельно" value="split" />
              <Tab label="Предпросмотр" value="preview" />
            </Tabs>
            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Button onClick={() => navigate('/admin/commercial-proposals')}>
              Отмена
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saveMutation.isPending}>
              Сохранить
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Panel */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <Box
            sx={{
              width: viewMode === 'split' ? '50%' : '100%',
              borderRight: viewMode === 'split' ? '1px solid' : 'none',
              borderColor: 'divider',
              overflow: 'auto',
              p: 3,
            }}
          >
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Основная информация</Typography>
              <TextField
                fullWidth
                label="Название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Имя клиента"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email клиента"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Paper>

            <ProposalVisualEditor slides={slides} onChange={handleSlidesChange} />
          </Box>
        )}

        {/* Preview Panel */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <Box
            sx={{
              width: viewMode === 'split' ? '50%' : '100%',
              overflow: 'auto',
              bgcolor: 'background.default',
            }}
          >
            <ProposalViewer proposal={previewProposal} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

