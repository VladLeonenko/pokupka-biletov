import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useToast } from '@/components/common/ToastProvider';
import {
  fetchAdminTicketsVitrine,
  putAdminTicketsVitrine,
} from '@/services/ticketsVitrineApi';
import type { CmsHeroSlide, TicketsVitrineContent } from '@/types/ticketsVitrine';
import { mergeTicketsVitrine } from '@/utils/ticketsVitrineDefaults';

const emptySlide = (): CmsHeroSlide => ({
  title: '',
  imageUrl: '',
  tags: '',
  author: '',
  director: '',
  lineLeft: '',
  ticketId: '',
  ctaHref: '',
  ctaLabel: 'КУПИТЬ БИЛЕТ',
});

export function TicketsVitrinePage() {
  const { showToast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tickets-vitrine', 'admin'],
    queryFn: fetchAdminTicketsVitrine,
  });

  const merged = useMemo(() => mergeTicketsVitrine(data?.content), [data]);
  const [draft, setDraft] = useState<TicketsVitrineContent>(merged);

  useEffect(() => {
    setDraft(merged);
  }, [merged]);

  const save = useMutation({
    mutationFn: () => putAdminTicketsVitrine(draft),
    onSuccess: () => {
      showToast('Сохранено', 'success');
      qc.invalidateQueries({ queryKey: ['tickets-vitrine'] });
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const setDir = (i: number, field: 'label' | 'q' | 'genre', value: string) => {
    const directions = [...(draft.directions ?? [])];
    directions[i] = { ...directions[i], [field]: value };
    setDraft({ ...draft, directions });
  };

  const setDirFlag = (i: number, field: 'showInHeader' | 'showOnHome', value: boolean) => {
    const directions = [...(draft.directions ?? [])];
    directions[i] = { ...directions[i], [field]: value };
    setDraft({ ...draft, directions });
  };

  const addDir = () => {
    setDraft({
      ...draft,
      directions: [...(draft.directions ?? []), { label: '', q: '' }],
    });
  };

  const delDir = (i: number) => {
    const directions = [...(draft.directions ?? [])];
    directions.splice(i, 1);
    setDraft({ ...draft, directions });
  };

  const setCity = (i: number, field: 'id' | 'label', value: string) => {
    const cities = [...(draft.cities ?? [])];
    cities[i] = { ...cities[i], [field]: value };
    setDraft({ ...draft, cities });
  };

  const addCity = () => {
    setDraft({
      ...draft,
      cities: [...(draft.cities ?? []), { id: '', label: '' }],
    });
  };

  const delCity = (i: number) => {
    const cities = [...(draft.cities ?? [])];
    cities.splice(i, 1);
    setDraft({ ...draft, cities });
  };

  const setSlide = (i: number, patch: Partial<CmsHeroSlide>) => {
    const heroSlides = [...(draft.heroSlides ?? [])];
    heroSlides[i] = { ...heroSlides[i], ...patch };
    setDraft({ ...draft, heroSlides });
  };

  const addSlide = () => {
    setDraft({ ...draft, heroSlides: [...(draft.heroSlides ?? []), emptySlide()] });
  };

  const delSlide = (i: number) => {
    const heroSlides = [...(draft.heroSlides ?? [])];
    heroSlides.splice(i, 1);
    setDraft({ ...draft, heroSlides });
  };

  return (
    <Box sx={{ p: 2, maxWidth: 960 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        Витрина билетов
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Тексты, направления (шапка и/или карусели на главной — отдельно), города в меню профиля, слайды hero
        (если заданы — вместо автоподстановки из API), контакты, подвал, HTML политики.
      </Typography>

      {isLoading ? (
        <Typography>Загрузка…</Typography>
      ) : (
        <Stack spacing={3}>
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Шапка
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Логотип — первая строка"
                fullWidth
                value={draft.header?.logoTitle ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, header: { ...draft.header, logoTitle: e.target.value } })
                }
              />
              <TextField
                label="Логотип — подзаголовок"
                fullWidth
                value={draft.header?.logoSub ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, header: { ...draft.header, logoSub: e.target.value } })
                }
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>Направления</Typography>
              <Button startIcon={<AddIcon />} onClick={addDir} size="small">
                Добавить
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Порядок строк общий. Галочки «Шапка» / «Главная» задают, где показать плашку и карусель
              (можно одно без другого). Удаление строки убирает оба места. «Жанр» → /events?genre=… «Запрос q» —
              полнотекст; заполняют одно из двух.
            </Typography>
            <Stack spacing={1}>
              {(draft.directions ?? []).map((d, i) => (
                <Stack key={i} spacing={1}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                    <TextField
                      label="Название"
                      size="small"
                      value={d.label}
                      onChange={(e) => setDir(i, 'label', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Жанр (genre)"
                      size="small"
                      placeholder="Спорт, Театр…"
                      value={d.genre ?? ''}
                      onChange={(e) => setDir(i, 'genre', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Поисковый запрос q"
                      size="small"
                      value={d.q ?? ''}
                      onChange={(e) => setDir(i, 'q', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <IconButton aria-label="Удалить" onClick={() => delDir(i)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                  <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={d.showInHeader !== false}
                          onChange={(e) => setDirFlag(i, 'showInHeader', e.target.checked)}
                        />
                      }
                      label="Шапка"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={d.showOnHome !== false}
                          onChange={(e) => setDirFlag(i, 'showOnHome', e.target.checked)}
                        />
                      }
                      label="Главная (карусель)"
                    />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>Города (меню профиля)</Typography>
              <Button startIcon={<AddIcon />} onClick={addCity} size="small">
                Город
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Если GET /api/bilet/cities недоступен (например rest_v2), используется этот список. id — cityId в
              GetBilet (BIL24), подставьте из кабинета.
            </Typography>
            <Stack spacing={1}>
              {(draft.cities ?? []).map((c, i) => (
                <Stack key={i} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
                  <TextField
                    label="cityId"
                    size="small"
                    value={c.id}
                    onChange={(e) => setCity(i, 'id', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Название"
                    size="small"
                    value={c.label}
                    onChange={(e) => setCity(i, 'label', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton aria-label="Удалить" onClick={() => delCity(i)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>Слайды hero (необязательно)</Typography>
              <Button startIcon={<AddIcon />} onClick={addSlide} size="small">
                Слайд
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Если список пуст, блок берётся из событий API. Поле ticketId — id события на витрине для подстановки
              полей.
            </Typography>
            <Stack spacing={2}>
              {(draft.heroSlides ?? []).map((s, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Заголовок"
                      size="small"
                      fullWidth
                      value={s.title ?? ''}
                      onChange={(e) => setSlide(i, { title: e.target.value })}
                    />
                    <TextField
                      label="URL картинки"
                      size="small"
                      fullWidth
                      value={s.imageUrl ?? ''}
                      onChange={(e) => setSlide(i, { imageUrl: e.target.value })}
                    />
                    <TextField
                      label="Теги (строка)"
                      size="small"
                      fullWidth
                      value={s.tags ?? ''}
                      onChange={(e) => setSlide(i, { tags: e.target.value })}
                    />
                    <TextField
                      label="Строка даты слева"
                      size="small"
                      fullWidth
                      value={s.lineLeft ?? ''}
                      onChange={(e) => setSlide(i, { lineLeft: e.target.value })}
                    />
                    <TextField
                      label="Автор"
                      size="small"
                      fullWidth
                      value={s.author ?? ''}
                      onChange={(e) => setSlide(i, { author: e.target.value })}
                    />
                    <TextField
                      label="Режиссёр"
                      size="small"
                      fullWidth
                      value={s.director ?? ''}
                      onChange={(e) => setSlide(i, { director: e.target.value })}
                    />
                    <TextField
                      label="ticketId (событие)"
                      size="small"
                      fullWidth
                      value={s.ticketId ?? ''}
                      onChange={(e) => setSlide(i, { ticketId: e.target.value })}
                    />
                    <TextField
                      label="Ссылка CTA (если не из ticketId)"
                      size="small"
                      fullWidth
                      value={s.ctaHref ?? ''}
                      onChange={(e) => setSlide(i, { ctaHref: e.target.value })}
                    />
                    <TextField
                      label="Текст кнопки"
                      size="small"
                      fullWidth
                      value={s.ctaLabel ?? ''}
                      onChange={(e) => setSlide(i, { ctaLabel: e.target.value })}
                    />
                    <Button color="error" size="small" onClick={() => delSlide(i)}>
                      Удалить слайд
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Контакты
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Заголовок страницы"
                fullWidth
                value={draft.contacts?.pageTitle ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, pageTitle: e.target.value } })
                }
              />
              <TextField
                label="Вводный текст"
                fullWidth
                multiline
                minRows={2}
                value={draft.contacts?.intro ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, intro: e.target.value } })
                }
              />
              <TextField
                label="Адрес"
                fullWidth
                value={draft.contacts?.address ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, address: e.target.value } })
                }
              />
              <TextField
                label="Телефон"
                fullWidth
                value={draft.contacts?.phone ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, phone: e.target.value } })
                }
              />
              <TextField
                label="Email"
                fullWidth
                value={draft.contacts?.email ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, email: e.target.value } })
                }
              />
              <TextField
                label="Режим работы"
                fullWidth
                value={draft.contacts?.hours ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, hours: e.target.value } })
                }
              />
              <TextField
                label="Заголовок формы"
                fullWidth
                value={draft.contacts?.formTitle ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, contacts: { ...draft.contacts, formTitle: e.target.value } })
                }
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Подвал
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Бренд"
                fullWidth
                value={draft.footer?.brand ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, footer: { ...draft.footer, brand: e.target.value } })
                }
              />
              <TextField
                label="Описание"
                fullWidth
                multiline
                minRows={2}
                value={draft.footer?.tagline ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, footer: { ...draft.footer, tagline: e.target.value } })
                }
              />
              <TextField
                label="Строка копирайта (© …)"
                fullWidth
                value={draft.footer?.copy ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, footer: { ...draft.footer, copy: e.target.value } })
                }
              />
            </Stack>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              Политика конфиденциальности (HTML)
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={12}
              value={draft.privacyHtml ?? ''}
              onChange={(e) => setDraft({ ...draft, privacyHtml: e.target.value })}
              placeholder="<p>…</p>"
            />
          </Paper>

          <Divider />

          <Stack direction="row" spacing={2}>
            <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>
              Сохранить
            </Button>
            <Button
              onClick={() => {
                setDraft(merged);
                showToast('Сброшено к сохранённому', 'info');
              }}
            >
              Отменить правки
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
