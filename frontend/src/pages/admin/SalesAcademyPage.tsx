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
  type TrainingMaterial,
  type MaterialCreate,
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

const MATERIAL_TYPES: { value: TrainingMaterial['type']; label: string }[] = [
  { value: 'call_script', label: 'Скрипт звонка' },
  { value: 'objection', label: 'Возражение' },
  { value: 'admin_guide', label: 'Гайд админки' },
  { value: 'sales_tip', label: 'Совет по продажам' },
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
          <Select
            value={form.type}
            label="Тип"
            onChange={(e) => setForm({ ...form, type: e.target.value as TrainingMaterial['type'] })}
          >
            {MATERIAL_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Заголовок"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          sx={{ mb: 2 }}
          required
        />
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

function QuizDialog({
  open,
  onClose,
  questionType,
  questions,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  questionType: string;
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
  const isLast = step === questions.length - 1;

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[step] = idx;
    setAnswers(newAnswers);
    if (isLast) {
      const correct = newAnswers.filter((a, i) => a === questions[i].correct_index).length;
      setScore(Math.round((correct / questions.length) * 100));
      setFinished(true);
      submitQuiz({
        question_type: questionType,
        score_percent: Math.round((correct / questions.length) * 100),
        total_questions: questions.length,
        correct_count: correct,
      }).then(onComplete).catch(() => {});
    } else {
      setStep(step + 1);
    }
  };

  if (!open || questions.length === 0) return null;
  if (finished) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth disableScrollLock>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmojiEventsIcon color="primary" />
            Тест пройден!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h4" color="primary" sx={{ textAlign: 'center', my: 2 }}>
            {score}%
          </Typography>
          <Typography sx={{ textAlign: 'center' }}>
            {score >= 80 ? 'Отлично! Вы молодец.' : score >= 60 ? 'Хороший результат. Повторите материалы для закрепления.' : 'Рекомендуем перечитать материалы и попробовать снова.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>Тест: {questionType === 'objection' ? 'Возражения' : 'Скрипты звонков'}</DialogTitle>
      <DialogContent>
        <LinearProgress variant="determinate" value={((step + 1) / questions.length) * 100} sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 2 }}>{q?.question_text}</Typography>
        <RadioGroup>
          {q?.options?.map((opt, idx) => (
            <FormControlLabel
              key={idx}
              value={idx}
              control={<Radio />}
              label={opt}
              onClick={() => handleAnswer(idx)}
            />
          ))}
        </RadioGroup>
      </DialogContent>
    </Dialog>
  );
}

function ManagerProgressHeader({ completedIds, totalMaterials, quizAttempts }: { completedIds: number[]; totalMaterials: number; quizAttempts: { question_type: string; score_percent: number }[] }) {
  const pct = totalMaterials > 0 ? Math.round((completedIds.length / totalMaterials) * 100) : 0;
  const bestQuiz = quizAttempts.length > 0 ? Math.max(...quizAttempts.map((a) => a.score_percent)) : 0;

  return (
    <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', color: 'white' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Мой прогресс</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`Материалы: ${completedIds.length}/${totalMaterials} (${pct}%)`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
          />
          {bestQuiz > 0 && (
            <Chip
              icon={<EmojiEventsIcon />}
              label={`Лучший тест: ${bestQuiz}%`}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
            />
          )}
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 8, borderRadius: 4 }} color="inherit" />
      </CardContent>
    </Card>
  );
}

