import { useState } from 'react';
import {
  Box, Container, Typography, Button, Stack, TextField, Checkbox,
  FormControlLabel, FormGroup, LinearProgress,
} from '@mui/material';
import { submitQuizForm as submitQuizFormApi } from '@/services/publicApi';
import { useToast } from '@/components/common/ToastProvider';

interface QuizFormData {
  seo?: boolean;
  'web-site'?: boolean;
  'mobile-app'?: boolean;
  design?: boolean;
  ecommerce?: boolean;
  services?: boolean;
  production?: boolean;
  finance?: boolean;
  consulting?: boolean;
  other?: boolean;
  direct?: boolean;
  filling?: boolean;
  crm?: boolean;
  smm?: boolean;
  target?: boolean;
  marketing?: boolean;
  seoPromotion?: boolean;
  photo?: boolean;
  promocode?: string;
  'quiz-name'?: string;
  'quiz-tel'?: string;
  'quiz-email'?: string;
  privacy?: boolean;
}

const STEPS = [
  { num: '01', title: 'Какая у вас цель?' },
  { num: '02', title: 'Вид деятельности' },
  { num: '03', title: 'Дополнительные услуги' },
  { num: '04', title: 'Промокод' },
  { num: '05', title: 'Контакты' },
];

const goalOptions = [
  { key: 'seo', label: 'Продвижение', icon: '/legacy/img/seo.png' },
  { key: 'web-site', label: 'Разработка сайта', icon: '/legacy/img/web-site.png' },
  { key: 'mobile-app', label: 'Мобильное приложение', icon: '/legacy/img/mobile-app.png' },
  { key: 'design', label: 'Дизайн', icon: '/legacy/img/design.png' },
];

const activityOptions = [
  { key: 'ecommerce', label: 'Продажа товаров' },
  { key: 'services', label: 'Оказание услуг' },
  { key: 'production', label: 'Производство' },
  { key: 'finance', label: 'Финансы' },
  { key: 'consulting', label: 'Консалтинг' },
  { key: 'other', label: 'Другое' },
];

const extraOptions = [
  { key: 'direct', label: 'Яндекс Директ' },
  { key: 'filling', label: 'Наполнение сайта' },
  { key: 'crm', label: 'Интеграция с CRM' },
  { key: 'smm', label: 'SMM' },
  { key: 'target', label: 'Таргетированная реклама' },
  { key: 'marketing', label: 'Маркетинг-стратегия' },
  { key: 'seoPromotion', label: 'SEO-продвижение' },
  { key: 'photo', label: 'Фото / Видео контент' },
];

const cbSx = { color: 'rgba(255,255,255,0.3)', '&.Mui-checked': { color: '#ffbb00' } };

