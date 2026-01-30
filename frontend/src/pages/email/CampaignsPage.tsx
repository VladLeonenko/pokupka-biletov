import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Send,
  Edit,
  Visibility,
  Email,
  TrendingUp,
  OpenInNew,
  TouchApp,
} from '@mui/icons-material';
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  sendCampaign,
  EmailCampaign,
} from '@/services/emailCampaignsApi';
import { useToast } from '@/components/common/ToastProvider';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState<number | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['email-campaigns'],
    queryFn: listCampaigns,
  });

  const { data: campaignDetails } = useQuery({
    queryKey: ['email-campaign', viewingCampaign],
    queryFn: () => getCampaign(viewingCampaign!),
    enabled: !!viewingCampaign,
  });

  const sendMutation = useMutation({
    mutationFn: sendCampaign,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      showToast(`Отправлено: ${result.sent} из ${result.total}`, 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'success';
      case 'sending':
        return 'info';
      case 'scheduled':
        return 'warning';
      case 'draft':
        return 'default';
      case 'paused':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      scheduled: 'Запланирована',
      sending: 'Отправляется',
      sent: 'Отправлена',
      paused: 'Приостановлена',
      cancelled: 'Отменена',
    };
    return labels[status] || status;
  };

  const handleSend = (id: number) => {
    if (window.confirm('Вы уверены, что хотите отправить эту рассылку?')) {
      sendMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Email-рассылки
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/admin/email/campaigns/new')}
        >
          Создать рассылку
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Тема</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Получателей</TableCell>
              <TableCell>Отправлено</TableCell>
              <TableCell>Доставлено</TableCell>
              <TableCell>Открыто</TableCell>
              <TableCell>Кликов</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns?.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell>{campaign.name}</TableCell>
                <TableCell>{campaign.subject}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(campaign.status)}
                    color={getStatusColor(campaign.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{campaign.total_recipients || 0}</TableCell>
                <TableCell>{campaign.total_sent || 0}</TableCell>
                <TableCell>{campaign.delivered || 0}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <OpenInNew fontSize="small" />
                    {campaign.opened || 0}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TouchApp fontSize="small" />
                    {campaign.clicked || 0}
                  </Box>
                </TableCell>
                <TableCell>
                  {new Date(campaign.created_at).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => setViewingCampaign(campaign.id)}
                  >
                    <Visibility />
                  </IconButton>
                  {campaign.status === 'draft' && (
                    <IconButton
                      size="small"
                      onClick={() => handleSend(campaign.id)}
                      disabled={sendMutation.isPending}
                    >
                      <Send />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Диалог просмотра статистики */}
      <Dialog
        open={!!viewingCampaign}
        onClose={() => setViewingCampaign(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Статистика рассылки</DialogTitle>
        <DialogContent>
          {campaignDetails && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {campaignDetails.campaign.name}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Отправлено
                    </Typography>
                    <Typography variant="h4">{campaignDetails.stats.total_sent}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Доставлено
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {campaignDetails.stats.delivered}
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Открыто
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      {campaignDetails.stats.opened}
                    </Typography>
                    {campaignDetails.stats.total_sent > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {(
                          (campaignDetails.stats.opened / campaignDetails.stats.total_sent) *
                          100
                        ).toFixed(1)}
                        %
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Кликов
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {campaignDetails.stats.clicked}
                    </Typography>
                    {campaignDetails.stats.opened > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {(
                          (campaignDetails.stats.clicked / campaignDetails.stats.opened) *
                          100
                        ).toFixed(1)}
                        % от открытий
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Отклонено
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {campaignDetails.stats.bounced}
                    </Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Ответов
                    </Typography>
                    <Typography variant="h4" color="secondary.main">
                      {campaignDetails.stats.replied}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingCampaign(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

