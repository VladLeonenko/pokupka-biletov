import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/common/ToastProvider';
import { submitForm } from '@/services/cmsApi';
import { CHARITY_FUND_NAMES } from '@/config/charityFunds';
import { Box, TextField, Button, Typography } from '@mui/material';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
    '&:hover fieldset': { borderColor: 'rgba(255,187,0,0.35)' },
    '&.Mui-focused fieldset': { borderColor: '#ffbb00', borderWidth: '1px' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#ffbb00' },
};

export function NewClientForm() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    company: '', difficulties: '', task: '', expectations: '', money: '',
    name: '', tel: '', email: '', commit: '', privacy_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateEmail = (email: string) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,8})+$/.test(email);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.company.trim()) newErrors.company = 'Расскажите о вашем бизнесе';
    if (!formData.difficulties.trim()) newErrors.difficulties = 'Опишите трудности';
    if (!formData.task.trim()) newErrors.task = 'Опишите задачу';
    if (!formData.expectations.trim()) newErrors.expectations = 'Опишите ожидания';
    if (!formData.money.trim()) newErrors.money = 'Укажите бюджет';
    if (!formData.name.trim()) newErrors.name = 'Введите имя';
    if (!formData.tel.trim()) newErrors.tel = 'Введите телефон';
    if (!formData.email.trim()) newErrors.email = 'Введите email';
    else if (!validateEmail(formData.email)) newErrors.email = 'Некорректный email';
    if (!formData.privacy_consent) newErrors.privacy_consent = 'Нужно согласие на обработку данных';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const selectedCharityFund = typeof window !== 'undefined' ? localStorage.getItem('selectedCharityFund') : null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      const first = Object.values(errors)[0];
      if (first) showToast(first, 'error');
      return;
    }
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      const dataToSubmit = {
        ...formData,
        charity_fund: selectedCharityFund || null,
        charity_fund_name: selectedCharityFund ? (CHARITY_FUND_NAMES[selectedCharityFund] || selectedCharityFund) : null,
      };
      await submitForm('new-client-form', dataToSubmit);
      setSubmitSuccess(true);
      setFormData({ company: '', difficulties: '', task: '', expectations: '', money: '', name: '', tel: '', email: '', commit: '', privacy_consent: false });
      setErrors({});
      showToast('Анкета отправлена. Мы свяжемся с вами в ближайшее время.', 'success');
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      const msg = err?.message || 'Ошибка отправки';
      setErrors((p) => ({ ...p, submit: msg }));
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((p) => { const n = { ...p }; delete n[name]; return n; });
  };

  const fields: { name: keyof typeof formData; label: string; placeholder?: string; hint?: string; multiline?: boolean }[] = [
    { name: 'company', label: '1. Расскажите о вашем бизнесе', placeholder: 'Интернет-магазин, студия дизайна, консалтинг…', hint: 'Название, деятельность, ссылка на сайт при наличии.' },
    { name: 'difficulties', label: '2. С какими трудностями столкнулись?', hint: 'Мало заявок, нет продаж, не хватает клиентов?' },
    { name: 'task', label: '3. Какую цель хотите достичь?', placeholder: 'Новый сайт, приложение, продвижение, редизайн…', hint: 'Желаемый результат.' },
    { name: 'expectations', label: '4. Каких результатов ждёте?', placeholder: 'Рост заявок на 30%, запуск за 2 месяца', hint: 'Что должно измениться, сроки.' },
    { name: 'money', label: '5. Какой бюджет планируете?', placeholder: 'Например: от 200 000 до 500 000 ₽', hint: 'Примерный диапазон.' },
  ];

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        maxWidth: 720,
        '& .MuiFormControl-root': { mb: 3 },
      }}
      data-anim="fade-up"
    >
      {fields.map((f) => (
        <Box key={f.name} sx={{ mb: 4 }}>
          <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem', mb: 0.5 }}>
            {f.label}
          </Typography>
          {f.hint && (
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', mb: 1.5 }}>
              {f.hint}
            </Typography>
          )}
          <TextField
            fullWidth
            name={f.name}
            value={formData[f.name] as string}
            onChange={handleChange}
            placeholder={f.placeholder}
            multiline={f.multiline}
            rows={f.multiline ? 3 : 1}
            error={!!errors[f.name]}
            helperText={errors[f.name]}
            required
            variant="outlined"
            sx={inputSx}
          />
        </Box>
      ))}

      <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem', mb: 2, mt: 5 }}>
        Контактные данные
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <TextField name="name" label="Имя" placeholder="Введите имя" value={formData.name} onChange={handleChange} required error={!!errors.name} helperText={errors.name} sx={inputSx} />
        <TextField name="tel" label="Телефон" placeholder="+7 …" value={formData.tel} onChange={handleChange} required error={!!errors.tel} helperText={errors.tel} sx={inputSx} />
      </Box>
      <TextField fullWidth name="email" label="Email" type="email" placeholder="email@example.com" value={formData.email} onChange={handleChange} required error={!!errors.email} helperText={errors.email} sx={{ ...inputSx, mb: 2 }} />
      <TextField fullWidth name="commit" label="Дополнительно" placeholder="Любая полезная информация" value={formData.commit} onChange={handleChange} sx={{ ...inputSx, mb: 2 }} />

      {/* Благотворительность: что выбрано и куда пойдут средства */}
      <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,187,0,0.06)', border: '1px solid rgba(255,187,0,0.2)', mb: 3 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', mb: 0.5 }}>
          Благотворительность
        </Typography>
        {selectedCharityFund && CHARITY_FUND_NAMES[selectedCharityFund] ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
            10% от проекта направим в <strong>{CHARITY_FUND_NAMES[selectedCharityFund]}</strong> от вашего имени.
          </Typography>
        ) : (
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Не выбрано. Можно выбрать фонд на <Link to="/charity" style={{ color: '#ffbb00', textDecoration: 'underline' }}>странице благотворительности</Link> — мы перечислим 10% от проекта.
          </Typography>
        )}
        <Typography component={Link} to="/charity" sx={{ color: '#ffbb00', fontSize: '0.85rem', mt: 1, display: 'inline-block', textDecoration: 'underline' }}>
          {selectedCharityFund ? 'Изменить фонд' : 'Выбрать фонд'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          type="submit"
          disabled={isSubmitting}
          variant="contained"
          sx={{
            bgcolor: '#ffbb00',
            color: '#141414',
            fontWeight: 700,
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            '&:hover': { bgcolor: '#e5a800', color: '#141414' },
          }}
        >
          {isSubmitting ? 'Отправка…' : 'Отправить'}
        </Button>
        {submitSuccess && <Typography sx={{ color: '#4caf50', fontWeight: 500 }}>Анкета отправлена!</Typography>}
        {errors.submit && <Typography sx={{ color: '#f44336', fontSize: '0.9rem' }}>{errors.submit}</Typography>}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <input
          type="checkbox"
          name="privacy_consent"
          id="privacy_consent_new_client"
          checked={formData.privacy_consent}
          onChange={handleChange}
          required
          style={{ width: 20, height: 20, marginTop: 4, accentColor: '#ffbb00', cursor: 'pointer' }}
        />
        <Typography component="label" htmlFor="privacy_consent_new_client" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5, cursor: 'pointer' }}>
          Я согласен на{' '}
          <Box component="a" href="/privacy" target="_blank" rel="noopener noreferrer" sx={{ color: '#ffbb00', textDecoration: 'underline' }}>
            обработку персональных данных
          </Box>
          <Box component="span" sx={{ color: '#ff5252' }}> *</Box>
        </Typography>
      </Box>
      {errors.privacy_consent && <Typography sx={{ color: '#ff5252', fontSize: '0.85rem', mt: 0.5 }}>{errors.privacy_consent}</Typography>}
    </Box>
  );
}
