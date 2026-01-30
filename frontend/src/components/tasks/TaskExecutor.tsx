import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Paper, Typography, Card, CardContent, LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useState } from 'react';
import { getNextTaskToExecute, getPendingTasks, completeTask, failTask } from '@/services/cmsApi';
import type { PendingTask } from '@/services/cmsApi';
import { useToast } from '@/components/common/ToastProvider';

export function TaskExecutor() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState<PendingTask | null>(null);
  const [executionNotes, setExecutionNotes] = useState('');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['pending-tasks'],
    queryFn: getPendingTasks,
    refetchInterval: isRunning ? 5000 : false,
  });

  const nextTaskMut = useMutation({
    mutationFn: getNextTaskToExecute,
    onSuccess: (data) => {
      if (data.task) {
        setCurrentTask(data.task);
        setExecutionNotes('');
      } else {
        setIsRunning(false);
        showToast('Все задачи выполнены', 'success');
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при получении задачи', 'error');
      setIsRunning(false);
    },
  });

  const completeMut = useMutation({
    mutationFn: ({ taskId, notes }: { taskId: number; notes?: string }) => completeTask(taskId, notes),
    onSuccess: () => {
      showToast('Задача выполнена', 'success');
      setCurrentTask(null);
      setExecutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      
      // Continue to next task
      if (isRunning) {
        setTimeout(() => {
          nextTaskMut.mutate();
        }, 1000);
      }
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при завершении задачи', 'error');
    },
  });

  const failMut = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: number; reason?: string }) => failTask(taskId, reason),
    onSuccess: () => {
      showToast('Задача отменена', 'info');
      setCurrentTask(null);
      setExecutionNotes('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      
      // Continue to next task
      if (isRunning) {
        setTimeout(() => {
          nextTaskMut.mutate();
        }, 1000);
      }
    },
    onError: (err: any) => {
      showToast(err?.message || 'Ошибка при отмене задачи', 'error');
    },
  });

  const handleStart = () => {
    setIsRunning(true);
    nextTaskMut.mutate();
  };

  const handleStop = () => {
    setIsRunning(false);
    setCurrentTask(null);
    setExecutionNotes('');
  };

  const handleComplete = () => {
    if (!currentTask) return;
    completeMut.mutate({ taskId: currentTask.id, notes: executionNotes || undefined });
  };

  const handleFail = () => {
    if (!currentTask) return;
    failMut.mutate({ taskId: currentTask.id, reason: executionNotes || undefined });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Автоматическое выполнение задач</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isRunning ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleStart}
              disabled={pendingTasks.length === 0}
            >
              Начать выполнение
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
            >
              Остановить
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Ожидающие задачи: {pendingTasks.length}
        </Typography>
        {pendingTasks.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {pendingTasks.slice(0, 5).map((task) => (
              <Chip
                key={task.id}
                label={`${task.title} (${task.priority})`}
                color={getPriorityColor(task.priority) as any}
                size="small"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
            {pendingTasks.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                и еще {pendingTasks.length - 5} задач
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {isRunning && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {currentTask && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Typography variant="h5" gutterBottom>
                  {currentTask.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    label={currentTask.status}
                    size="small"
                    color={currentTask.status === 'in_progress' ? 'info' : 'default'}
                  />
                  <Chip
                    label={currentTask.priority}
                    size="small"
                    color={getPriorityColor(currentTask.priority) as any}
                  />
                  {currentTask.dueDate && (
                    <Chip
                      label={`Срок: ${new Date(currentTask.dueDate).toLocaleDateString('ru-RU')}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Box>

            {currentTask.description && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography variant="body1" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {currentTask.description}
                </Typography>
              </Paper>
            )}

            {currentTask.tags && currentTask.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {currentTask.tags.map((tag, idx) => (
                  <Chip key={idx} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Заметки о выполнении (необязательно):
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                placeholder="Опишите что было сделано..."
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleComplete}
                  disabled={completeMut.isPending}
                >
                  {completeMut.isPending ? 'Сохраняется...' : 'Задача выполнена'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={handleFail}
                  disabled={failMut.isPending}
                >
                  {failMut.isPending ? 'Отменяется...' : 'Отменить задачу'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {!currentTask && !isRunning && pendingTasks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Нет задач для выполнения
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Создайте задачи в разделе "Задачник" для их автоматического выполнения
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

