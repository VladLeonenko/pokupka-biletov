# План миграции страниц с HTML на React JSX

## 📋 Список страниц, использующих HTML из БД

### ✅ Уже на React (не требуют миграции)
1. **`/` (HomePage)** - полностью на React компонентах
2. **`/about` (AboutPage)** - использует React компоненты, `getPublicPage` только для SEO метаданных
3. **`/catalog`** - React компонент
4. **`/products/:slug`** - React компонент
5. **`/cart`** - React компонент
6. **`/wishlist`** - React компонент
7. **`/search`** - React компонент
8. **`/account/*`** - React компоненты
9. **`/blog`** - React компонент (PublicBlogPage использует PublicPageRenderer, но это обёртка)
10. **`/blog/:slug`** - React компонент (PublicBlogPostPage использует PublicPageRenderer)
11. **`/portfolio`** - React компонент
12. **`/cases/:slug`** - React компонент
13. **`/tools/*`** - React компоненты
14. **`/ai-chat`** - React компонент
15. **`/ai-team`** - React компонент

### ⚠️ Используют HTML из БД (требуют миграции)

#### 1. **`/` (PublicHomePage)** - ДУБЛИКАТ
- **Файл**: `frontend/src/pages/public/PublicHomePage.tsx`
- **Использует**: `PublicPageRenderer` с HTML из БД
- **Статус**: Есть альтернатива `HomePage.tsx` на React
- **Действие**: Удалить `PublicHomePage`, использовать только `HomePage`

#### 2. **`/contacts` (ContactsPage)**
- **Файл**: `frontend/src/pages/public/ContactsPage.tsx`
- **Использует**: `SafeHtmlRenderer` с `page.html` из БД
- **Статус**: Рендерит HTML напрямую
- **Действие**: Создать React компоненты для секций страницы

#### 3. **`/new-client` (NewClientPage)**
- **Файл**: `frontend/src/pages/public/NewClientPage.tsx`
- **Использует**: `SafeHtmlRenderer` с `page.html` из БД
- **Статус**: Рендерит HTML напрямую
- **Действие**: Создать React компоненты для формы и секций

#### 4. **`/:slug` (PublicPageView)** - CATCH-ALL ROUTE
- **Файл**: `frontend/src/pages/public/PublicPageView.tsx`
- **Использует**: `PublicPageRenderer` с полным HTML из БД
- **Статус**: Обрабатывает ВСЕ неизвестные маршруты
- **Действие**: 
  - Определить список всех страниц в БД
  - Создать React компоненты для каждой
  - Удалить catch-all или оставить только для legacy страниц

#### 5. **`/promotion` (PublicPromotionsPage)**
- **Файл**: `frontend/src/pages/public/PublicPromotionsPage.tsx`
- **Использует**: `PublicPageRenderer` с HTML из БД
- **Статус**: Рендерит HTML напрямую
- **Действие**: Создать React компонент для промо-страницы

#### 6. **`/blog` (PublicBlogPage)**
- **Файл**: `frontend/src/pages/public/PublicBlogPage.tsx`
- **Использует**: `PublicPageRenderer` с HTML из БД
- **Статус**: Рендерит HTML напрямую
- **Действие**: Проверить, можно ли использовать чистый React компонент

#### 7. **`/blog/:slug` (PublicBlogPostPage)**
- **Файл**: `frontend/src/pages/public/PublicBlogPostPage.tsx`
- **Использует**: `PublicPageRenderer` с HTML из БД
- **Статус**: Рендерит HTML напрямую
- **Действие**: Проверить, можно ли использовать чистый React компонент

### 🔍 Страницы из БД (попадают под catch-all route `/:slug`)

**Всего страниц с HTML в БД: 34**

#### Страницы с React компонентами (но есть HTML в БД - дубликат):
1. `/` - HomePage (React) + PublicHomePage (HTML) - **УДАЛИТЬ PublicHomePage**
2. `/about` - AboutPage (React) + HTML в БД - **УДАЛИТЬ HTML из БД**
3. `/contacts` - ContactsPage (React) + HTML в БД - **МИГРИРОВАТЬ на чистый React**
4. `/new-client` - NewClientPage (React) + HTML в БД - **МИГРИРОВАТЬ на чистый React**
5. `/blog` - PublicBlogPage (React) + HTML в БД - **МИГРИРОВАТЬ на чистый React**
6. `/promotion` - PublicPromotionsPage (React) + HTML в БД - **МИГРИРОВАТЬ на чистый React**
7. `/portfolio` - PortfolioPage (React) + HTML в БД - **УДАЛИТЬ HTML из БД**
8. `/ai-team` - PublicHomePageAI (React) + HTML в БД - **УДАЛИТЬ HTML из БД**

