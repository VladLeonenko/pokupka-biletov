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
  InputAdornment,
  Collapse,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import {
  getCourses,
  getCourse,
  getCourseProgress,
  getProductMatrix,
  getCases,
  getQuestions,
  getQuizResults,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  type TrainingQuestion,
  type QuizResult,
  type TrainingMaterial,
} from '@/services/salesAcademyApi';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/common/ToastProvider';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PsychologyIcon from '@mui/icons-material/Psychology';
import WorkIcon from '@mui/icons-material/Work';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const MATERIAL_TYPES = [
  { value: 'objection', label: 'Возражение' },
  { value: 'call_script', label: 'Скрипт звонка' },
  { value: 'admin_guide', label: 'Гайд админки' },
  { value: 'sales_tip', label: 'Совет по продажам' },
] as const;

const QUIZ_TYPES = [
  { value: 'objection', label: 'Возражения (старый)' },
  { value: 'call_script', label: 'Скрипты звонков' },
  { value: 'admin_guide', label: 'Гайд админки' },
  { value: 'course_objections', label: 'Курс: Возражения', courseSlug: 'objections' },
  { value: 'course_lpr', label: 'Курс: Как выйти на ЛПР', courseSlug: 'lpr' },
];

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
    course_slug: '' as string | null,
    question_text: '',
    options: ['', '', '', ''],
    correct_index: 0,
    isOpenEnded: false,
    sort_order: 0,
  });

  useEffect(() => {
    if (open) {
      if (question) {
        const opts = Array.isArray(question.options) ? question.options : [];
        const isOpen = !opts.length || question.correct_index < 0;
        setForm({
          type: (question as any).course_slug ? 'general' : question.type,
          course_slug: (question as any).course_slug || null,
          question_text: question.question_text,
          options: opts.length ? [opts[0] || '', opts[1] || '', opts[2] || '', opts[3] || ''].slice(0, 4) : ['', '', '', ''],
          correct_index: question.correct_index >= 0 ? question.correct_index : 0,
          isOpenEnded: isOpen,
          sort_order: question.sort_order,
        });
      } else {
        setForm({ type: 'objection', course_slug: null, question_text: '', options: ['', '', '', ''], correct_index: 0, isOpenEnded: false, sort_order: 0 });
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
    if (!form.question_text.trim()) {
      showToast('Введите вопрос', 'warning');
      return;
    }
    const opts = form.isOpenEnded ? [] : form.options.filter((o) => o.trim());
    if (!form.isOpenEnded && opts.length < 2) {
      showToast('Минимум 2 варианта ответа', 'warning');
      return;
    }
    if (!form.isOpenEnded && form.correct_index >= opts.length) {
      showToast('Правильный ответ не выбран', 'warning');
      return;
    }
    const payload: any = {
      type: form.course_slug ? 'general' : form.type,
      course_slug: form.course_slug || undefined,
      question_text: form.question_text,
      options: opts,
      correct_index: form.isOpenEnded ? -1 : form.correct_index,
      sort_order: form.sort_order,
    };
    if (question) {
      updateMut.mutate({ id: question.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const handleSectionChange = (v: string) => {
    const t = QUIZ_TYPES.find((x) => x.value === v) as { value: string; label: string; courseSlug?: string };
    setForm({
      ...form,
      type: t?.courseSlug ? 'general' : v,
      course_slug: t?.courseSlug || null,
    });
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableScrollLock>
      <DialogTitle>{question ? 'Редактировать вопрос' : 'Добавить вопрос теста'}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Раздел теста</InputLabel>
          <Select value={form.type} label="Раздел теста" onChange={(e) => handleSectionChange(e.target.value)}>
            {QUIZ_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField fullWidth label="Вопрос" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} multiline rows={2} sx={{ mb: 2 }} required />
        <FormControlLabel
          control={<Radio checked={!form.isOpenEnded} onChange={() => setForm({ ...form, isOpenEnded: false })} />}
          label="Варианты ответа"
        />
        <FormControlLabel
          control={<Radio checked={form.isOpenEnded} onChange={() => setForm({ ...form, isOpenEnded: true })} />}
          label="Открытый вопрос"
        />
        {!form.isOpenEnded && [0, 1, 2, 3].map((i) => (
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

function ManagerProgressHeader({ courseProgress }: { courseProgress: { slug: string; completed: number; total: number; testPassed: boolean }[] }) {
  const done = courseProgress.filter((c) => c.testPassed).length;
  const total = courseProgress.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', color: 'white' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>Мой прогресс</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip icon={<EmojiEventsIcon />} label={`Материалы: ${done}/${total} пройдено`} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Chip label={`${pct}%`} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 8, borderRadius: 4 }} color="inherit" />
      </CardContent>
    </Card>
  );
}

// Вкладка Материалы: плитка курсов (пошаговое изучение + тест в конце)
function MaterialsTab({ courseProgress, isAdmin }: { courseProgress: Record<string, { completed: number; total: number; testPassed: boolean }>; isAdmin?: boolean }) {
  const { data: courses, isLoading } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (!courses?.length) return <Alert severity="info">Пока нет учебных материалов.</Alert>;

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Изучайте материалы пошагово. В конце каждого — тест для проверки знаний.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {courses.map((c) => {
          const prog = courseProgress[c.slug];
          const pct = prog?.total ? Math.round((prog.completed / prog.total) * 100) : 0;
          return (
            <Card
              key={c.slug}
              sx={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                position: 'relative',
              }}
            >
              <CardContent>
                <Box component={RouterLink} to={`/admin/sales-academy/courses/${c.slug}`} sx={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <MenuBookIcon color="action" sx={{ mt: 0.25 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{c.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {c.total_pages ?? 0} страниц · тест ~{c.estimated_test_minutes} мин
                    </Typography>
                  </Box>
                  {prog?.testPassed && <EmojiEventsIcon color="success" fontSize="small" />}
                </Box>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, mt: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  {prog?.completed ?? 0}/{prog?.total ?? c.total_pages ?? 0}
                </Typography>
                </Box>
                {isAdmin && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button size="small" component={RouterLink} to={`/admin/sales-academy/courses/${c.slug}`}>Изучить</Button>
                    <Button size="small" component={RouterLink} to={`/admin/sales-academy/courses/${c.slug}/edit`} variant="outlined">Редактировать</Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}

// Шпаргалка по возражениям: компактная таблица для быстрого поиска
function ObjectionsCheatsheetTab() {
  const [search, setSearch] = useState('');
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', 'objections'],
    queryFn: () => getCourse('objections'),
  });
  const objections = (course?.pages ?? []).filter((p) => p.page_type === 'objection');
  const filtered = search.trim()
    ? objections.filter(
        (o) =>
          (o.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (o.objection_text ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (o.solution_text ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : objections;

  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Быстрый справочник: возражение клиента → как отвечать
      </Typography>
      <TextField
        size="small"
        placeholder="Поиск по возражению или решению..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2, maxWidth: 400 }}
      />
      {filtered.length === 0 ? (
        <Alert severity="info">{search ? 'Ничего не найдено' : 'Нет данных'}</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 600 }}>Возражение</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Решение</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((o, i) => (
              <ObjectionRow key={i} objection={o.objection_text ?? o.title} solution={o.solution_text ?? ''} />
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

function ObjectionRow({ objection, solution }: { objection: string; solution: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = solution.length > 100;
  const short = solution.slice(0, 100) + (solution.length > 100 ? '…' : '');
  return (
    <TableRow>
      <TableCell sx={{ verticalAlign: 'top', minWidth: 180 }}>{objection}</TableCell>
      <TableCell>
        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
          {isLong && !expanded ? short : solution}
        </Typography>
        {isLong && (
          <Button size="small" startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Свернуть' : 'Развернуть'}
          </Button>
        )}
      </TableCell>
    </TableRow>
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
              <TableCell>
                <Link href={`/cases/${c.slug}`} target="_blank" rel="noopener">Открыть</Link>
              </TableCell>
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

function MaterialEditDialog({
  open,
  onClose,
  material,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  material?: TrainingMaterial | null;
  onSuccess: () => void;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: 'objection' as const, title: '', content: '', objection_text: '', solution_text: '', sort_order: 0 });
  useEffect(() => {
    if (open) {
      if (material) {
        setForm({
          type: material.type as any,
          title: material.title || '',
          content: material.content || '',
          objection_text: material.objection_text || '',
          solution_text: material.solution_text || '',
          sort_order: material.sort_order ?? 0,
        });
      } else {
        setForm({ type: 'objection', title: '', content: '', objection_text: '', solution_text: '', sort_order: 0 });
      }
    }
  }, [open, material?.id]);
  const createMut = useMutation({
    mutationFn: createMaterial,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-materials'] }); showToast('Создано', 'success'); onClose(); onSuccess(); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateMaterial(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-materials'] }); showToast('Сохранено', 'success'); onClose(); onSuccess(); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const handleSubmit = () => {
    if (!form.title.trim()) { showToast('Введите заголовок', 'warning'); return; }
    if (material) {
      updateMut.mutate({ id: material.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{material ? 'Редактировать материал' : 'Новый материал'}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={form.type} label="Тип" onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
            {MATERIAL_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField fullWidth label="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} sx={{ mb: 2 }} />
        {(form.type === 'objection' || form.type === 'admin_guide') && (
          <>
            <TextField fullWidth label="Возражение / Тема" value={form.objection_text} onChange={(e) => setForm({ ...form, objection_text: e.target.value })} multiline rows={2} sx={{ mb: 2 }} />
            <TextField fullWidth label="Решение / Контент" value={form.solution_text} onChange={(e) => setForm({ ...form, solution_text: e.target.value })} multiline rows={4} sx={{ mb: 2 }} />
          </>
        )}
        {form.type !== 'objection' && (
          <TextField fullWidth label="Контент" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline rows={6} sx={{ mb: 2 }} />
        )}
        <TextField type="number" label="Порядок" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} sx={{ mb: 2 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  );
}

function MaterialsAdminTab() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [editMaterial, setEditMaterial] = useState<TrainingMaterial | null | true>(null);
  const { data: materials, isLoading } = useQuery({
    queryKey: ['training-materials', typeFilter],
    queryFn: () => getMaterials(typeFilter || undefined),
  });
  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-materials'] }),
  });
  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  return (
    <Box sx={{ pt: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={typeFilter} label="Тип" onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="">Все</MenuItem>
            {MATERIAL_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditMaterial(true)}>Добавить материал</Button>
      </Box>
      <Table size="small">
        <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}><TableCell>Тип</TableCell><TableCell>Заголовок</TableCell><TableCell>Контент</TableCell><TableCell></TableCell></TableRow></TableHead>
        <TableBody>
          {(materials || []).map((m) => (
            <TableRow key={m.id} hover>
              <TableCell>{MATERIAL_TYPES.find((t) => t.value === m.type)?.label || m.type}</TableCell>
              <TableCell>{m.title}</TableCell>
              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{(m.content || m.objection_text || '').slice(0, 80)}...</TableCell>
              <TableCell>
                <IconButton size="small" onClick={() => setEditMaterial(m)}><EditIcon /></IconButton>
                <IconButton size="small" onClick={() => deleteMut.mutate(m.id)} color="error"><DeleteIcon /></IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {(!materials || materials.length === 0) && <Alert severity="info">Нет материалов</Alert>}
      {editMaterial && (
        <MaterialEditDialog open={!!editMaterial} onClose={() => setEditMaterial(null)} material={editMaterial === true ? undefined : editMaterial} onSuccess={() => setEditMaterial(null)} />
      )}
    </Box>
  );
}

function QuizResultsTab() {
  const [courseFilter, setCourseFilter] = useState<string>('');
  const { data: results, isLoading } = useQuery({
    queryKey: ['quiz-results', courseFilter],
    queryFn: () => getQuizResults(courseFilter || undefined),
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pt: 2 }}>
      <FormControl size="small" sx={{ minWidth: 200, mb: 2 }}>
        <InputLabel>Курс</InputLabel>
        <Select value={courseFilter} label="Курс" onChange={(e) => setCourseFilter(e.target.value)}>
          <MenuItem value="">Все</MenuItem>
          <MenuItem value="objections">Возражения</MenuItem>
          <MenuItem value="lpr">Как выйти на ЛПР</MenuItem>
        </Select>
      </FormControl>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Менеджер</TableCell>
            <TableCell>Курс</TableCell>
            <TableCell align="center">Балл</TableCell>
            <TableCell>Дата</TableCell>
            <TableCell padding="none" />
          </TableRow>
        </TableHead>
        <TableBody>
          {(results || []).map((r) => (
            <React.Fragment key={r.id}>
              <TableRow hover onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} sx={{ cursor: 'pointer' }}>
                <TableCell>{r.user_name || r.user_email}</TableCell>
                <TableCell>{r.question_type?.replace('course_', '') || r.question_type}</TableCell>
                <TableCell align="center">
                  <Chip label={`${r.score_percent}%`} size="small" color={r.score_percent >= 80 ? 'success' : r.score_percent >= 60 ? 'default' : 'error'} />
                </TableCell>
                <TableCell>{r.completed_at ? new Date(r.completed_at).toLocaleString('ru-RU') : '—'}</TableCell>
                <TableCell>{expandedId === r.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 0, borderBottom: 'none' }}>
                  <Collapse in={expandedId === r.id}>
                    <Box sx={{ py: 2, pl: 2, bgcolor: 'action.hover' }}>
                      {r.answers?.length ? (
                        r.answers.map((a, i) => (
                          <Box key={i} sx={{ mb: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">{a.question_text}</Typography>
                            {a.answer_text != null ? (
                              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{a.answer_text || '—'}</Typography>
                            ) : a.answer_index != null && a.options ? (
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {a.options[a.answer_index] || `[${a.answer_index}]`}
                                {a.correct_index !== undefined && a.answer_index === a.correct_index ? ' ✓' : a.correct_index !== undefined ? ' ✗' : ''}
                              </Typography>
                            ) : null}
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2" color="text.secondary">Ответы не сохранены</Typography>
                      )}
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      {(!results || results.length === 0) && <Alert severity="info">Нет результатов</Alert>}
    </Box>
  );
}

function QuestionsAdminTab({ onEditQuestion }: { onEditQuestion: (q: TrainingQuestion | null) => void }) {
  const { data: objectionQ } = useQuery({ queryKey: ['training-questions', 'objection'], queryFn: () => getQuestions('objection') });
  const { data: scriptQ } = useQuery({ queryKey: ['training-questions', 'call_script'], queryFn: () => getQuestions('call_script') });
  const { data: guideQ } = useQuery({ queryKey: ['training-questions', 'admin_guide'], queryFn: () => getQuestions('admin_guide') });
  const { data: objectionsCourseQ } = useQuery({ queryKey: ['training-questions', 'course_objections'], queryFn: () => getQuestions(undefined, 'objections') });
  const { data: lprCourseQ } = useQuery({ queryKey: ['training-questions', 'course_lpr'], queryFn: () => getQuestions(undefined, 'lpr') });
  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['training-questions'] }),
  });

  const sections = [
    { type: 'objection', label: 'Возражения (старый)', items: objectionQ || [] },
    { type: 'call_script', label: 'Скрипты', items: scriptQ || [] },
    { type: 'admin_guide', label: 'Гайд админки', items: guideQ || [] },
    { courseSlug: 'objections', label: 'Курс: Возражения', items: objectionsCourseQ || [] },
    { courseSlug: 'lpr', label: 'Курс: Как выйти на ЛПР', items: lprCourseQ || [] },
  ];

  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Создавайте и редактируйте вопросы для тестов. Менеджеры видят тест после изучения материалов раздела.</Typography>
      <Button startIcon={<AddIcon />} onClick={() => onEditQuestion(null)} sx={{ mb: 2 }}>Добавить вопрос</Button>
      {sections.map((s) => (
        <Box key={s.type || s.courseSlug} sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{s.label} ({s.items.length})</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Вопрос</TableCell><TableCell>Правильный</TableCell><TableCell align="right">Действия</TableCell></TableRow></TableHead>
            <TableBody>
              {s.items.map((q) => {
                const opts = Array.isArray(q.options) ? q.options : [];
                const correct = q.correct_index >= 0 && opts[q.correct_index] ? opts[q.correct_index] : 'Открытый';
                return (
                  <TableRow key={q.id}>
                    <TableCell sx={{ maxWidth: 400 }}><Typography noWrap>{q.question_text}</Typography></TableCell>
                    <TableCell>{correct}</TableCell>
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
  const [editQuestion, setEditQuestion] = useState<TrainingQuestion | true | null>(null);

  const isAdmin = user?.role === 'admin';

  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const { data: progObjections } = useQuery({ queryKey: ['course-progress', 'objections'], queryFn: () => getCourseProgress('objections') });
  const { data: progLpr } = useQuery({ queryKey: ['course-progress', 'lpr'], queryFn: () => getCourseProgress('lpr') });

  const courseProgress: Record<string, { completed: number; total: number; testPassed: boolean }> = {};
  (courses || []).forEach((c) => {
    const prog = c.slug === 'objections' ? progObjections : c.slug === 'lpr' ? progLpr : null;
    if (prog) {
      courseProgress[c.slug] = {
        completed: prog.completedPageCount,
        total: c.total_pages ?? 1,
        testPassed: prog.testPassed,
      };
    }
  });

  const tabs = [
    { label: 'Материалы', icon: <MenuBookIcon /> },
    { label: 'Шпаргалка по возражениям', icon: <PsychologyIcon /> },
    { label: 'Продуктовая матрица', icon: <InventoryIcon /> },
    { label: 'Кейсы', icon: <WorkIcon /> },
    ...(isAdmin ? [{ label: 'Редактор материалов', icon: <EditIcon /> }, { label: 'Вопросы тестов', icon: <QuizOutlinedIcon /> }, { label: 'Результаты тестов', icon: <EmojiEventsIcon /> }] : []),
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Обучение</Typography>
      {!isAdmin && courseProgress && Object.keys(courseProgress).length > 0 && (
        <ManagerProgressHeader courseProgress={Object.entries(courseProgress).map(([slug, p]) => ({ slug, ...p }))} />
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        {tabs.map((t, i) => (
          <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

      {tab === 0 && <MaterialsTab courseProgress={courseProgress} isAdmin={isAdmin} />}
      {tab === 1 && <ObjectionsCheatsheetTab />}
      {tab === 2 && <ProductMatrixTab />}
      {tab === 3 && <CasesTab />}
      {isAdmin && tab === 4 && <MaterialsAdminTab />}
      {isAdmin && tab === 5 && <QuestionsAdminTab onEditQuestion={(q) => setEditQuestion(q ?? true)} />}
      {isAdmin && tab === 6 && <QuizResultsTab />}

      {editQuestion && (
        <QuestionEditDialog
          open={!!editQuestion}
          onClose={() => setEditQuestion(null)}
          question={editQuestion === true ? undefined : editQuestion}
          onSuccess={() => setEditQuestion(null)}
        />
      )}
    </Box>
  );
}
