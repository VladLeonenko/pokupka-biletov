import { useEffect, useMemo, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCase, getCase, setCasePublished, upsertCase, uploadImage } from '@/services/cmsApi';
import { Box, Button, Grid, Paper, Switch, TextField, Typography, FormControlLabel, MenuItem, Select, FormControl, InputLabel, Tabs, Tab, IconButton, Accordion, AccordionSummary, AccordionDetails, Chip, Autocomplete, Avatar } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { SafeImage } from '@/components/common/SafeImage';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { TOOLS_PRESETS, TOOLS_BY_CATEGORY, CATEGORY_LABELS, ToolPreset } from '@/data/toolsPresets';
const CASE_CATEGORIES = [
  { value: '', label: 'Не выбрана' },
  { value: 'website', label: 'Сайт' },
  { value: 'mobile', label: 'Приложение' },
  { value: 'ai', label: 'AI Boost Team' },
  { value: 'seo', label: 'SEO' },
  { value: 'marketing', label: 'Маркетинг' },
  { value: 'advertising', label: 'Реклама' }
];

export function CaseEditorPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateSlug = searchParams.get('template');
  const isNew = id === 'new';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  const { data: templateData } = useQuery({
    queryKey: ['case', templateSlug],
    queryFn: () => templateSlug ? getCase(templateSlug) : Promise.resolve(undefined),
    enabled: !!templateSlug && isNew,
  });
  
  const { data } = useQuery({
    queryKey: ['case', id],
    queryFn: () => (!id || isNew) ? null : getCase(id),
    enabled: !!id && !isNew && !templateSlug,
  });
  
  const caseData = templateData || data;
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [htmlMode, setHtmlMode] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [tools, setTools] = useState<string[]>([]);
  const [gallery, setGallery] = useState<(string | { url: string; alt?: string })[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [contentJson, setContentJson] = useState<any>({});
  const [category, setCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState(0);
  // SEO поля
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');

  const quillRef = useRef<any>(null);
  const navigate = useNavigate();
  const isSavingRef = useRef(false);
  // Функция автозаполнения SEO
  const generateSeoFromContent = () => {
    const newSeoTitle = title ? `${title} | Кейс Prime Coder`.slice(0, 60) : '';
    const newSeoDescription = summary ? summary.slice(0, 160) : '';
    const toolsKeywords = tools || [];
    const keywords = [...toolsKeywords, 'кейс', 'портфолио', 'разработка сайта'].join(', ');
    const newOgImageUrl = heroImageUrl || getCJ('hero.backgroundImage', '');
    setSeoTitle(newSeoTitle);
    setSeoDescription(newSeoDescription);
    setSeoKeywords(keywords);
    setOgImageUrl(newOgImageUrl);
    showToast('SEO поля заполнены!', 'success');
  };

  useEffect(() => {
    if (caseData && !isSavingRef.current) {
      if (templateData && isNew) {
        setSlug('');
        setTitle(caseData.title + ' (копия)');
        setSummary(caseData.summary || '');
        setHeroImageUrl(caseData.heroImageUrl || '');
        setContentHtml(caseData.contentHtml || '');
        setMetrics(caseData.metrics || {});
        setTools(caseData.tools || []);
        setGallery(Array.isArray(caseData.gallery) ? caseData.gallery : []);
        setIsPublished(false);
        setContentJson(caseData.contentJson || {});
        setCategory((caseData as any).category || '');
      } else if (data) {
        setSlug(data.slug);
        setTitle(data.title);
        setSummary(data.summary || '');
        setHeroImageUrl(data.heroImageUrl || '');
        setContentHtml(data.contentHtml || '');
        setMetrics(data.metrics || {});
        setTools(data.tools || []);
        setGallery(Array.isArray(data.gallery) ? data.gallery : []);
        setIsPublished(!!data.isPublished);
        setContentJson(data.contentJson || {});
        setCategory((data as any).category || '');
        setSeoTitle((data as any).seoTitle || '');
        setSeoDescription((data as any).seoDescription || '');
        setSeoKeywords((data as any).seoKeywords || '');
        setOgImageUrl((data as any).ogImageUrl || '');

      }
    }
  }, [caseData, templateData, data, isNew]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // Валидация для нового кейса
      if (isNew) {
        if (!slug || slug.trim() === '') {
          throw new Error('Slug обязателен для создания кейса');
        }
        if (!title || title.trim() === '') {
          throw new Error('Название обязательно для создания кейса');
        }
      }
      
      isSavingRef.current = true;
      const payload = { 
        slug: isNew ? slug.trim() : (id as string), 
        title, 
        summary, 
        heroImageUrl, 
        contentHtml, 
        metrics, 
        tools: (tools || []).filter(Boolean), 
        gallery, 
        contentJson, 
        isPublished, 
        category: category || null,
        seoTitle, 
        seoDescription, 
        seoKeywords, 
        ogImageUrl
      } as any;

      await upsertCase(payload, { create: isNew });
    },


    onSuccess: async () => {
      showToast(isNew ? 'Кейс создан!' : 'Кейс сохранен!', 'success');
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (isNew) {
        navigate('/admin/cases');
      } else {
        await queryClient.invalidateQueries({ queryKey: ['case', id] });
        setTimeout(() => { isSavingRef.current = false; }, 500);
      }
      if (isNew) isSavingRef.current = false;
    },
    onError: (error: Error) => {
      showToast('Ошибка: ' + error.message, 'error');
      isSavingRef.current = false;
    }
  });

  const delMut = useMutation({
    mutationFn: async () => deleteCase(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
      navigate('/admin/cases');
    }
  });

  const metricsPairs = useMemo(() => Object.entries(metrics || {}), [metrics]);

  const setCJ = (path: string, value: any) => {
    setContentJson((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] === undefined) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const getCJ = (path: string, defaultValue: any = '') => {
    const parts = path.split('.');
    let cur = contentJson;
    for (const p of parts) {
      if (cur === undefined || cur === null) return defaultValue;
      cur = cur[p];
    }
    return cur ?? defaultValue;
  };

  const ImageUploader = ({ label, path }: { label: string; path: string }) => {
    const value = getCJ(path, '');
    return (
      <Box sx={{ mb: 2 }}>
        <TextField label={label} fullWidth value={value} onChange={(e) => setCJ(path, e.target.value)} sx={{ mb: 1 }} />
        <Button size="small" component="label" variant="outlined">
          Загрузить
          <input hidden type="file" accept="image/*" onChange={async (e) => { 
            const f = e.target.files?.[0]; 
            if (!f) return; 
            try { 
              const r = await uploadImage(f); 
              setCJ(path, r.url); 
              showToast('Загружено!', 'success'); 
            } catch (err: any) { 
              showToast('Ошибка: ' + err.message, 'error'); 
            }
          }} />
        </Button>
        {value && (
          <Box sx={{ mt: 2, maxWidth: 400, borderRadius: 1, overflow: 'hidden', border: '1px solid #333' }}>
            <img src={resolveImageUrl(value)} alt="Preview" style={{ width: '100%', height: 'auto' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </Box>
        )}
      </Box>
    );
  };

  const selectedTools = (getCJ('tools.items', []) as any[]).filter(Boolean);

  const addToolFromPreset = (tool: ToolPreset) => {
    const currentTools = getCJ('tools.items', []) as any[];
    if (!currentTools.find((t: any) => t.name === tool.name)) {
      setCJ('tools.items', [...currentTools, { name: tool.name, icon: tool.icon }]);
    }
  };

  const removeTool = (toolName: string) => {
    const currentTools = getCJ('tools.items', []) as any[];
    setCJ('tools.items', currentTools.filter((t: any) => t.name !== toolName));
  };

  if (!data && !isNew && !templateData) return <Typography>Загрузка...</Typography>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {isNew ? 'Новый кейс' : `Кейс: ${title}`}
      </Typography>
      
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Основное" />
          <Tab label="Madeo Template" />
          <Tab label="Галерея" />
          <Tab label="KPI" />
          <Tab label="SEO" />
        </Tabs>

      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          
          {activeTab === 0 && (
            <Paper sx={{ p: 3 }}>
              {isNew && (
                <TextField fullWidth label="Slug" sx={{ mb: 2 }} value={slug} onChange={(e) => setSlug(e.target.value)} helperText="Уникальный идентификатор" required />
              )}
              <TextField fullWidth label="Заголовок" sx={{ mb: 2 }} value={title} onChange={(e) => setTitle(e.target.value)} required />
              <TextField fullWidth label="Краткое описание" multiline rows={3} sx={{ mb: 2 }} value={summary} onChange={(e) => setSummary(e.target.value)} />
<FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Категория</InputLabel>
                <Select value={category} label="Категория" onChange={(e) => setCategory(e.target.value)}>
                  {CASE_CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">Дополнительный контент</Typography>
                <FormControlLabel control={<Switch checked={htmlMode} onChange={(e) => setHtmlMode(e.target.checked)} />} label="HTML" />
              </Box>
              {htmlMode ? (
                <TextField fullWidth multiline minRows={15} value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} sx={{ fontFamily: 'monospace' }} />
              ) : (
                <Box sx={{ '& .ql-container': { minHeight: 200 } }}>
                  <ReactQuill theme="snow" value={contentHtml || ''} onChange={setContentHtml} ref={quillRef} />
                </Box>
              )}
            </Paper>
          )}

          {activeTab === 1 && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Видимость блоков</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Отключённые блоки не отображаются на странице кейса</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {[
                      { key: 'hero', label: 'Hero' },
                      { key: 'about', label: 'О проекте' },
                      { key: 'typography', label: 'Типография' },
                      { key: 'colors', label: 'Цветовая схема' },
                      { key: 'tools', label: 'Инструменты' },
                      { key: 'performance', label: 'Показатели' },
                      { key: 'mockup', label: 'Мокап' },
                      { key: 'results', label: 'Результат' },
                      { key: 'team', label: 'Команда' },
                      { key: 'ask', label: 'Вопрос' },
                      { key: 'form', label: 'Форма заявки' },
                    ].map(({ key, label }) => (
                      <FormControlLabel
                        key={key}
                        control={<Switch checked={getCJ(`sections.${key}`, true)} onChange={(e) => setCJ(`sections.${key}`, e.target.checked)} />}
                        label={label}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Hero Section</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок Hero" sx={{ mb: 2 }} value={getCJ('hero.title', '')} onChange={(e) => setCJ('hero.title', e.target.value)} />
                  <TextField fullWidth label="Подзаголовок Hero" sx={{ mb: 2 }} value={getCJ('hero.subtitle', '')} onChange={(e) => setCJ('hero.subtitle', e.target.value)} />
                  <ImageUploader label="Фоновое изображение Hero" path="hero.backgroundImage" />
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">О проекте</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок секции" sx={{ mb: 2 }} value={getCJ('about.title', 'О проекте')} onChange={(e) => setCJ('about.title', e.target.value)} />
                  <TextField fullWidth label="Описание проекта" multiline rows={4} sx={{ mb: 2 }} value={getCJ('about.description', '')} onChange={(e) => setCJ('about.description', e.target.value)} />
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, color: 'text.secondary' }}>Задачи</Typography>
                  <TextField fullWidth label="Заголовок (Задачи)" sx={{ mb: 2 }} value={getCJ('about.taskTitle', 'Задачи')} onChange={(e) => setCJ('about.taskTitle', e.target.value)} />
                  <TextField fullWidth label="Текст задач" multiline rows={4} sx={{ mb: 2 }} value={getCJ('about.taskText', '')} onChange={(e) => setCJ('about.taskText', e.target.value)} />
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, color: 'text.secondary' }}>Решение</Typography>
                  <TextField fullWidth label="Заголовок (Решение)" sx={{ mb: 2 }} value={getCJ('about.solutionTitle', 'Решение')} onChange={(e) => setCJ('about.solutionTitle', e.target.value)} />
                  <TextField fullWidth label="Текст решения" multiline rows={4} sx={{ mb: 2 }} value={getCJ('about.solutionText', '')} onChange={(e) => setCJ('about.solutionText', e.target.value)} />
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, color: 'text.secondary' }}>Изображения</Typography>
                  <ImageUploader label="Изображение 1 (задний план)" path="about.image" />
                  <ImageUploader label="Изображение 2 (передний план)" path="about.secondaryImage" />
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Typography Section</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок" sx={{ mb: 2 }} value={getCJ('typography.title', 'Типографика')} onChange={(e) => setCJ('typography.title', e.target.value)} />
                  <TextField fullWidth label="Шрифт" sx={{ mb: 2 }} value={getCJ('typography.fontFamily', '')} onChange={(e) => setCJ('typography.fontFamily', e.target.value)} placeholder="Montserrat" />
                  <TextField fullWidth label="Размеры шрифтов (через запятую)" sx={{ mb: 2 }} value={((getCJ('typography.fontSizes', []) as string[]) || []).join(', ')} onChange={(e) => setCJ('typography.fontSizes', e.target.value.split(',').map(s => s.trim()))} />
                  <ImageUploader label="Изображение типографики" path="typography.image" />
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Tools Section (Инструменты)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок секции" sx={{ mb: 2 }} value={getCJ('tools.title', 'Инструменты')} onChange={(e) => setCJ('tools.title', e.target.value)} />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Результаты для CTA-блока (через запятую или по одному)</Typography>
                  <TextField fullWidth label="Результаты: Трафик +150%, Конверсия +40%..." placeholder="Трафик +150%, Конверсия +40%, Продажи x3 за 6 месяцев" sx={{ mb: 2 }} value={((getCJ('tools.ctaResults', []) as string[]) || []).join(', ')} onChange={(e) => setCJ('tools.ctaResults', e.target.value.split(',').map(s => s.trim()))} helperText="Эти пункты отображаются в блоке «Понравился кейс [Название]?»" />
                  
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Выбранные инструменты:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3, minHeight: 40, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    {selectedTools.length === 0 ? (
                      <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Выберите инструменты из списка ниже</Typography>
                    ) : (
                      selectedTools.map((tool: any) => (
                        <Chip
                          key={tool.name}
                          avatar={<Avatar src={tool.icon} sx={{ width: 24, height: 24 }} />}
                          label={tool.name}
                          onDelete={() => removeTool(tool.name)}
                          sx={{ height: 36 }}
                        />
                      ))
                    )}
                  </Box>

                  <Autocomplete
                    options={TOOLS_PRESETS}
                    getOptionLabel={(option) => option.name}
                    groupBy={(option) => CATEGORY_LABELS[option.category] || option.category}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar src={option.icon} sx={{ width: 24, height: 24 }} />
                        <span>{option.name}</span>
                      </Box>
                    )}
                    renderInput={(params) => <TextField {...params} label="Поиск инструмента" placeholder="Начните вводить..." />}
                    onChange={(_, value) => { if (value) addToolFromPreset(value); }}
                    value={null}
                    sx={{ mb: 3 }}
                  />

                  {Object.entries(TOOLS_BY_CATEGORY).map(([cat, toolsList]) => (
                    <Accordion key={cat} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{CATEGORY_LABELS[cat]} ({toolsList.length})</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {toolsList.map((tool) => {
                            const isSelected = selectedTools.some((t: any) => t.name === tool.name);
                            return (
                              <Chip
                                key={tool.name}
                                avatar={<Avatar src={tool.icon} sx={{ width: 20, height: 20 }} />}
                                label={tool.name}
                                onClick={() => isSelected ? removeTool(tool.name) : addToolFromPreset(tool)}
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                sx={{ cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Performance Section (Основные показатели)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок" sx={{ mb: 2 }} value={getCJ('performance.title', 'Показатели')} onChange={(e) => setCJ('performance.title', e.target.value)} />
                  <TextField fullWidth type="number" label="Score круга (85–99, пусто = авто по slug)" placeholder="92" sx={{ mb: 2 }} value={getCJ('performance.score', '')} onChange={(e) => setCJ('performance.score', e.target.value)} helperText="Если пусто — случайное 85–99, одинаковое для кейса" />
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>Метрики:</Typography>
                  {(getCJ('performance.metrics', []) as any[]).map((metric: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <TextField size="small" label="Название" value={metric?.label || ''} onChange={(e) => {
                        const items = [...getCJ('performance.metrics', [])];
                        items[index] = { ...items[index], label: e.target.value };
                        setCJ('performance.metrics', items);
                      }} sx={{ flex: 1, minWidth: 120 }} />
                      <TextField size="small" label="Значение" value={metric?.value || ''} onChange={(e) => {
                        const items = [...getCJ('performance.metrics', [])];
                        items[index] = { ...items[index], value: e.target.value };
                        setCJ('performance.metrics', items);
                      }} sx={{ flex: 1, minWidth: 80 }} />
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Уровень</InputLabel>
                        <Select label="Уровень" value={metric?.status || 'excellent'} onChange={(e) => {
                          const items = [...getCJ('performance.metrics', [])];
                          items[index] = { ...items[index], status: e.target.value };
                          setCJ('performance.metrics', items);
                        }}>
                          <MenuItem value="excellent">Идеально</MenuItem>
                          <MenuItem value="good">Нормально</MenuItem>
                          <MenuItem value="poor">Плохо</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton color="error" onClick={() => {
                        const items = getCJ('performance.metrics', []).filter((_: any, i: number) => i !== index);
                        setCJ('performance.metrics', items);
                      }}><DeleteIcon /></IconButton>
                    </Box>
                  ))}
                  <Button startIcon={<AddIcon />} onClick={() => setCJ('performance.metrics', [...getCJ('performance.metrics', []), { label: '', value: '', status: 'excellent' }])}>Добавить метрику</Button>
                </AccordionDetails>
              </Accordion>



              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Mockup Section (Изображение мокапа)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>Загрузите изображение мокапа (например, ноутбук с сайтом)</Typography>
                  <ImageUploader label="Изображение мокапа" path="mockup.image" />
                </AccordionDetails>
              </Accordion>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Results Section</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Заголовок" sx={{ mb: 2 }} value={getCJ('results.title', 'Результат')} onChange={(e) => setCJ('results.title', e.target.value)} />
                  <TextField fullWidth label="Описание результата" multiline rows={3} sx={{ mb: 2 }} value={getCJ('results.description', '')} onChange={(e) => setCJ('results.description', e.target.value)} />
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}><TextField fullWidth label="Дней разработки" value={getCJ('results.days', '')} onChange={(e) => setCJ('results.days', e.target.value)} /></Grid>
                    <Grid item xs={6}><TextField fullWidth label="Экранов/страниц" value={getCJ('results.screens', '')} onChange={(e) => setCJ('results.screens', e.target.value)} /></Grid>
                  </Grid>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>Особенности:</Typography>
                  {(getCJ('results.features', []) as string[]).map((feature: string, index: number) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      <TextField size="small" fullWidth value={feature || ''} onChange={(e) => {
                        const items = [...getCJ('results.features', [])];
                        items[index] = e.target.value;
                        setCJ('results.features', items);
                      }} />
                      <IconButton color="error" onClick={() => {
                        const items = getCJ('results.features', []).filter((_: any, i: number) => i !== index);
                        setCJ('results.features', items);
                      }}><DeleteIcon /></IconButton>
                    </Box>
                  ))}
                  <Button startIcon={<AddIcon />} onClick={() => setCJ('results.features', [...getCJ('results.features', []), ''])}>Добавить</Button>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Colors Section (индивидуально для каждого кейса)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField fullWidth label="Палитра цветов (hex через запятую)" placeholder="#000000, #ffffff, #fd9c12" value={((getCJ('colors.palette', []) as { color?: string }[]) || []).map((x: any) => (typeof x === 'string' ? x : x?.color || '')).join(', ')} onChange={(e) => setCJ('colors.palette', e.target.value.split(',').map(s => s.trim()).map(color => ({ color: color ? (color.startsWith('#') ? color : '#' + color) : '' })))} helperText="Блок «Цветовая схема» — одинаковый для всех кейсов, только цвета меняются" />
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {activeTab === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Hero изображение</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField fullWidth label="Hero URL" value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} />
                <Button component="label" variant="outlined">
                  Загрузить
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f = e.target.files?.[0]; if (!f) return; 
                    const r = await uploadImage(f); setHeroImageUrl(r.url); 
                  }} />
                </Button>
              </Box>
              {heroImageUrl && <Box sx={{ mb: 3, maxWidth: 600 }}><SafeImage src={heroImageUrl} alt="Hero" sx={{ width: '100%' }} /></Box>}
              
              <Typography variant="h6" sx={{ mb: 2 }}>Галерея</Typography>
              <Button component="label" variant="outlined" sx={{ mb: 2 }}>
                Загрузить
                <input hidden type="file" accept="image/*" multiple onChange={async (e) => { 
                  const files = Array.from(e.target.files || []); 
                  for (const f of files) { const r = await uploadImage(f); setGallery(prev => [...prev, r.url]); }
                }} />
              </Button>
              <Grid container spacing={2}>
                {gallery?.map((g, i) => {
                  const url = typeof g === 'string' ? g : g?.url || '';
                  return (
                    <Grid item xs={6} sm={4} md={3} key={i}>
                      <Box sx={{ position: 'relative' }}>
                        <SafeImage src={url} alt={`Gallery ${i}`} sx={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 1 }} />
                        <IconButton size="small" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff' }}>×</IconButton>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {activeTab === 3 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Инструменты (теги)</Typography>
              <TextField fullWidth placeholder="React, TypeScript (через запятую)" value={(tools || []).join(', ')} onChange={(e) => setTools(e.target.value.split(',').map(s => s.trim()))} sx={{ mb: 3 }} />
              <Typography variant="h6" sx={{ mb: 2 }}>KPI</Typography>
              {metricsPairs.map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField size="small" label="Ключ" value={k} onChange={(e) => { const next = { ...metrics } as any; delete next[k]; next[e.target.value] = v; setMetrics(next); }} />
                  <TextField size="small" label="Значение" type="number" value={v} onChange={(e) => { const next = { ...metrics } as any; next[k] = Number(e.target.value); setMetrics(next); }} />
                </Box>
              ))}
              <Button size="small" onClick={() => setMetrics({ ...metrics, [`kpi_${metricsPairs.length+1}`]: 0 })}>+ KPI</Button>
            </Paper>
          )}
          {activeTab === 4 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">SEO настройки</Typography>
                <Button variant="contained" startIcon={<AutoFixHighIcon />} onClick={generateSeoFromContent}>Заполнить автоматически</Button>
              </Box>
              <TextField fullWidth label="Meta Title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} sx={{ mb: 2 }} inputProps={{ maxLength: 60 }} helperText={`${seoTitle.length}/60`} />
              <TextField fullWidth label="Meta Description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} sx={{ mb: 2 }} multiline rows={3} inputProps={{ maxLength: 160 }} helperText={`${seoDescription.length}/160`} />
              <TextField fullWidth label="Meta Keywords" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="OG Image URL" value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} sx={{ mb: 2 }} />
              {ogImageUrl && <Box sx={{ mt: 2, maxWidth: 400 }}><SafeImage src={ogImageUrl} alt="OG preview" sx={{ width: '100%' }} /></Box>}
            </Paper>
          )}

        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Действия</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <Switch checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              <Typography>Опубликован</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" fullWidth onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Сохранение...' : (isNew ? 'Создать' : 'Сохранить')}
              </Button>
              {!isNew && (
                <>
                  <Button variant="outlined" fullWidth onClick={() => window.open(`/cases/${id}`, '_blank')}>Открыть</Button>
                  <Button color="error" fullWidth onClick={() => delMut.mutate()} disabled={delMut.isPending}>Удалить</Button>
                </>
              )}
            </Box>
            
            <Accordion sx={{ mt: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2">contentJson (debug)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre style={{ fontSize: '0.65rem', overflow: 'auto', maxHeight: 300 }}>{JSON.stringify(contentJson, null, 2)}</pre>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
