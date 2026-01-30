import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  severity: Severity;
  duration?: number;
}

type ToastContextValue = {
  showToast: (message: string, severity?: Severity, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((msg: string, sev: Severity = 'success', duration = 4000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message: msg, severity: sev, duration };
    
    setToasts((prev) => [...prev, newToast]);

    // Автоматическое удаление
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  // Экспортируем showToast в window для использования из не-React кода
  // Используем useEffect чтобы гарантировать выполнение после монтирования
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__showToast = showToast;
      (window as any).showErrorNotification = (msg: string) => showToast(msg, 'error');
      (window as any).showSuccessNotification = (msg: string) => showToast(msg, 'success');
      (window as any).showInfoNotification = (msg: string) => showToast(msg, 'info');
      (window as any).showWarningNotification = (msg: string) => showToast(msg, 'warning');
      
      // Переопределяем alert для глобального перехвата (если еще не перехвачен в main.tsx)
      if (!(window as any).__originalAlert) {
        (window as any).__originalAlert = window.alert;
      }
      window.alert = function(message: string) {
        // Показываем через toast вместо alert
        if (showToast) {
          showToast(String(message), 'info');
        } else if ((window as any).__showToast) {
          (window as any).__showToast(String(message), 'info');
        }
        // НЕ вызываем originalAlert, чтобы не показывать нативный alert
      };
      
      // Показываем отложенные alert'ы, если они были
      if ((window as any).__pendingAlerts && Array.isArray((window as any).__pendingAlerts)) {
        (window as any).__pendingAlerts.forEach((msg: string) => {
          showToast(msg, 'info');
        });
        (window as any).__pendingAlerts = [];
      }
    }
  }, [showToast]);

  const getIcon = (severity: Severity) => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 20 }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 20 }} />;
    }
  };

  const getColor = (severity: Severity) => {
    switch (severity) {
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      case 'warning':
        return '#ff9800';
      case 'info':
        return '#2196f3';
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          maxWidth: '400px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast, index) => (
          <Snackbar
            key={toast.id}
            open={true}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            sx={{
              position: 'relative',
              bottom: 'auto',
              left: 'auto',
              right: 'auto',
              transform: 'none',
              pointerEvents: 'auto',
            }}
          >
            <Alert
              severity={toast.severity}
              onClose={() => removeToast(toast.id)}
              icon={getIcon(toast.severity)}
              variant="filled"
              sx={{
                width: '100%',
                minWidth: '300px',
                maxWidth: '400px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: 1.5,
                '& .MuiAlert-icon': {
                  color: '#fff',
                },
                '& .MuiAlert-message': {
                  color: '#fff',
                  flex: 1,
                },
                '& .MuiAlert-action': {
                  paddingTop: 0,
                  paddingRight: 0,
                },
                backgroundColor: getColor(toast.severity),
                animation: 'slideInLeft 0.3s ease-out',
                '@keyframes slideInLeft': {
                  from: {
                    transform: 'translateX(-100%)',
                    opacity: 0,
                  },
                  to: {
                    transform: 'translateX(0)',
                    opacity: 1,
                  },
                },
              }}
              action={
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={() => removeToast(toast.id)}
                  sx={{
                    padding: '4px',
                    color: '#fff',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              {toast.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}




