import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSeoOverrides, listSitePages, setSeoOverrides, suggestSeo } from '@/services/cmsApi';
import { generateOgImageOnOwnDomain } from '@/services/cmsApi';
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import { useMemo, useState, useEffect } from 'react';
import { useToast } from '@/components/common/ToastProvider';
import { SeoData } from '@/types/cms';
import { useAuth } from '@/auth/AuthProvider';

export function SeoPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { token } = useAuth();
  const { data: pages = [], isLoading: pagesLoading } = useQuery({ 
    queryKey: ['pages'], 
    queryFn: listSitePages,
    enabled: !!token, // Запрос только при наличии токена
    retry: false, // Не повторять при ошибке 401
    onError: (error: any) => {
      // Тихая обработка ошибок авторизации
      if (error?.message?.includes('Authentication required') || error?.message?.includes('401')) {
        return;
      }
    },
  });
  const { data: overrides = {} } = useQuery({ queryKey: ['seo-overrides'], queryFn: getSeoOverrides });
  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo(() => pages.find((p) => p.id === selectedId), [pages, selectedId]);
  
  // Local form state
  const [formData, setFormData] = useState<SeoData>({});

  // Update form data when page is selected or overrides change
  useEffect(() => {
    if (selectedId && overrides[selectedId]) {
      setFormData(overrides[selectedId]);
    } else {
      setFormData({});
    }
  }, [selectedId, overrides]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No page selected');
      const next = { ...overrides } as Record<string, any>;
      next[selectedId] = formData;
      await setSeoOverrides(next);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      showToast('SEO настройки успешно сохранены', 'success');
    },
    onError: (error) => {
      showToast('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), 'error');
    },
  });

  const [preset, setPreset] = useState<'WebPage' | 'Article' | 'Organization' | 'BreadcrumbList'>('WebPage');
  const [brandName, setBrandName] = useState('PrimeCoder');
  const [siteUrl, setSiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [lang, setLang] = useState('ru');
  const [locales, setLocales] = useState('ru,en');

  const suggest = useMutation({
    mutationFn: async (id: string) => {
      const page = pages.find(p => p.id === id);
      if (!page) throw new Error('Page not found');
      return await suggestSeo({ slug: page.path, title: page.title, html: page.html, type: preset, brandName, siteUrl, logoUrl, lang });
    },
    onSuccess: (s) => {
      setFormData({ ...formData, ...s });
      showToast('AI подсказки применены. Нажмите "Сохранить" для применения.', 'info');
    },
    onError: (error) => {
      showToast('Ошибка при получении подсказок: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), 'error');
    },
  });

  const handleSave = () => {
    if (!selectedId) {
      showToast('Выберите страницу', 'warning');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>SEO редактор</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <TextField
              select
              fullWidth
              label="Страница"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={pagesLoading}
              SelectProps={{
                displayEmpty: true,
              }}
            >
              {pagesLoading ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Загрузка...
                </MenuItem>
              ) : pages.length === 0 ? (
                <MenuItem disabled>Нет страниц</MenuItem>
              ) : (
                pages.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.title || p.id}</MenuItem>
                ))
              )}
            </TextField>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Подсказки (AI)</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              AI генерирует SEO-рекомендации с учетом правил: title 50-60 символов, ключевое слово в начале, бренд в конце. 
              Description 150-160 символов с призывом к действию.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><TextField select fullWidth size="small" label="Пресет" value={preset} onChange={(e) => setPreset(e.target.value as any)}>
                <MenuItem value="WebPage">WebPage</MenuItem>
                <MenuItem value="Article">Article</MenuItem>
                <MenuItem value="Organization">Organization</MenuItem>
                <MenuItem value="BreadcrumbList">Breadcrumbs</MenuItem>
              </TextField></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Бренд" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="PrimeCoder" helperText="Будет добавлен в конец title" /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Сайт (https://...)" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://example.com" /></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Логотип URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></Grid>
              <Grid item xs={12} md={2}><TextField fullWidth size="small" label="Язык" value={lang} onChange={(e) => setLang(e.target.value)} /></Grid>
              <Grid item xs={12} md={10} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => selectedId && suggest.mutate(selectedId)} 
                  disabled={!selectedId || suggest.isPending}
                >
                  {suggest.isPending ? 'Генерация...' : 'Подсказать (AI)'}
                </Button>
                {formData?.metaTitle && (
                  <Typography variant="caption" color={formData.metaTitle.length >= 50 && formData.metaTitle.length <= 60 ? 'success.main' : 'warning.main'}>
                    Title: {formData.metaTitle.length} символов {formData.metaTitle.length < 50 || formData.metaTitle.length > 60 ? '(оптимально 50-60)' : '✓'}
                  </Typography>
                )}
                {formData?.metaDescription && (
                  <Typography variant="caption" color={formData.metaDescription.length >= 150 && formData.metaDescription.length <= 160 ? 'success.main' : 'warning.main'}>
                    Description: {formData.metaDescription.length} символов {formData.metaDescription.length < 150 || formData.metaDescription.length > 160 ? '(оптимально 150-160)' : '✓'}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Быстрые действия</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Выберите страницу и используйте кнопки для быстрой генерации SEO-данных. Не забудьте нажать "Сохранить" внизу формы.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button 
                size="small" 
                disabled={!selected}
                onClick={() => {
                  if (!selected) {
                    showToast('Выберите страницу сначала', 'warning');
                    return;
                  }
                  setFormData({ ...formData, ogImageUrl: `https://dummyimage.com/1200x630/141414/ffbb00.png&text=${encodeURIComponent(selected.title || 'OG Image')}` });
                  showToast('Placeholder OG Image добавлен', 'success');
                }}
                title="Создает временное placeholder изображение для Open Graph"
              >
                OG Image (placeholder)
              </Button>
              <Button 
                size="small" 
                disabled={!selected}
                onClick={() => {
                  if (!selected) {
                    showToast('Выберите страницу сначала', 'warning');
                    return;
                  }
                  setFormData({ ...formData, structuredDataJson: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: selected.title, image: formData?.ogImageUrl || '', description: formData?.metaDescription || '' }, null, 2) });
                  showToast('Schema Product добавлен', 'success');
                }}
                title="Добавляет JSON-LD разметку для товара"
              >
                Schema Product
              </Button>
              <Button 
                size="small" 
                onClick={() => {
                  setFormData({ ...formData, structuredDataJson: JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: brandName || 'Company', url: siteUrl || '', image: logoUrl || '' }, null, 2) });
                  showToast('Schema LocalBusiness добавлен', 'success');
                }}
                title="Добавляет JSON-LD разметку для локального бизнеса (использует данные бренда выше)"
              >
                Schema LocalBusiness
              </Button>
              <Button 
                size="small" 
                onClick={() => {
                  setFormData({ ...formData, structuredDataJson: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [ { '@type': 'Question', name: 'Вопрос 1', acceptedAnswer: { '@type': 'Answer', text: 'Ответ 1' } }, { '@type': 'Question', name: 'Вопрос 2', acceptedAnswer: { '@type': 'Answer', text: 'Ответ 2' } } ] }, null, 2) });
                  showToast('Schema FAQ добавлен (отредактируйте вопросы и ответы в поле ниже)', 'success');
                }}
                title="Добавляет шаблон JSON-LD для FAQ-страницы"
              >
                Schema FAQ
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                disabled={!selected}
                onClick={async () => {
                  if (!selected) {
                    showToast('Выберите страницу сначала', 'warning');
                    return;
                  }
                  const title = encodeURIComponent(selected.title || '');
                  const logo = encodeURIComponent(logoUrl || '');
                  const og = `https://og-image.vercel.app/${title}.png?theme=dark&md=0&fontSize=86px${logo ? `&images=${logo}` : ''}`;
                  setFormData({ ...formData, ogImageUrl: og });
                  showToast('OG Image URL от Vercel добавлен', 'success');
                }}
                title="Генерирует OG изображение через Vercel OG Image Generator"
              >
                OG Image (Vercel OG)
              </Button>
              <Button 
                size="small" 
                variant="contained" 
                disabled={!selected}
                onClick={async () => {
                  if (!selected) {
                    showToast('Выберите страницу сначала', 'warning');
                    return;
                  }
                  try {
                    showToast('Генерация изображения...', 'info');
                    const r = await generateOgImageOnOwnDomain({ title: selected.title || '', logoUrl });
                    setFormData({ ...formData, ogImageUrl: r.url });
                    showToast('OG Image сгенерирован и загружен на ваш домен', 'success');
                  } catch (error) {
                    showToast('Ошибка генерации изображения: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), 'error');
                  }
                }}
                title="Генерирует OG изображение и загружает на ваш сервер"
              >
                OG Image (свой домен)
              </Button>
              <TextField 
                size="small" 
                label="Hreflang локали (ru,en)" 
                value={locales} 
                onChange={(e) => setLocales(e.target.value)} 
                sx={{ minWidth: 200 }}
                disabled={!selected}
                helperText={!selected ? 'Выберите страницу' : ''}
              />
              <Button 
                size="small" 
                disabled={!selected || !siteUrl}
                onClick={() => {
                  if (!selected) {
                    showToast('Выберите страницу сначала', 'warning');
                    return;
                  }
                  if (!siteUrl) {
                    showToast('Укажите URL сайта в поле "Сайт" выше', 'warning');
                    return;
                  }
                  const langs = locales.split(',').map(s => s.trim()).filter(Boolean);
                  const list = langs.map(l => ({ lang: l, url: (siteUrl || '') + selected.path }));
                  setFormData({ ...formData, hreflang: list });
                  showToast(`Hreflang создан для ${langs.length} локалей`, 'success');
                }}
                title="Создает массив hreflang ссылок для мультиязычности"
              >
                Собрать hreflang
              </Button>
            </Box>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            {selected ? (
              <Box>
                <TextField
                  fullWidth
                  label="Meta Title"
                  value={formData?.metaTitle || ''}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  sx={{ mb: 2 }}
                  helperText={
                    formData?.metaTitle 
                      ? `${formData.metaTitle.length} символов. ${formData.metaTitle.length >= 50 && formData.metaTitle.length <= 60 ? '✓ Оптимальная длина' : formData.metaTitle.length < 50 ? '⚠ Слишком коротко (рекомендуется 50-60)' : '⚠ Слишком длинно (макс. 60 символов)'}`
                      : 'Рекомендуемая длина: 50-60 символов. Формат: "Ключевое слово | Бренд"'
                  }
                  inputProps={{ maxLength: 60 }}
                />
                <TextField
                  fullWidth
                  label="Meta Description"
                  multiline
                  minRows={3}
                  value={formData?.metaDescription || ''}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  sx={{ mb: 2 }}
                  helperText={
                    formData?.metaDescription 
                      ? `${formData.metaDescription.length} символов. ${formData.metaDescription.length >= 150 && formData.metaDescription.length <= 160 ? '✓ Оптимальная длина' : formData.metaDescription.length < 150 ? '⚠ Рекомендуется 150-160 символов' : '⚠ Слишком длинно (макс. 160 символов)'}`
                      : 'Рекомендуемая длина: 150-160 символов. Должна содержать ключевое слово и призыв к действию'
                  }
                  inputProps={{ maxLength: 160 }}
                />
                <TextField 
                  fullWidth 
                  label="Canonical URL" 
                  value={formData?.canonicalUrl || ''} 
                  onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })} 
                  sx={{ mb: 2 }} 
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={formData?.robotsIndex ?? true} 
                        onChange={(e) => setFormData({ ...formData, robotsIndex: e.target.checked })} 
                      />
                    } 
                    label="Index" 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={formData?.robotsFollow ?? true} 
                        onChange={(e) => setFormData({ ...formData, robotsFollow: e.target.checked })} 
                      />
                    } 
                    label="Follow" 
                  />
                </Box>
                <TextField
                  fullWidth
                  label="OG Title"
                  value={formData?.ogTitle || ''}
                  onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="OG Description"
                  multiline
                  minRows={3}
                  value={formData?.ogDescription || ''}
                  onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="OG Image URL"
                  value={formData?.ogImageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
                />
                <TextField 
                  fullWidth 
                  label="Twitter Card (summary, summary_large_image)" 
                  value={formData?.twitterCard || ''} 
                  onChange={(e) => setFormData({ ...formData, twitterCard: e.target.value })} 
                  sx={{ mt: 2 }} 
                />
                <TextField 
                  fullWidth 
                  label="Twitter Site (@site)" 
                  value={formData?.twitterSite || ''} 
                  onChange={(e) => setFormData({ ...formData, twitterSite: e.target.value })} 
                  sx={{ mt: 2 }} 
                />
                <TextField 
                  fullWidth 
                  label="Twitter Creator (@creator)" 
                  value={formData?.twitterCreator || ''} 
                  onChange={(e) => setFormData({ ...formData, twitterCreator: e.target.value })} 
                  sx={{ mt: 2 }} 
                />
                <TextField 
                  fullWidth 
                  label="Structured Data (JSON-LD)" 
                  value={formData?.structuredDataJson || ''} 
                  onChange={(e) => setFormData({ ...formData, structuredDataJson: e.target.value })} 
                  multiline 
                  minRows={4} 
                  sx={{ mt: 2 }} 
                />
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  <Button size="small" onClick={() => setFormData({ ...formData, twitterCard: 'summary_large_image' })}>Card Large Image</Button>
                  <Button size="small" onClick={() => setFormData({ ...formData, structuredDataJson: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: selected.title, url: window.location.origin, potentialAction: { '@type': 'SearchAction', target: window.location.origin + '/?q={search_term_string}', 'query-input': 'required name=search_term_string' } }, null, 2) })}>Schema WebSite</Button>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !selectedId}
                    startIcon={saveMutation.isPending ? <CircularProgress size={20} /> : null}
                  >
                    {saveMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">Выберите страницу слева</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}


