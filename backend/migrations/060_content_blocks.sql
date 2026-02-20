-- Rich content для страниц курсов: text, list, dropdown, checkbox, image, video
ALTER TABLE training_course_pages ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT NULL;
COMMENT ON COLUMN training_course_pages.content_blocks IS 'Массив блоков: {type, ...}. Типы: text, list, dropdown, checkbox, image, video';

-- Пример rich content для страницы ЛПР "Как найти ЛПР" (page_index=3)
DO $$
DECLARE
  pid INTEGER;
BEGIN
  SELECT p.id INTO pid FROM training_course_pages p
  JOIN training_courses c ON c.id = p.course_id
  WHERE c.slug = 'lpr' AND p.page_index = 3 LIMIT 1;
  IF pid IS NOT NULL THEN
    UPDATE training_course_pages SET content_blocks = '[
      {"type":"text","text":"Используйте несколько каналов для поиска контактов ЛПР:"},
      {"type":"list","items":["LinkedIn — профиль компании и сотрудников","Корпоративный сайт — раздел «Руководство»","Отраслевые мероприятия — спикеры, участники"],"ordered":false},
      {"type":"dropdown","title":"Вопрос привратнику","content":"«Кто принимает решения по закупкам в этой сфере?» — прямой и эффективный вопрос. Добавьте: «Кому передать материалы для ознакомления?»"},
      {"type":"checkbox","title":"Чек-лист поиска","items":["Найти ФИО и должность","Проверить LinkedIn","Найти email/телефон","Подготовить персональное обращение"]},
      {"type":"text","text":"Цепочка вопросов: «С кем мне обсудить это решение?» → «Кто ещё участвует в принятии решения?»"}
    ]'::jsonb WHERE id = pid;
  END IF;
END $$;

-- Пример для "Цепочка контактов" (page_index=5)
DO $$
DECLARE
  pid INTEGER;
BEGIN
  SELECT p.id INTO pid FROM training_course_pages p
  JOIN training_courses c ON c.id = p.course_id
  WHERE c.slug = 'lpr' AND p.page_index = 5 LIMIT 1;
  IF pid IS NOT NULL THEN
    UPDATE training_course_pages SET content_blocks = '[
      {"type":"text","text":"Выстраивайте цепочку контактов. Каждому звену — свой месседж:"},
      {"type":"list","items":["Привратник → краткость, вежливость, ценность для компании","Влияющий (руководитель направления) → техническая польза, решение задач","ЛПР → ROI, стратегическая выгода, итоговое решение"],"ordered":true},
      {"type":"dropdown","title":"Почему не идти сразу к ЛПР?","content":"Прямой выход на ЛПР часто блокируется. Привратник защищает время руководства. Пройдя через влияющего, вы получаете внутреннего союзника, который может рекомендовать вас ЛПР с уже подготовленным контекстом."},
      {"type":"checkbox","title":"Перед контактом с ЛПР убедитесь","items":["Знаете его роль и полномочия","Подготовили ROI и кейсы","Есть конкретное ценностное предложение","Известны боли и приоритеты компании"]}
    ]'::jsonb WHERE id = pid;
  END IF;
END $$;
