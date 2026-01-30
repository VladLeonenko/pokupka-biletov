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
  Rating,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useAuth } from '@/auth/AuthProvider';
import { getAdminReviews, moderateReview, addReviewResponse, deleteReview, type Review } from '@/services/reviewsApi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ReviewsManagePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0); // 0 = непроверенные, 1 = опубликованные, 2 = все
  const [responseDialog, setResponseDialog] = useState<{ open: boolean; review: Review | null }>({
    open: false,
    review: null,
  });
  const [responseText, setResponseText] = useState('');

  // Фильтр по вкладкам
  const getFilter = () => {
    if (tab === 0) return { is_moderated: false };
    if (tab === 1) return { is_published: true };
    return {};
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', tab],
    queryFn: () => getAdminReviews(token!, getFilter()),
    enabled: !!token,
  });

  const reviews = data?.reviews || [];

  // Модерация
  const moderateMutation = useMutation({
    mutationFn: ({ id, is_published, is_verified }: { id: number; is_published: boolean; is_verified?: boolean }) =>
      moderateReview(token!, id, { is_published, is_verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  // Ответ на отзыв
  const responseMutation = useMutation({
    mutationFn: ({ id, response_text, response_author }: { id: number; response_text: string; response_author: string }) =>
      addReviewResponse(token!, id, { response_text, response_author }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setResponseDialog({ open: false, review: null });
      setResponseText('');
    },
  });

  // Удаление
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReview(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
  });

  const handleApprove = (id: number, is_verified: boolean = false) => {
    moderateMutation.mutate({ id, is_published: true, is_verified });
  };

  const handleReject = (id: number) => {
    moderateMutation.mutate({ id, is_published: false });
  };

  const handleDelete = (id: number) => {
    if (confirm('Удалить этот отзыв?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenResponse = (review: Review) => {
    setResponseDialog({ open: true, review });
    setResponseText(review.response_text || '');
  };

  const handleSubmitResponse = () => {
    if (responseDialog.review && responseText.trim()) {
      responseMutation.mutate({
        id: responseDialog.review.id,
        response_text: responseText,
        response_author: 'PrimeCoder',
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Управление отзывами
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Непроверенные (${reviews.filter((r) => !r.is_moderated).length})`} />
        <Tab label="Опубликованные" />
        <Tab label="Все отзывы" />
      </Tabs>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Отзывов нет
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Автор</TableCell>
                <TableCell>Рейтинг</TableCell>
                <TableCell>Отзыв</TableCell>
                <TableCell>Услуга</TableCell>
                <TableCell>Дата</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {review.author}
                      </Typography>
                      {review.email && (
                        <Typography variant="caption" color="text.secondary">
                          {review.email}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Rating value={review.rating} readOnly size="small" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap>
                      {review.text}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {review.service_type && (
                      <Chip label={review.service_type} size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(review.created_at), 'd MMM yyyy', { locale: ru })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                      {review.is_published && (
                        <Chip label="Опубликован" color="success" size="small" />
                      )}
                      {review.is_verified && (
                        <Chip label="Проверен" color="primary" size="small" icon={<VerifiedIcon />} />
                      )}
                      {!review.is_moderated && (
                        <Chip label="На модерации" color="warning" size="small" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {!review.is_published && (
                        <>
                          <Tooltip title="Одобрить">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleApprove(review.id, false)}
                            >
                              <CheckIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Одобрить как проверенного клиента">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleApprove(review.id, true)}
                            >
                              <VerifiedIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Отклонить">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleReject(review.id)}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Ответить">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleOpenResponse(review)}
                        >
                          <ReplyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Удалить">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(review.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог ответа на отзыв */}
      <Dialog
        open={responseDialog.open}
        onClose={() => setResponseDialog({ open: false, review: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Ответ на отзыв от {responseDialog.review?.author}
        </DialogTitle>
        <DialogContent>
          {responseDialog.review && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Rating value={responseDialog.review.rating} readOnly size="small" sx={{ mb: 1 }} />
              <Typography variant="body2">{responseDialog.review.text}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Ваш ответ"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Напишите ответ от имени компании..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResponseDialog({ open: false, review: null })}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmitResponse}
            variant="contained"
            disabled={!responseText.trim() || responseMutation.isPending}
          >
            {responseMutation.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

