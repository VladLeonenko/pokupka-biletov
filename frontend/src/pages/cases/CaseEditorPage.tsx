import { useEffect, useMemo, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCase, getCase, setCasePublished, upsertCase } from '@/services/cmsApi';
import { Box, Button, Chip, Grid, Paper, Switch, TextField, Typography, FormControlLabel, MenuItem, Select, FormControl, InputLabel, Tabs, Tab, IconButton } from '@mui/material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { uploadImage } from '@/services/cmsApi';
import { SafeImage } from '@/components/common/SafeImage';
import { useToast } from '@/components/common/ToastProvider';
import { resolveImageUrl } from '@/utils/resolveImageUrl';

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
    queryFn: () => {
      if (!id || isNew) return null;
      return getCase(id);
    },
    enabled: !!id && !isNew && !templateSlug,
  });
  
  // Use template data if creating from template
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
  const [templateType, setTemplateType] = useState<string>('');
  const [isTemplate, setIsTemplate] = useState(false);
  const [category, setCategory] = useState<'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | ''>('');
  const [activeTab, setActiveTab] = useState(0);
  const quillRef = useRef<any>(null);
  const navigate = useNavigate();

  // Используем ref для отслеживания, была ли мутация сохранения
  const isSavingRef = useRef(false);

  useEffect(() => {
    console.log('[DEBUG] useEffect triggered:', {
      hasCaseData: !!caseData,
      isSavingRef: isSavingRef.current,
      isNew,
      hasTemplateData: !!templateData,
      hasData: !!data,
      dataIsPublished: data?.isPublished,
      currentIsPublished: isPublished
    });
    
    if (caseData && !isSavingRef.current) {
      // If creating from template, copy data but change slug and title
      if (templateData && isNew) {
        console.log('[DEBUG] Setting data from template');
        setSlug('');
        setTitle(caseData.title + ' (копия)');
        setSummary(caseData.summary || '');
        setHeroImageUrl(caseData.heroImageUrl || '');
        setContentHtml(caseData.contentHtml || '');
        setMetrics(caseData.metrics || {});
        setTools(caseData.tools || []);
        const galleryData = caseData.gallery || [];
        setGallery(Array.isArray(galleryData) ? galleryData : []);
        setIsPublished(false);
        setContentJson(caseData.contentJson || {});
        setTemplateType('');
        setIsTemplate(false);
        setCategory((caseData as any).category || '');
      } else if (data) {
        console.log('[DEBUG] Setting data from DB:', {
          isPublished: data.isPublished,
          willSetIsPublished: !!data.isPublished
        });
        setSlug(data.slug);
        setTitle(data.title);
        setSummary(data.summary || '');
        setHeroImageUrl(data.heroImageUrl || '');
        setContentHtml(data.contentHtml || '');
        setMetrics(data.metrics || {});
        setTools(data.tools || []);
        const galleryData = data.gallery || [];
        setGallery(Array.isArray(galleryData) ? galleryData : []);
        setIsPublished(!!data.isPublished);
        setContentJson(data.contentJson || {});
        setTemplateType(data.templateType || '');
        setIsTemplate(!!data.isTemplate);
        setCategory((data as any).category || '');
      }
    } else if (isSavingRef.current) {
      console.log('[DEBUG] useEffect SKIPPED because isSavingRef.current = true');
    }
  }, [caseData, templateData, data, isNew]);

  const saveMut = useMutation({
    mutationFn: async () => {
      console.log('[DEBUG] saveMut.mutationFn START:', {
        isPublished: isPublished,
        isSavingRefBefore: isSavingRef.current
      });
      isSavingRef.current = true;
      const payload = { slug: isNew ? slug : (id as string), title, summary, heroImageUrl, contentHtml, metrics, tools, gallery, contentJson, isPublished, category: category || null } as any;
      console.log('[DEBUG] Saving case with payload:', {
        ...payload,
        isPublished: payload.isPublished,
        contentJson: typeof payload.contentJson === 'object' ? JSON.stringify(payload.contentJson).substring(0, 200) : payload.contentJson
      });
      await upsertCase(payload);
      console.log('[DEBUG] upsertCase completed');
    },
    onSuccess: async () => {
      showToast(isNew ? 'Кейс успешно создан!' : 'Кейс успешно сохранен!', 'success');
      await queryClient.invalidateQueries({ queryKey: ['cases'] });
      if (isNew) {
      navigate('/admin/cases');
      } else {
        const caseSlug = id as string;
        // Инвалидируем все запросы связанные с кейсом
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['case', caseSlug] }),
          queryClient.invalidateQueries({ queryKey: ['publicCase', caseSlug] }),
          queryClient.invalidateQueries({ queryKey: ['case', id] }), // Для превью
        ]);
        
        // Обновляем данные кейса из кэша после инвалидации, чтобы синхронизировать состояние
        console.log('[DEBUG] Fetching updated case from DB...');
        const updatedCase = await queryClient.fetchQuery({ 
          queryKey: ['case', caseSlug], 
          queryFn: () => getCase(caseSlug)
        });
        console.log('[DEBUG] Updated case from DB:', {
          isPublished: updatedCase?.isPublished,
          willSetIsPublished: updatedCase ? !!updatedCase.isPublished : 'no case'
        });
        if (updatedCase) {
          // Синхронизируем isPublished с данными из БД
          console.log('[DEBUG] Setting isPublished to:', !!updatedCase.isPublished);
          setIsPublished(!!updatedCase.isPublished);
        }
        
        // Сбрасываем флаг ПОСЛЕ обновления состояния, чтобы useEffect не перезаписал значения
        setTimeout(() => {
          console.log('[DEBUG] Resetting isSavingRef to false after 500ms');
          isSavingRef.current = false;
        }, 500);
      }
      // Сбрасываем флаг для нового кейса
      if (isNew) {
        isSavingRef.current = false;
      }
    },
    onError: (error: Error) => {
      console.error('Error saving case:', error);
      showToast('Ошибка при сохранении кейса: ' + (error.message || 'Неизвестная ошибка'), 'error');
      isSavingRef.current = false; // Сбрасываем флаг при ошибке
    }
  });

  const publishMut = useMutation({
    mutationFn: async (next: boolean) => setCasePublished(id as string, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['case', id] });
      setIsPublished((v) => !v);
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
  
  // Генерируем полный HTML из шаблона contentJson + contentHtml для HTML режима
  const fullHtmlForEditor = useMemo(() => {
    const contentJsonKeys = contentJson ? Object.keys(contentJson) : [];
    const hasContentJsonData = contentJson && Object.keys(contentJson).length > 0;
    console.log('[DEBUG] fullHtmlForEditor generating:', {
      hasContentHtml: !!contentHtml,
      contentHtmlLength: contentHtml?.length || 0,
      hasContentJson: !!contentJson,
      contentJsonKeys,
      hasContentJsonData,
      contentJsonString: contentJson ? JSON.stringify(contentJson).substring(0, 500) : 'none',
      hasHeader: !!contentJson?.header,
      hasAbout: !!contentJson?.about,
      hasTasks: !!contentJson?.tasks
    });
    
    let html = contentHtml || '';
    
    // Если есть contentJson, генерируем HTML структуру шаблона
    if (contentJson && Object.keys(contentJson).length > 0) {
      console.log('[DEBUG] Generating template HTML from contentJson');
      let templateHtml = '\n\n<!-- ========== ТЕМПЛЕЙТ ШАБЛОНА (Madeo) ========== -->\n\n';
      
      // Header/Banner секция
      if (contentJson.header?.banner) {
        templateHtml += `<!-- Header/Banner -->\n<section class="case-header" style="width: 100%; padding: 60px 0; background: #141414;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <img src="${contentJson.header.banner}" alt="Hero banner" style="width: 100%; height: auto; border-radius: 8px;" />\n`;
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // About секция
      if (contentJson.about?.text) {
        templateHtml += `<!-- About Section -->\n<section class="case-about" style="padding: 80px 0;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">О проекте</h2>\n`;
        templateHtml += `    <div style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); white-space: pre-wrap;">${contentJson.about.text}</div>\n`;
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Tasks секция
      if (contentJson.tasks?.text || contentJson.tasks?.laptopImage) {
        templateHtml += `<!-- Tasks Section -->\n<section class="case-tasks" style="padding: 80px 0; background: #1a1a1a;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Задачи</h2>\n`;
        if (contentJson.tasks.text) {
          templateHtml += `    <div style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); white-space: pre-wrap; margin-bottom: 40px;">${contentJson.tasks.text}</div>\n`;
        }
        if (contentJson.tasks.laptopImage) {
          templateHtml += `    <img src="${contentJson.tasks.laptopImage}" alt="Tasks laptop" style="width: 100%; max-width: 800px; height: auto; border-radius: 8px;" />\n`;
        }
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Solution секция
      if (contentJson.solution?.text || contentJson.solution?.phoneImage) {
        templateHtml += `<!-- Solution Section -->\n<section class="case-solution" style="padding: 80px 0;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Решение</h2>\n`;
        if (contentJson.solution.text) {
          templateHtml += `    <div style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); white-space: pre-wrap; margin-bottom: 40px;">${contentJson.solution.text}</div>\n`;
        }
        if (contentJson.solution.phoneImage) {
          templateHtml += `    <img src="${contentJson.solution.phoneImage}" alt="Solution phone" style="width: 100%; max-width: 400px; height: auto; border-radius: 8px;" />\n`;
        }
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Typography секция
      if (contentJson.typography?.image) {
        templateHtml += `<!-- Typography Section -->\n<section class="case-typography" style="padding: 80px 0; background: #1a1a1a;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Типографика</h2>\n`;
        templateHtml += `    <img src="${contentJson.typography.image}" alt="Typography" style="width: 100%; max-width: 900px; height: auto; border-radius: 8px;" />\n`;
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Colors секция
      if (contentJson.colors?.image) {
        templateHtml += `<!-- Colors Section -->\n<section class="case-colors" style="padding: 80px 0;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Цветовая схема</h2>\n`;
        templateHtml += `    <img src="${contentJson.colors.image}" alt="Colors" style="width: 100%; max-width: 900px; height: auto; border-radius: 8px;" />\n`;
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Tools секция
      if (contentJson.tools?.text || (contentJson.tools?.icons && contentJson.tools.icons.length > 0)) {
        templateHtml += `<!-- Tools Section -->\n<section class="case-tools" style="padding: 80px 0; background: #1a1a1a;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Инструменты</h2>\n`;
        if (contentJson.tools.text) {
          templateHtml += `    <div style="font-size: 1.125rem; line-height: 1.8; color: rgba(255, 255, 255, 0.9); white-space: pre-wrap; margin-bottom: 40px;">${contentJson.tools.text}</div>\n`;
        }
        if (contentJson.tools.icons && contentJson.tools.icons.length > 0) {
          templateHtml += `    <div style="display: flex; flex-wrap: wrap; gap: 20px;">\n`;
          contentJson.tools.icons.forEach((icon: string) => {
            templateHtml += `      <img src="${icon}" alt="Tool icon" style="height: 60px; width: auto;" />\n`;
          });
          templateHtml += `    </div>\n`;
        }
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Stats секция
      if (contentJson.stats?.image) {
        templateHtml += `<!-- Stats Section -->\n<section class="case-stats" style="padding: 80px 0;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Статистика</h2>\n`;
        templateHtml += `    <img src="${contentJson.stats.image}" alt="Stats" style="width: 100%; max-width: 900px; height: auto; border-radius: 8px;" />\n`;
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      // Results секция
      if (contentJson.results?.days || contentJson.results?.pages) {
        templateHtml += `<!-- Results Section -->\n<section class="case-results" style="padding: 80px 0; background: #1a1a1a;">\n`;
        templateHtml += `  <div class="container" style="max-width: 1170px; margin: 0 auto; padding: 0 16px;">\n`;
        templateHtml += `    <h2 style="font-size: 2.5rem; font-weight: 300; margin-bottom: 30px; color: #fff;">Результаты</h2>\n`;
        if (contentJson.results.days) {
          templateHtml += `    <div style="font-size: 1.5rem; color: rgba(255, 255, 255, 0.9); margin-bottom: 20px;">Дней разработки: ${contentJson.results.days}</div>\n`;
        }
        if (contentJson.results.pages) {
          templateHtml += `    <div style="font-size: 1.5rem; color: rgba(255, 255, 255, 0.9);">Страниц: ${contentJson.results.pages}</div>\n`;
        }
        templateHtml += `  </div>\n</section>\n\n`;
      }
      
      templateHtml += '<!-- ========== КОНЕЦ ТЕМПЛЕЙТА ========== -->\n\n';
      
      // Добавляем JSON данные
      const jsonSection = '<!-- Content JSON (Template Data) -->\n<script type="application/json" id="case-content-json">\n' + JSON.stringify(contentJson, null, 2) + '\n</script>\n';
      
      html = html + templateHtml + jsonSection;
      console.log('[DEBUG] Generated full HTML:', {
        templateHtmlLength: templateHtml.length,
        totalHtmlLength: html.length,
        preview: html.substring(0, 500)
      });
    } else if (contentHtml) {
      // Если нет contentJson, просто добавляем JSON скрипт если есть contentJson объект (пустой)
      html = contentHtml;
      console.log('[DEBUG] No contentJson, using only contentHtml, length:', html.length);
    }
    
    console.log('[DEBUG] fullHtmlForEditor result length:', html.length);
    console.log('[DEBUG] fullHtmlForEditor preview (first 1000 chars):', html.substring(0, 1000));
    return html;
  }, [contentHtml, contentJson]);

  const setCJ = (path: string, value: any) => {
    setContentJson((prev: any) => {
      const next = { ...(prev || {}) } as any;
      const parts = path.split('.');
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        cur[p] = cur[p] || {};
        cur = cur[p];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  if (!data && !isNew && !templateData) return <Typography>Страница не найдена</Typography>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {isNew ? (templateData ? `Новый кейс на основе "${templateData.title}"` : 'Новый кейс') : `Кейс: ${title}`}
      </Typography>
      
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Основное" />
          <Tab label="Изображения" />
          <Tab label="Детали" />
          <Tab label="Шаблон" />
        </Tabs>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {/* Основное */}
          {activeTab === 0 && (
            <Paper sx={{ p: 3 }}>
            {isNew && (
              <TextField 
                fullWidth 
                label="Slug" 
                sx={{ mb: 2 }} 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)}
                helperText="Уникальный идентификатор (например: my-new-case)"
                required
              />
            )}
              <TextField 
                fullWidth 
                label="Заголовок" 
                sx={{ mb: 2 }} 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required
              />
              <TextField 
                fullWidth 
                label="Краткое описание" 
                multiline 
                rows={3}
                sx={{ mb: 2 }} 
                value={summary} 
                onChange={(e) => setSummary(e.target.value)} 
                helperText="Краткое описание кейса для превью"
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">Контент</Typography>
                <FormControlLabel control={<Switch checked={htmlMode} onChange={(e)=>setHtmlMode(e.target.checked)} />} label="HTML режим" />
              </Box>
              {!htmlMode && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'info.light', borderRadius: 1, fontSize: '0.875rem' }}>
                  💡 <strong>Совет:</strong> Чтобы вставить изображение в любое место текста, нажмите кнопку <strong>"Image"</strong> (📷) в панели инструментов редактора. Изображение будет загружено и вставлено в позицию курсора.
            </Box>
              )}
            {htmlMode ? (
                <TextField 
                  fullWidth 
                  multiline 
                  minRows={30}
                  maxRows={100}
                  value={fullHtmlForEditor} 
                  onChange={(e) => {
                    // При изменении, берем только часть до JSON комментария
                    const newValue = e.target.value;
                    const jsonIndex = newValue.indexOf('<!-- Content JSON');
                    if (jsonIndex >= 0) {
                      setContentHtml(newValue.substring(0, jsonIndex).trim());
                    } else {
                      setContentHtml(newValue);
                    }
                  }} 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.875rem',
                    '& textarea': {
                      overflowY: 'auto !important',
                      maxHeight: '80vh',
                    }
                  }} 
                />
              ) : (
                <Box sx={{ '& .ql-container': { minHeight: 300 } }}>
                  <ReactQuill 
                    theme="snow" 
                    value={contentHtml || ''} 
                    onChange={(value) => {
                      setContentHtml(value);
                    }}
                    modules={{
                      toolbar: {
                        container: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ color: [] }, { background: [] }],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          ['blockquote', 'code-block', 'link', 'image'],
                          ['clean'],
                        ],
                        handlers: {
                          image: () => {
                            const input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            input.click();
                            input.onchange = async () => {
                              const file = input.files?.[0];
                              if (!file) return;
                              const quill = quillRef.current?.getEditor();
                              if (!quill) {
                                console.error('Quill editor not found');
                                return;
                              }
                              try {
                                const result = await uploadImage(file);
                                const range = quill.getSelection(true);
                                if (range) {
                                  quill.insertEmbed(range.index, 'image', result.url);
                                  quill.setSelection(range.index + 1);
                                }
                                showToast('Изображение загружено в контент!', 'success');
                              } catch (err: any) {
                                console.error('Ошибка загрузки изображения:', err);
                                showToast(`Ошибка загрузки изображения: ${err.message || 'Неизвестная ошибка'}`, 'error');
                              }
                            };
                          }
                        }
                      }
                    }}
                    ref={(el: any) => { 
                      if (el) {
                        quillRef.current = el;
                      }
                    }}
                  />
                </Box>
            )}
          </Paper>
          )}

          {/* Изображения */}
          {activeTab === 1 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Hero изображение</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TextField 
                  fullWidth 
                  label="Hero изображение URL" 
                  value={heroImageUrl} 
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  sx={{ flex: 1, minWidth: 300 }}
                />
                <Button component="label" variant="outlined" sx={{ whiteSpace: 'nowrap' }}>
                  Загрузить
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f = e.target.files?.[0]; 
                    if (!f) return; 
                    try {
                      const r = await uploadImage(f); 
                      setHeroImageUrl(r.url); 
                      showToast('Hero изображение успешно загружено!', 'success');
                    } catch (err: any) {
                      console.error('Ошибка загрузки Hero изображения:', err);
                      showToast(`Ошибка загрузки Hero изображения: ${err.message || 'Неизвестная ошибка'}`, 'error');
                    }
                  }} />
                </Button>
              </Box>
              {heroImageUrl && (
                <Box sx={{ mb: 3, borderRadius: 1, overflow: 'hidden', maxWidth: 600 }}>
                  <SafeImage src={heroImageUrl} alt="Hero preview" sx={{ width: '100%', height: 'auto' }} />
                </Box>
              )}

              <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>Галерея</Typography>
              <TextField 
                fullWidth 
                placeholder="Вставьте URL изображения и нажмите Enter" 
                onKeyDown={(e) => {
                  const input = e.target as HTMLInputElement;
                  if (e.key === 'Enter' && input.value.trim()) {
                    const url = input.value.trim();
                    const isObjectFormat = Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'object' && gallery[0] !== null && 'url' in gallery[0];
                    if (isObjectFormat) {
                      setGallery([...(gallery || []), { url, alt: '' }]);
                    } else {
                      setGallery([...(gallery || []), url]);
                    }
                    input.value = '';
                  }
                }}
                sx={{ mb: 2 }}
              />
              <Button 
                component="label" 
                variant="outlined" 
                size="small"
                sx={{ mb: 2 }}
              >
                Загрузить в галерею
                <input 
                  hidden 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={async (e) => { 
                    const files = Array.from(e.target.files || []); 
                    if (!files.length) return;
                    try {
                      for (const f of files) {
                        const r = await uploadImage(f);
                        const isObjectFormat = Array.isArray(gallery) && gallery.length > 0 && typeof gallery[0] === 'object' && gallery[0] !== null && 'url' in gallery[0];
                        if (isObjectFormat) {
                          setGallery([...(gallery || []), { url: r.url, alt: '' }]);
                        } else {
                          setGallery([...(gallery || []), r.url]);
                        }
                      }
                      showToast(`Изображения успешно загружены в галерею! (${files.length})`, 'success');
                    } catch (err: any) {
                      console.error('Ошибка загрузки в галерею:', err);
                      showToast(`Ошибка загрузки в галерею: ${err.message || 'Неизвестная ошибка'}`, 'error');
                    }
                  }} 
                />
              </Button>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {gallery?.map((g, i) => {
                  const url = typeof g === 'string' ? g : g?.url || '';
                  const alt = typeof g === 'object' ? g?.alt || '' : '';
                  return (
                    <Grid item xs={6} sm={4} md={3} key={i}>
                      <Box sx={{ position: 'relative' }}>
                        <SafeImage 
                          src={url} 
                          alt={alt || `Gallery ${i + 1}`}
                          sx={{ 
                            width: '100%', 
                            height: 200, 
                            objectFit: 'cover',
                            borderRadius: 1
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                          }}
                        >
                          ×
                        </IconButton>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {/* Детали */}
          {activeTab === 2 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Категория</Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Категория для портфолио</InputLabel>
                <Select
                  value={category}
                  label="Категория для портфолио"
                  onChange={(e) => setCategory(e.target.value as 'website' | 'mobile' | 'ai' | 'seo' | 'advertising' | 'design' | 'marketing' | '')}
                >
                  <MenuItem value="">Автоопределение</MenuItem>
                  <MenuItem value="website">Сайт</MenuItem>
                  <MenuItem value="mobile">Приложение</MenuItem>
                  <MenuItem value="ai">AI Boost Team</MenuItem>
                  <MenuItem value="seo">SEO продвижение</MenuItem>
                  <MenuItem value="marketing">Маркетинг</MenuItem>
                  <MenuItem value="advertising">Реклама</MenuItem>
                  <MenuItem value="design">Дизайн</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="h6" sx={{ mb: 2 }}>Инструменты</Typography>
              <TextField 
                fullWidth 
                placeholder="React, TypeScript, Node.js (через запятую)" 
                value={(tools || []).join(', ')} 
                onChange={(e) => setTools(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                sx={{ mb: 3 }}
              />

              <Typography variant="h6" sx={{ mb: 2 }}>Показатели (KPI)</Typography>
              {metricsPairs.map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField 
                    size="small" 
                    label="Ключ" 
                    value={k} 
                    onChange={(e) => {
                      const next = { ...metrics } as any; 
                      delete next[k]; 
                      next[e.target.value] = v; 
                      setMetrics(next);
                    }} 
                  />
                  <TextField 
                    size="small" 
                    label="Значение" 
                    type="number" 
                    value={v} 
                    onChange={(e) => {
                      const next = { ...metrics } as any; 
                      next[k] = Number(e.target.value); 
                      setMetrics(next);
                    }} 
                  />
                </Box>
              ))}
              <Button size="small" onClick={() => setMetrics({ ...(metrics || {}), [`kpi_${metricsPairs.length+1}`]: 0 })}>
                + Добавить KPI
              </Button>
            </Paper>
          )}

          {/* Шаблон */}
          {activeTab === 3 && (
            <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Шаблон Madeo (структурированные поля)</Typography>
            <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <Box>
                <TextField label="Баннер (URL)" fullWidth value={contentJson.header?.banner || ''} onChange={(e) => setCJ('header.banner', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить баннер
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('header.banner', r.url); 
                      showToast('Баннер успешно загружен!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки баннера:', err); 
                      showToast(`Ошибка загрузки баннера: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
              </Button>
                {(() => {
                  const bannerUrl = contentJson?.header?.banner;
                  const hasBanner = bannerUrl && String(bannerUrl).trim();
                  const resolvedUrl = hasBanner ? resolveImageUrl(String(bannerUrl)) : null;
                  console.log('[DEBUG] Banner preview check:', {
                    hasContentJson: !!contentJson,
                    hasHeader: !!contentJson?.header,
                    bannerUrl,
                    hasBanner: !!hasBanner,
                    resolvedUrl
                  });
                  return hasBanner ? (
                    <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                      <img 
                        src={resolvedUrl || ''} 
                        alt="Баннер preview" 
                        style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                        onError={(e) => {
                          console.error('[DEBUG] Banner image load error:', resolvedUrl);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.style.minHeight = '0';
                            parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                          }
                        }}
                        onLoad={(e) => {
                          console.log('[DEBUG] Banner image loaded successfully:', resolvedUrl);
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.style.minHeight = 'auto';
                          }
                        }}
                      />
                    </Box>
                  ) : null;
                })()}
              </Box>
              <TextField label="О проекте (текст)" fullWidth multiline minRows={3} value={contentJson.about?.text || ''} onChange={(e) => setCJ('about.text', e.target.value)} />
              <TextField label="Задачи (текст)" fullWidth multiline minRows={3} value={contentJson.tasks?.text || ''} onChange={(e) => setCJ('tasks.text', e.target.value)} />
              <Box>
                <TextField label="Задачи: изображение ноутбука (URL)" fullWidth value={contentJson.tasks?.laptopImage || ''} onChange={(e) => setCJ('tasks.laptopImage', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить изображение ноутбука
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('tasks.laptopImage', r.url); 
                      showToast('Изображение ноутбука успешно загружено!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки изображения ноутбука:', err); 
                      showToast(`Ошибка загрузки изображения ноутбука: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
                </Button>
                {contentJson?.tasks?.laptopImage && String(contentJson.tasks.laptopImage).trim() && (
                  <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                    <img 
                      src={resolveImageUrl(contentJson.tasks.laptopImage)} 
                      alt="Ноутбук preview" 
                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = '0';
                          parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = 'auto';
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              <TextField label="Решение (текст)" fullWidth multiline minRows={3} value={contentJson.solution?.text || ''} onChange={(e) => setCJ('solution.text', e.target.value)} />
              <Box>
                <TextField label="Решение: изображение телефона (URL)" fullWidth value={contentJson.solution?.phoneImage || ''} onChange={(e) => setCJ('solution.phoneImage', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить изображение телефона
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('solution.phoneImage', r.url); 
                      showToast('Изображение телефона успешно загружено!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки изображения телефона:', err); 
                      showToast(`Ошибка загрузки изображения телефона: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
                </Button>
                {contentJson?.solution?.phoneImage && String(contentJson.solution.phoneImage).trim() && (
                  <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                    <img 
                      src={resolveImageUrl(contentJson.solution.phoneImage)} 
                      alt="Телефон preview" 
                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = '0';
                          parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = 'auto';
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              <Box>
                <TextField label="Типографика (изображение URL)" fullWidth value={contentJson.typography?.image || ''} onChange={(e) => setCJ('typography.image', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить типографику
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('typography.image', r.url); 
                      showToast('Изображение типографики успешно загружено!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки типографики:', err); 
                      showToast(`Ошибка загрузки типографики: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
              </Button>
                {contentJson?.typography?.image && String(contentJson.typography.image).trim() && (
                  <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                    <img 
                      src={resolveImageUrl(contentJson.typography.image)} 
                      alt="Типографика preview" 
                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = '0';
                          parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = 'auto';
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              <Box>
                <TextField label="Цветовая схема (изображение URL)" fullWidth value={contentJson.colors?.image || ''} onChange={(e) => setCJ('colors.image', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить цветовую схему
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('colors.image', r.url); 
                      showToast('Изображение цветовой схемы успешно загружено!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки цветовой схемы:', err); 
                      showToast(`Ошибка загрузки цветовой схемы: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
              </Button>
                {contentJson?.colors?.image && String(contentJson.colors.image).trim() && (
                  <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                    <img 
                      src={resolveImageUrl(contentJson.colors.image)} 
                      alt="Цветовая схема preview" 
                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = '0';
                          parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = 'auto';
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              <TextField label="Инструменты (текст)" fullWidth multiline minRows={2} value={contentJson.tools?.text || ''} onChange={(e) => setCJ('tools.text', e.target.value)} />
              <TextField label="Иконки инструментов (URL через запятую)" fullWidth value={(contentJson.tools?.icons || []).join(', ')} onChange={(e) => setCJ('tools.icons', e.target.value.split(',').map((s)=>s.trim()).filter(Boolean))} />
              <Box>
                <TextField label="Статистика (изображение URL)" fullWidth value={contentJson.stats?.image || ''} onChange={(e) => setCJ('stats.image', e.target.value)} sx={{ mb: 1 }} />
                <Button size="small" component="label" variant="outlined" sx={{ mb: 1 }}>Загрузить статистику
                  <input hidden type="file" accept="image/*" onChange={async (e) => { 
                    const f=e.target.files?.[0]; if(!f) return; 
                    try { 
                      const r=await uploadImage(f); 
                      setCJ('stats.image', r.url); 
                      showToast('Изображение статистики успешно загружено!', 'success'); 
                    } catch (err: any) { 
                      console.error('Ошибка загрузки статистики:', err); 
                      showToast(`Ошибка загрузки статистики: ${err.message || 'Неизвестная ошибка'}`, 'error'); 
                    }
                  }} />
              </Button>
                {contentJson?.stats?.image && String(contentJson.stats.image).trim() && (
                  <Box sx={{ mt: 2, mb: 2, borderRadius: 1, overflow: 'hidden', maxWidth: 400, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', minHeight: 200 }}>
                    <img 
                      src={resolveImageUrl(contentJson.stats.image)} 
                      alt="Статистика preview" 
                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: 200, objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = '0';
                          parent.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">Изображение не загружено</div>';
                        }
                      }}
                      onLoad={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          parent.style.minHeight = 'auto';
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>
              <TextField label="Результат: дни" fullWidth value={contentJson.results?.days || ''} onChange={(e) => setCJ('results.days', e.target.value)} />
              <TextField label="Результат: страницы" fullWidth value={contentJson.results?.pages || ''} onChange={(e) => setCJ('results.pages', e.target.value)} />
              <TextField label="Команда (name|role|image; через ; )" fullWidth value={(contentJson.team?.members || []).map((m:any)=>`${m.name}|${m.role}|${m.image}`).join('; ')} onChange={(e) => {
                const val = e.target.value;
                const members = val.split(';').map(s=>s.trim()).filter(Boolean).map(s=>{ const [name,role,image] = s.split('|').map(x=>x?.trim()); return { name, role, image }; });
                setCJ('team.members', members);
              }} />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button size="small" onClick={() => setContentJson({
                header: { banner: '' },
                about: { text: '' },
                tasks: { text: '' },
                solution: { text: '' },
                typography: { image: '' },
                colors: { image: '' },
                tools: { text: '', icons: [] },
                stats: { image: '' },
                results: { days: '', pages: '' },
                team: { members: [] },
              })}>Сбросить шаблон</Button>
            </Box>
          </Paper>
          )}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Действия</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
              <Switch 
                checked={isPublished} 
                onChange={(e) => {
                  const newValue = e.target.checked;
                  console.log('[DEBUG] Switch changed:', {
                    oldValue: isPublished,
                    newValue,
                    isSavingRef: isSavingRef.current
                  });
                  setIsPublished(newValue);
                }} 
              />
              <Typography>Опубликован</Typography>
              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                ({isPublished ? 'Да' : 'Нет'})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" fullWidth onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Сохранение...' : (isNew ? 'Создать' : 'Сохранить')}
              </Button>
              {!isNew && (
                <>
                  <Button fullWidth onClick={() => publishMut.mutate(!isPublished)} disabled={publishMut.isPending}>
                    {isPublished ? 'Снять с публикации' : 'Опубликовать'}
                  </Button>
                  <Button fullWidth onClick={() => navigate(`/admin/cases/${encodeURIComponent(id as string)}/preview`)}>
                    Предпросмотр
                  </Button>
                  <Button color="error" fullWidth onClick={() => delMut.mutate()} disabled={delMut.isPending}>
                    {delMut.isPending ? 'Удаление...' : 'Удалить'}
                  </Button>
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}


