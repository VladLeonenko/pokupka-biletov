import {
  Box,
  Card,
  CardContent,
  Tab,
  Tabs,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMaterials,
  getProductMatrix,
  getCases,
  getProgress,
  getQuestions,
  completeMaterial,
  submitQuiz,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type TrainingMaterial,
  type MaterialCreate,
  type TrainingQuestion,
} from '@/services/salesAcademyApi';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/common/ToastProvider';
import PhoneIcon from '@mui/icons-material/Phone';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WorkIcon from '@mui/icons-material/Work';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';

const MATERIAL_TYPES: { value: TrainingMaterial['type']; label: string }[] = [
  { value: 'call_script', label: 'Скрипт звонка' },
  { value: 'objection', label: 'Возражение' },
  { value: 'admin_guide', label: 'Гайд админки' },
  { value: 'sales_tip', label: 'Совет по продажам' },
];

const QUIZ_TYPES = [
  { value: 'objection', label: 'Возражения' },
  { value: 'call_script', label: 'Скрипты звонков' },
  { value: 'admin_guide', label: 'Гайд админки' },
];

function MaterialEditDialog({
  open,
  onClose,
  material,
  defaultType,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  material?: TrainingMaterial | null;
  defaultType?: TrainingMaterial['type'];
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<MaterialCreate>>({
    type: 'call_script',
    title: '',
    content: '',
    objection_text: '',
    solution_text: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (open) {
      if (material) {
        setForm({
          type: material.type,
          title: material.title,
          content: material.content ?? '',
          objection_text: material.objection_text ?? '',
          solution_text: material.solution_text ?? '',
          sort_order: material.sort_order,
        });
      } else {
        setForm({ type: defaultType || 'call_script', title: '', content: '', objection_text: '', solution_text: '', sort_order: 0 });
      }
    }
  }, [open, material?.id, defaultType]);

  const createMut = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      showToast('Материал создан', 'success');
      onClose();
      onSuccess();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaterialCreate> }) => updateMaterial(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      showToast('Сохранено', 'success');
      onClose();
      onSuccess();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleSubmit = () => {
    if (!form.title?.trim()) {
      showToast('Введите заголовок', 'warning');
      return;
    }
    if (material) {
      updateMut.mutate({ id: material.id, data: form });
    } else {
      createMut.mutate(form as MaterialCreate);
    }
  };

  if (!open) return null;
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>{material ? 'Редактировать материал' : 'Добавить материал'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={form.type} label="Тип" onChange={(e) => setForm({ ...form, type: e.target.value as TrainingMaterial['type'] })}>
            {MATERIAL_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} sx={{ mb: 2 }} required />
        {form.type === 'objection' ? (
          <>
            <TextField fullWidth label="Возражение клиента" value={form.objection_text} onChange={(e) => setForm({ ...form, objection_text: e.target.value })} multiline rows={2} sx={{ mb: 2 }} />
            <TextField fullWidth label="Решение / ответ" value={form.solution_text} onChange={(e) => setForm({ ...form, solution_text: e.target.value })} multiline rows={4} />
          </>
        ) : (
          <TextField fullWidth label="Содержание" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline rows={6} />
        )}
        <TextField fullWidth type="number" label="Порядок" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} sx={{ mt: 2 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isPending}>
          {isPending ? '...' : material ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function QuestionEditDialog({
  open,
  onClose,
  question,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  question?: TrainingQuestion | null | undefined;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: 'objection',
    question_text: '',
    options: ['', '', '', ''],
    correct_index: 0,
    sort_order: 0,
  });

  useEffect(() => {
    if (open) {
      if (question) {
        const opts = Array.isArray(question.options) ? question.options : [];
        setForm({
          type: question.type,
          question_text: question.question_text,
          options: [opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || ''].slice(0, 4),
          correct_index: question.correct_index,
          sort_order: question.sort_order,
        });
      } else {
        setForm({ type: 'objection', question_text: '', options: ['', '', '', ''], correct_index: 0, sort_order: 0 });
      }
    }
  }, [open, question?.id]);

  const createMut = useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-questions'] });
      showToast('Вопрос создан', 'success');
      onClose();
      onSuccess();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateQuestion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-questions'] });
      showToast('Сохранено', 'success');
      onClose();
      onSuccess();
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleSubmit = () => {
    const opts = form.options.filter((o) => o.trim());
    if (!form.question_text.trim()) {
      showToast('Введите вопрос', 'warning');
      return;
    }
    if (opts.length < 2) {
      showToast('Минимум 2 варианта ответа', 'warning');
      return;
    }
    if (form.correct_index >= opts.length) {
      showToast('Правильный ответ не выбран', 'warning');
      return;
    }
    const payload = { type: form.type, question_text: form.question_text, options: opts, correct_index: form.correct_index, sort_order: form.sort_order };
    if (question) {
      updateMut.mutate({ id: question.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>{question ? 'Редактировать вопрос' : 'Добавить вопрос теста'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Раздел теста</InputLabel>
          <Select value={form.type} label="Раздел теста" onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {QUIZ_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Вопрос" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} multiline rows={2} sx={{ mb: 2 }} required />
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Radio
              checked={form.correct_index === i}
              onChange={() => setForm({ ...form, correct_index: i })}
              disabled={!form.options[i]?.trim()}
            />
            <TextField
              fullWidth
              size="small"
              label={`Вариант ${i + 1}`}
              value={form.options[i] || ''}
              onChange={(e) => {
                const o = [...form.options];
                o[i] = e.target.value;
                setForm({ ...form, options: o });
              }}
            />
          </Box>
        ))}
        <TextField fullWidth type="number" label="Порядок" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} sx={{ mt: 2 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
          {question ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function QuizDialog({ open, onClose, questionType, questions, onComplete }: {
  open: boolean; onClose: () => void; questionType: string;
  questions: { id: number; question_text: string; options: string[]; correct_index: number }[];
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnswers([]);
      setFinished(false);
      setScore(0);
    }
  }, [open]);

  const q = questions[step];
  const opts = Array.isArray(q?.options) ? q.options : [];
  const isLast = step === questions.length - 1;

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[step] = idx;
    setAnswers(newAnswers);
    if (isLast) {
      const correct = newAnswers.filter((a, i) => a === questions[i]?.correct_index).length;
      const pct = Math.round((correct / questions.length) * 100);
      setScore(pct);
      setFinished(true);
      submitQuiz({
        question_type: questionType,
        score_percent: pct,
        total_questions: questions.length,
        correct_count: correct,
      })
        .then(onComplete)
        .catch(() => {});
    } else {
      setStep(step + 1);
    }
  };

  if (!open || questions.length === 0) return null;
  if (finished) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EmojiEventsIcon color="primary" />Тест пройден!</Box></DialogTitle>
        <DialogContent>
          <Typography variant="h4" color="primary" sx={{ textAlign: 'center', my: 2 }}>{score}%</Typography>
          <Typography sx={{ textAlign: 'center' }}>
            {score >= 80 ? 'Отлично! Прогресс обновлён.' : score >= 60 ? 'Хороший результат.' : 'Перечитайте материалы и попробуйте снова.'}
          </Typography>
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={onClose}>Закрыть</Button></DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>Тест: {QUIZ_TYPES.find((t) => t.value === questionType)?.label || questionType}</DialogTitle>
      <DialogContent>
        <LinearProgress variant="determinate" value={((step + 1) / questions.length) * 100} sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 2 }}>{q?.question_text}</Typography>
        <RadioGroup>
          {opts.map((opt, idx) => (
            <FormControlLabel key={idx} value={idx} control={<Radio />} label={opt} onClick={() => handleAnswer(idx)} />
          ))}
        </RadioGroup>
      </DialogContent>
    </Dialog>
  );
}

// Динамическая шкала: материалы + пройденные тесты (≥70%)
function ManagerProgressHeader({
  completedIds,
  totalMaterials,
  quizAttempts,
  quizTypesWithQuestions,
}: {
  completedIds: number[];
  totalMaterials: number;
  quizAttempts: { question_type: string; score_percent: number }[];
  quizTypesWithQuestions: string[];
}) {
  const materialsPct = totalMaterials > 0 ? (completedIds.length / totalMaterials) * 50 : 0;
  const passedQuizzes = quizTypesWithQuestions.filter((type) => {
    const best = Math.max(...quizAttempts.filter((a) => a.question_type === type).map((a) => a.score_percent), 0);
    return best >= 70;
  }).length;
  const quizPct = quizTypesWithQuestions.length > 0 ? (passedQuizzes / quizTypesWithQuestions.length) * 50 : 0;
  const totalPct = Math.round(materialsPct + quizPct);

  return (
    <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', color: 'white' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Мой прогресс</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip icon={<CheckCircleIcon />} label={`Материалы: ${completedIds.length}/${totalMaterials}`} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Chip icon={<EmojiEventsIcon />} label={`Тесты: ${passedQuizzes}/${quizTypesWithQuestions.length} пройдено (≥70%)`} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Chip label={`Итого: ${totalPct}%`} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
        </Box>
        <LinearProgress variant="determinate" value={totalPct} sx={{ mt: 1, height: 8, borderRadius: 4 }} color="inherit" />
      </CardContent>
    </Card>
  );
}

// Один раздел: материалы + кнопка теста в конце
function SectionTab({
  title,
  materialTypes,
  questionType,
  isAdmin,
  completedIds,
  onComplete,
  onEdit,
  onDelete,
  onAdd,
  onStartQuiz,
  questionsCount,
  onEditQuestion,
}: {
  title: string;
  materialTypes: TrainingMaterial['type'][];
  questionType: string;
  isAdmin: boolean;
  completedIds: number[];
  onComplete: (id: number) => void;
  onEdit: (m: TrainingMaterial) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  onStartQuiz: () => void;
  questionsCount: number;
  onEditQuestion?: () => void;
}) {
  const { data: allData, isLoading } = useQuery({
    queryKey: ['training', materialTypes],
    queryFn: async () => {
      const results = await Promise.all(materialTypes.map((t) => getMaterials(t)));
      return results.flat();
    },
  });
  const items = (allData || []).sort((a, b) => a.sort_order - b.sort_order);

  if (isLoading) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 2 }}>
      {isAdmin && (
        <Button startIcon={<AddIcon />} onClick={onAdd} sx={{ mb: 2 }}>
          Добавить материал
        </Button>
      )}
      {items.length === 0 ? (
        <Alert severity="info">Пока нет материалов. {isAdmin && 'Добавьте первый.'}</Alert>
      ) : (
        items.map((m) => (
          <Card key={m.id} variant="outlined" sx={{ mb: 2, borderLeft: completedIds.includes(m.id) ? '4px solid #4caf50' : undefined }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="h6">{m.title}</Typography>
                <Box>
                  {!isAdmin && (
                    <IconButton
                      size="small"
                      color={completedIds.includes(m.id) ? 'success' : 'default'}
                      onClick={() => !completedIds.includes(m.id) && onComplete(m.id)}
                      title={completedIds.includes(m.id) ? 'Прочитано' : 'Отметить прочитанным'}
                    >
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <>
                      <IconButton size="small" onClick={() => onEdit(m)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => onDelete(m.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </>
                  )}
                </Box>
              </Box>
              {m.type === 'objection' ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{m.objection_text}</Typography>
                  <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{m.solution_text}</Typography>
                </>
              ) : (
                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', mt: 1 }}>{m.content || ''}</Typography>
              )}
            </CardContent>
          </Card>
        ))
      )}
      {!isAdmin && questionsCount > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>После изучения материалов пройдите тест:</Typography>
          <Button variant="contained" startIcon={<QuizIcon />} onClick={onStartQuiz}>
            Пройти тест ({questionsCount} вопросов)
          </Button>
        </Box>
      )}
      {isAdmin && onEditQuestion && (
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button variant="outlined" startIcon={<QuizOutlinedIcon />} onClick={onEditQuestion}>
            Управление вопросами теста ({questionsCount})
          </Button>
        </Box>
      )}
    </Box>
  );
}

