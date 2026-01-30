import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem, Chip, Grid, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, ArrowUpward, ArrowDownward } from '@mui/icons-material';
import { useToast } from '@/components/common/ToastProvider';
import { getApiBase } from '@/utils/apiBase';

interface QuizOption {
  id?: number;
  optionText: string;
  optionDescription?: string;
  pointsStart: number;
  pointsBusiness: number;
  pointsPremium: number;
  sortOrder: number;
  isActive: boolean;
}

interface QuizQuestion {
  id?: number;
  questionText: string;
  questionType: string;
  sortOrder: number;
  isActive: boolean;
  options: QuizOption[];
}

async function fetchQuizQuestions(): Promise<QuizQuestion[]> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/questions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch questions');
  return response.json();
}

async function createQuestion(data: Partial<QuizQuestion>): Promise<QuizQuestion> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create question');
  return response.json();
}

async function updateQuestion(id: number, data: Partial<QuizQuestion>): Promise<QuizQuestion> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/questions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update question');
  return response.json();
}

async function deleteQuestion(id: number): Promise<void> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/questions/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete question');
}

async function createOption(questionId: number, data: Partial<QuizOption>): Promise<QuizOption> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/questions/${questionId}/options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to create option');
  return response.json();
}

async function updateOption(id: number, data: Partial<QuizOption>): Promise<QuizOption> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/options/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Failed to update option');
  return response.json();
}

