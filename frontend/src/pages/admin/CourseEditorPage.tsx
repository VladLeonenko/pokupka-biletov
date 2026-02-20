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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SubjectIcon from '@mui/icons-material/Subject';
import { getCourse, updateCourse, updateCoursePages, getMaterials, type CoursePage } from '@/services/salesAcademyApi';
import type { ContentBlock } from '@/services/salesAcademyApi';
import { uploadImage } from '@/services/cmsApi';
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

  const [courseForm, setCourseForm] = useState({ title: '', cover_description: '', cover_image_url: '', estimated_test_minutes: 10 });
  useEffect(() => {
    if (course) {
      setCourseForm({
        title: course.title || '',
        cover_description: course.cover_description || '',
        cover_image_url: course.cover_image_url || '',
        estimated_test_minutes: course.estimated_test_minutes ?? 10,
      });
    }
  }, [course?.id]);

  const handleSaveCourse = () => {
    updateCourseMut.mutate({ ...courseForm, cover_image_url: courseForm.cover_image_url || undefined });
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
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Обложка курса</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {courseForm.cover_image_url && (
              <Box component="img" src={courseForm.cover_image_url} alt="Обложка" sx={{ maxHeight: 120, borderRadius: 1, border: 1, borderColor: 'divider' }} />
            )}
            <Box>
              <input accept="image/*" type="file" id="cover-upload" style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) try { const r = await uploadImage(f); setCourseForm((prev) => ({ ...prev, cover_image_url: r.url })); showToast('Изображение загружено', 'success'); } catch (err) { showToast((err as Error).message, 'error'); }
              }} />
              <label htmlFor="cover-upload">
                <Button variant="outlined" component="span" size="small">Загрузить</Button>
              </label>
              <TextField size="small" placeholder="или URL" value={courseForm.cover_image_url} onChange={(e) => setCourseForm({ ...courseForm, cover_image_url: e.target.value })} sx={{ ml: 1, minWidth: 200 }} />
            </Box>
          </Box>
        </Box>
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

function parsePasteToBlocks(text: string): ContentBlock[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

  // Markdown table: | col1 | col2 |
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (tableLines.length >= 2) {
    const toCells = (s: string) => s.split('|').slice(1, -1).map((c) => c.trim());
    const headers = toCells(tableLines[0]);
    const isSeparator = (cells: string[]) => cells.every((c) => /^[\s\-:]+$/.test(c));
    let dataStart = 1;
    if (tableLines[1]) {
      const secondCells = toCells(tableLines[1]);
      if (isSeparator(secondCells)) dataStart = 2;
    }
    const rows = tableLines.slice(dataStart).map((l) => toCells(l));
    if (headers.some(Boolean) || rows.some((r) => r.some(Boolean))) {
      return [{ type: 'table', headers, rows }];
    }
  }

  // Checkboxes: ✅ [ ] текст или - [ ] текст или * [ ] текст
  const checkboxPattern = /^[✅✔✓\-*]?\s*\[[\sxX✓✔]\]\s*(.+)$|^[✅✔✓]\s+(.+)$/;
  const cbLines = lines.filter((l) => checkboxPattern.test(l) || /\[[\sxX✓✔]\]/.test(l));
  if (cbLines.length > 0) {
    const items = cbLines
      .map((l) => l.replace(/^[✅✔✓\-*]?\s*\[[\sxX✓✔]\]\s*/, '').replace(/^[✅✔✓]\s+/, '').trim())
      .filter(Boolean);
    if (items.length > 0) return [{ type: 'checkbox', title: '', items }];
  }

  return [{ type: 'text', text: trimmed }];
}

const BLOCK_TYPES: { value: ContentBlock['type']; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Текст', icon: <SubjectIcon /> },
  { value: 'list', label: 'Список', icon: <FormatListBulletedIcon /> },
  { value: 'dropdown', label: 'Выпадающий список', icon: <ExpandMoreIcon /> },
  { value: 'checkbox', label: 'Чекбоксы', icon: <CheckBoxIcon /> },
  { value: 'table', label: 'Таблица', icon: <TableChartIcon /> },
  { value: 'image', label: 'Изображение', icon: <ImageIcon /> },
  { value: 'video', label: 'Видео', icon: <VideoFileIcon /> },
];

function ContentBlocksEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (blocks: ContentBlock[]) => void }) {
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  const [pasteText, setPasteText] = useState('');
  const handlePasteRecognize = () => {
    const parsed = parsePasteToBlocks(pasteText);
    if (parsed.length > 0) {
      onChange([...blocks, ...parsed]);
      setPasteText('');
    }
  };
  const addBlock = (type: ContentBlock['type']) => {
    const defaults: Record<ContentBlock['type'], ContentBlock> = {
      text: { type: 'text', text: '' },
      list: { type: 'list', items: [''], ordered: false },
      dropdown: { type: 'dropdown', title: '', content: '' },
      checkbox: { type: 'checkbox', title: '', items: [''] },
      table: { type: 'table', headers: ['Колонка 1', 'Колонка 2'], rows: [['', '']] },
      image: { type: 'image', url: '', alt: '' },
      video: { type: 'video', url: '' },
    };
    onChange([...blocks, defaults[type]]);
  };
  const updateBlock = (i: number, b: ContentBlock) => {
    const next = [...blocks];
    next[i] = b;
    onChange(next);
  };
  const removeBlock = (i: number) => onChange(blocks.filter((_, j) => j !== i));
  const moveBlock = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Блоки контента</Typography>
      <Accordion sx={{ mb: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" color="text.secondary">Вставить из буфера (распознаёт чекбоксы и таблицы)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField fullWidth multiline rows={6} size="small" value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={'Чекбоксы: ✅ [ ] Текст пункта\n\nТаблица: | Колонка 1 | Колонка 2 |\n| --- | --- |\n| ячейка | ячейка |'} sx={{ mb: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
          <Button size="small" variant="outlined" onClick={handlePasteRecognize} disabled={!pasteText.trim()}>Распознать и добавить</Button>
        </AccordionDetails>
      </Accordion>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {BLOCK_TYPES.map((t) => (
          <Button key={t.value} size="small" variant="outlined" startIcon={t.icon} onClick={() => addBlock(t.value)}>
            {t.label}
          </Button>
        ))}
      </Box>
      {blocks.map((b, i) => (
        <Accordion key={i} defaultExpanded sx={{ '&:before': { display: 'none' }, border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Chip size="small" label={BLOCK_TYPES.find((t) => t.value === b.type)?.label || b.type} />
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.type === 'text' && (b as any).text?.slice(0, 40)}
                {b.type === 'list' && `Список (${(b as any).items?.length || 0} пунктов)`}
                {b.type === 'dropdown' && (b as any).title?.slice(0, 40)}
                {b.type === 'checkbox' && ((b as any).title || `Чекбоксы (${(b as any).items?.length || 0})`)}
                {b.type === 'image' && ((b as any).url ? 'Изображение' : '—')}
                {b.type === 'video' && ((b as any).url ? 'Видео' : '—')}
              </Typography>
              <Box component="span" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" onClick={() => moveBlock(i, -1)} disabled={i === 0}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}><ArrowDownwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => removeBlock(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {b.type === 'text' && (
              <TextField fullWidth multiline rows={3} label="Текст" value={(b as any).text || ''} onChange={(e) => updateBlock(i, { ...b, text: e.target.value })} />
            )}
            {b.type === 'list' && (
              <Box>
                <FormControlLabel control={<Switch size="small" checked={(b as any).ordered || false} onChange={(e) => updateBlock(i, { ...b, ordered: e.target.checked })} />} label="Нумерованный список" />
                {(b as any).items?.map((item: string, j: number) => (
                  <TextField key={j} fullWidth size="small" value={item} onChange={(e) => {
                    const items = [...((b as any).items || [])];
                    items[j] = e.target.value;
                    updateBlock(i, { ...b, items });
                  }} sx={{ mt: 1 }} placeholder={`Пункт ${j + 1}`} />
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => updateBlock(i, { ...b, items: [...((b as any).items || []), ''] })} sx={{ mt: 1 }}>Добавить пункт</Button>
              </Box>
            )}
            {b.type === 'dropdown' && (
              <Box>
                <TextField fullWidth size="small" label="Заголовок" value={(b as any).title || ''} onChange={(e) => updateBlock(i, { ...b, title: e.target.value })} sx={{ mb: 1 }} />
                <TextField fullWidth multiline rows={4} label="Содержимое" value={(b as any).content || ''} onChange={(e) => updateBlock(i, { ...b, content: e.target.value })} />
              </Box>
            )}
            {b.type === 'checkbox' && (
              <Box>
                <TextField fullWidth size="small" label="Заголовок" value={(b as any).title || ''} onChange={(e) => updateBlock(i, { ...b, title: e.target.value })} sx={{ mb: 1 }} />
                {(b as any).items?.map((item: string, j: number) => (
                  <TextField key={j} fullWidth size="small" value={item} onChange={(e) => {
                    const items = [...((b as any).items || [])];
                    items[j] = e.target.value;
                    updateBlock(i, { ...b, items });
                  }} sx={{ mt: 1 }} placeholder={`Пункт ${j + 1}`} />
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => updateBlock(i, { ...b, items: [...((b as any).items || []), ''] })} sx={{ mt: 1 }}>Добавить пункт</Button>
              </Box>
            )}
            {b.type === 'table' && (
              <Box>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Заголовки (через запятую)</Typography>
                <TextField fullWidth size="small" value={((b as any).headers || []).join(', ')} onChange={(e) => updateBlock(i, { ...b, headers: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Колонка 1, Колонка 2" sx={{ mb: 2 }} />
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Строки (каждая строка — ячейки через |)</Typography>
                <TextField fullWidth multiline rows={4} size="small" value={((b as any).rows || []).map((r: string[]) => r.join(' | ')).join('\n')} onChange={(e) => {
                  const rows = e.target.value.split('\n').map((line) => line.split('|').map((c) => c.trim()));
                  updateBlock(i, { ...b, rows });
                }} placeholder="ячейка1 | ячейка2\nячейка1 | ячейка2" />
              </Box>
            )}
            {b.type === 'image' && (
              <Box>
                <input id={`img-upload-${i}`} accept="image/*" type="file" style={{ display: 'none' }} onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) { setUploadingFor(i); try { const r = await uploadImage(f); updateBlock(i, { ...b, url: r.url }); } catch { /* ignore */ } finally { setUploadingFor(null); } }
                  e.target.value = '';
                }} />
                <label htmlFor={`img-upload-${i}`}>
                  <Button size="small" variant="outlined" component="span" disabled={uploadingFor === i} sx={{ mb: 1 }}>{uploadingFor === i ? 'Загрузка...' : 'Загрузить'}</Button>
                </label>
                <TextField fullWidth size="small" label="URL изображения" value={(b as any).url || ''} onChange={(e) => updateBlock(i, { ...b, url: e.target.value })} sx={{ mt: 1 }} />
                <TextField fullWidth size="small" label="Alt (описание)" value={(b as any).alt || ''} onChange={(e) => updateBlock(i, { ...b, alt: e.target.value })} sx={{ mt: 1 }} />
                {(b as any).url && <Box component="img" src={(b as any).url} alt="" sx={{ mt: 1, maxHeight: 100, borderRadius: 1 }} />}
              </Box>
            )}
            {b.type === 'video' && (
              <TextField fullWidth size="small" label="URL видео (YouTube, Vimeo)" value={(b as any).url || ''} onChange={(e) => updateBlock(i, { ...b, url: e.target.value })} placeholder="https://youtube.com/..." />
            )}
          </AccordionDetails>
        </Accordion>
      ))}
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
  const [form, setForm] = useState({ page_type: 'content' as const, title: '', content: '', content_blocks: [] as ContentBlock[], objection_text: '', solution_text: '', material_id: null as number | null });
  useEffect(() => {
    if (open) {
      const blocks = (page?.content_blocks && Array.isArray(page.content_blocks) ? page.content_blocks : []) as ContentBlock[];
      setForm({
        page_type: (page?.page_type as any) || 'content',
        title: page?.title || '',
        content: page?.content || '',
        content_blocks: blocks,
        objection_text: page?.objection_text || '',
        solution_text: page?.solution_text || '',
        material_id: page?.material_id ?? null,
      });
    }
  }, [open, page?.id]);

  const handleSave = () => {
    onSave({
      ...form,
      content_blocks: form.content_blocks.length > 0 ? form.content_blocks : undefined,
    });
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
        <ContentBlocksEditor blocks={form.content_blocks} onChange={(blocks) => setForm({ ...form, content_blocks: blocks })} />
        {(form.page_type === 'content' || form.page_type === 'cover') && (
          <TextField fullWidth label="Простой текст (если нет блоков)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} multiline rows={2} sx={{ mb: 2 }} placeholder="Запасной контент, если блоки пустые" />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  );
}
