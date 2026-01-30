import { useState, useEffect, useRef } from 'react';
import { Box, Paper, IconButton, TextField, Typography, Avatar, Tooltip, Chip, Dialog, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { sendAIMessage, AIMessage } from '@/services/aiChatApi';
import { useToast } from '@/components/common/ToastProvider';

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  // Инициализация Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition() as any;
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        if (final) {
          setInputMessage(prev => prev + (prev ? ' ' : '') + final);
          setInterimTranscript('');
        } else {
          setInterimTranscript(interim);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      setIsVoiceEnabled(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const speakText = (text: string) => {
    if (!synthRef.current || !isVoiceEnabled) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.volume = 0.8;
    synthRef.current.speak(utterance);
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && !selectedFile) || isLoading) return;

    let messageContent = inputMessage.trim();
    if (selectedFile) {
      messageContent = messageContent 
        ? `${messageContent}\n\n[Файл: ${selectedFile.name}]`
        : `[Файл: ${selectedFile.name}]`;
    }

    const userMessage: AIMessage = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSelectedFile(null);
    setIsLoading(true);

    try {
      const response = await sendAIMessage(userMessage.content, messages);
      
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);

      if (isVoiceEnabled) {
        speakText(response.message);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      showToast(error.message || 'Ошибка при отправке сообщения', 'error');
    } finally {
      setIsLoading(false);
    }
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

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      showToast('Голосовой ввод не поддерживается в этом браузере', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        showToast('Не удалось начать распознавание речи', 'error');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <style>{`
        .ai-chat-widget, .ai-chat-widget * {
          cursor: default !important;
        }
        .ai-chat-widget button, .ai-chat-widget .MuiIconButton-root, 
        .ai-chat-widget .MuiButton-root, .ai-chat-widget a {
          cursor: pointer !important;
        }
        .ai-chat-widget input, .ai-chat-widget textarea {
          cursor: text !important;
        }
        .MuiDialog-root .ai-chat-widget, .MuiDialog-root .ai-chat-widget * {
          cursor: default !important;
        }
        .MuiDialog-root .ai-chat-widget button, 
        .MuiDialog-root .ai-chat-widget .MuiIconButton-root {
          cursor: pointer !important;
        }
        .MuiDialog-root .ai-chat-widget input, 
        .MuiDialog-root .ai-chat-widget textarea {
          cursor: text !important;
        }
      `}</style>
      {/* Кнопка для открытия */}
      {!isOpen && (
        <Box
          className="ai-chat-widget"
          sx={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 1000,
            cursor: 'pointer !important',
            '& *': {
              cursor: 'inherit !important',
            },
          }}
        >
          <IconButton
            onClick={() => setIsOpen(true)}
            aria-label="Открыть AI-чат"
            sx={{
              background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
              color: '#141414',
              width: 60,
              height: 60,
              '&:hover': {
                background: 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)',
              },
              boxShadow: '0 4px 12px rgba(255, 187, 0, 0.4)',
            }}
          >
            <SmartToyIcon />
          </IconButton>
        </Box>
      )}

      {/* Модальное окно */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: '90%',
            maxWidth: '1200px',
            height: '85vh',
            maxHeight: '900px',
            borderRadius: 3,
            overflow: 'hidden',
            bgcolor: 'background.paper',
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <Paper
          className="ai-chat-widget"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: 'rgba(255, 187, 0, 0.15)',
                  color: '#ffbb00',
                  width: 36,
                  height: 36,
                }}
              >
                <SmartToyIcon sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} color="text.primary">
                AI Ассистент
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 3,
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
              <SmartToyIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                Задайте вопрос AI-ассистенту
              </Typography>
              <Typography variant="body2">
                Поддерживается голосовой ввод и вывод
              </Typography>
            </Box>
          ) : (
            messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 1,
                }}
              >
                {msg.role === 'assistant' && (
                  <Avatar
                    sx={{
                      background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                      color: '#141414',
                      width: 40,
                      height: 40,
                    }}
                  >
                    <SmartToyIcon />
                  </Avatar>
                )}
                <Box
                  sx={{
                    maxWidth: '70%',
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)'
                      : 'background.paper',
                    color: msg.role === 'user' ? '#141414' : 'text.primary',
                    boxShadow: msg.role === 'user' 
                      ? '0 4px 12px rgba(255, 187, 0, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: msg.role === 'assistant' ? '1px solid' : 'none',
                    borderColor: msg.role === 'assistant' ? 'divider' : 'transparent',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                    {msg.content}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                    {formatTime(msg.timestamp)}
                  </Typography>
                </Box>
                {msg.role === 'user' && (
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(255, 187, 0, 0.2)',
                      color: '#ffbb00',
                      border: '2px solid #ffbb00',
                      width: 40,
                      height: 40,
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">Я</Typography>
                  </Avatar>
                )}
              </Box>
            ))
          )}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1.5 }}>
                <Avatar
                  sx={{
                    background: 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)',
                    color: '#141414',
                    width: 40,
                    height: 40,
                  }}
                >
                  <SmartToyIcon />
                </Avatar>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CircularProgress size={16} sx={{ color: '#ffbb00' }} />
                  <Typography variant="body2" color="text.secondary">
                    Думаю...
                  </Typography>
                </Box>
              </Box>
            )}
            {/* Промежуточный текст распознавания */}
            {isListening && interimTranscript && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                  opacity: 0.6,
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255, 187, 0, 0.1)',
                    border: '1px dashed',
                    borderColor: '#ffbb00',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                    {interimTranscript}
                  </Typography>
                </Box>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(255, 68, 68, 0.2)',
                    color: '#ff4444',
                    border: '2px solid #ff4444',
                    width: 40,
                    height: 40,
                  }}
                >
                  <MicIcon />
                </Avatar>
              </Box>
            )}
            <div ref={messagesEndRef} />
        </Box>

        {/* Voice controls */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            alignItems: 'center',
            bgcolor: 'background.paper',
          }}
        >
            <Tooltip title={isVoiceEnabled ? 'Отключить голосовой вывод' : 'Включить голосовой вывод'}>
              <IconButton
                size="small"
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                sx={{
                  color: isVoiceEnabled ? '#ffbb00' : 'text.secondary',
                  '&:hover': {
                    bgcolor: isVoiceEnabled ? 'rgba(255, 187, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                {isVoiceEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Tooltip>
            <Chip
              label={isVoiceEnabled ? 'Голос включен' : 'Голос выключен'}
              size="small"
              sx={{
                bgcolor: isVoiceEnabled ? 'rgba(255, 187, 0, 0.15)' : 'transparent',
                color: isVoiceEnabled ? '#ffbb00' : 'text.secondary',
                borderColor: isVoiceEnabled ? '#ffbb00' : 'divider',
                border: '1px solid',
              }}
              variant="outlined"
            />
        </Box>

        {/* Input */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {selectedFile && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5,
                p: 1.5,
                bgcolor: 'rgba(255, 187, 0, 0.1)',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'rgba(255, 187, 0, 0.3)',
              }}
            >
              <AttachFileIcon sx={{ fontSize: 20, color: '#ffbb00' }} />
              <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Typography>
              <IconButton
                size="small"
                onClick={() => setSelectedFile(null)}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.05)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept="*/*"
            />
            <Tooltip title="Прикрепить файл">
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'rgba(255, 187, 0, 0.1)',
                    color: '#ffbb00',
                  },
                  '&:disabled': {
                    color: 'text.disabled',
                  },
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              size="small"
              placeholder="Введите сообщение или используйте голосовой ввод..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <Tooltip title={isListening ? 'Остановить запись' : 'Голосовой ввод'}>
              <IconButton
                onClick={handleVoiceInput}
                disabled={isLoading}
                sx={{
                  color: isListening ? '#ff4444' : '#ffbb00',
                  '&:hover': {
                    bgcolor: isListening ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 187, 0, 0.1)',
                  },
                  '&:disabled': {
                    color: 'text.disabled',
                  },
                }}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={handleSend}
              disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
              sx={{
                background: (inputMessage.trim() || selectedFile) && !isLoading
                  ? 'linear-gradient(135deg, #ffbb00 0%, #ff8c00 100%)'
                  : 'transparent',
                color: (inputMessage.trim() || selectedFile) && !isLoading ? '#141414' : 'text.disabled',
                '&:hover': {
                  background: (inputMessage.trim() || selectedFile) && !isLoading
                    ? 'linear-gradient(135deg, #ffcc00 0%, #ff9900 100%)'
                    : 'transparent',
                },
                '&:disabled': {
                  background: 'transparent',
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
        </Paper>
      </Dialog>
    </>
  );
}
