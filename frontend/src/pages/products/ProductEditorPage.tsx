import { useEffect, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteProduct, getProduct, upsertProduct, uploadImage, generateProductSeoContent, generateProductCard, listTeamMembers } from '@/services/cmsApi';
import { listProductCategories } from '@/services/ecommerceApi';
import { resolveImageUrl } from '@/utils/resolveImageUrl';
import { slugify } from '@/utils/slugify';
import { getApiBase } from '@/utils/apiBase';
import { Box, Button, Grid, MenuItem, Paper, TextField, Typography, FormControlLabel, Switch, Accordion, AccordionSummary, AccordionDetails, IconButton, Chip, Autocomplete, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildIcon from '@mui/icons-material/Build';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate, useParams } from 'react-router-dom';
import { ProductItem, ProductContentJson } from '@/types/cms';
import { useToast } from '@/components/common/ToastProvider';

export function ProductEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data } = useQuery({ 
    queryKey: ['product', id], 
    queryFn: () => (id && !isNew ? getProduct(id!) : Promise.resolve(undefined)),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });
  const navigate = useNavigate();
  const isInitialized = useRef(false);
  
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [summary, setSummary] = useState('');
  const [fullDescriptionHtml, setFullDescriptionHtml] = useState('');
  const [priceCents, setPriceCents] = useState<number>(0);
  const [priceRubles, setPriceRubles] = useState<number>(0); // Для отображения в рублях
  const [currency, setCurrency] = useState('RUB');
  const [pricePeriod, setPricePeriod] = useState<'one_time' | 'monthly' | 'yearly'>('one_time');
  const [features, setFeatures] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [contentJson, setContentJson] = useState<ProductContentJson>({});
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [caseSlugs, setCaseSlugs] = useState<string[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  
  const { data: categories = [] } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => listProductCategories(false),
  });

  // Получаем список сотрудников команды
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => listTeamMembers(true), // Только активные
  });

  // Получаем список кейсов для выбора (публичные)
  const { data: cases = [] } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      const API_BASE = getApiBase();
      const res = await fetch(`${API_BASE}/api/public/cases`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((r: any) => ({
        slug: r.slug,
        title: r.title,
        summary: r.summary || '',
      }));
    },
  });

  // Сбрасываем флаг инициализации при смене продукта
  useEffect(() => {
    isInitialized.current = false;
  }, [id]);

  // Автоматическая генерация slug из названия для новых продуктов
  useEffect(() => {
    if (isNew && title && !slug) {
      const generatedSlug = slugify(title);
      if (generatedSlug) {
        setSlug(generatedSlug);
      }
    }
  }, [title, isNew, slug]);

  useEffect(() => {
    if (data && !isInitialized.current) {
      setSlug(data.slug);
      setTitle(data.title);
      setDescriptionHtml(data.descriptionHtml || '');
      setSummary(data.summary || '');
      setFullDescriptionHtml(data.fullDescriptionHtml || '');
      const cents = data.priceCents || 0;
      setPriceCents(cents);
      setPriceRubles(Math.round(cents / 100)); // Конвертируем копейки в рубли для отображения
      setCurrency(data.currency || 'RUB');
      setPricePeriod((data.pricePeriod as any) || 'one_time');
      setFeatures(data.features || []);
      setSortOrder(data.sortOrder || 0);
      setContentJson(data.contentJson || {});
      setCategoryId(data.categoryId);
      setImageUrl(data.imageUrl || '');
      setGallery(data.gallery || []);
      setTags(data.tags || []);
      setMetaTitle(data.metaTitle || '');
      setMetaDescription(data.metaDescription || '');
      setMetaKeywords(data.metaKeywords || '');
      setCaseSlugs(data.caseSlugs || []);
      setIsActive(data.isActive !== false);
      isInitialized.current = true;
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // Фильтруем пустые строки из галереи
      const filteredGallery = gallery.filter(url => url && url.trim());

      // Генерация slug для новых продуктов, если он не заполнен
      let finalSlug = isNew ? slug.trim() : (id as string);
      if (isNew) {
        if (!finalSlug) {
          const titleTrimmed = title.trim();
          if (!titleTrimmed) {
            throw new Error('Заполните название или slug перед сохранением');
          }
          finalSlug = slugify(titleTrimmed);
          if (!finalSlug) {
            throw new Error('Не удалось создать slug из названия. Используйте латиницу или заполните slug вручную.');
          }
          setSlug(finalSlug);
        } else {
          // Нормализуем существующий slug
          finalSlug = slugify(finalSlug) || finalSlug;
        }
      }

      const payload: ProductItem = {
        slug: finalSlug,
        title,
        descriptionHtml,
        summary: summary || undefined,
        fullDescriptionHtml: fullDescriptionHtml || undefined,
        priceCents: priceRubles > 0 ? priceRubles * 100 : 0, // Конвертируем рубли в копейки при сохранении
        currency,
        pricePeriod,
        features,
        sortOrder,
        contentJson: Object.keys(contentJson).length > 0 ? contentJson : undefined,
        categoryId,
        imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : undefined,
        gallery: filteredGallery.length > 0 ? filteredGallery : undefined,
        tags: tags.length > 0 ? tags : undefined,
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        metaKeywords: metaKeywords || undefined,
        caseSlugs: caseSlugs.length > 0 ? caseSlugs : undefined,
        isActive,
      };

      await upsertProduct(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Продукт сохранен', 'success');
      navigate('/admin/products');
    },
    onError: (error) => {
      showToast('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'), 'error');
    },
  });

  const delMut = useMutation({
    mutationFn: async () => deleteProduct(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Продукт удален', 'success');
      navigate('/products');
    },
  });

  const handleImageUpload = async (field: string, section?: string): Promise<string | null> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    return new Promise((resolve) => {
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        try {
          const result = await uploadImage(file);
          if (section) {
            setContentJson((prev) => ({
              ...prev,
              [section]: { ...(prev[section as keyof ProductContentJson] as any), [field]: result.url },
            }));
          } else {
            setContentJson((prev) => ({
              ...prev,
              backgroundImages: { ...prev.backgroundImages, [field]: result.url },
            }));
          }
          showToast('Изображение загружено', 'success');
          resolve(result.url);
        } catch (error) {
          showToast('Ошибка загрузки изображения', 'error');
          resolve(null);
        }
      };
      input.click();
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>{isNew ? 'Новый продукт' : `Продукт: ${title}`}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Шаблон /ads - Структурированный контент</Typography>
            
            {/* Header Section */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Шапка (Header)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Заголовок"
                      value={contentJson.header?.title || ''}
                      onChange={(e) => setContentJson({ ...contentJson, header: { ...contentJson.header, title: e.target.value } as any })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Описание"
                      value={contentJson.header?.description || ''}
                      onChange={(e) => setContentJson({ ...contentJson, header: { ...contentJson.header, description: e.target.value } as any })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Кнопка 1 (текст)"
                      value={contentJson.header?.primaryButtonText || ''}
                      onChange={(e) => setContentJson({ ...contentJson, header: { ...contentJson.header, primaryButtonText: e.target.value } as any })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Кнопка 2 (текст)"
                      value={contentJson.header?.secondaryButtonText || ''}
                      onChange={(e) => setContentJson({ ...contentJson, header: { ...contentJson.header, secondaryButtonText: e.target.value } as any })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Description Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Описание</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Заголовок"
                      value={contentJson.description?.title || ''}
                      onChange={(e) => setContentJson({ ...contentJson, description: { ...contentJson.description, title: e.target.value } as any })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      label="Текст"
                      value={contentJson.description?.text || ''}
                      onChange={(e) => setContentJson({ ...contentJson, description: { ...contentJson.description, text: e.target.value } as any })}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Price Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Прайс (Тарифы)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Заголовок секции"
                      value={contentJson.priceSection?.title || 'Прайс'}
                      onChange={(e) => setContentJson({
                        ...contentJson,
                        priceSection: { ...contentJson.priceSection, title: e.target.value, tariffs: contentJson.priceSection?.tariffs || [] } as any,
                      })}
                    />
                  </Grid>
                  {contentJson.priceSection?.tariffs?.map((tariff, idx) => (
                    <Grid item xs={12} key={tariff.id || idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="subtitle1">Тариф #{idx + 1}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              const newTariffs = contentJson.priceSection?.tariffs?.filter((_, i) => i !== idx) || [];
                              setContentJson({
                                ...contentJson,
                                priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any,
                              });
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" label="Название" value={tariff.name || ''} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, name: e.target.value };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" label="Подзаголовок" value={tariff.subtitle || ''} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, subtitle: e.target.value };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" label="Цена" value={tariff.price || ''} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, price: e.target.value };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth size="small" multiline rows={2} label="Описание" value={tariff.description || ''} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, description: e.target.value };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" multiline rows={4} label="Особенности (левая колонка, через Enter)" value={(tariff.featuresLeft || []).join('\n')} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, featuresLeft: e.target.value.split('\n').filter(Boolean) };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" multiline rows={4} label="Особенности (правая колонка, через Enter)" value={(tariff.featuresRight || []).join('\n')} onChange={(e) => {
                              const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                              newTariffs[idx] = { ...tariff, featuresRight: e.target.value.split('\n').filter(Boolean) };
                              setContentJson({ ...contentJson, priceSection: { ...contentJson.priceSection, tariffs: newTariffs } as any });
                            }} />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newTariffs = [...(contentJson.priceSection?.tariffs || [])];
                      newTariffs.push({ id: `tariff-${Date.now()}`, name: '', subtitle: '', price: '' });
                      setContentJson({ ...contentJson, priceSection: { title: contentJson.priceSection?.title || 'Прайс', tariffs: newTariffs } as any });
                    }}>
                      Добавить тариф
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Work Steps Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Этапы работы</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Заголовок" value={contentJson.workSteps?.title || ''} onChange={(e) => setContentJson({ ...contentJson, workSteps: { ...contentJson.workSteps, title: e.target.value, steps: contentJson.workSteps?.steps || [] } as any })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="Описание" value={contentJson.workSteps?.description || ''} onChange={(e) => setContentJson({ ...contentJson, workSteps: { ...contentJson.workSteps, description: e.target.value, steps: contentJson.workSteps?.steps || [] } as any })} />
                  </Grid>
                  {contentJson.workSteps?.steps?.map((step, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Этап #{step.number}</Typography>
                          <IconButton size="small" onClick={() => {
                            const newSteps = contentJson.workSteps?.steps?.filter((_, i) => i !== idx) || [];
                            setContentJson({ ...contentJson, workSteps: { ...contentJson.workSteps, steps: newSteps } as any });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <TextField fullWidth size="small" label="Номер" value={step.number} onChange={(e) => {
                              const newSteps = [...(contentJson.workSteps?.steps || [])];
                              newSteps[idx] = { ...step, number: e.target.value };
                              setContentJson({ ...contentJson, workSteps: { ...contentJson.workSteps, steps: newSteps } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <TextField fullWidth size="small" multiline rows={2} label="Описание" value={step.description} onChange={(e) => {
                              const newSteps = [...(contentJson.workSteps?.steps || [])];
                              newSteps[idx] = { ...step, description: e.target.value };
                              setContentJson({ ...contentJson, workSteps: { ...contentJson.workSteps, steps: newSteps } as any });
                            }} />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newSteps = [...(contentJson.workSteps?.steps || [])];
                      newSteps.push({ number: String(newSteps.length + 1), description: '' });
                      setContentJson({ ...contentJson, workSteps: { title: contentJson.workSteps?.title || '', description: contentJson.workSteps?.description || '', steps: newSteps } as any });
                    }}>
                      Добавить этап
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Stats Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Статистика</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Заголовок" value={contentJson.stats?.title || ''} onChange={(e) => setContentJson({ ...contentJson, stats: { ...contentJson.stats, title: e.target.value, items: contentJson.stats?.items || [] } as any })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="Описание" value={contentJson.stats?.description || ''} onChange={(e) => setContentJson({ ...contentJson, stats: { ...contentJson.stats, description: e.target.value, items: contentJson.stats?.items || [] } as any })} />
                  </Grid>
                  {contentJson.stats?.items?.map((item, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">#{idx + 1}</Typography>
                          <IconButton size="small" onClick={() => {
                            const newItems = contentJson.stats?.items?.filter((_, i) => i !== idx) || [];
                            setContentJson({ ...contentJson, stats: { ...contentJson.stats, items: newItems } as any });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <TextField fullWidth size="small" label="Значение" value={item.value} onChange={(e) => {
                          const newItems = [...(contentJson.stats?.items || [])];
                          newItems[idx] = { ...item, value: e.target.value };
                          setContentJson({ ...contentJson, stats: { ...contentJson.stats, items: newItems } as any });
                        }} sx={{ mb: 1 }} />
                        <TextField fullWidth size="small" multiline rows={2} label="Подпись" value={item.label} onChange={(e) => {
                          const newItems = [...(contentJson.stats?.items || [])];
                          newItems[idx] = { ...item, label: e.target.value };
                          setContentJson({ ...contentJson, stats: { ...contentJson.stats, items: newItems } as any });
                        }} />
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newItems = [...(contentJson.stats?.items || [])];
                      newItems.push({ value: '', label: '' });
                      setContentJson({ ...contentJson, stats: { title: contentJson.stats?.title || '', description: contentJson.stats?.description || '', items: newItems } as any });
                    }}>
                      Добавить показатель
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Team Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Команда</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Заголовок" value={contentJson.team?.title || ''} onChange={(e) => setContentJson({ ...contentJson, team: { ...contentJson.team, title: e.target.value, members: contentJson.team?.members || [] } as any })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="Описание" value={contentJson.team?.description || ''} onChange={(e) => setContentJson({ ...contentJson, team: { ...contentJson.team, description: e.target.value, members: contentJson.team?.members || [] } as any })} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Выберите сотрудников из команды:</Typography>
                    <Autocomplete
                      multiple
                      options={teamMembers}
                      getOptionLabel={(option) => `${option.name} - ${option.role}`}
                      value={teamMembers.filter(tm => 
                        contentJson.team?.members?.some((m: any) => m.teamMemberId === tm.id)
                      )}
                      onChange={(_, newValue) => {
                        const newMembers = newValue.map(tm => ({
                          teamMemberId: tm.id,
                          name: tm.name,
                          role: tm.role,
                          imageUrl: tm.imageUrl,
                        }));
                        setContentJson({ ...contentJson, team: { ...contentJson.team, members: newMembers } as any });
                      }}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {option.imageUrl && (
                            <Box
                              component="img"
                              src={option.imageUrl}
                              alt={option.name}
                              sx={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{option.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{option.role}</Typography>
                          </Box>
                        </Box>
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={`${option.name} - ${option.role}`}
                            {...getTagProps({ index })}
                            key={option.id}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Сотрудники команды"
                          placeholder="Выберите сотрудников"
                        />
                      )}
                    />
                  </Grid>
                  {contentJson.team?.members && contentJson.team.members.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Выбранные сотрудники:</Typography>
                      <Grid container spacing={2}>
                        {contentJson.team.members.map((member: any, idx: number) => {
                          const teamMember = teamMembers.find(tm => tm.id === member.teamMemberId);
                          return (
                            <Grid item xs={12} md={6} key={idx}>
                              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="subtitle2">#{idx + 1}</Typography>
                                  <IconButton size="small" onClick={() => {
                                    const newMembers = contentJson.team?.members?.filter((_: any, i: number) => i !== idx) || [];
                                    setContentJson({ ...contentJson, team: { ...contentJson.team, members: newMembers } as any });
                                  }}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  {teamMember?.imageUrl && (
                                    <Box
                                      component="img"
                                      src={resolveImageUrl(teamMember.imageUrl)}
                                      alt={teamMember.name}
                                      sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <Box>
                                    <Typography variant="body1" fontWeight={600}>{member.name || teamMember?.name}</Typography>
                                    <Typography variant="body2" color="text.secondary">{member.role || teamMember?.role}</Typography>
                                  </Box>
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* FAQ Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>FAQ (Часто задаваемые вопросы)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Заголовок раздела FAQ" value={contentJson.faq?.title || ''} onChange={(e) => setContentJson({ ...contentJson, faq: { ...contentJson.faq, title: e.target.value, items: contentJson.faq?.items || [] } as any })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={2} label="Описание раздела FAQ" value={contentJson.faq?.description || ''} onChange={(e) => setContentJson({ ...contentJson, faq: { ...contentJson.faq, description: e.target.value, items: contentJson.faq?.items || [] } as any })} />
                  </Grid>
                  {contentJson.faq?.items?.map((item, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Вопрос #{idx + 1}</Typography>
                          <IconButton size="small" onClick={() => {
                            const newItems = contentJson.faq?.items?.filter((_, i) => i !== idx) || [];
                            setContentJson({ ...contentJson, faq: { ...contentJson.faq, items: newItems } as any });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField fullWidth label="Вопрос" value={item.question || ''} onChange={(e) => {
                              const newItems = [...(contentJson.faq?.items || [])];
                              newItems[idx] = { ...item, question: e.target.value };
                              setContentJson({ ...contentJson, faq: { ...contentJson.faq, items: newItems } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth multiline rows={3} label="Ответ" value={item.answer || ''} onChange={(e) => {
                              const newItems = [...(contentJson.faq?.items || [])];
                              newItems[idx] = { ...item, answer: e.target.value };
                              setContentJson({ ...contentJson, faq: { ...contentJson.faq, items: newItems } as any });
                            }} />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newItems = [...(contentJson.faq?.items || [])];
                      newItems.push({ question: '', answer: '' });
                      setContentJson({ ...contentJson, faq: { title: contentJson.faq?.title || '', description: contentJson.faq?.description || '', items: newItems } as any });
                    }}>
                      Добавить вопрос
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Related Services */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Связанные услуги</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Заголовок" value={contentJson.relatedServices?.title || ''} onChange={(e) => setContentJson({ ...contentJson, relatedServices: { ...contentJson.relatedServices, title: e.target.value, services: contentJson.relatedServices?.services || [] } as any })} />
                  </Grid>
                  {contentJson.relatedServices?.services?.map((service, idx) => (
                    <Grid item xs={12} md={6} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">#{idx + 1}</Typography>
                          <IconButton size="small" onClick={() => {
                            const newServices = contentJson.relatedServices?.services?.filter((_, i) => i !== idx) || [];
                            setContentJson({ ...contentJson, relatedServices: { ...contentJson.relatedServices, services: newServices } as any });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              {service.imageUrl && <Chip label="Изображение загружено" size="small" color="success" />}
                              <Button size="small" onClick={() => handleImageUpload('imageUrl', 'relatedServices').then((url) => {
                                if (url) {
                                  const newServices = [...(contentJson.relatedServices?.services || [])];
                                  newServices[idx] = { ...service, imageUrl: url };
                                  setContentJson({ ...contentJson, relatedServices: { ...contentJson.relatedServices, services: newServices } as any });
                                }
                              })}>
                                {service.imageUrl ? 'Изменить' : 'Загрузить изображение'}
                              </Button>
                            </Box>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Название" value={service.title} onChange={(e) => {
                              const newServices = [...(contentJson.relatedServices?.services || [])];
                              newServices[idx] = { ...service, title: e.target.value };
                              setContentJson({ ...contentJson, relatedServices: { ...contentJson.relatedServices, services: newServices } as any });
                            }} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Ссылка" value={service.link || ''} onChange={(e) => {
                              const newServices = [...(contentJson.relatedServices?.services || [])];
                              newServices[idx] = { ...service, link: e.target.value };
                              setContentJson({ ...contentJson, relatedServices: { ...contentJson.relatedServices, services: newServices } as any });
                            }} />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newServices = [...(contentJson.relatedServices?.services || [])];
                      newServices.push({ title: '' });
                      setContentJson({ ...contentJson, relatedServices: { title: contentJson.relatedServices?.title || '', services: newServices } as any });
                    }}>
                      Добавить услугу
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Subscribe Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Подписка/Действия</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {contentJson.subscribe?.items?.map((item, idx) => (
                    <Grid item xs={12} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">#{idx + 1}</Typography>
                          <IconButton size="small" onClick={() => {
                            const newItems = contentJson.subscribe?.items?.filter((_, i) => i !== idx) || [];
                            setContentJson({ ...contentJson, subscribe: { items: newItems } });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              {item.iconUrl && <Chip label="Иконка загружена" size="small" color="success" />}
                              <Button size="small" onClick={() => handleImageUpload('iconUrl', 'subscribe').then((url) => {
                                if (url) {
                                  const newItems = [...(contentJson.subscribe?.items || [])];
                                  newItems[idx] = { ...item, iconUrl: url };
                                  setContentJson({ ...contentJson, subscribe: { items: newItems } });
                                }
                              })}>
                                {item.iconUrl ? 'Изменить иконку' : 'Загрузить иконку'}
                              </Button>
                            </Box>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Заголовок" value={item.title} onChange={(e) => {
                              const newItems = [...(contentJson.subscribe?.items || [])];
                              newItems[idx] = { ...item, title: e.target.value };
                              setContentJson({ ...contentJson, subscribe: { items: newItems } });
                            }} />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth size="small" multiline rows={2} label="Описание" value={item.description} onChange={(e) => {
                              const newItems = [...(contentJson.subscribe?.items || [])];
                              newItems[idx] = { ...item, description: e.target.value };
                              setContentJson({ ...contentJson, subscribe: { items: newItems } });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" label="Текст ссылки" value={item.linkText || ''} onChange={(e) => {
                              const newItems = [...(contentJson.subscribe?.items || [])];
                              newItems[idx] = { ...item, linkText: e.target.value };
                              setContentJson({ ...contentJson, subscribe: { items: newItems } });
                            }} />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField fullWidth size="small" label="URL ссылки" value={item.linkUrl || ''} onChange={(e) => {
                              const newItems = [...(contentJson.subscribe?.items || [])];
                              newItems[idx] = { ...item, linkUrl: e.target.value };
                              setContentJson({ ...contentJson, subscribe: { items: newItems } });
                            }} />
                          </Grid>
                        </Grid>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => {
                      const newItems = [...(contentJson.subscribe?.items || [])];
                      newItems.push({ title: '', description: '', linkText: 'Подробнее', linkUrl: '/' });
                      setContentJson({ ...contentJson, subscribe: { items: newItems } });
                    }}>
                      Добавить действие
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Background Images */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Фоновые изображения</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      {contentJson.backgroundImages?.grayBgUrl && <Chip label="Серый фон загружен" size="small" color="success" />}
                      <Button size="small" onClick={() => handleImageUpload('grayBgUrl')}>
                        {contentJson.backgroundImages?.grayBgUrl ? 'Изменить серый фон' : 'Загрузить серый фон'}
                      </Button>
                    </Box>
                    {contentJson.backgroundImages?.grayBgUrl && (
                      <TextField fullWidth size="small" label="URL серого фона" value={contentJson.backgroundImages.grayBgUrl} onChange={(e) => setContentJson({ ...contentJson, backgroundImages: { ...contentJson.backgroundImages, grayBgUrl: e.target.value } })} />
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                      {contentJson.backgroundImages?.yellowBgUrl && <Chip label="Желтый фон загружен" size="small" color="success" />}
                      <Button size="small" onClick={() => handleImageUpload('yellowBgUrl')}>
                        {contentJson.backgroundImages?.yellowBgUrl ? 'Изменить желтый фон' : 'Загрузить желтый фон'}
                      </Button>
                    </Box>
                    {contentJson.backgroundImages?.yellowBgUrl && (
                      <TextField fullWidth size="small" label="URL желтого фона" value={contentJson.backgroundImages.yellowBgUrl} onChange={(e) => setContentJson({ ...contentJson, backgroundImages: { ...contentJson.backgroundImages, yellowBgUrl: e.target.value } })} />
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* SEO Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>SEO настройки</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={generatingSeo ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                        onClick={async () => {
                          if (!title.trim()) {
                            showToast('Сначала укажите название товара', 'warning');
                            return;
                          }
                          setGeneratingSeo(true);
                          try {
                            const seoContent = await generateProductSeoContent(
                              title,
                              descriptionHtml || summary,
                              priceCents,
                              features
                            );
                            setDescriptionHtml(seoContent.descriptionHtml);
                            setSummary(seoContent.summary);
                            setFullDescriptionHtml(seoContent.fullDescriptionHtml);
                            setMetaTitle(seoContent.metaTitle);
                            setMetaDescription(seoContent.metaDescription);
                            setMetaKeywords(seoContent.metaKeywords);
                            if (seoContent.tags && seoContent.tags.length > 0) {
                              setTags([...new Set([...tags, ...seoContent.tags])]);
                            }
                            showToast('SEO контент сгенерирован', 'success');
                          } catch (err: any) {
                            showToast(err?.message || 'Ошибка генерации SEO контента', 'error');
                          } finally {
                            setGeneratingSeo(false);
                          }
                        }}
                        disabled={generatingSeo}
                      >
                        {generatingSeo ? 'Генерация...' : 'Генерировать SEO контент'}
                      </Button>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Meta Title (SEO заголовок)"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      helperText="Заголовок для поисковых систем (до 60 символов)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Meta Description (SEO описание)"
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      helperText="Описание для поисковых систем (до 160 символов)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Meta Keywords (ключевые слова, через запятую)"
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      helperText="Ключевые слова для поисковых систем"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Description Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Описание товара</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Краткое описание (анонс)"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      helperText="Краткое описание для карточки товара"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={5}
                      label="Описание (HTML)"
                      value={descriptionHtml}
                      onChange={(e) => setDescriptionHtml(e.target.value)}
                      helperText="Основное описание товара. Можно использовать HTML разметку"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={10}
                      label="Расширенное описание (HTML)"
                      value={fullDescriptionHtml}
                      onChange={(e) => setFullDescriptionHtml(e.target.value)}
                      helperText="Подробное описание товара. Можно использовать HTML разметку"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Gallery Section */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Галерея изображений</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {gallery.map((url, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2">Изображение #{idx + 1}</Typography>
                          <IconButton size="small" onClick={() => setGallery(gallery.filter((_, i) => i !== idx))}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          label="URL изображения"
                          value={url}
                          onChange={(e) => {
                            const newGallery = [...gallery];
                            newGallery[idx] = e.target.value;
                            setGallery(newGallery);
                          }}
                        />
                        <Button 
                          size="small" 
                          sx={{ mt: 1 }}
                          onClick={() => handleImageUpload('gallery').then((newUrl) => {
                            if (newUrl) {
                              const newGallery = [...gallery];
                              newGallery[idx] = newUrl;
                              setGallery(newGallery);
                            }
                          })}
                        >
                          Загрузить
                        </Button>
                      </Paper>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setGallery([...gallery, ''])}>
                      Добавить изображение
                    </Button>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Основная информация</Typography>
            {isNew && (
              <TextField 
                fullWidth 
                label="Slug (ЧПУ)" 
                sx={{ mb: 2 }} 
                value={slug} 
                onChange={(e) => {
                  const normalized = slugify(e.target.value) || e.target.value;
                  setSlug(normalized);
                }}
                helperText="Автоматически генерируется из названия. Можно редактировать вручную."
              />
            )}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <TextField 
                fullWidth 
                label="Название" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название товара или тему для генерации"
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={generatingCard ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                onClick={async () => {
                  const topic = title.trim() || 'товар';
                  setGeneratingCard(true);
                  try {
                    const cardContent = await generateProductCard(
                      topic,
                      title || undefined,
                      descriptionHtml || summary || undefined,
                      priceRubles > 0 ? priceRubles * 100 : undefined, // Конвертируем рубли в копейки
                      features.length > 0 ? features : undefined
                    );
                    // Заполняем все поля карточки товара
                    if (cardContent.title) setTitle(cardContent.title);
                    if (cardContent.summary) setSummary(cardContent.summary);
                    if (cardContent.descriptionHtml) {
                      setDescriptionHtml(cardContent.descriptionHtml);
                      // Если fullDescriptionHtml не задан, используем descriptionHtml
                      if (!fullDescriptionHtml) {
                        setFullDescriptionHtml(cardContent.descriptionHtml);
                      }
                    }
                    if (cardContent.features && cardContent.features.length > 0) {
                      setFeatures(cardContent.features);
                    }
                    if (cardContent.suggestedPriceCents) {
                      const cents = cardContent.suggestedPriceCents;
                      setPriceCents(cents);
                      setPriceRubles(Math.round(cents / 100)); // Конвертируем копейки в рубли
                    }
                    if (cardContent.metaTitle) setMetaTitle(cardContent.metaTitle);
                    if (cardContent.metaDescription) setMetaDescription(cardContent.metaDescription);
                    if (cardContent.tags && cardContent.tags.length > 0) {
                      setTags([...new Set([...tags, ...cardContent.tags])]);
                    }
                    showToast('Карточка товара заполнена', 'success');
                  } catch (err: any) {
                    showToast(err?.message || 'Ошибка генерации карточки товара', 'error');
                  } finally {
                    setGeneratingCard(false);
                  }
                }}
                disabled={generatingCard}
                sx={{ minWidth: 200, whiteSpace: 'nowrap' }}
              >
                {generatingCard ? 'Генерация...' : 'Заполнить карточку'}
              </Button>
            </Box>
            <TextField fullWidth type="number" label="Цена (в рублях)" sx={{ mb: 2 }} value={priceRubles} onChange={(e) => {
              const rubles = Number(e.target.value);
              setPriceRubles(rubles);
              setPriceCents(rubles * 100); // Сохраняем также в копейках для совместимости
            }} />
            <TextField select fullWidth label="Валюта" sx={{ mb: 2 }} value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <MenuItem value="RUB">RUB</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
            </TextField>
            <TextField select fullWidth label="Период" sx={{ mb: 2 }} value={pricePeriod} onChange={(e) => setPricePeriod(e.target.value as any)}>
              <MenuItem value="one_time">Разово</MenuItem>
              <MenuItem value="monthly">Ежемесячно</MenuItem>
              <MenuItem value="yearly">Ежегодно</MenuItem>
            </TextField>
            <TextField fullWidth label="Особенности (через запятую)" sx={{ mb: 2 }} value={(features || []).join(', ')} onChange={(e) => setFeatures(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Основное изображение карточки товара</Typography>
              {imageUrl && (
                <Box sx={{ mb: 1, position: 'relative', display: 'inline-block' }}>
                  <img 
                    src={resolveImageUrl(imageUrl)} 
                    alt="Превью" 
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => setImageUrl('')}
                    sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.8)' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              <TextField 
                fullWidth 
                label="URL изображения" 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Введите URL или загрузите файл"
                sx={{ mb: 1 }}
              />
              <Button 
                variant="outlined" 
                fullWidth
                onClick={async () => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files[0];
                    if (!file) {
                      return;
                    }
                    try {
                      console.log('[ProductEditorPage] Starting image upload, file size:', file.size, 'bytes');
                      const result = await uploadImage(file);
                      console.log('[ProductEditorPage] Image uploaded successfully:', result);
                      if (result && result.url) {
                        setImageUrl(result.url);
                        showToast('Изображение загружено', 'success');
                      } else {
                        throw new Error('Не получен URL изображения');
                      }
                    } catch (error: any) {
                      console.error('[ProductEditorPage] Error uploading image:', error);
                      showToast(error?.message || 'Ошибка загрузки изображения', 'error');
                    }
                  };
                  input.click();
                }}
              >
                {imageUrl ? 'Изменить изображение' : 'Загрузить изображение'}
              </Button>
            </Box>
            <Autocomplete
              multiple
              options={cases.map((c: any) => c.slug)}
              getOptionLabel={(option) => {
                const caseItem = cases.find((c: any) => c.slug === option);
                return caseItem ? caseItem.title : option;
              }}
              value={caseSlugs}
              onChange={(e, newValue) => setCaseSlugs(newValue)}
              renderInput={(params) => <TextField {...params} label="Примеры работ (кейсы)" sx={{ mb: 2 }} />}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const caseItem = cases.find((c: any) => c.slug === option);
                  return (
                    <Chip variant="outlined" label={caseItem?.title || option} {...getTagProps({ index })} key={index} />
                  );
                })
              }
            />
            {/* Секция фильтров и сортировки */}
            <Accordion defaultExpanded sx={{ mb: 2, border: '2px solid #1976d2', borderRadius: '8px' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  🔖 Фильтры, теги и сортировка
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Настройте фильтры, теги и сортировку для этого товара. Теги используются для фильтрации в каталоге.
                </Alert>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField 
                      fullWidth 
                      type="number" 
                      label="Порядок сортировки" 
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      helperText="Чем меньше число, тем выше товар в списке"
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                      label="Активен (отображается в каталоге)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Теги для фильтрации (можно добавлять новые)
                    </Typography>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={tags}
                      onChange={(e, newValue) => setTags(newValue)}
                      renderInput={(params) => (
                        <TextField 
                          {...params} 
                          label="Теги" 
                          placeholder="Введите тег и нажмите Enter"
                          helperText="Добавьте теги для фильтрации товара в каталоге"
                        />
                      )}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip 
                            variant="outlined" 
                            label={option} 
                            {...getTagProps({ index })} 
                            key={index}
                            onDelete={() => {
                              const newTags = tags.filter((_, i) => i !== index);
                              setTags(newTags);
                            }}
                          />
                        ))
                      }
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Категория (для фильтрации)
                    </Typography>
                    <TextField 
                      select 
                      fullWidth 
                      label="Категория" 
                      value={categoryId || ''} 
                      onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                      helperText="Выберите категорию для группировки товаров"
                    >
                      <MenuItem value="">Без категории</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="outlined" 
                startIcon={<BuildIcon />}
                onClick={() => navigate(`/admin/products/${isNew ? 'new' : id}/builder`)}
              >
                Page Builder
              </Button>
              <Button variant="contained" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Сохранение...' : (isNew ? 'Создать' : 'Сохранить')}
              </Button>
              {!isNew && <Button color="error" onClick={() => { if (window.confirm('Удалить продукт?')) delMut.mutate(); }}>Удалить</Button>}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