async function deleteOption(id: number): Promise<void> {
  const base = getApiBase();
  const token = localStorage.getItem('token');
  const response = await fetch(`${base}/api/quiz/options/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete option');
}

export function QuizManagementPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [editingOption, setEditingOption] = useState<{ questionId: number; option: QuizOption | null } | null>(null);
  
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    questionType: 'single',
    sortOrder: 0,
    isActive: true
  });

  const [optionForm, setOptionForm] = useState({
    optionText: '',
    optionDescription: '',
    pointsStart: 0,
    pointsBusiness: 0,
    pointsPremium: 0,
    sortOrder: 0,
    isActive: true
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['quiz-questions-admin'],
    queryFn: fetchQuizQuestions,
  });

  const handleCreateQuestion = async () => {
    try {
      await createQuestion(questionForm);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      setQuestionDialogOpen(false);
      setQuestionForm({ questionText: '', questionType: 'single', sortOrder: 0, isActive: true });
      showToast('Вопрос создан', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания вопроса', 'error');
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion?.id) return;
    try {
      await updateQuestion(editingQuestion.id, questionForm);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      setQuestionDialogOpen(false);
      setEditingQuestion(null);
      setQuestionForm({ questionText: '', questionType: 'single', sortOrder: 0, isActive: true });
      showToast('Вопрос обновлен', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка обновления вопроса', 'error');
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm('Удалить вопрос и все его варианты ответов?')) return;
    try {
      await deleteQuestion(id);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      showToast('Вопрос удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления вопроса', 'error');
    }
  };

  const handleCreateOption = async () => {
    if (!editingOption?.questionId) return;
    try {
      await createOption(editingOption.questionId, optionForm);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      setOptionDialogOpen(false);
      setEditingOption(null);
      setOptionForm({
        optionText: '',
        optionDescription: '',
        pointsStart: 0,
        pointsBusiness: 0,
        pointsPremium: 0,
        sortOrder: 0,
        isActive: true
      });
      showToast('Вариант ответа создан', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания варианта', 'error');
    }
  };

  const handleUpdateOption = async () => {
    if (!editingOption?.option?.id) return;
    try {
      await updateOption(editingOption.option.id, optionForm);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      setOptionDialogOpen(false);
      setEditingOption(null);
      setOptionForm({
        optionText: '',
        optionDescription: '',
        pointsStart: 0,
        pointsBusiness: 0,
        pointsPremium: 0,
        sortOrder: 0,
        isActive: true
      });
      showToast('Вариант ответа обновлен', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка обновления варианта', 'error');
    }
  };

  const handleDeleteOption = async (id: number) => {
    if (!confirm('Удалить вариант ответа?')) return;
    try {
      await deleteOption(id);
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-admin'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      showToast('Вариант ответа удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления варианта', 'error');
    }
  };

  const openQuestionDialog = (question?: QuizQuestion) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        questionText: question.questionText,
        questionType: question.questionType,
        sortOrder: question.sortOrder,
        isActive: question.isActive
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        questionText: '',
        questionType: 'single',
        sortOrder: questions.length,
        isActive: true
      });
    }
    setQuestionDialogOpen(true);
  };

  const openOptionDialog = (questionId: number, option?: QuizOption) => {
    setEditingOption({ questionId, option: option || null });
    if (option) {
      setOptionForm({
        optionText: option.optionText,
        optionDescription: option.optionDescription || '',
        pointsStart: option.pointsStart,
        pointsBusiness: option.pointsBusiness,
        pointsPremium: option.pointsPremium,
        sortOrder: option.sortOrder,
        isActive: option.isActive
      });
    } else {
      const question = questions.find(q => q.id === questionId);
      setOptionForm({
        optionText: '',
        optionDescription: '',
        pointsStart: 0,
        pointsBusiness: 0,
        pointsPremium: 0,
        sortOrder: question?.options?.length || 0,
        isActive: true
      });
    }
    setOptionDialogOpen(true);
  };

  if (isLoading) {
    return <Box sx={{ p: 3 }}><Typography>Загрузка...</Typography></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Управление квизом</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => openQuestionDialog()}
        >
          Добавить вопрос
        </Button>
      </Box>

      {questions.map((question) => (
        <Card key={question.id} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <Box>
                <Typography variant="h6">{question.questionText}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`Порядок: ${question.sortOrder}`} size="small" />
                  <Chip
                    label={question.isActive ? 'Активен' : 'Неактивен'}
                    color={question.isActive ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip label={`Вариантов: ${question.options?.length || 0}`} size="small" />
                </Box>
              </Box>
              <Box>
                <IconButton onClick={() => openQuestionDialog(question)} size="small">
                  <Edit />
                </IconButton>
                <IconButton onClick={() => handleDeleteQuestion(question.id!)} size="small" color="error">
                  <Delete />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => openOptionDialog(question.id!, undefined)}
              >
                Добавить вариант ответа
              </Button>
            </Box>

            {question.options && question.options.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Текст</TableCell>
                      <TableCell>Описание</TableCell>
                      <TableCell align="center">START</TableCell>
                      <TableCell align="center">BUSINESS</TableCell>
                      <TableCell align="center">PREMIUM</TableCell>
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {question.options.map((option) => (
                      <TableRow key={option.id}>
                        <TableCell>{option.optionText}</TableCell>
                        <TableCell>{option.optionDescription || '-'}</TableCell>
                        <TableCell align="center">{option.pointsStart}</TableCell>
                        <TableCell align="center">{option.pointsBusiness}</TableCell>
                        <TableCell align="center">{option.pointsPremium}</TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => openOptionDialog(question.id!, option)}
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteOption(option.id!)}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Диалог создания/редактирования вопроса */}
      <Dialog open={questionDialogOpen} onClose={() => setQuestionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingQuestion ? 'Редактировать вопрос' : 'Создать вопрос'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Текст вопроса"
            value={questionForm.questionText}
            onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Тип вопроса</InputLabel>
            <Select
              value={questionForm.questionType}
              onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
            >
              <MenuItem value="single">Один ответ</MenuItem>
              <MenuItem value="multiple">Несколько ответов</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label="Порядок сортировки"
            value={questionForm.sortOrder}
            onChange={(e) => setQuestionForm({ ...questionForm, sortOrder: parseInt(e.target.value) || 0 })}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}
          >
            {editingQuestion ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания/редактирования варианта ответа */}
      <Dialog open={optionDialogOpen} onClose={() => setOptionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOption?.option ? 'Редактировать вариант ответа' : 'Создать вариант ответа'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Текст варианта"
            value={optionForm.optionText}
            onChange={(e) => setOptionForm({ ...optionForm, optionText: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Описание (необязательно)"
            value={optionForm.optionDescription}
            onChange={(e) => setOptionForm({ ...optionForm, optionDescription: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Очки START"
                value={optionForm.pointsStart}
                onChange={(e) => setOptionForm({ ...optionForm, pointsStart: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Очки BUSINESS"
                value={optionForm.pointsBusiness}
                onChange={(e) => setOptionForm({ ...optionForm, pointsBusiness: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Очки PREMIUM"
                value={optionForm.pointsPremium}
                onChange={(e) => setOptionForm({ ...optionForm, pointsPremium: parseInt(e.target.value) || 0 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOptionDialogOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={editingOption?.option ? handleUpdateOption : handleCreateOption}
          >
            {editingOption?.option ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
