import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listChatbotRules,
  createChatbotRule,
  updateChatbotRule,
  deleteChatbotRule,
  listProposalTemplates,
  ChatbotRule,
} from '@/services/chatbotApi';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useToast } from '@/components/common/ToastProvider';

export function ChatbotSettingsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChatbotRule | null>(null);
  const [formData, setFormData] = useState<Partial<ChatbotRule>>({
    name: '',
    keywords: [],
    response_text: '',
    response_type: 'text',
    priority: 0,
    is_active: true,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['chatbot-rules'],
    queryFn: listChatbotRules,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposal-templates'],
    queryFn: listProposalTemplates,
  });

  const createMutation = useMutation({
    mutationFn: createChatbotRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-rules'] });
      showToast('Правило создано', 'success');
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChatbotRule> }) => updateChatbotRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-rules'] });
      showToast('Правило обновлено', 'success');
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChatbotRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-rules'] });
      showToast('Правило удалено', 'success');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      keywords: [],
      response_text: '',
      response_type: 'text',
      priority: 0,
      is_active: true,
    });
    setEditingRule(null);
  };

  const handleOpenDialog = (rule?: ChatbotRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.keywords || formData.keywords.length === 0) {
      showToast('Заполните название и ключевые слова', 'error');
      return;
    }

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleKeywordsChange = (value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    setFormData({ ...formData, keywords });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Настройки чат-бота</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Добавить правило
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
        <Typography variant="body2">
          <strong>📊 Статистика:</strong> Всего правил: {rules.length} | 
          Активных: {rules.filter(r => r.is_active).length} | 
          Неактивных: {rules.filter(r => !r.is_active).length}
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Ключевые слова</TableCell>
              <TableCell>Тип ответа</TableCell>
              <TableCell>Приоритет</TableCell>
              <TableCell>Активно</TableCell>
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>{rule.name}</TableCell>
                <TableCell>
                  {rule.keywords.map((kw, i) => (
                    <Chip key={i} label={kw} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                  ))}
                </TableCell>
                <TableCell>{rule.response_type}</TableCell>
                <TableCell>{rule.priority}</TableCell>
                <TableCell>
                  <Chip
                    label={rule.is_active ? 'Да' : 'Нет'}
                    color={rule.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenDialog(rule)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      if (window.confirm('Удалить правило?')) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'Редактировать правило' : 'Новое правило'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Название"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Ключевые слова (через запятую)"
              value={formData.keywords?.join(', ') || ''}
              onChange={(e) => handleKeywordsChange(e.target.value)}
              helperText="Введите ключевые слова через запятую"
            />
            <FormControl fullWidth>
              <InputLabel>Тип ответа</InputLabel>
              <Select
                value={formData.response_type}
                label="Тип ответа"
                onChange={(e) => setFormData({ ...formData, response_type: e.target.value as any })}
              >
                <MenuItem value="text">Текст</MenuItem>
                <MenuItem value="file">Файл</MenuItem>
                <MenuItem value="proposal">Коммерческое предложение</MenuItem>
                <MenuItem value="redirect">Редирект</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Текст ответа"
              multiline
              rows={4}
              value={formData.response_text || ''}
              onChange={(e) => setFormData({ ...formData, response_text: e.target.value })}
            />
            {formData.response_type === 'proposal' && (
              <FormControl fullWidth>
                <InputLabel>Шаблон КП</InputLabel>
                <Select
                  value={formData.proposal_template_id || ''}
                  label="Шаблон КП"
                  onChange={(e) => setFormData({ ...formData, proposal_template_id: e.target.value as number })}
                >
                  {proposals.filter(p => p.is_active).map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {formData.response_type === 'file' && (
              <>
                <TextField
                  fullWidth
                  label="URL файла"
                  value={formData.file_url || ''}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                />
                <TextField
                  fullWidth
                  label="Имя файла"
                  value={formData.file_name || ''}
                  onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                />
              </>
            )}
            {formData.response_type === 'redirect' && (
              <TextField
                fullWidth
                label="URL редиректа"
                value={formData.redirect_url || ''}
                onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
              />
            )}
            <TextField
              fullWidth
              type="number"
              label="Приоритет"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
              helperText="Чем выше приоритет, тем раньше правило проверяется (0-100)"
              inputProps={{ min: 0, max: 100 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              }
              label="Активно"
            />
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                💡 <strong>Совет:</strong> Используйте ключевые слова, которые клиенты могут использовать в вопросах. 
                Правила проверяются по приоритету (от большего к меньшему). 
                Если несколько правил подходят, сработает первое найденное.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSave} variant="contained">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

