import { z } from 'zod';

/**
 * Validation schemas для различных API endpoints
 * Используем Zod для runtime валидации входных данных
 */

// === AUTH SCHEMAS ===

export const loginSchema = z.object({
  email: z.string().email('Некорректный email адрес').min(1, 'Email обязателен'),
  password: z.string().min(1, 'Пароль обязателен'),
});

export const registerSchema = z.object({
  email: z.string().email('Некорректный email адрес').min(1, 'Email обязателен'),
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .regex(/[a-zа-яё]/, 'Пароль должен содержать строчную букву')
    .regex(/[A-ZА-ЯЁ]/, 'Пароль должен содержать заглавную букву')
    .regex(/[0-9]/, 'Пароль должен содержать цифру')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Пароль должен содержать специальный символ'),
  name: z.string().min(1, 'Имя обязательно').max(100, 'Имя слишком длинное'),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, 'Некорректный номер телефона').optional().nullable(),
  agreeToTerms: z.boolean().refine(val => val === true, 'Необходимо согласие с условиями'),
  agreeToPrivacy: z.boolean().refine(val => val === true, 'Необходимо согласие с обработкой данных'),
});

export const verifyCodeSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  code: z.string().length(6, 'Код должен содержать 6 цифр').regex(/^\d+$/, 'Код должен содержать только цифры'),
}).refine(data => data.email || data.phone, {
  message: 'Необходимо указать email или телефон',
});

// === BLOG SCHEMAS ===

export const blogPostSchema = z.object({
  title: z.string().min(1, 'Заголовок обязателен').max(200, 'Заголовок слишком длинный'),
  slug: z.string().min(1, 'Slug обязателен').max(200, 'Slug слишком длинный').regex(/^[a-z0-9-]+$/, 'Slug должен содержать только буквы, цифры и дефисы'),
  excerpt: z.string().max(500, 'Описание слишком длинное').optional().nullable(),
  content: z.string().min(10, 'Контент слишком короткий'),
  categoryId: z.number().int().positive().optional().nullable(),
  coverImage: z.string().url('Некорректный URL изображения').optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(70, 'SEO заголовок слишком длинный').optional().nullable(),
  seoDescription: z.string().max(160, 'SEO описание слишком длинное').optional().nullable(),
  seoKeywords: z.array(z.string()).optional().default([]),
});

// === PRODUCT SCHEMAS ===

export const productSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  descriptionHtml: z.string().optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  currency: z.string().length(3).default('RUB'),
  pricePeriod: z.enum(['once', 'month', 'year']).default('once'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  categoryId: z.number().int().positive().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  gallery: z.array(z.string().url()).default([]),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  tags: z.array(z.string()).default([]),
});

// === FORM SCHEMAS ===

export const formSubmissionSchema = z.object({
  formId: z.string().min(1, 'Form ID обязателен'),
  data: z.record(z.any()),
  url: z.string().url().optional(),
  userAgent: z.string().optional(),
});

// === TASK SCHEMAS ===

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.enum(['new', 'in_progress', 'completed', 'cancelled']).default('new'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignedTo: z.number().int().positive().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
  category: z.string().default('development'),
  dealId: z.number().int().positive().optional().nullable(),
});

// === CLIENT SCHEMAS ===

export const clientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(['lead', 'qualified', 'customer', 'churned']).default('lead'),
  notes: z.string().optional().nullable(),
});

// === UTILITY FUNCTIONS ===

/**
 * Хелпер для парсинга ID из параметров URL
 */
export const idSchema = z.coerce.number().int().positive();

/**
 * Хелпер для парсинга пагинации
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Хелпер для парсинга булевых значений из query string
 */
export const booleanQuerySchema = z
  .string()
  .optional()
  .transform(val => val === 'true' || val === '1');








