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
    console.error('🚨 Error message:', error.message);
    console.error('🚨 Error stack:', error.stack);
    console.error('🚨 Error info:', errorInfo);
    console.error('🚨 Component stack:', errorInfo.componentStack);
    
    // Также выводим в window для доступа из консоли
    if (typeof window !== 'undefined') {
      (window as any).__lastReactError = { error, errorInfo };
    }
    
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

      // Fallback без MUI на случай если MUI не загрузился
      try {
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
                        import('@/utils/authStorage').then(({ removeAuthToken, removeAuthUser }) => {
                          removeAuthToken();
                          removeAuthUser();
                        });
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
      } catch (muiError) {
        // Если MUI не загрузился, показываем простой HTML fallback
        console.error('[ErrorBoundary] MUI not available, using HTML fallback:', muiError);
        return (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: '#141414',
            color: '#fff',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <h2 style={{ color: '#ff6b6b', marginBottom: '20px' }}>😿 Что-то пошло не так</h2>
            <p style={{ marginBottom: '20px', color: '#999' }}>
              {isNetworkError && 'Проблема с подключением к серверу.'}
              {isAuthError && 'Сессия истекла. Необходима повторная авторизация.'}
              {!isNetworkError && !isAuthError && `Ошибка: ${errorMessage}`}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              🔄 Перезагрузить страницу
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left', maxWidth: '600px' }}>
                <summary style={{ cursor: 'pointer', color: '#999' }}>Детали ошибки</summary>
                <pre style={{
                  background: '#000',
                  padding: '10px',
                  overflow: 'auto',
                  fontSize: '12px',
                  marginTop: '10px'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        );
      }
    }

    return this.props.children;
  }
}
