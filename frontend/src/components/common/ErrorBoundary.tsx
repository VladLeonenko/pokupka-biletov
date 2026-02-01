import React, { Component, ReactNode } from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - ловит все React ошибки и показывает fallback UI
 * 
 * Решает проблему черного экрана в Safari:
 * - Ловит все необработанные React ошибки
 * - Показывает понятное сообщение с кнопкой перезагрузки
 * - Логирует ошибку для отладки
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error);
    console.error('🚨 Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Можно отправить в систему мониторинга ошибок
    if (typeof window !== 'undefined' && (window as any).__errorMonitoring) {
      try {
        (window as any).__errorMonitoring.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      } catch (e) {
        console.error('Failed to send error to monitoring:', e);
      }
    }
  }

  handleReload = () => {
    // Очищаем состояние ошибки и перезагружаем страницу
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  handleReset = () => {
    // Пытаемся сбросить состояние без перезагрузки
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Неизвестная ошибка';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');
      const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('token');

      return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Box
            sx={{
              textAlign: 'center',
              bgcolor: 'background.paper',
              p: 4,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography variant="h4" gutterBottom sx={{ color: 'error.main' }}>
              😿 Что-то пошло не так
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
              {isNetworkError && 'Проблема с подключением к серверу. Проверьте интернет-соединение.'}
              {isAuthError && 'Сессия истекла. Необходима повторная авторизация.'}
              {!isNetworkError && !isAuthError && `Ошибка: ${errorMessage}`}
            </Typography>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'grey.900',
                  borderRadius: 1,
                  textAlign: 'left',
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                <Typography variant="caption" component="pre" sx={{ color: 'error.light', fontSize: '0.75rem' }}>
                  {this.state.error.stack}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                size="large"
              >
                🔄 Перезагрузить страницу
              </Button>
              
              {!isAuthError && (
                <Button
                  variant="outlined"
                  onClick={this.handleReset}
                  size="large"
                >
                  Попробовать снова
                </Button>
              )}
            </Box>

            {isAuthError && (
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="text"
                  onClick={() => {
                    // Очищаем auth данные и редиректим на логин
                    try {
                      localStorage.removeItem('auth.token');
                      localStorage.removeItem('auth.user');
                      sessionStorage.removeItem('auth.token');
                      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
                    } catch (e) {
                      console.error('Failed to clear auth:', e);
                    }
                    window.location.href = '/admin/login';
                  }}
                >
                  Войти заново
                </Button>
              </Box>
            )}
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