function CasesTab() {
  const { data, isLoading } = useQuery({ queryKey: ['sales-cases'], queryFn: getCases });
  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Кейсы из базы</Typography>
      <Table size="small">
        <TableHead><TableRow><TableCell>Кейс</TableCell><TableCell>Категория</TableCell><TableCell>Ссылка</TableCell></TableRow></TableHead>
        <TableBody>
          {data?.map((c) => (
            <TableRow key={c.slug}>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.category || '—'}</TableCell>
              <TableCell><Link href={`/cases/${c.slug}`} target="_blank" rel="noopener">Открыть</Link></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ProductMatrixTab() {
  const { data, isLoading } = useQuery({ queryKey: ['product-matrix'], queryFn: getProductMatrix });
  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Продуктовая матрица</Typography>
      <Table size="small">
        <TableHead><TableRow><TableCell>Продукт</TableCell><TableCell>Цена</TableCell><TableCell>Описание</TableCell><TableCell>Ссылка</TableCell></TableRow></TableHead>
        <TableBody>
          {data?.products?.map((p) => (
            <TableRow key={p.slug}>
              <TableCell>{p.title}</TableCell>
              <TableCell>{p.price}{p.period}</TableCell>
              <TableCell sx={{ maxWidth: 300 }}>{p.summary || '—'}</TableCell>
              <TableCell><Link href={`/products/${p.slug}`} target="_blank" rel="noopener">Каталог</Link></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function QuestionsAdminTab({ onEditQuestion }: { onEditQuestion: (q: TrainingQuestion | null) => void }) {
  const { data: objectionQ } = useQuery({ queryKey: ['training-questions', 'objection'], queryFn: () => getQuestions('objection') });
  const { data: scriptQ } = useQuery({ queryKey: ['training-questions', 'call_script'], queryFn: () => getQuestions('call_script') });
  const { data: guideQ } = useQuery({ queryKey: ['training-questions', 'admin_guide'], queryFn: () => getQuestions('admin_guide') });
  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-questions'] }),
  });

  const sections = [
    { type: 'objection', label: 'Возражения', items: objectionQ || [] },
    { type: 'call_script', label: 'Скрипты', items: scriptQ || [] },
    { type: 'admin_guide', label: 'Гайд админки', items: guideQ || [] },
  ];

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Создавайте и редактируйте вопросы для тестов. Менеджеры видят тест после изучения материалов раздела.</Typography>
      <Button startIcon={<AddIcon />} onClick={() => onEditQuestion(null)} sx={{ mb: 2 }}>Добавить вопрос</Button>
      {sections.map((s) => (
        <Box key={s.type} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{s.label} ({s.items.length})</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Вопрос</TableCell><TableCell>Правильный</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
            <TableBody>
              {s.items.map((q) => {
                const opts = Array.isArray(q.options) ? q.options : [];
                const correct = opts[q.correct_index];
                return (
                  <TableRow key={q.id}>
                    <TableCell sx={{ maxWidth: 400 }}><Typography noWrap>{q.question_text}</Typography></TableCell>
                    <TableCell>{correct || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onEditQuestion(q)}><EditIcon /></IconButton>
                      <IconButton size="small" color="error" onClick={() => window.confirm('Удалить?') && deleteMut.mutate(q.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      ))}
    </Box>
  );
}

export function SalesAcademyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [editMaterial, setEditMaterial] = useState<TrainingMaterial | null>(null);
  const [editQuestion, setEditQuestion] = useState<TrainingQuestion | true | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState<TrainingMaterial['type']>('call_script');
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizType, setQuizType] = useState<string>('objection');

  const isAdmin = user?.role === 'admin';

  const { data: progress } = useQuery({ queryKey: ['training-progress'], queryFn: getProgress });
  const { data: objectionQuestions } = useQuery({ queryKey: ['training-questions', 'objection'], queryFn: () => getQuestions('objection') });
  const { data: scriptQuestions } = useQuery({ queryKey: ['training-questions', 'call_script'], queryFn: () => getQuestions('call_script') });
  const { data: allMaterials } = useQuery({ queryKey: ['training', 'all'], queryFn: () => getMaterials() });

  const completedIds = progress?.completedMaterialIds || [];
  const totalMaterials = allMaterials?.length ?? 0;
  const quizTypesWithQuestions = ['objection', 'call_script'].filter(
    (t) => ((t === 'objection' ? objectionQuestions : scriptQuestions)?.length || 0) > 0
  );

  const completeMut = useMutation({
    mutationFn: completeMaterial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-progress'] }),
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training'] });
      showToast('Удалено', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Удалить материал?')) deleteMut.mutate(id);
  };

  const handleAdd = (type?: TrainingMaterial['type']) => {
    setEditMaterial(null);
    setAddDefaultType(type || 'call_script');
    setAddOpen(true);
  };

  const getQuestionsForType = (type: string) => {
    if (type === 'objection') return objectionQuestions || [];
    if (type === 'call_script') return scriptQuestions || [];
    return [];
  };

  const tabs = [
    { label: 'Скрипты звонков', icon: <PhoneIcon />, section: 'scripts' },
    { label: 'Возражения', icon: <PsychologyIcon />, section: 'objections' },
    { label: 'Кейсы', icon: <WorkIcon />, section: 'cases' },
    { label: 'Продуктовая матрица', icon: <InventoryIcon />, section: 'products' },
    ...(isAdmin ? [{ label: 'Вопросы тестов', icon: <QuizOutlinedIcon />, section: 'questions' }] : []),
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Академия продаж</Typography>
      {!isAdmin && (
        <ManagerProgressHeader
          completedIds={completedIds}
          totalMaterials={totalMaterials}
          quizAttempts={progress?.quizAttempts || []}
          quizTypesWithQuestions={quizTypesWithQuestions}
        />
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isAdmin ? 'Редактируйте материалы и вопросы тестов.' : 'Изучайте материалы, отмечайте прочитанное, проходите тесты.'}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        {tabs.map((t, i) => (
          <Tab key={t.section} icon={t.icon} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

      {tab === 0 && (
        <SectionTab
          title="Скрипты звонков"
          materialTypes={['call_script', 'admin_guide']}
          questionType="call_script"
          isAdmin={!!isAdmin}
          completedIds={completedIds}
          onComplete={(id) => completeMut.mutate(id)}
          onEdit={(m) => setEditMaterial(m)}
          onDelete={handleDelete}
          onAdd={() => handleAdd('call_script')}
          onStartQuiz={() => { setQuizType('call_script'); setQuizOpen(true); }}
          questionsCount={scriptQuestions?.length || 0}
          onEditQuestion={isAdmin ? () => setTab(4) : undefined}
        />
      )}
      {tab === 1 && (
        <SectionTab
          title="Возражения"
          materialTypes={['objection']}
          questionType="objection"
          isAdmin={!!isAdmin}
          completedIds={completedIds}
          onComplete={(id) => completeMut.mutate(id)}
          onEdit={(m) => setEditMaterial(m)}
          onDelete={handleDelete}
          onAdd={() => handleAdd('objection')}
          onStartQuiz={() => { setQuizType('objection'); setQuizOpen(true); }}
          questionsCount={objectionQuestions?.length || 0}
          onEditQuestion={isAdmin ? () => setTab(4) : undefined}
        />
      )}
      {tab === 2 && <CasesTab />}
      {tab === 3 && <ProductMatrixTab />}
      {isAdmin && tab === 4 && <QuestionsAdminTab onEditQuestion={(q) => setEditQuestion(q ?? true)} />}

      <MaterialEditDialog
        open={addOpen || !!editMaterial}
        onClose={() => { setAddOpen(false); setEditMaterial(null); }}
        material={editMaterial}
        defaultType={addDefaultType}
        onSuccess={() => { setAddOpen(false); setEditMaterial(null); }}
      />

      {editQuestion && (
        <QuestionEditDialog
          open={!!editQuestion}
          onClose={() => setEditQuestion(null)}
          question={editQuestion === true ? undefined : editQuestion}
          onSuccess={() => setEditQuestion(null)}
        />
      )}

      <QuizDialog
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        questionType={quizType}
        questions={getQuestionsForType(quizType)}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['training-progress'] })}
      />
    </Box>
  );
}
