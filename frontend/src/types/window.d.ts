// Расширение типа Window для функций уведомлений
interface Window {
  showNotification?: (message: string, type?: 'error' | 'success' | 'info' | 'warning') => void;
  showErrorNotification?: (message: string) => void;
  showSuccessNotification?: (message: string) => void;
  showInfoNotification?: (message: string) => void;
  showWarningNotification?: (message: string) => void;
  showValidationError?: (message: string) => void;
}

