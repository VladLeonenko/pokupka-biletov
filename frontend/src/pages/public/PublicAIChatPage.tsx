import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  CircularProgress,
  Chip,
  Tooltip,
  Container,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { sendAIMessage, AIMessage } from '@/services/aiChatApi';
import { useToast } from '@/components/common/ToastProvider';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

export function PublicAIChatPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition() as any;
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
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

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="AI Ассистент - Primecoder"
        description="Задайте вопрос нашему AI-ассистенту. Поддержка голосового ввода и вывода."
        url={currentUrl}
      />
      <Container maxWidth="md" sx={{ py: 4, minHeight: '80vh' }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', textAlign: 'center' }}>
          AI Ассистент
        </Typography>

        <Paper
          sx={{
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {messages.length === 0 ? (
              <Box sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                <SmartToyIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  Начните диалог с AI-ассистентом
                </Typography>
                <Typography variant="body2">
                  Задайте вопрос или попросите помощи. Поддерживается голосовой ввод и вывод.
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
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <SmartToyIcon />
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      maxWidth: '70%',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      boxShadow: 1,
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 0.5 }}>
                      {msg.content}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                      {formatTime(msg.timestamp)}
                    </Typography>
                  </Box>
                  {msg.role === 'user' && (
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <PersonIcon />
                    </Avatar>
                  )}
                </Box>
              ))
            )}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SmartToyIcon />
                </Avatar>
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
                  <CircularProgress size={20} />
                </Box>
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
                color={isVoiceEnabled ? 'primary' : 'default'}
              >
                {isVoiceEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
              </IconButton>
            </Tooltip>
            <Chip
              label={isVoiceEnabled ? 'Голос включен' : 'Голос выключен'}
              size="small"
              color={isVoiceEnabled ? 'primary' : 'default'}
              variant="outlined"
            />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 2,
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              gap: 1,
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              fullWidth
              multiline
              maxRows={4}
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
                color={isListening ? 'error' : 'primary'}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
            <IconButton
              onClick={handleSend}
              disabled={isLoading || !inputMessage.trim()}
              color="primary"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Container>
    </>
  );
}