#### Страницы БЕЗ React компонентов (только HTML в БД):
1. `/404` - 1KB
2. `/ads` - 16KB
3. `/bitrix` - 10KB
4. `/business-card-website` - 19KB
5. `/chto_nuzhno_dlya_sozdaniya_sajta` - 8KB
6. `/ckolko_delaetsya_1_sajt` - 3KB
7. `/cleancode-website` - 15KB
8. `/corporate-website` - 20KB
9. `/houses-case` - 18KB
10. `/komanda-primecoder` - 25KB
11. `/landing` - 20KB
12. `/madeo-case` - 15KB
13. `/marketing` - 11KB
14. `/online-shop` - 21KB
15. `/opencart` - 8KB
16. `/polygon` - 33KB
17. `/privacy` - 20KB (есть PrivacyPolicyPage, но не используется для /privacy)
18. `/promo-website` - 19KB
19. `/rewievs` - 3KB
20. `/services` - 41KB
21. `/straumann-case` - 19KB
22. `/test` - 42KB
23. `/tilda` - 8KB
24. `/wordpress` - 10KB
25. `/zakazat-sayt` - 41KB
26. `/zhizn` - 10KB

**Всего страниц без React: 26**

---

## 🎯 Решение: Редактирование React компонентов через админку

### Концепция: Headless CMS подход

Вместо хранения HTML в БД, храним **структурированные данные** и рендерим их через React компоненты.

### 1. Новая структура БД

```sql
-- Добавляем колонку для структурированного контента
ALTER TABLE pages 
  ADD COLUMN IF NOT EXISTS content_json JSONB,
  ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'default';

-- Пример структуры content_json:
{
  "sections": [
    {
      "type": "hero",
      "data": {
        "title": "Заголовок",
        "subtitle": "Подзаголовок",
        "image": "/legacy/img/hero.jpg",
        "cta": { "text": "Кнопка", "link": "/contacts" }
      }
    },
    {
      "type": "text",
      "data": {
        "content": "<p>Текст секции</p>",
        "columns": 1
      }
    },
    {
      "type": "form",
      "data": {
        "formId": "contacts-form",
        "fields": [...]
      }
    },
    {
      "type": "gallery",
      "data": {
        "images": [...]
      }
    }
  ]
}
```

### 2. Система компонентов для рендеринга

```typescript
// frontend/src/components/page-sections/SectionRenderer.tsx
interface PageSection {
  type: 'hero' | 'text' | 'form' | 'gallery' | 'advantages' | 'team' | 'reviews';
  data: any;
}

export function SectionRenderer({ section }: { section: PageSection }) {
  switch (section.type) {
    case 'hero':
      return <HeroSection {...section.data} />;
    case 'text':
      return <TextSection {...section.data} />;
    case 'form':
      return <FormSection {...section.data} />;
    case 'gallery':
      return <GallerySection {...section.data} />;
    case 'advantages':
      return <AdvantagesSection {...section.data} />;
    case 'team':
      return <TeamSection {...section.data} />;
    case 'reviews':
      return <ReviewsSection {...section.data} />;
    default:
      return null;
  }
}

// Использование в странице
export function DynamicPage() {
  const { slug } = useParams();
  const { data: page } = useQuery(['page', slug], () => getPageData(slug));
  
  return (
    <PageLayout>
      {page?.content_json?.sections?.map((section, idx) => (
        <SectionRenderer key={idx} section={section} />
      ))}
    </PageLayout>
  );
}
```

### 3. Редактор в админке

```typescript
// frontend/src/pages/pages/PageEditorPage.tsx (обновлённая версия)
export function PageEditorPage() {
  const [contentJson, setContentJson] = useState<PageContentJson>({ sections: [] });
  
  return (
    <Box>
      {/* Визуальный редактор секций */}
      <SectionEditor 
        sections={contentJson.sections}
        onChange={(sections) => setContentJson({ ...contentJson, sections })}
      />
      
      {/* Предпросмотр */}
      <PreviewPanel>
        {contentJson.sections.map((section, idx) => (
          <SectionRenderer key={idx} section={section} />
        ))}
      </PreviewPanel>
    </Box>
  );
}
```

### 4. Компонент визуального редактора секций

```typescript
// frontend/src/components/admin/SectionEditor.tsx
export function SectionEditor({ sections, onChange }: Props) {
  const addSection = (type: SectionType) => {
    const newSection = createDefaultSection(type);
    onChange([...sections, newSection]);
  };
  
  const updateSection = (index: number, data: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], data };
    onChange(updated);
  };
  
  const removeSection = (index: number) => {
    onChange(sections.filter((_, i) => i !== index));
  };
  
  return (
    <Box>
      {/* Кнопки добавления секций */}
      <SectionTypeSelector onSelect={addSection} />
      
      {/* Список секций с редакторами */}
      {sections.map((section, idx) => (
        <SectionItemEditor
          key={idx}
          section={section}
          onChange={(data) => updateSection(idx, data)}
          onRemove={() => removeSection(idx)}
        />
      ))}
    </Box>
  );
}
```

