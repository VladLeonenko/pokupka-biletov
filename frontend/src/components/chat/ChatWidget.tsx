import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Paper, IconButton, TextField, Typography, Avatar, Chip, Link, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import { sendClientMessage, getChatHistory, getOrCreateChat, ChatMessage, Chat } from '@/services/chatApi';
import { useTicketsChrome } from '@/hooks/useTicketsChrome';
import { getChatWidgetTheme } from '@/utils/ticketWidgetTheme';

interface ChatWidgetProps {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

// Генерация уникального ID сессии для каждой вкладки браузера
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Получить или создать уникальный sessionId для этой вкладки
function getSessionId(): string {
  // Используем sessionStorage - уникален для каждой вкладки, очищается при закрытии
  let sessionId = sessionStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
}

export function ChatWidget({ clientName, clientEmail, clientPhone }: ChatWidgetProps) {
  const ticketsChrome = useTicketsChrome();
  const th = useMemo(() => getChatWidgetTheme(ticketsChrome), [ticketsChrome]);

  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [clientInfo, setClientInfo] = useState({ name: clientName, email: clientEmail, phone: clientPhone });
  const [sessionId] = useState<string>(getSessionId());
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    // Пытаемся получить сохраненные данные для ЭТОЙ СЕССИИ из sessionStorage
    const savedChatId = sessionStorage.getItem(`chatId_${sessionId}`);
    const savedClientName = sessionStorage.getItem(`clientName_${sessionId}`);
    const savedClientEmail = sessionStorage.getItem(`clientEmail_${sessionId}`);
    const savedClientPhone = sessionStorage.getItem(`clientPhone_${sessionId}`);

    if (savedChatId) {
      setChatId(parseInt(savedChatId));
      loadChatHistory(parseInt(savedChatId));
    }

    if (savedClientName || savedClientEmail || savedClientPhone) {
      setClientInfo({
        name: savedClientName || clientName,
        email: savedClientEmail || clientEmail,
        phone: savedClientPhone || clientPhone,
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Проверяем новые сообщения от админа и воспроизводим звук
    if (messages.length > lastMessageCount && lastMessageCount > 0) {
      const newMessages = messages.slice(lastMessageCount);
      const hasAdminMessage = newMessages.some(msg => msg.sender_type === 'admin' || msg.sender_type === 'bot');
      
      if (hasAdminMessage) {
        // Воспроизводим звук уведомления
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyBzvLXiTcIGWi77eefTRAMUKfj8LZjHAY4kdfy');
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().catch(() => {
          /* swallow playback errors silently */
        });
        
        // Показываем браузерное уведомление если чат закрыт
        if (!isOpen && 'Notification' in window && Notification.permission === 'granted') {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.message_text) {
            new Notification('Новое сообщение', {
              body: lastMessage.message_text.substring(0, 100),
              icon: '/favicon.svg'
            });
          }
        }
      }
    }
    
    setLastMessageCount(messages.length);
  }, [messages, isOpen, lastMessageCount]);

  const loadChatHistory = async (id: number) => {
    try {
      const data = await getChatHistory(id);
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleOpen = async () => {
    // Проверяем, есть ли уже имя
    const savedName = sessionStorage.getItem(`clientName_${sessionId}`);
    if (!savedName && !clientInfo.name) {
      // Показываем диалог для ввода имени
      setShowNameDialog(true);
      setIsOpen(true);
      return;
    }
    
    setIsOpen(true);
    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    if (!chatId) {
      try {
        const data = await getOrCreateChat(sessionId, clientInfo.name || savedName || undefined, clientInfo.email, clientInfo.phone);
        const newChatId = data.chat.id;
        setChatId(newChatId);
        sessionStorage.setItem(`chatId_${sessionId}`, String(newChatId));
        if (data.chat.client_name) sessionStorage.setItem(`clientName_${sessionId}`, data.chat.client_name);
        if (data.chat.client_email) sessionStorage.setItem(`clientEmail_${sessionId}`, data.chat.client_email);
        if (data.chat.client_phone) sessionStorage.setItem(`clientPhone_${sessionId}`, data.chat.client_phone);
        await loadChatHistory(newChatId);
      } catch (error) {
        console.error('Error creating chat:', error);
      }
    } else {
      await loadChatHistory(chatId);
    }
  };

  const handleNameSubmit = async () => {
    if (!tempName.trim()) return;
    
    const name = tempName.trim();
    setClientInfo(prev => ({ ...prev, name }));
    sessionStorage.setItem(`clientName_${sessionId}`, name);
    setShowNameDialog(false);
    
    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Создаем чат с именем
    try {
      const data = await getOrCreateChat(sessionId, name, clientInfo.email, clientInfo.phone);
      const newChatId = data.chat.id;
      setChatId(newChatId);
      sessionStorage.setItem(`chatId_${sessionId}`, String(newChatId));
      await loadChatHistory(newChatId);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const result = await sendClientMessage(sessionId, chatId, messageText, clientInfo.name, clientInfo.email, clientInfo.phone);
      
      if (result.chatId !== chatId) {
        setChatId(result.chatId);
        sessionStorage.setItem(`chatId_${sessionId}`, String(result.chatId));
      }

      // Добавляем сообщение клиента и ответ бота
      setMessages(prev => [...prev, result.message]);
      if (result.botResponse) {
        setMessages(prev => [...prev, result.botResponse!]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          cursor: 'pointer !important',
        }}
      >
        <IconButton
          onClick={handleOpen}
          aria-label="Открыть чат"
          sx={{
            bgcolor: th.fabBg,
            color: th.fabIcon,
            width: 60,
            height: 60,
            cursor: 'pointer !important',
            '&:hover': {
              bgcolor: th.accentHover,
            },
            boxShadow: th.fabShadow,
          }}
        >
          <ChatIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <>
      {/* Диалог для ввода имени */}
      <Dialog 
        open={showNameDialog} 
        onClose={() => {}}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: th.accent, color: th.headerFg, fontWeight: 'bold' }}>
          Представьтесь, пожалуйста
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Для начала общения нам нужно знать, как к вам обращаться
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Ваше имя *"
            placeholder="Например: Иван"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && tempName.trim()) {
                handleNameSubmit();
              }
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setShowNameDialog(false);
              setIsOpen(false);
            }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleNameSubmit}
            variant="contained"
            disabled={!tempName.trim()}
            sx={{
              bgcolor: th.accent,
              '&:hover': { bgcolor: th.accentHover },
            }}
          >
            Продолжить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Основное окно чата */}
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 380,
        height: 600,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        cursor: 'default !important',
        '& *': {
          cursor: 'default !important',
        },
        '& button, & input, & textarea, & a': {
          cursor: 'pointer !important',
        },
      }}
    >
      <Paper
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: th.headerBg,
            color: th.headerFg,
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Онлайн-чат
          </Typography>
          <IconButton
            size="small"
            onClick={() => setIsOpen(false)}
            sx={{ color: th.headerFg }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            bgcolor: th.threadBg,
            backgroundImage: th.threadGradient,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {messages.length === 0 ? (
            <Typography variant="body2" textAlign="center" sx={{ mt: 4, color: th.emptyHint }}>
              Начните общение, задав вопрос
            </Typography>
          ) : (
            messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: 'flex',
                  justifyContent: msg.sender_type === 'client' ? 'flex-end' : 'flex-start',
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '75%',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: msg.sender_type === 'client' ? th.bubbleClientBg : th.bubbleOtherBg,
                    color: `${msg.sender_type === 'client' ? th.bubbleClientFg : th.bubbleOtherFg} !important`,
                    border:
                      msg.sender_type === 'client' ? 'none' : `1px solid ${ticketsChrome ? 'rgba(0,0,0,0.08)' : 'transparent'}`,
                    boxShadow: msg.sender_type === 'client' ? '0 1px 2px rgba(0,0,0,0.12)' : th.bubbleOtherShadow,
                    '& *': {
                      color: `${msg.sender_type === 'client' ? th.bubbleClientFg : th.bubbleOtherFg} !important`,
                    },
                  }}
                >
                  {msg.message_type === 'file' && msg.file_url ? (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: 'inherit !important' }}>
                        {msg.message_text}
                      </Typography>
                      <Link
                        href={msg.file_url}
                        target="_blank"
                        download={msg.file_name}
                        sx={{
                          color: `${th.linkFg} !important`,
                          textDecoration: 'underline',
                          display: 'block',
                          '&:hover': {
                            color: `${th.linkHover} !important`,
                          },
                        }}
                      >
                        📎 {msg.file_name || 'Скачать файл'}
                      </Link>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'inherit !important' }}>
                      {msg.message_text}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: '0.7rem',
                      color: 'inherit !important',
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </Typography>
                </Box>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${th.inputBarBorder}`,
            bgcolor: th.inputBarBg,
            display: 'flex',
            gap: 1,
          }}
        >
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
            disabled={isLoading}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: th.inputBg,
                color: th.inputFg,
                borderRadius: '20px',
                '&:hover': {
                  bgcolor: th.inputBg,
                },
                '&.Mui-focused': {
                  bgcolor: th.inputBg,
                },
              },
              '& .MuiInputBase-input': {
                color: `${th.inputFg} !important`,
                '&::placeholder': {
                  color: th.inputPlaceholder,
                  opacity: 1,
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: th.inputBorder,
              },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: th.inputBorderHover,
              },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: th.inputBorderFocus,
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={isLoading || !inputMessage.trim()}
            sx={{
              bgcolor: th.sendBg,
              color: th.sendFg,
              '&:hover': {
                bgcolor: th.accentHover,
              },
              '&:disabled': {
                bgcolor: th.sendDisabled,
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
    </>
  );
}

