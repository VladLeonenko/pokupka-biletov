import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCourse, updateCourse, updateCoursePages, getMaterials, type CoursePage } from '@/services/salesAcademyApi';
import { useToast } from '@/components/common/ToastProvider';

const PAGE_TYPES = [
  { value: 'cover', label: 'Обложка' },
  { value: 'content', label: 'Контент' },
  { value: 'objection', label: 'Возражение' },
] as const;

export function CourseEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [pageDialog, setPageDialog] = useState<{ open: boolean; page: Partial<CoursePage> | null; index: number }>({ open: false, page: null, index: -1 });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: () => getCourse(slug!),
    enabled: !!slug,
  });
  const { data: materials } = useQuery({ queryKey: ['training-materials'], queryFn: () => getMaterials('objection') });

  const updateCourseMut = useMutation({
    mutationFn: (data: Parameters<typeof updateCourse>[1]) => updateCourse(slug!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', slug] });
      showToast('Курс сохранён', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });
  const updatePagesMut = useMutation({
    mutationFn: (pages: any[]) => updateCoursePages(slug!, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', slug] });
      showToast('Страницы сохранены', 'success');
      setPageDialog({ open: false, page: null, index: -1 });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const [courseForm, setCourseForm] = useState({ title: '', cover_description: '', estimated_test_minutes: 10 });
  useEffect(() => {
    if (course) {
      setCourseForm({
        title: course.title || '',
        cover_description: course.cover_description || '',
        estimated_test_minutes: course.estimated_test_minutes ?? 10,
      });
    }
  }, [course?.id]);

  const handleSaveCourse = () => {
    updateCourseMut.mutate(courseForm);
  };

  const handleOpenPage = (page?: CoursePage, index?: number) => {
    setPageDialog({
      open: true,
      page: page ? { ...page } : { page_type: 'content', title: '', content: '', objection_text: '', solution_text: '', material_id: null },
      index: index ?? (course?.pages?.length ?? 0),
    });
  };

  const handleSavePage = (edited: Partial<CoursePage>) => {
    const pages = [...(course?.pages || [])];
    const idx = pageDialog.index;
    if (idx >= 0 && idx < pages.length) {
      pages[idx] = { ...pages[idx], ...edited };
    } else {
      pages.push({ ...edited, page_index: pages.length, id: 0 } as CoursePage);
    }
    updatePagesMut.mutate(pages.map((p) => ({
      page_type: p.page_type,
      title: p.title,
      content: p.content,
      content_blocks: p.content_blocks ?? undefined,
      objection_text: p.objection_text,
      solution_text: p.solution_text,
      material_id: p.material_id ?? null,
    })));
  };

  const handleDeletePage = (index: number) => {
    const pages = (course?.pages || []).filter((_, i) => i !== index);
    updatePagesMut.mutate(pages.map((p) => ({
      page_type: p.page_type,
      title: p.title,
      content: p.content,
      content_blocks: p.content_blocks ?? undefined,
      objection_text: p.objection_text,
      solution_text: p.solution_text,
      material_id: p.material_id ?? null,
    })));
  };

  if (!slug || isLoading || !course) {
    return <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/sales-academy')} sx={{ mb: 2 }}>
        Назад
      </Button>
      <Typography variant="h5" sx={{ mb: 2 }}>Редактор курса: {course.title}</Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Настройки курса</Typography>
        <TextField fullWidth label="Название" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} sx={{ mb: 2 }} />
        <TextField fullWidth label="Описание обложки" value={courseForm.cover_description} onChange={(e) => setCourseForm({ ...courseForm, cover_description: e.target.value })} multiline rows={4} sx={{ mb: 2 }} />
        <TextField type="number" label="Минут на тест" value={courseForm.estimated_test_minutes} onChange={(e) => setCourseForm({ ...courseForm, estimated_test_minutes: parseInt(e.target.value) || 10 })} sx={{ mb: 2 }} />
        <Button variant="contained" onClick={handleSaveCourse} disabled={updateCourseMut.isPending}>Сохранить курс</Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Страницы курса</Typography>
          <Button startIcon={<AddIcon />} onClick={() => handleOpenPage()}>Добавить страницу</Button>
        </Box>
        <Table size="small">
          <TableHead><TableRow><TableCell>#</TableCell><TableCell>Тип</TableCell><TableCell>Заголовок / Контент</TableCell><TableCell></TableCell></TableRow></TableHead>
          <TableBody>
            {(course.pages || []).map((p, i) => (
              <TableRow key={p.id || i} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{PAGE_TYPES.find((t) => t.value === p.page_type)?.label || p.page_type}</TableCell>
                <TableCell sx={{ maxWidth: 300 }}>{(p.title || p.content || p.objection_text || '—').slice(0, 60)}...</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenPage(p, i)}><EditIcon /></IconButton>
                  <IconButton size="small" onClick={() => handleDeletePage(i)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <PageEditDialog
        open={pageDialog.open}
        page={pageDialog.page}
        materials={materials || []}
        onClose={() => setPageDialog({ open: false, page: null, index: -1 })}
        onSave={(p) => handleSavePage(p)}
        isPending={updatePagesMut.isPending}
      />
    </Box>
  );
}

function PageEditDialog({
  open,
  page,
  materials,
  onClose,
  onSave,
  isPending,
}: {
  open: boolean;
  page: Partial<CoursePage> | null;
  materials: { id: number; title: string }[] | readonly { id: number; title: string }[];
  onClose: () => void;
  onSave: (p: Partial<CoursePage>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ page_type: 'content' as const, title: '', content: '', objection_text: '', solution_text: '', material_id: null as number | null });
  useEffect(() => {
    if (open) {
      setForm({
        page_type: (page?.page_type as any) || 'content',
        title: page?.title || '',
        content: page?.content || '',
        objection_text: page?.objection_text || '',
        solution_text: page?.solution_text || '',
        material_id: page?.material_id ?? null,
      });
    }
  }, [open, page?.id]);

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Редактировать страницу</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
          <InputLabel>Тип страницы</InputLabel>
          <Select value={form.page_type} label="Тип страницы" onChange={(e) => setForm({ ...form, page_type: e.target.value as any })}>
            {PAGE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
        {form.page_type === 'objection' && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Материал (возражение)</InputLabel>
            <Select value={form.material_id || ''} label="Материал" onChange={(e) => setForm({ ...form, material_id: e.target.value ? Number(e.target.value) : null })}>
              <MenuItem value="">— Свой текст —</MenuItem>
              {materials.map((m) => <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>)}
            </Select>
          </FormControl>
        )}
        <TextField fullWidth label="Заголовок" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} sx={{ mb: 2 }} />
        {form.page_type === 'objection' && (
          <>
            <TextField fullWidth label="Возражение" value={form.objection_text} onChange={(e) => setForm({ ...form, objection_text: e.target.value })} multiline rows={2} sx={{ mb: 2 }} />
            <TextField fullWidth label="Решение" value={form.solution_text} onChange={(e) => setForm({ ...form, solution_text: e.target.value })} multiline rows={4} sx={{ mb: 2 }} />
          </>
        )}
        {form.page_type !== 'objection' && (
          <TextField fullWidth label="Контент" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline rows={8} sx={{ mb: 2 }} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  );
}