function ScriptsTab({
  isAdmin,
  completedIds,
  onComplete,
  onEdit,
  onDelete,
  onAdd,
}: {
  isAdmin: boolean;
  completedIds: number[];
  onComplete: (id: number) => void;
  onEdit: (m: TrainingMaterial) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  const { data } = useQuery({ queryKey: ['training', 'call_script'], queryFn: () => getMaterials('call_script') });
  const { data: guides } = useQuery({ queryKey: ['training', 'admin_guide'], queryFn: () => getMaterials('admin_guide') });
  const items = [...(guides || []), ...(data || [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Box sx={{ pt: 2 }}>
      {isAdmin && (
        <Button startIcon={<AddIcon />} onClick={onAdd} sx={{ mb: 2 }}>Добавить</Button>
      )}
      {items.map((m) => (
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
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', mt: 1 }}>
              {m.content || ''}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function ObjectionsTab({
  isAdmin,
  completedIds,
  onComplete,
  onEdit,
  onDelete,
  onAdd,
  onStartQuiz,
  hasQuestions,
}: {
  isAdmin: boolean;
  completedIds: number[];
  onComplete: (id: number) => void;
  onEdit: (m: TrainingMaterial) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
  onStartQuiz: () => void;
  hasQuestions: boolean;
}) {
  const { data } = useQuery({ queryKey: ['training', 'objection'], queryFn: () => getMaterials('objection') });

  return (
    <Box sx={{ pt: 2 }}>
      {isAdmin && (
        <Button startIcon={<AddIcon />} onClick={onAdd} sx={{ mb: 2 }}>Добавить возражение</Button>
      )}
      {!isAdmin && hasQuestions && (
        <Button startIcon={<QuizIcon />} variant="outlined" onClick={onStartQuiz} sx={{ mb: 2 }}>Пройти тест по возражениям</Button>
      )}
      {data?.map((m) => (
        <Card key={m.id} variant="outlined" sx={{ mb: 2, borderLeft: completedIds.includes(m.id) ? '4px solid #4caf50' : undefined }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" color="primary">{m.title}</Typography>
              <Box>
                {!isAdmin && (
                  <IconButton size="small" color={completedIds.includes(m.id) ? 'success' : 'default'} onClick={() => !completedIds.includes(m.id) && onComplete(m.id)} title={completedIds.includes(m.id) ? 'Прочитано' : 'Отметить прочитанным'}>
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
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{m.objection_text}</Typography>
            <Typography variant="body1" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{m.solution_text}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function CasesTab() {
  const { data } = useQuery({ queryKey: ['sales-cases'], queryFn: getCases });

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Кейсы из базы — обновляются автоматически</Typography>
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
  const { data } = useQuery({ queryKey: ['product-matrix'], queryFn: getProductMatrix });

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Продуктовая матрица из каталога</Typography>
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

export function SalesAcademyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [editMaterial, setEditMaterial] = useState<TrainingMaterial | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultType, setAddDefaultType] = useState<TrainingMaterial['type']>('call_script');
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizType, setQuizType] = useState<'objection' | 'call_script'>('objection');

  const isAdmin = user?.role === 'admin';

  const { data: progress } = useQuery({ queryKey: ['training-progress'], queryFn: getProgress });
  const { data: objectionQuestions } = useQuery({ queryKey: ['training-questions', 'objection'], queryFn: () => getQuestions('objection') });
  const { data: allMaterials } = useQuery({
    queryKey: ['training', 'all'],
    queryFn: () => getMaterials(),
  });

  const completedIds = progress?.completedMaterialIds || [];
  const totalMaterials = allMaterials?.length || 0;
  const hasObjectionQuestions = (objectionQuestions?.length || 0) > 0;

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

  const handleEdit = (m: TrainingMaterial) => {
    setEditMaterial(m);
    setAddOpen(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Академия продаж</Typography>
      {!isAdmin && (
        <ManagerProgressHeader
          completedIds={completedIds}
          totalMaterials={totalMaterials}
          quizAttempts={progress?.quizAttempts || []}
        />
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isAdmin
          ? 'Редактируйте материалы обучения. Менеджеры видят их в виде геймифицированного курса.'
          : 'Изучайте материалы, отмечайте прочитанное и проходите тесты для закрепления.'}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab icon={<PhoneIcon />} iconPosition="start" label="Скрипты звонков" />
        <Tab icon={<PsychologyIcon />} iconPosition="start" label="Возражения" />
        <Tab icon={<WorkIcon />} iconPosition="start" label="Кейсы" />
        <Tab icon={<InventoryIcon />} iconPosition="start" label="Продуктовая матрица" />
      </Tabs>

      {tab === 0 && (
        <ScriptsTab
          isAdmin={!!isAdmin}
          completedIds={completedIds}
          onComplete={(id) => completeMut.mutate(id)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={() => handleAdd('call_script')}
        />
      )}
      {tab === 1 && (
        <ObjectionsTab
          isAdmin={!!isAdmin}
          completedIds={completedIds}
          onComplete={(id) => completeMut.mutate(id)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={() => handleAdd('objection')}
          onStartQuiz={() => { setQuizType('objection'); setQuizOpen(true); }}
          hasQuestions={hasObjectionQuestions}
        />
      )}
      {tab === 2 && <CasesTab />}
      {tab === 3 && <ProductMatrixTab />}

      <MaterialEditDialog
        open={addOpen || !!editMaterial}
        onClose={() => { setAddOpen(false); setEditMaterial(null); }}
        material={editMaterial}
        defaultType={addDefaultType}
        onSuccess={() => { setAddOpen(false); setEditMaterial(null); }}
      />

      <QuizDialog
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        questionType={quizType}
        questions={quizType === 'objection' ? (objectionQuestions || []) : []}
        onComplete={() => queryClient.invalidateQueries({ queryKey: ['training-progress'] })}
      />
    </Box>
  );
}