### 5. Редакторы для каждого типа секции

```typescript
// frontend/src/components/admin/section-editors/HeroSectionEditor.tsx
export function HeroSectionEditor({ data, onChange }: Props) {
  return (
    <Box>
      <TextField
        label="Заголовок"
        value={data.title || ''}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
      />
      <TextField
        label="Подзаголовок"
        value={data.subtitle || ''}
        onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
      />
      <ImageUpload
        label="Изображение"
        value={data.image || ''}
        onChange={(url) => onChange({ ...data, image: url })}
      />
      {/* ... другие поля */}
    </Box>
  );
}
```

### 6. Миграция существующих страниц

#### Шаг 1: Парсинг HTML в JSON
```typescript
// backend/scripts/migrateHtmlToJson.js
async function migratePage(slug) {
  const page = await getPage(slug);
  const html = page.body || page.html;
  
  // Парсим HTML в структурированные секции
  const sections = parseHtmlToSections(html);
  
  // Сохраняем в content_json
  await updatePage(slug, {
    content_json: { sections },
    template_type: 'dynamic'
  });
}
```

#### Шаг 2: Создание React компонентов
```typescript
// frontend/src/pages/public/ContactsPage.tsx (новая версия)
export function ContactsPage() {
  const { data: page } = useQuery({
    queryKey: ['public-page', '/contacts'],
    queryFn: () => getPublicPage('/contacts'),
  });
  
  // Если есть content_json, используем его
  if (page?.content_json?.sections) {
    return (
      <PageLayout>
        {page.content_json.sections.map((section, idx) => (
          <SectionRenderer key={idx} section={section} />
        ))}
      </PageLayout>
    );
  }
  
  // Fallback на старый HTML (для обратной совместимости)
  return <SafeHtmlRenderer html={page?.html || ''} />;
}
```

---

## 📝 План миграции по приоритетам

### Фаза 1: Подготовка инфраструктуры (1-2 недели)
1. ✅ Добавить `content_json` и `template_type` в БД
2. ✅ Создать базовые React компоненты секций
3. ✅ Создать `SectionRenderer`
4. ✅ Создать визуальный редактор секций в админке

### Фаза 2: Миграция приоритетных страниц (2-3 недели)
1. **`/contacts`** - высокая посещаемость, важная форма
2. **`/new-client`** - важная форма для лидов
3. **`/promotion`** - маркетинговая страница

### Фаза 3: Миграция остальных страниц (2-3 недели)
1. Определить все страницы из БД
2. Создать React компоненты для каждой
3. Мигрировать данные из HTML в JSON
4. Обновить роутинг

### Фаза 4: Очистка (1 неделя)
1. Удалить `PublicPageRenderer` (или оставить для legacy)
2. Удалить `PublicPageView` catch-all (или ограничить)
3. Удалить неиспользуемый код
4. Обновить документацию

---

## 🛠️ Технические детали

### Преимущества нового подхода:
1. ✅ **Типобезопасность** - TypeScript типы для всех секций
2. ✅ **Переиспользование** - общие компоненты секций
3. ✅ **Производительность** - нет парсинга HTML на клиенте
4. ✅ **Безопасность** - нет `innerHTML`, только React
5. ✅ **Редактируемость** - визуальный редактор в админке
6. ✅ **Валидация** - проверка структуры данных
7. ✅ **Тестируемость** - легко тестировать компоненты

### Обратная совместимость:
- Старые страницы с HTML продолжают работать
- Постепенная миграция без downtime
- Fallback на `SafeHtmlRenderer` для legacy страниц

---

## 📊 Статистика миграции

**Всего страниц с HTML в БД**: 34
- **Уже на React (но есть HTML)**: 8 страниц
- **Только HTML (без React)**: 26 страниц
- **Требуют миграции**: 34 страницы

**Приоритет миграции:**
1. **Высокий** (критичные страницы): `/`, `/contacts`, `/new-client`, `/about`
2. **Средний** (популярные): `/blog`, `/promotion`, `/portfolio`, `/services`
3. **Низкий** (редко используемые): остальные 26 страниц

**Оценка времени**: 
- Критичные страницы: 2-3 недели
- Популярные страницы: 3-4 недели
- Остальные: 4-6 недель
- **Итого**: 9-13 недель

**Приоритет**: Высокий (безопасность и производительность)

