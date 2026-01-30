import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BlogPost, BlogPostCarouselItem } from '@/types/cms';
import { createBlogCategory, getBlogPost, listBlogCategories, upsertBlogPost, deleteBlogPost, generateSeoContent, uploadImage } from '@/services/cmsApi';
import { Box, Button, Grid, MenuItem, Paper, Switch, TextField, Typography, FormControlLabel, CircularProgress, IconButton, Divider } from '@mui/material';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TableChartIcon from '@mui/icons-material/TableChart';
import PollIcon from '@mui/icons-material/Poll';
import ChecklistIcon from '@mui/icons-material/Checklist';
import QuizIcon from '@mui/icons-material/Quiz';

export function BlogEditorPage() {
  const { id = '' } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: post } = useQuery({
    queryKey: ['blog', id],
    queryFn: () => getBlogPost(id),
    enabled: !isNew,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['blog-categories'], queryFn: listBlogCategories });

  const initial: BlogPost = useMemo(() => post || {
    id: crypto.randomUUID(),
    title: '',
    slug: '',
    contentHtml: '',
    seo: {},
    tags: [],
    categorySlug: '',
    isFeatured: false,
  coverImageUrl: undefined,
  carouselEnabled: false,
  carouselTitle: '',
  carouselItems: [],
  }, [post]);

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [contentHtml, setContentHtml] = useState(initial.contentHtml);
  const [htmlRaw, setHtmlRaw] = useState(initial.contentHtml); // Отдельное состояние для HTML режима
  const [categorySlug, setCategorySlug] = useState(initial.categorySlug || '');
  const [tags, setTags] = useState<string[]>(initial.tags || []);
  const [isFeatured, setIsFeatured] = useState(Boolean(initial.isFeatured));
  const [seoTitle, setSeoTitle] = useState(initial.seo.metaTitle || '');
  const [seoDesc, setSeoDesc] = useState(initial.seo.metaDescription || '');
  const [ogImageUrl, setOgImageUrl] = useState(initial.seo.ogImageUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl || '');
  const [carouselEnabled, setCarouselEnabled] = useState(Boolean(initial.carouselEnabled));
  const [carouselTitle, setCarouselTitle] = useState(initial.carouselTitle || '');
  const [carouselItems, setCarouselItems] = useState<BlogPostCarouselItem[]>(initial.carouselItems || []);
  const [htmlMode, setHtmlMode] = useState(false);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const quillRef = useRef<ReactQuill | null>(null);

  // Функции для вставки интерактивных элементов
  const insertTable = () => {
    const tableHtml = `<div class="article-table">
  <h3>Сравнительная таблица</h3>
  <table>
    <thead>
      <tr>
        <th>Параметр</th>
        <th>Вариант 1</th>
        <th>Вариант 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Характеристика 1</td>
        <td>Значение 1</td>
        <td>Значение 2</td>
      </tr>
      <tr>
        <td>Характеристика 2</td>
        <td>Значение 1</td>
        <td>Значение 2</td>
      </tr>
    </tbody>
  </table>
</div>`;
    
    if (htmlMode) {
      setHtmlRaw(htmlRaw + '\n\n' + tableHtml);
      return;
    }
    
    // Для визуального режима - переключаемся в HTML режим и вставляем
    const currentHtml = htmlRaw || contentHtml;
    setHtmlRaw(currentHtml + '\n\n' + tableHtml);
    setHtmlMode(true);
    showToast('Таблица вставлена. Для редактирования используйте HTML-режим.', 'info');
  };

  const insertChecklist = () => {
    const checklistHtml = `<div class="article-checklist">
  <h3>Чек-лист</h3>
  <ul>
    <li class="checklist-item">Пункт 1</li>
    <li class="checklist-item">Пункт 2</li>
    <li class="checklist-item">Пункт 3</li>
  </ul>
</div>`;
    
    if (htmlMode) {
      setHtmlRaw(htmlRaw + '\n\n' + checklistHtml);
      return;
    }
    
    const currentHtml = htmlRaw || contentHtml;
    setHtmlRaw(currentHtml + '\n\n' + checklistHtml);
    setHtmlMode(true);
    showToast('Чек-лист вставлен. Для редактирования используйте HTML-режим.', 'info');
  };

  const insertPoll = () => {
    const pollHtml = `<div class="article-poll">
  <h3>Опрос</h3>
  <ul>
    <li class="poll-item">Вариант ответа 1</li>
    <li class="poll-item">Вариант ответа 2</li>
    <li class="poll-item">Вариант ответа 3</li>
  </ul>
</div>`;
    
    if (htmlMode) {
      setHtmlRaw(htmlRaw + '\n\n' + pollHtml);
      return;
    }
    
    const currentHtml = htmlRaw || contentHtml;
    setHtmlRaw(currentHtml + '\n\n' + pollHtml);
    setHtmlMode(true);
    showToast('Опрос вставлен. Для редактирования используйте HTML-режим.', 'info');
  };

  const insertQuiz = () => {
    const quizHtml = `<div class="article-poll">
  <h3>Квиз</h3>
  <ul>
    <li class="poll-item">Вопрос 1 с вариантами ответа</li>
    <li class="poll-item">Вопрос 2 с вариантами ответа</li>
    <li class="poll-item">Вопрос 3 с вариантами ответа</li>
  </ul>
</div>`;
    
    if (htmlMode) {
      setHtmlRaw(htmlRaw + '\n\n' + quizHtml);
      return;
    }
    
    const currentHtml = htmlRaw || contentHtml;
    setHtmlRaw(currentHtml + '\n\n' + quizHtml);
    setHtmlMode(true);
    showToast('Квиз вставлен. Для редактирования используйте HTML-режим.', 'info');
  };

  const insertTip = () => {
    const tipHtml = `<div class="article-tip">
  <h3>Важная информация</h3>
  <p>Здесь можно разместить полезный совет или важную информацию для читателей.</p>
</div>`;
    
    if (htmlMode) {
      setHtmlRaw(htmlRaw + '\n\n' + tipHtml);
      return;
    }
    
    const currentHtml = htmlRaw || contentHtml;
    setHtmlRaw(currentHtml + '\n\n' + tipHtml);
    setHtmlMode(true);
    showToast('Блок совета вставлен. Для редактирования используйте HTML-режим.', 'info');
  };

  useEffect(() => {
    setTitle(initial.title);
    setSlug(initial.slug);
    setContentHtml(initial.contentHtml);
    setHtmlRaw(initial.contentHtml); // Синхронизируем HTML режим
    setCategorySlug(initial.categorySlug || '');
    setTags(initial.tags || []);
    setIsFeatured(Boolean(initial.isFeatured));
    setSeoTitle(initial.seo.metaTitle || '');
    setSeoDesc(initial.seo.metaDescription || '');
    setOgImageUrl(initial.seo.ogImageUrl || '');
    setCoverImageUrl(initial.coverImageUrl || '');
    setCarouselEnabled(Boolean(initial.carouselEnabled));
    setCarouselTitle(initial.carouselTitle || '');
    setCarouselItems(initial.carouselItems || []);
  }, [initial.id]);
  
  // Синхронизация при переключении режимов
  const handleHtmlModeChange = (checked: boolean) => {
    if (checked) {
      // Переключаемся на HTML режим - сохраняем текущий HTML из Quill
      setHtmlRaw(contentHtml);
    } else {
      // Переключаемся на визуальный режим - используем сырой HTML
      setContentHtml(htmlRaw);
    }
    setHtmlMode(checked);
  };

  const mutation = useMutation({
    mutationFn: (payload: BlogPost) => upsertBlogPost(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      queryClient.invalidateQueries({ queryKey: ['blog', saved.id] });
      if (isNew) navigate(`/blog/${saved.id}`, { replace: true });
      showToast('Статья сохранена', 'success');
    },
    onError: (err: any) => showToast(err?.message || 'Ошибка сохранения', 'error'),
  });

  const remove = useMutation({
    mutationFn: (delId: string) => deleteBlogPost(delId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      navigate('/blog', { replace: true });
      showToast('Статья удалена', 'success');
    },
    onError: (err: any) => showToast(err?.message || 'Ошибка удаления', 'error'),
  });

  const handleCoverUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target?.files?.length) return;
      const file = target.files[0];
      try {
        const result = await uploadImage(file);
        setCoverImageUrl(result.url);
        showToast('Обложка обновлена', 'success');
      } catch (error) {
        console.error('[BlogEditorPage] cover upload error', error);
        showToast('Не удалось загрузить изображение', 'error');
      } finally {
        target.value = '';
      }
    };
    input.click();
  };

  const handleCarouselImageAdd = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      if (!target?.files?.length) return;
      const file = target.files[0];
      try {
        const result = await uploadImage(file);
        setCarouselItems((prev) => [...prev, { imageUrl: result.url }]);
        showToast('Слайд добавлен', 'success');
      } catch (error) {
        console.error('[BlogEditorPage] carousel upload error', error);
        showToast('Не удалось загрузить изображение', 'error');
      } finally {
        target.value = '';
      }
    };
    input.click();
  };

  const updateCarouselItem = (index: number, patch: Partial<BlogPostCarouselItem>) => {
    setCarouselItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeCarouselItem = (index: number) => {
    setCarouselItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveCarouselItem = (index: number, direction: 'up' | 'down') => {
    setCarouselItems((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const normalizedCarouselItems: BlogPostCarouselItem[] = carouselItems
    .map((item) => ({
      imageUrl: (item.imageUrl || '').trim(),
      caption: item.caption?.trim(),
      alt: item.alt?.trim(),
      linkUrl: item.linkUrl?.trim(),
    }))
    .filter((item) => item.imageUrl);

  // Используем htmlRaw в HTML режиме, contentHtml в визуальном
  const finalContentHtml = htmlMode ? htmlRaw : contentHtml;

  const model: BlogPost = {
    ...initial,
    title,
    slug,
    contentHtml: finalContentHtml,
    categorySlug,
    tags,
    isFeatured,
    seo: { ...initial.seo, metaTitle: seoTitle, metaDescription: seoDesc, ogImageUrl },
    // coverImageUrl всегда явно указываем, чтобы гарантировать сохранение
    coverImageUrl: typeof coverImageUrl === 'string' && coverImageUrl.trim() 
      ? coverImageUrl.trim() 
      : (coverImageUrl === null ? null : undefined),
    carouselEnabled: carouselEnabled && normalizedCarouselItems.length > 0,
    carouselTitle: carouselTitle.trim() ? carouselTitle.trim() : undefined,
    carouselItems: normalizedCarouselItems,
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>{isNew ? 'Новая статья' : `Редактирование: ${model.title || 'Без названия'}`}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1">Контент</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={generatingSeo ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                  onClick={async () => {
                    const topic = title.trim() || 'статья';
                    setGeneratingSeo(true);
                    try {
                      const currentHtml = htmlMode ? htmlRaw : contentHtml;
                      const seoContent = await generateSeoContent(topic, title, currentHtml);
                      setTitle(seoContent.title);
                      // Обновляем оба состояния, чтобы при переключении режимов все было синхронизировано
                      setContentHtml(seoContent.html);
                      setHtmlRaw(seoContent.html);
                      setSeoTitle(seoContent.seoTitle);
                      setSeoDesc(seoContent.seoDescription);
                      if (seoContent.ogImageUrl) {
                        setOgImageUrl(seoContent.ogImageUrl);
                      }
                      showToast(`Сгенерирована SEO-статья (${seoContent.textLength} символов)`, 'success');
                    } catch (err: any) {
                      showToast(err?.message || 'Ошибка генерации SEO-контента', 'error');
                    } finally {
                      setGeneratingSeo(false);
                    }
                  }}
                  disabled={generatingSeo}
                >
                  {generatingSeo ? 'Генерация...' : 'Генерировать SEO-статью'}
                </Button>
                <FormControlLabel control={<Switch checked={htmlMode} onChange={(e)=>handleHtmlModeChange(e.target.checked)} />} label="HTML" />
              </Box>
            </Box>
            {htmlMode ? (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<TableChartIcon />} onClick={insertTable}>Таблица</Button>
                  <Button size="small" variant="outlined" startIcon={<ChecklistIcon />} onClick={insertChecklist}>Чек-лист</Button>
                  <Button size="small" variant="outlined" startIcon={<PollIcon />} onClick={insertPoll}>Опрос</Button>
                  <Button size="small" variant="outlined" startIcon={<QuizIcon />} onClick={insertQuiz}>Квиз</Button>
                  <Button size="small" variant="outlined" onClick={insertTip}>Совет</Button>
                </Box>
                <TextField fullWidth multiline minRows={18} value={htmlRaw} onChange={(e)=>setHtmlRaw(e.target.value)} sx={{ fontFamily: 'monospace' }} />
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<TableChartIcon />} onClick={insertTable}>Таблица</Button>
                  <Button size="small" variant="outlined" startIcon={<ChecklistIcon />} onClick={insertChecklist}>Чек-лист</Button>
                  <Button size="small" variant="outlined" startIcon={<PollIcon />} onClick={insertPoll}>Опрос</Button>
                  <Button size="small" variant="outlined" startIcon={<QuizIcon />} onClick={insertQuiz}>Квиз</Button>
                  <Button size="small" variant="outlined" onClick={insertTip}>Совет</Button>
                </Box>
                <ReactQuill 
                  ref={quillRef}
                  theme="snow" 
                  value={contentHtml} 
                  onChange={setContentHtml} 
                  style={{ height: 400 }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link', 'image', 'code-block'],
                      ['clean']
                    ],
                  }}
                />
              </>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <TextField fullWidth label="Заголовок" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
            <TextField
              fullWidth
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <TextField
              select
              fullWidth
              label="Категория"
              value={categorySlug || ''}
              onChange={(e) => setCategorySlug(e.target.value)}
              sx={{ mt: 2 }}
            >
              <MenuItem value="">(без категории)</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.slug} value={c.slug}>{c.name}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'flex-start' }}>
              <TextField 
                size="small" 
                placeholder="новая категория (slug)" 
                id="new-cat-slug"
                fullWidth
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const button = document.querySelector('#add-category-btn') as HTMLButtonElement;
                    button?.click();
                  }
                }}
              />
              <Button 
                id="add-category-btn"
                size="small" 
                variant="outlined"
                onClick={async () => {
                  const el = document.getElementById('new-cat-slug') as HTMLInputElement | null;
                  const slug = (el?.value || '').trim();
                  if (!slug) {
                    showToast('Введите slug категории', 'warning');
                    el?.focus();
                    return;
                  }
                  
                  // Проверяем, не существует ли уже такая категория
                  if (categories.some(c => c.slug === slug)) {
                    showToast('Категория с таким slug уже существует', 'warning');
                    setCategorySlug(slug); // Выбираем существующую
                    if (el) el.value = '';
                    return;
                  }
                  
                  try {
                    await createBlogCategory(slug, slug);
                    // Обновляем список категорий
                    await queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
                    // Ждем обновления данных
                    await queryClient.refetchQueries({ queryKey: ['blog-categories'] });
                    // Автоматически выбираем созданную категорию
                    setCategorySlug(slug);
                    if (el) el.value = '';
                    showToast('Категория добавлена и выбрана', 'success');
                  } catch (err: any) {
                    const errorMsg = err?.message || 'Ошибка создания категории';
                    console.error('Error creating category:', err);
                    showToast(errorMsg, 'error');
                  }
                }}
              >
                Добавить
              </Button>
            </Box>
            <TextField fullWidth label="Теги (через запятую)" value={tags.join(', ')} onChange={(e) => setTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} sx={{ mt: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Switch checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <Typography>В хайлайтах</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button variant="contained" onClick={() => mutation.mutate(model)}>Сохранить</Button>
              {!isNew && (
                <Button color="error" onClick={() => remove.mutate(model.id)}>Удалить</Button>
              )}
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Обложка статьи</Typography>
            {coverImageUrl ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  component="img"
                  src={resolveImageUrl(coverImageUrl)}
                  alt="Обложка статьи"
                  sx={{
                    width: '100%',
                    borderRadius: 1,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    objectFit: 'cover',
                    maxHeight: 220,
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleCoverUpload} startIcon={<AddPhotoAlternateIcon />}>
                    Заменить
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setCoverImageUrl('')}
                  >
                    Удалить
                  </Button>
                </Box>
              </Box>
            ) : (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={handleCoverUpload}
              >
                Загрузить обложку
              </Button>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1">Карусель в статье</Typography>
              <FormControlLabel
                control={<Switch checked={carouselEnabled} onChange={(e) => setCarouselEnabled(e.target.checked)} />}
                label={carouselEnabled ? 'Включена' : 'Выключена'}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Добавьте изображения, чтобы показать галерею внутри статьи. Карусель поддерживает автопрокрутку, жесты и перетаскивание.
            </Typography>
            {carouselEnabled && (
              <>
                <TextField
                  fullWidth
                  label="Заголовок блока"
                  value={carouselTitle}
                  onChange={(e) => setCarouselTitle(e.target.value)}
                  sx={{ mb: 2 }}
                  placeholder="Например: Галерея проекта"
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {carouselItems.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Слайды не добавлены. Добавьте изображения, чтобы показать карусель.
                    </Typography>
                  )}
                  {carouselItems.map((item, index) => (
                    <Paper
                      key={`${item.imageUrl}-${index}`}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2, position: 'relative' }}
                    >
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box
                          component="img"
                          src={resolveImageUrl(item.imageUrl)}
                          alt={item.alt || `Слайд ${index + 1}`}
                          sx={{
                            width: 120,
                            height: 80,
                            borderRadius: 1,
                            objectFit: 'cover',
                            flexShrink: 0,
                            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                          }}
                        />
                        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            size="small"
                            label="Подпись"
                            value={item.caption || ''}
                            onChange={(e) => updateCarouselItem(index, { caption: e.target.value })}
                          />
                          <TextField
                            size="small"
                            label="Alt (для SEO)"
                            value={item.alt || ''}
                            onChange={(e) => updateCarouselItem(index, { alt: e.target.value })}
                          />
                          <TextField
                            size="small"
                            label="Ссылка (опционально)"
                            value={item.linkUrl || ''}
                            onChange={(e) => updateCarouselItem(index, { linkUrl: e.target.value })}
                            placeholder="https:// или /путь"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            disabled={index === 0}
                            onClick={() => moveCarouselItem(index, 'up')}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            disabled={index === carouselItems.length - 1}
                            onClick={() => moveCarouselItem(index, 'down')}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeCarouselItem(index)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="outlined"
                  startIcon={<AddPhotoAlternateIcon />}
                  onClick={handleCarouselImageAdd}
                >
                  Добавить слайд
                </Button>
              </>
            )}
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>SEO</Typography>
            <TextField label="Meta Title" fullWidth value={seoTitle} sx={{ mb: 2 }} onChange={(e) => setSeoTitle(e.target.value)} />
            <TextField label="Meta Description" fullWidth multiline minRows={3} value={seoDesc} sx={{ mb: 2 }} onChange={(e) => setSeoDesc(e.target.value)} />
            {ogImageUrl && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>OG Изображение:</Typography>
                <Box 
                  component="img" 
                  src={resolveImageUrl(ogImageUrl)} 
                  alt="OG" 
                  sx={{ maxWidth: '100%', height: 'auto', borderRadius: 1, mb: 1 }} 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <TextField
                  label="OG Image URL"
                  fullWidth
                  size="small"
                  value={ogImageUrl}
                  onChange={(e) => setOgImageUrl(e.target.value)}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}


