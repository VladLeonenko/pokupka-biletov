import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconButton, Badge, Popover, Box, Typography, List, ListItem, ListItemText, ListItemButton, Divider, Button, Tooltip, Switch, FormControlLabel } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/cmsApi';
import { Notification } from '@/types/cms';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { playNotificationSound, setNotificationSoundEnabled, isNotificationSoundEnabled } from '@/utils/notificationSound';
// Simple date formatting without date-fns
function formatTime(date: string): string {
  try {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return d.toLocaleDateString('ru-RU');
  } catch {
    return '';
  }
}

export function NotificationsBell() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(isNotificationSoundEnabled());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const previousUnreadCountRef = useRef<number>(0);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      try {
        return await listNotifications(true);
      } catch (error: any) {
        // Тихая обработка ошибок авторизации
        if (error?.message?.includes('Authentication required') || error?.message?.includes('401')) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!token, // Запрос только при наличии токена
    refetchInterval: !!token ? 30000 : false, // Refetch только при наличии токена
    retry: false, // Не повторять при ошибке 401
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Воспроизводим звук при появлении новых уведомлений
  useEffect(() => {
    if (previousUnreadCountRef.current > 0 && unreadCount > previousUnreadCountRef.current) {
      // Появились новые непрочитанные уведомления
      playNotificationSound();
    }
    previousUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  const markReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMut.mutate(notification.id);
    }
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
      handleClose();
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMut.mutate();
  };

  const handleSoundToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setSoundEnabled(enabled);
    setNotificationSoundEnabled(enabled);
    // Воспроизводим звук при включении для проверки
    if (enabled) {
      playNotificationSound();
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notifications-popover' : undefined;


  return (
    <>
      <Tooltip title="Уведомления">
        <IconButton color="inherit" onClick={handleClick}>
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            width: 400, 
            maxHeight: 600, 
            mt: 1,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
            color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: 'inherit !important' }}>Уведомления</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title={soundEnabled ? 'Звук включен' : 'Звук выключен'}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={soundEnabled}
                      onChange={handleSoundToggle}
                      icon={<VolumeOffIcon sx={{ fontSize: 16 }} />}
                      checkedIcon={<VolumeUpIcon sx={{ fontSize: 16 }} />}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Tooltip>
              {unreadCount > 0 && (
                <Button size="small" onClick={handleMarkAllRead} disabled={markAllReadMut.isPending}>
                  Отметить все прочитанными
                </Button>
              )}
            </Box>
          </Box>
          <Divider />
          {isLoading ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Загрузка...</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Нет уведомлений</Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 500, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  disablePadding
                  sx={{
                    bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemButton onClick={() => handleNotificationClick(notification)}>
                    <ListItemText
                      primary={
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            color: (theme) => theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
                          }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          {notification.message && (
                            <Typography 
                              variant="caption" 
                              component="div"
                              sx={{ 
                                color: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7) !important' : 'rgba(0,0,0,0.6) !important',
                              }}
                            >
                              {notification.message}
                            </Typography>
                          )}
                          <Typography 
                            variant="caption" 
                            component="div"
                            sx={{ 
                              color: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7) !important' : 'rgba(0,0,0,0.6) !important',
                            }}
                          >
                            {formatTime(notification.createdAt)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}

