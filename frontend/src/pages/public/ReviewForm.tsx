import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  Button,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
  Fade,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Close as CloseIcon, Send as SendIcon, Star as StarIcon } from '@mui/icons-material';
import { createReview, type CreateReviewData } from '@/services/reviewsApi';
import { PrivacyConsentCheckbox } from '@/components/privacy/PrivacyConsentCheckbox';

const serviceTypes = [
  { value: '', label: 'Выберите услугу' },
  { value: 'web-development', label: 'Разработка сайтов' },
  { value: 'mobile-development', label: 'Мобильные приложения' },
  { value: 'design', label: 'Дизайн' },
  { value: 'seo', label: 'SEO продвижение' },
  { value: 'support', label: 'Поддержка' },
  { value: 'other', label: 'Другое' },
];

interface ReviewFormProps {
  onClose: () => void;
}

export function ReviewForm({ onClose }: ReviewFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateReviewData>({
    author: '',
    email: '',
    rating: 0,
    text: '',
    service_type: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreeToPrivacy, setAgreeToPrivacy] = useState(false);

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onClose();
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.author.trim()) {
      newErrors.author = 'Укажите ваше имя';
    }

    if (!formData.rating || formData.rating < 1) {
      newErrors.rating = 'Поставьте оценку';
    }

    if (!formData.text.trim()) {
      newErrors.text = 'Напишите отзыв';
    } else if (formData.text.trim().length < 10) {
      newErrors.text = 'Отзыв должен содержать минимум 10 символов';
    }

    if (!agreeToPrivacy) {
      newErrors.privacy = 'Необходимо согласие на обработку персональных данных';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Неверный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof CreateReviewData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 4 }}>
        {/* Заголовок */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Оставить отзыв
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Сообщение об успехе */}
        {mutation.isSuccess && (
          <Fade in>
            <Alert severity="success" sx={{ mb: 3 }}>
              Спасибо за отзыв! Он будет опубликован после модерации.
            </Alert>
          </Fade>
        )}

        {/* Сообщение об ошибке */}
        {mutation.isError && (
          <Fade in>
            <Alert severity="error" sx={{ mb: 3 }}>
              {mutation.error instanceof Error ? mutation.error.message : 'Произошла ошибка. Попробуйте позже.'}
            </Alert>
          </Fade>
        )}

        <form onSubmit={handleSubmit}>
          {/* Оценка */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 500 }}>
              Ваша оценка *
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Rating
                value={formData.rating}
                onChange={(_, value) => handleChange('rating', value || 0)}
                size="large"
                icon={<StarIcon fontSize="inherit" />}
                emptyIcon={<StarIcon fontSize="inherit" sx={{ color: 'rgba(255,255,255,0.2)' }} />}
                sx={{
                  '& .MuiRating-iconFilled': {
                    color: '#ffbb00',
                  },
                  '& .MuiRating-iconHover': {
                    color: '#ffbb00',
                  },
                }}
              />
              {formData.rating > 0 && (
                <Typography variant="body2" sx={{ color: '#ffbb00' }}>
                  {formData.rating === 5 && 'Превосходно!'}
                  {formData.rating === 4 && 'Хорошо'}
                  {formData.rating === 3 && 'Нормально'}
                  {formData.rating === 2 && 'Плохо'}
                  {formData.rating === 1 && 'Ужасно'}
                </Typography>
              )}
            </Box>
            {errors.rating && (
              <Typography variant="caption" sx={{ color: '#f44336', mt: 0.5, display: 'block' }}>
                {errors.rating}
              </Typography>
            )}
          </Box>

          {/* Имя */}
          <TextField
            fullWidth
            label="Ваше имя"
            value={formData.author}
            onChange={(e) => handleChange('author', e.target.value)}
            error={!!errors.author}
            helperText={errors.author}
            required
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#ffbb00' },
                '&.Mui-focused fieldset': { borderColor: '#ffbb00' },
              },
            }}
          />

          {/* Email */}
          <TextField
            fullWidth
            label="Email (необязательно)"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email || 'Для получения ответа на отзыв'}
            sx={{
              mb: 2,
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#ffbb00' },
                '&.Mui-focused fieldset': { borderColor: '#ffbb00' },
              },
              '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,0.5)' },
            }}
          />

          {/* Тип услуги */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Услуга (необязательно)</InputLabel>
            <Select
              value={formData.service_type || ''}
              label="Услуга (необязательно)"
              onChange={(e) => handleChange('service_type', e.target.value)}
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffbb00' },
              }}
            >
              {serviceTypes.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Текст отзыва */}
          <TextField
            fullWidth
            label="Ваш отзыв"
            value={formData.text}
            onChange={(e) => handleChange('text', e.target.value)}
            error={!!errors.text}
            helperText={errors.text || `${formData.text.length} / минимум 10 символов`}
            required
            multiline
            rows={6}
            sx={{
              mb: 3,
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#ffbb00' },
                '&.Mui-focused fieldset': { borderColor: '#ffbb00' },
              },
              '& .MuiFormHelperText-root': {
                color: errors.text ? '#f44336' : 'rgba(255,255,255,0.5)',
              },
            }}
          />

          {/* Подсказка */}
          <Alert
            severity="info"
            sx={{
              mb: 3,
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              color: 'rgba(255,255,255,0.8)',
              '& .MuiAlert-icon': { color: '#2196f3' },
            }}
          >
            Ваш отзыв будет опубликован после проверки модератором. Это займет не более 24 часов.
          </Alert>

          {/* Согласие на обработку ПД */}
          <Box sx={{ mb: 3 }}>
            <PrivacyConsentCheckbox
              checked={agreeToPrivacy}
              onChange={setAgreeToPrivacy}
              error={errors.privacy}
              required
            />
          </Box>

          {/* Кнопки */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={onClose}
              disabled={mutation.isPending}
              sx={{
                color: 'rgba(255,255,255,0.7)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={mutation.isPending}
              startIcon={mutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
              sx={{
                bgcolor: '#ffbb00',
                color: '#000',
                fontWeight: 600,
                px: 4,
                '&:hover': {
                  bgcolor: '#e6a800',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 24px rgba(255,187,0,0.4)',
                },
                '&:disabled': {
                  bgcolor: 'rgba(255,187,0,0.3)',
                },
                transition: 'all 0.3s',
              }}
            >
              {mutation.isPending ? 'Отправка...' : 'Отправить отзыв'}
            </Button>
          </Box>
        </form>
      </Box>
    </motion.div>
  );
}

