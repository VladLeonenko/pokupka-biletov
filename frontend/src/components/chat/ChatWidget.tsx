import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Paper, IconButton, TextField, Typography, Link, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import { sendClientMessage, getChatHistory, ChatMessage } from '@/services/chatApi';
import { getChatWidgetTheme } from '@/utils/ticketWidgetTheme';

const QUICK_QUESTIONS = [
  'Не пришёл билет',
  'Проблема с оплатой',
  'Хочу вернуть билет',
  'Помощь с выбором мест',
];

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
}

interface ChatWidgetProps {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

export function ChatWidget({ clientName, clientEmail, clientPhone }: ChatWidgetProps) {
  const th = useMemo(() => getChatWidgetTheme(true), []);
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState<string>(getSessionId);
  const [name, setName] = useState(clientName || '');
  const seenCount = useRef(0);

  useEffect(() => {
    const savedChatId = sessionStorage.getItem(`chatId_${sessionId}`);
    const savedName = sessionStorage.getItem(`clientName_${sessionId}`);
    if (savedName) setName(savedName);
    if (savedChatId) {
      const id = parseInt(savedChatId, 10);
      if (Number.isFinite(id)) {
        setChatId(id);
        getChatHistory(id).then((data) => setMessages(data.messages || [])).catch(() => {});
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isOpen || !chatId) return;
    let cancelled = false;
    const tick = () => {
      getChatHistory(chatId)
        .then((data) => {
          if (cancelled) return;
          const server = data.messages || [];
          const ids = new Set(server.map((m) => m.id));
          setMessages((prev) => {
            const extra = prev.filter((m) => !ids.has(m.id));
            return extra.length ? [...server, ...extra] : server;
          });
        })
        .catch(() => {});
    };
    const timer = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, chatId]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: seenCount.current ? 'smooth' : 'auto' });
    seenCount.current = messages.length;
  }, [messages, isOpen]);

  const persistName = (value: string) => {
    const next = value.trim();
    setName(value);
    if (next) sessionStorage.setItem(`clientName_${sessionId}`, next);
  };

  const handleSend = async (preset?: string) => {
    const messageText = (preset ?? inputMessage).trim();
    if (!messageText || isLoading) return;
    setInputMessage('');
    setIsLoading(true);
    const pageUrl = `${window.location.pathname}${window.location.search || ''}`;
    try {
      const result = await sendClientMessage(
        sessionId,
        chatId,
        messageText,
        name.trim() || undefined,
        clientEmail,
        clientPhone,
        pageUrl,
        document.title
      );
      if (result.chatId !== chatId) {
        setChatId(result.chatId);
        sessionStorage.setItem(`chatId_${sessionId}`, String(result.chatId));
      }
      setMessages((prev) => [...prev, result.message, ...(result.botResponse ? [result.botResponse] : [])]);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputMessage(messageText);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
        <IconButton
          onClick={() => setIsOpen(true)}
          aria-label="Открыть чат"
          sx={{
            bgcolor: th.fabBg,
            color: th.fabIcon,
            width: 60,
            height: 60,
            boxShadow: th.fabShadow,
            '&:hover': { bgcolor: th.accentHover },
          }}
        >
          <ChatIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: { xs: 'calc(100vw - 24px)', sm: 380 },
        height: { xs: 'min(640px, calc(100vh - 24px))', sm: 640 },
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      }}
    >
      <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: th.headerBg, color: th.headerFg, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>Поддержка билетов</Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Ответим в этом чате</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: th.headerFg }} aria-label="Закрыть чат">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: th.threadBg, backgroundImage: th.threadGradient, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {messages.length === 0 ? (
            <Box>
              <Typography variant="body2" sx={{ color: th.emptyHint, mb: 1.5 }}>
                Напишите, что случилось: билет, оплата, возврат или места. Номер заказа и почта ускорят ответ.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {QUICK_QUESTIONS.map((q) => (
                  <Button
                    key={q}
                    size="small"
                    variant="outlined"
                    disabled={isLoading}
                    onClick={() => handleSend(q)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', borderColor: th.accent, color: th.accent }}
                  >
                    {q}
                  </Button>
                ))}
              </Box>
            </Box>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender_type === 'client';
              return (
                <Box key={msg.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <Box
                    sx={{
                      maxWidth: '75%',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: mine ? th.bubbleClientBg : th.bubbleOtherBg,
                      color: mine ? th.bubbleClientFg : th.bubbleOtherFg,
                      boxShadow: mine ? 'none' : th.bubbleOtherShadow,
                    }}
                  >
                    {msg.message_type === 'file' && msg.file_url ? (
                      <Link href={msg.file_url} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit' }}>
                        {msg.file_name || 'Файл'}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'inherit' }}>{msg.message_text}</Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7, color: 'inherit' }}>
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Box sx={{ p: 1.5, borderTop: `1px solid ${th.inputBarBorder}`, bgcolor: th.inputBarBg, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Как к вам обращаться"
            value={name}
            onChange={(e) => persistName(e.target.value)}
            sx={{
              '& .MuiInputBase-input': { color: th.inputFg },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: th.inputBorder },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Сообщение"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={isLoading}
              sx={{
                '& .MuiInputBase-root': { bgcolor: th.inputBg, borderRadius: '20px' },
                '& .MuiInputBase-input': { color: `${th.inputFg} !important` },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: th.inputBorder },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: th.inputBorderFocus },
              }}
            />
            <IconButton
              onClick={() => handleSend()}
              disabled={isLoading || !inputMessage.trim()}
              aria-label="Отправить"
              sx={{ bgcolor: th.sendBg, color: th.sendFg, '&:hover': { bgcolor: th.accentHover }, '&:disabled': { bgcolor: th.sendDisabled } }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