export function QuizForm() {
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [fd, setFd] = useState<QuizFormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const set = (k: string, v: string | boolean) => {
    setFd((p) => ({ ...p, [k]: v }));
    setErrors((p) => { const n = { ...p }; delete n[k]; return n; });
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!(fd.seo || fd['web-site'] || fd['mobile-app'] || fd.design)) e['tab-0'] = 'Выберите хотя бы один вариант';
    } else if (s === 1) {
      if (!(fd.ecommerce || fd.services || fd.production || fd.finance || fd.consulting || fd.other)) e['tab-1'] = 'Выберите хотя бы один вариант';
    } else if (s === 4) {
      if (!fd['quiz-name']?.trim()) e['quiz-name'] = 'Имя обязательно';
      if (!fd['quiz-tel']?.trim() || fd['quiz-tel']?.trim() === '+7') e['quiz-tel'] = 'Телефон обязателен';
      if (!fd['quiz-email']?.trim()) e['quiz-email'] = 'Email обязателен';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd['quiz-email']!)) e['quiz-email'] = 'Введите корректный email';
      if (!fd.privacy) e.privacy = 'Необходимо согласие';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (!validate(step)) return; if (step < 4) setStep(step + 1); else submit(); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const submit = async () => {
    if (!validate(step)) return;
    setSending(true);
    try {
      const d: Record<string, any> = {};
      Object.entries(fd).forEach(([k, v]) => { if (v != null) d[k] = typeof v === 'boolean' ? (v ? '1' : undefined) : String(v); });
      await submitQuizFormApi(d);
      setStep(5);
    } catch { showToast('Ошибка при отправке. Попробуйте позже.', 'error'); }
    finally { setSending(false); }
  };

  const progress = ((step + 1) / 5) * 100;

  const cardSx = (checked: boolean) => ({
    border: '1px solid',
    borderColor: checked ? '#ffbb00' : 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    p: 2,
    cursor: 'pointer',
    transition: 'border-color 0.25s, background 0.25s',
    bgcolor: checked ? 'rgba(255,187,0,0.06)' : 'transparent',
    '&:hover': { borderColor: 'rgba(255,187,0,0.4)' },
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 1,
    textAlign: 'center' as const,
  });

  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.25em', color: 'rgba(255,255,255,0.4)', display: 'block', mb: 1 }}
        >
          Калькулятор
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', mb: 1 }}
        >
          Рассчитайте стоимость проекта
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.55)', mb: 4, maxWidth: 520, lineHeight: 1.6 }}>
          Ответьте на несколько вопросов — мы подготовим коммерческое предложение и бесплатную консультацию.
        </Typography>

        {step < 5 && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              mb: 4, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': { bgcolor: '#ffbb00' },
            }}
          />
        )}

        {/* Step 0 — Goal */}
        {step === 0 && (
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', mb: 2 }}>
              {STEPS[0].num} / {STEPS[0].title}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
              {goalOptions.map((o) => {
                const checked = !!fd[o.key as keyof QuizFormData];
                return (
                  <Box key={o.key} sx={cardSx(checked)} onClick={() => set(o.key, !checked)}>
                    <Box component="img" src={o.icon} alt={o.label} sx={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.85 }} />
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{o.label}</Typography>
                  </Box>
                );
              })}
            </Box>
            {errors['tab-0'] && <Typography sx={{ color: '#ff5555', mt: 1, fontSize: '0.85rem' }}>{errors['tab-0']}</Typography>}
          </Box>
        )}

        {/* Step 1 — Activity */}
        {step === 1 && (
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', mb: 2 }}>
              {STEPS[1].num} / {STEPS[1].title}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {activityOptions.map((o) => {
                const checked = !!fd[o.key as keyof QuizFormData];
                return (
                  <Box key={o.key} sx={cardSx(checked)} onClick={() => set(o.key, !checked)}>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>{o.label}</Typography>
                  </Box>
                );
              })}
            </Box>
            {errors['tab-1'] && <Typography sx={{ color: '#ff5555', mt: 1, fontSize: '0.85rem' }}>{errors['tab-1']}</Typography>}
          </Box>
        )}

        {/* Step 2 — Extra services */}
        {step === 2 && (
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', mb: 2 }}>
              {STEPS[2].num} / {STEPS[2].title}
            </Typography>
            <FormGroup>
              {extraOptions.map((o) => (
                <FormControlLabel
                  key={o.key}
                  control={
                    <Checkbox
                      checked={!!fd[o.key as keyof QuizFormData]}
                      onChange={(e) => set(o.key, e.target.checked)}
                      sx={cbSx}
                    />
                  }
                  label={<Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{o.label}</Typography>}
                  sx={{ mb: 0.5 }}
                />
              ))}
            </FormGroup>
          </Box>
        )}

        {/* Step 3 — Promo */}
        {step === 3 && (
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', mb: 2 }}>
              {STEPS[3].num} / {STEPS[3].title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', mb: 2, fontSize: '0.95rem' }}>
              Найдите на нашем сайте спрятанное слово-промокод и получите скидку
            </Typography>
            <TextField
              placeholder="Введите промокод"
              fullWidth
              value={fd.promocode || ''}
              onChange={(e) => set('promocode', e.target.value)}
              sx={{
                maxWidth: 360,
                '& .MuiOutlinedInput-root': {
                  color: '#fff',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ffbb00' },
                },
              }}
            />
          </Box>
        )}

        {/* Step 4 — Contacts */}
        {step === 4 && (
          <Box>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', mb: 2 }}>
              {STEPS[4].num} / {STEPS[4].title}
            </Typography>
            <Stack spacing={2} sx={{ maxWidth: 420 }}>
              {([
                { key: 'quiz-name', label: 'Имя', type: 'text' },
                { key: 'quiz-tel', label: 'Телефон', type: 'tel' },
                { key: 'quiz-email', label: 'Email', type: 'email' },
              ] as const).map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  type={f.type}
                  value={fd[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  error={!!errors[f.key]}
                  helperText={errors[f.key]}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#ffbb00' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#ffbb00' },
                  }}
                />
              ))}
              <FormControlLabel
                control={
                  <Checkbox checked={!!fd.privacy} onChange={(e) => set('privacy', e.target.checked)} sx={cbSx} />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Я согласен на{' '}
                    <Box component="a" href="/privacy" target="_blank" sx={{ color: '#ffbb00', textDecoration: 'underline' }}>
                      обработку персональных данных
                    </Box>
                  </Typography>
                }
              />
              {errors.privacy && <Typography sx={{ color: '#ff5555', fontSize: '0.8rem' }}>{errors.privacy}</Typography>}
            </Stack>
          </Box>
        )}

        {/* Final */}
        {step === 5 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', mb: 1 }}>
              Спасибо!
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)' }}>
              Мы уже получили ваши ответы и свяжемся с вами в ближайшее время.
            </Typography>
          </Box>
        )}

        {/* Nav buttons */}
        {step < 5 && (
          <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
            {step > 0 && (
              <Button
                onClick={prev}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  px: 3,
                  borderRadius: 2,
                  '&:hover': { borderColor: 'rgba(255,255,255,0.4)' },
                }}
              >
                Назад
              </Button>
            )}
            <Button
              onClick={next}
              disabled={sending}
              sx={{
                bgcolor: '#ffbb00',
                color: '#141414',
                fontWeight: 700,
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                '&:hover': { bgcolor: '#e5a800', color: '#141414' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,187,0,0.3)' },
              }}
            >
              {step === 4 ? 'Отправить' : 'Далее'}
            </Button>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
