import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getChat, sendAdminMessage, assignChat, updateChatStatus, ChatMessage, uploadChatFile } from '@/services/chatApi';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useToast } from '@/components/common/ToastProvider';
import { formatTime } from '@/utils/date';

export function ChatViewPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChat(parseInt(chatId!)),
    enabled: !!chatId,
    refetchInterval: 5000, // Обновляем каждые 5 секунд
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const sendMutation = useMutation({
    mutationFn: async ({ message, file }: { message: string; file?: File }) => {
      if (file) {
        setUploading(true);
        try {
          const uploadResult = await uploadChatFile(parseInt(chatId!), file);
          return await sendAdminMessage(
            parseInt(chatId!),
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
      } else {
        return await sendAdminMessage(parseInt(chatId!), message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      setInputMessage('');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      showToast(error.message || 'Ошибка отправки сообщения', 'error');
      setUploading(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId?: number) => assignChat(parseInt(chatId!), userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      showToast('Чат назначен', 'success');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'active' | 'closed' | 'archived') => updateChatStatus(parseInt(chatId!), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      showToast('Статус обновлен', 'success');
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Проверяем новые сообщения от клиента и воспроизводим звук
    const messages = data?.messages || [];
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const newMessages = messages.slice(lastMessageCount);
      const hasClientMessage = newMessages.some(msg => msg.sender_type === 'client');
      
      if (hasClientMessage) {
        // Воспроизводим звук уведомления
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyBzvLXiTcIGWi77eefTRAMUKfj8LZjHAY4kdfy');
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().catch(() => {
          /* ignore playback errors */
        });
      }
    }
    
    setLastMessageCount(messages.length);
  }, [data?.messages, lastMessageCount]);

  const handleSend = () => {
    if (!inputMessage.trim() && !selectedFile) return;
    sendMutation.mutate({ message: inputMessage.trim(), file: selectedFile || undefined });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Файл слишком большой. Максимальный размер: 10MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Чат не найден</Typography>
      </Box>
    );
  }

  const { chat, messages } = data;

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <IconButton onClick={() => navigate('/admin/chat')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5">{chat.client_name || 'Клиент'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {chat.client_email} {chat.client_phone}
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Статус</InputLabel>
          <Select
            value={chat.status}
            label="Статус"
            onChange={(e) => statusMutation.mutate(e.target.value as any)}
          >
            <MenuItem value="active">Активный</MenuItem>
            <MenuItem value="closed">Закрыт</MenuItem>
            <MenuItem value="archived">Архив</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                justifyContent: msg.sender_type === 'client' ? 'flex-start' : 'flex-end',
                gap: 1,
              }}
            >
              {msg.sender_type === 'client' && (
                <Avatar sx={{ bgcolor: '#ffbb00' }}>
                  {chat.client_name?.[0] || 'К'}
                </Avatar>
              )}
              <Box
                sx={{
                  maxWidth: '70%',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: msg.sender_type === 'client' ? '#e8f5e9 !important' : '#ffbb00 !important',
                  color: msg.sender_type === 'client' ? '#1b5e20 !important' : '#000000 !important',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  border: msg.sender_type === 'client' ? '1px solid #81c784' : 'none',
                  '& *': {
                    color: msg.sender_type === 'client' ? '#1b5e20 !important' : '#000000 !important',
                  },
                  '& .MuiTypography-root': {
                    color: msg.sender_type === 'client' ? '#1b5e20 !important' : '#000000 !important',
                  },
                }}
              >
                {msg.message_type === 'file' && msg.file_url ? (
                  <Box>
                    {msg.message_text && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {msg.message_text}
                      </Typography>
                    )}
                      <Link
                        href={msg.file_url.startsWith('http') ? msg.file_url : `${window.location.origin}${msg.file_url}`}
                        target="_blank"
                        download={msg.file_name}
                        sx={{
                          color: msg.sender_type === 'client' ? '#1b5e20 !important' : '#000000 !important',
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                        }}
                      >
                      📎 {msg.file_name || 'Скачать файл'}
                      {msg.file_size && (
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                          ({(msg.file_size / 1024).toFixed(1)} KB)
                        </Typography>
                      )}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.message_text}</Typography>
                )}
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                  {formatTime(msg.created_at)} {msg.sender_name && `• ${msg.sender_name}`}
                </Typography>
              </Box>
              {msg.sender_type !== 'client' && (
                <Avatar sx={{ bgcolor: '#1976d2' }}>
                  {msg.sender_name?.[0] || 'А'}
                </Avatar>
              )}
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 1, alignItems: 'center' }}>
          {selectedFile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption">{selectedFile.name}</Typography>
              <IconButton size="small" onClick={() => setSelectedFile(null)}>
                ×
              </IconButton>
            </Box>
          )}
          <input
            type="file"
            id="file-upload"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept="*/*"
          />
          <label htmlFor="file-upload">
            <IconButton component="span" disabled={uploading || sendMutation.isPending}>
              <AttachFileIcon />
            </IconButton>
          </label>
          <TextField
            fullWidth
            size="small"
            placeholder="Введите сообщение..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sendMutation.isPending || uploading}
          />
          <IconButton
            onClick={handleSend}
            disabled={sendMutation.isPending || uploading || (!inputMessage.trim() && !selectedFile)}
            sx={{ bgcolor: '#ffbb00', color: 'white', '&:hover': { bgcolor: '#e6a800' } }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}

