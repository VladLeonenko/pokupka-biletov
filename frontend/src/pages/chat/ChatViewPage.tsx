import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { getChat, sendAdminMessage, updateChatStatus, uploadChatFile, ChatOrder } from '@/services/chatApi';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useToast } from '@/components/common/ToastProvider';
import { formatDateTime, formatTime } from '@/utils/date';

const ACCENT = '#ff4e18';

const QUICK_REPLIES = [
  'Билет уходит на почту после оплаты. Проверьте «Спам» и поиск по названию мероприятия.',
  'Напишите номер заказа и почту из оформления — сверю оплату и статус.',
  'Возврат зависит от организатора. Пришлите номер заказа, мероприятие и причину — передадим.',
  'Если банк отклонил платёж, заказ не создан. Можно повторить оплату на странице события.',
];

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'оплачен',
  pending: 'ожидает оплаты',
  failed: 'ошибка оплаты',
  cancelled: 'отменён',
  canceled: 'отменён',
  refunded: 'возврат',
};

function money(cents?: number) {
  return `${((Number(cents) || 0) / 100).toLocaleString('ru-RU')} ₽`;
}

function pageHref(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

function OrderCard({ order }: { order: ChatOrder }) {
  return (
    <Box sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Link component={RouterLink} to={`/admin/orders/${order.order_number}`} underline="hover" sx={{ fontWeight: 700 }}>
        {order.order_number}
      </Link>
      <Typography variant="body2">{order.titles || 'Билет'}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {PAYMENT_LABEL[order.payment_status || ''] || order.payment_status || order.status}
        {' · '}
        {money(order.total_cents)}
        {' · '}
        {formatDateTime(order.created_at)}
      </Typography>
    </Box>
  );
}

export function ChatViewPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenCount = useRef(0);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChat(parseInt(chatId!, 10)),
    enabled: !!chatId && Number.isFinite(Number(chatId)),
    refetchInterval: 4000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ message, file }: { message: string; file?: File }) => {
      if (file) {
        setUploading(true);
        try {
          const uploadResult = await uploadChatFile(parseInt(chatId!, 10), file);
          return await sendAdminMessage(
            parseInt(chatId!, 10),
            message || 'Файл',
            'file',
            uploadResult.url,
            uploadResult.filename,
            uploadResult.size
          );
        } finally {
          setUploading(false);
          setSelectedFile(null);
        }
      }
      return await sendAdminMessage(parseInt(chatId!, 10), message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setInputMessage('');
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Ошибка отправки сообщения', 'error');
      setUploading(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'closed' | 'archived') => updateChatStatus(parseInt(chatId!, 10), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (error: Error) => showToast(error.message || 'Не удалось сменить статус', 'error'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: seenCount.current ? 'smooth' : 'auto' });
    seenCount.current = data?.messages.length || 0;
  }, [data?.messages]);

  const handleSend = () => {
    if (!inputMessage.trim() && !selectedFile) return;
    sendMutation.mutate({ message: inputMessage.trim(), file: selectedFile || undefined });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Файл слишком большой. Максимум 10 МБ', 'error');
      return;
    }
    setSelectedFile(file);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/chat')}>К списку</Button>
        <Typography sx={{ mt: 2 }}>Чат не найден</Typography>
      </Box>
    );
  }

  const { chat, messages, orders = [] } = data;
  const href = pageHref(chat.page_url);
  const internal = href.startsWith('/') && !href.startsWith('//');

  return (
    <Box sx={{ height: { xs: 'auto', md: 'calc(100vh - 140px)' }, minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/admin/chat')} aria-label="К списку">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h5">{chat.client_name || 'Гость'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {[chat.client_email, chat.client_phone].filter(Boolean).join(' · ') || 'контактов нет — попросите почту или номер заказа'}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={chat.status}
            label="Статус"
            onChange={(e) => statusMutation.mutate(e.target.value as 'active' | 'closed' | 'archived')}
          >
            <MenuItem value="active">Открыт</MenuItem>
            <MenuItem value="closed">Закрыт</MenuItem>
            <MenuItem value="archived">Архив</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <Paper sx={{ width: { xs: '100%', md: 320 }, flexShrink: 0, p: 2, overflow: 'auto', maxHeight: { xs: 280, md: 'none' } }}>
          <Typography variant="subtitle2" gutterBottom>Откуда написали</Typography>
          {href ? (
            internal ? (
              <Link component={RouterLink} to={href} underline="hover">{chat.page_title || href}</Link>
            ) : (
              <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover">{chat.page_title || href}</Link>
            )
          ) : (
            <Typography variant="body2" color="text.secondary">Страница не передана (старый диалог)</Typography>
          )}

          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Заказы по почте или телефону</Typography>
          {orders.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Совпадений нет. Если клиент не оставил почту — спросите номер заказа.</Typography>
          ) : orders.map((order) => <OrderCard key={order.order_number} order={order} />)}

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Быстрые ответы</Typography>
          <Stack spacing={1}>
            {QUICK_REPLIES.map((text) => (
              <Button
                key={text}
                size="small"
                variant="outlined"
                onClick={() => setInputMessage(text)}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none' }}
              >
                {text}
              </Button>
            ))}
          </Stack>
        </Paper>

        <Paper sx={{ flex: 1, minWidth: 0, minHeight: 360, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'action.hover' }}>
            {messages.length === 0 && (
              <Typography variant="body2" color="text.secondary">Сообщений ещё нет</Typography>
            )}
            {messages.map((msg) => {
              const mine = msg.sender_type !== 'client';
              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <Box
                    sx={{
                      maxWidth: '75%',
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: mine ? ACCENT : 'background.paper',
                      color: mine ? '#fff' : 'text.primary',
                      border: mine ? 'none' : '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {msg.sender_type === 'bot' && (
                      <Chip label="подсказка" size="small" sx={{ mb: 0.5, height: 20, color: '#fff', bgcolor: 'rgba(0,0,0,0.25)' }} />
                    )}
                    {msg.message_type === 'file' && msg.file_url ? (
                      <Link
                        href={msg.file_url.startsWith('http') ? msg.file_url : msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: 'inherit' }}
                      >
                        {msg.file_name || 'Файл'}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'inherit' }}>{msg.message_text}</Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.75, color: 'inherit' }}>
                      {formatTime(msg.created_at)}
                      {msg.sender_type === 'client' ? '' : msg.sender_type === 'bot' ? ' · бот' : ' · мы'}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>

          <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <input id="chat-file-upload" type="file" hidden onChange={handleFileSelect} />
            <label htmlFor="chat-file-upload">
              <IconButton component="span" disabled={uploading || sendMutation.isPending} aria-label="Файл">
                <AttachFileIcon />
              </IconButton>
            </label>
            <Box sx={{ flex: 1 }}>
              {selectedFile && (
                <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                  {selectedFile.name}
                  <Button size="small" onClick={() => setSelectedFile(null)}>убрать</Button>
                </Typography>
              )}
              <TextField
                fullWidth
                size="small"
                multiline
                maxRows={4}
                placeholder="Ответ клиенту"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={sendMutation.isPending || uploading}
              />
            </Box>
            <IconButton
              onClick={handleSend}
              disabled={sendMutation.isPending || uploading || (!inputMessage.trim() && !selectedFile)}
              aria-label="Отправить"
              sx={{ bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: '#e64514' } }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
