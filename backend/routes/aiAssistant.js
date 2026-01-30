import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { callOpenAIJSON } from './ai.js';

const router = express.Router();

router.use(requireAuth);

// Генерация персональных рекомендаций
router.post('/generate-recommendations', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Получаем статистику пользователя
    const [tasksStats, projectsStats, metricsStats, streaksStats] = await Promise.all([
      // Статистика задач за последние 7 дней
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE) as overdue
         FROM tasks
         WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
        [userId]
      ),
      
      // Статистика проектов
      pool.query(
        `SELECT name, progress, deadline, priority
         FROM projects
         WHERE user_id = $1 AND is_archived = false
         ORDER BY priority DESC`,
        [userId]
      ),
      
      // Метрики за последние 7 дней
      pool.query(
        `SELECT date, completion_rate, energy_level, mood, sleep_hours
         FROM daily_metrics
         WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY date DESC`,
        [userId]
      ),
      
      // Стрики
      pool.query(
        'SELECT type, current_count, best_count FROM streaks WHERE user_id = $1',
        [userId]
      ),
    ]);

    const tasks = tasksStats.rows[0];
    const projects = projectsStats.rows;
    const metrics = metricsStats.rows;
    const streaks = streaksStats.rows;

    // Формируем промпт для AI
    const prompt = `Ты - личный AI-помощник "Boost Assistant" для планирования и продуктивности.

СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ:

Задачи (последние 7 дней):
- Выполнено: ${tasks.completed}
- В работе: ${tasks.in_progress}
- Просрочено: ${tasks.overdue}

Проекты:
${projects.map(p => `- ${p.name}: ${p.progress}% (приоритет ${p.priority}/5)${p.deadline ? `, дедлайн ${p.deadline}` : ''}`).join('\n')}

Метрики (последние 7 дней):
${metrics.map(m => `- ${m.date}: ${m.completion_rate}% выполнено${m.energy_level ? `, энергия ${m.energy_level}/10` : ''}${m.mood ? `, настроение ${m.mood}/10` : ''}`).join('\n')}

Стрики:
${streaks.map(s => `- ${s.type}: ${s.current_count} дней подряд (рекорд ${s.best_count})`).join('\n')}

ЗАДАЧА:
Проанализируй данные и создай 3-5 персональных рекомендаций для пользователя.
Каждая рекомендация должна быть:
1. Конкретной и действенной
2. Основана на реальных данных
3. Мотивирующей и полезной

Типы рекомендаций:
- "task" - предложение новой задачи
- "insight" - инсайт о продуктивности
- "warning" - предупреждение о проблеме
- "achievement" - достижение

Формат ответа (JSON):
{
  "recommendations": [
    {
      "type": "warning",
      "title": "Заголовок",
      "description": "Описание проблемы",
      "action_text": "Что делать",
      "priority": 4
    }
  ]
}`;

    let aiResponse;
    try {
      // callOpenAIJSON принимает (system, user) - оба строки
      const systemPrompt = 'Ты - AI помощник для планировщика задач. Генерируй рекомендации в формате JSON.';
      aiResponse = await callOpenAIJSON(systemPrompt, prompt);
    } catch (error) {
      console.error('AI error:', error);
      // Фоллбэк рекомендации
      aiResponse = {
        recommendations: [
          {
            type: 'insight',
            title: 'Анализ доступен',
            description: 'AI-анализ временно недоступен, но вы можете продолжать работать!',
            priority: 3,
          },
        ],
      };
    }

    // Сохраняем рекомендации в БД
    const recommendations = aiResponse.recommendations || [];
    const savedRecs = [];

    for (const rec of recommendations) {
      const result = await pool.query(
        `INSERT INTO ai_recommendations (user_id, type, title, description, action_text, priority, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')
         RETURNING *`,
        [userId, rec.type, rec.title, rec.description, rec.action_text, rec.priority || 3]
      );
      savedRecs.push(result.rows[0]);
    }

    res.json({ recommendations: savedRecs });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Генерация умных задач на основе контекста
router.post('/suggest-tasks', async (req, res) => {
  try {
    const userId = req.user.id;
    const { context } = req.body; // "morning", "evening", "project_X"

    const projectsResult = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND is_archived = false',
      [userId]
    );

    const tasksResult = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 AND status != 'completed' 
       ORDER BY priority DESC, created_at DESC 
       LIMIT 10`,
      [userId]
    );

    const prompt = `Ты - AI-помощник для планирования.

Контекст: ${context}

Проекты пользователя:
${projectsResult.rows.map(p => `- ${p.name} (${p.progress}%)`).join('\n')}

Текущие задачи:
${tasksResult.rows.map(t => `- ${t.title} (${t.priority}/5)`).join('\n')}

Предложи 3-5 новых задач, которые помогут продвинуться по проектам.

Формат ответа (JSON):
{
  "tasks": [
    {
      "title": "Название задачи",
      "description": "Описание",
      "project_name": "Название проекта",
      "priority": 3,
      "estimated_time": 60,
      "reason": "Почему это важно"
    }
  ]
}`;

    let aiResponse;
    try {
      // callOpenAIJSON принимает (system, user) - оба строки
      const systemPrompt = 'Ты - AI помощник для планировщика задач. Генерируй задачи в формате JSON.';
      aiResponse = await callOpenAIJSON(systemPrompt, prompt);
    } catch (error) {
      console.error('AI error:', error);
      aiResponse = { tasks: [] };
    }

    res.json(aiResponse);
  } catch (error) {
    console.error('Error suggesting tasks:', error);
    res.status(500).json({ error: 'Failed to suggest tasks' });
  }
});

// Персональные рекомендации для категорий
router.post('/personal-recommendations', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.body; // workouts, nutrition, reading, education

    let profile = null;
    let entries = [];
    let recommendations = null; // Будет установлен в каждом case

    switch (category) {
      case 'workouts':
        // Получаем профиль тренировок
        const workoutProfileResult = await pool.query(
          'SELECT * FROM user_workout_profile WHERE user_id = $1',
          [userId]
        );
        profile = workoutProfileResult.rows[0];

        // Получаем последние записи
        const workoutEntriesResult = await pool.query(
          `SELECT pe.* FROM personal_entries pe
           JOIN personal_categories pc ON pe.category_id = pc.id
           WHERE pe.user_id = $1 AND pc.name = 'workouts'
           ORDER BY pe.date DESC LIMIT 10`,
          [userId]
        );
        entries = workoutEntriesResult.rows;
        
        console.log('[AI Assistant] Workout profile check:', {
          hasProfile: !!profile,
          profileData: profile,
          entriesCount: entries.length,
        });

        if (!profile) {
          console.log('[AI Assistant] No workout profile found for user:', userId);
          recommendations = {
            plan: [],
            recommendations: ['Заполните профиль тренировок для получения персональных рекомендаций.'],
          };
        } else {
          console.log('[AI Assistant] Profile found, generating recommendations...');
          const systemPrompt = 'Ты - персональный тренер. Создавай детальные планы тренировок в формате JSON. Всегда возвращай валидный JSON.';
          
          const userPrompt = `Проанализируй профиль пользователя и создай план тренировок.

ПРОФИЛЬ:
- Рост: ${profile.height || 'не указан'} см
- Вес: ${profile.weight || 'не указан'} кг
- Возраст: ${profile.age || 'не указан'}
- Пол: ${profile.gender || 'не указан'}
- Уровень: ${profile.fitness_level || 'не указан'}
- Цели: ${(profile.goals || []).join(', ') || 'не указаны'}
- Предпочтения: ${(profile.preferences || []).join(', ') || 'не указаны'}
${profile.limitations ? `- Ограничения: ${profile.limitations}` : ''}

ПОСЛЕДНИЕ ТРЕНИРОВКИ:
${entries.map(e => `- ${e.date}: ${e.workout_type || 'тренировка'}, ${e.workout_duration || 0} мин${e.workout_weight ? `, вес ${e.workout_weight} кг` : ''}`).join('\n') || 'Нет записей'}

Создай план тренировок на неделю с конкретными упражнениями, подходами, повторениями и весами.
Учти цели, уровень подготовки и ограничения.

ВАЖНО: Для каждого упражнения ОБЯЗАТЕЛЬНО добавь:
- "image_url": URL изображения из Pixabay (формат: https://pixabay.com/get/[id]/)
  Используй реальные URL изображений для упражнений (например, для "приседания" - "squat exercise", для "жим лежа" - "bench press")
  Можно использовать прямые ссылки на изображения Pixabay или другие бесплатные источники
- "description": Краткое описание техники выполнения (1-2 предложения с конкретными указаниями)

Формат ответа (JSON):
{
  "plan": [
    {
      "day": "Понедельник",
      "workout_type": "Силовая",
      "exercises": [
        {
          "name": "Жим лежа",
          "sets": 4,
          "reps": "8-10",
          "weight": "80кг",
          "rest": "2-3 мин",
          "image_url": "https://example.com/exercise/bench-press.jpg",
          "description": "Описание техники выполнения"
        }
      ],
      "duration": 60,
      "notes": "Фокус на грудь и трицепс"
    }
  ],
  "recommendations": [
    "Рекомендация 1",
    "Рекомендация 2"
  ]
}

ВАЖНО: Для каждого упражнения добавь поле "image_url" с URL изображения упражнения из Pixabay или другого бесплатного источника.
Можно использовать прямые ссылки на изображения или оставить пустым - система автоматически подберет изображение.`;

          try {
            console.log('[AI Assistant] Calling OpenAI for workouts...');
            console.log('[AI Assistant] System prompt type:', typeof systemPrompt, 'length:', systemPrompt?.length);
            console.log('[AI Assistant] User prompt type:', typeof userPrompt, 'length:', userPrompt?.length);
            
            // Убеждаемся, что оба параметра - строки
            const systemStr = typeof systemPrompt === 'string' ? systemPrompt : String(systemPrompt);
            const userStr = typeof userPrompt === 'string' ? userPrompt : String(userPrompt);
            
            console.log('[AI Assistant] Calling with system:', systemStr.substring(0, 100));
            console.log('[AI Assistant] Calling with user:', userStr.substring(0, 200));
            
            const aiResponse = await callOpenAIJSON(systemStr, userStr);
            console.log('[AI Assistant] Workout AI response (raw):', JSON.stringify(aiResponse, null, 2));
            console.log('[AI Assistant] AI response type:', typeof aiResponse);
            console.log('[AI Assistant] AI response keys:', aiResponse ? Object.keys(aiResponse) : 'null');
            
            if (aiResponse && (aiResponse.plan || aiResponse.recommendations)) {
              console.log('[AI Assistant] Using AI response');
              
              // Проверяем и добавляем image_url если его нет
              if (aiResponse.plan && Array.isArray(aiResponse.plan)) {
                console.log('[AI Assistant] Processing plan with', aiResponse.plan.length, 'days');
                for (const [dayIndex, day] of aiResponse.plan.entries()) {
                  console.log(`[AI Assistant] Day ${dayIndex + 1}: ${day.day}, exercises count:`, day.exercises?.length || 0);
                  if (day.exercises && Array.isArray(day.exercises)) {
                    for (const [exIndex, ex] of day.exercises.entries()) {
                      console.log(`[AI Assistant] Exercise ${exIndex + 1}: ${ex.name}, has image_url:`, !!ex.image_url, 'image_url:', ex.image_url);
                      // Сначала проверяем, есть ли сохраненное изображение в БД
                      if (!ex.image_url || !ex.image_url.startsWith('http')) {
                        try {
                          const imageResult = await pool.query(
                            'SELECT image_url FROM exercise_images WHERE name ILIKE $1 AND category = $2 LIMIT 1',
                            [ex.name, 'workout']
                          );
                          
                          if (imageResult.rows.length > 0) {
                            ex.image_url = imageResult.rows[0].image_url;
                            console.log(`[AI Assistant] ✅ Found saved image for "${ex.name}": ${ex.image_url}`);
                          } else {
                            // Если не найдено, генерируем URL на основе названия упражнения (используем Pexels)
                            const exerciseName = ex.name?.toLowerCase() || '';
                            let imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg'; // default - фитнес
                            
                            if (exerciseName.includes('присед') || exerciseName.includes('squat')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                            } else if (exerciseName.includes('жим') && exerciseName.includes('леж')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                            } else if (exerciseName.includes('тяга')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                            } else if (exerciseName.includes('бег') || exerciseName.includes('run')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2016/11/29/09/16/runner-1868632_1280.jpg';
                            } else if (exerciseName.includes('велосипед') || exerciseName.includes('bike')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2016/11/29/09/16/runner-1868632_1280.jpg';
                            } else if (exerciseName.includes('подтяг') || exerciseName.includes('pull')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                            } else if (exerciseName.includes('отжим') || exerciseName.includes('push')) {
                              imageUrl = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                            }
                            
                            ex.image_url = imageUrl;
                            console.log(`[AI Assistant] ✅ Added auto-generated image_url for "${ex.name}": ${ex.image_url}`);
                            
                            // Автоматически сохраняем в БД
                            try {
                              await pool.query(
                                `INSERT INTO exercise_images (name, category, image_url, source, unsplash_id)
                                 VALUES ($1, $2, $3, $4, $5)
                                 ON CONFLICT (name, category) 
                                 DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
                                [ex.name, 'workout', ex.image_url, 'pixabay', null]
                              );
                              console.log(`[AI Assistant] ✅ Saved image to DB for "${ex.name}"`);
                            } catch (dbError) {
                              console.error(`[AI Assistant] Error saving image to DB for "${ex.name}":`, dbError);
                            }
                          }
                        } catch (error) {
                          console.error(`[AI Assistant] Error checking saved image for "${ex.name}":`, error);
                          // Fallback к автогенерации
                          const exerciseName = ex.name?.toLowerCase() || '';
                          ex.image_url = 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg';
                        }
                      } else if (ex.image_url && ex.image_url.startsWith('http')) {
                        // Если AI вернул изображение, сохраняем его в БД
                        try {
                          await pool.query(
                                `INSERT INTO exercise_images (name, category, image_url, source)
                                 VALUES ($1, $2, $3, $4)
                                 ON CONFLICT (name, category) 
                                 DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
                                        [ex.name, 'workout', ex.image_url, 'pixabay']
                          );
                          console.log(`[AI Assistant] ✅ Saved AI-provided image to DB for "${ex.name}"`);
                        } catch (dbError) {
                          console.error(`[AI Assistant] Error saving AI image to DB for "${ex.name}":`, dbError);
                        }
                      } else {
                        console.log(`[AI Assistant] ✅ Exercise "${ex.name}" already has image_url: ${ex.image_url}`);
                      }
                      if (!ex.description) {
                        ex.description = `Техника выполнения упражнения "${ex.name}"`;
                        console.log(`[AI Assistant] ✅ Added description for "${ex.name}"`);
                      }
                    }
                  }
                }
                // Логируем первый день для проверки
                if (aiResponse.plan[0] && aiResponse.plan[0].exercises) {
                  console.log('[AI Assistant] First day exercises after processing:', JSON.stringify(aiResponse.plan[0].exercises, null, 2));
                  // Проверяем, что все упражнения имеют image_url
                  aiResponse.plan[0].exercises.forEach((ex, idx) => {
                    if (!ex.image_url) {
                      console.error(`[AI Assistant] ❌ ERROR: Exercise ${idx + 1} "${ex.name}" has NO image_url after processing!`);
                    } else {
                      console.log(`[AI Assistant] ✅ Exercise ${idx + 1} "${ex.name}" has image_url: ${ex.image_url}`);
                    }
                  });
                }
              }
              
              recommendations = aiResponse;
              console.log('[AI Assistant] Final recommendations with image_urls:', JSON.stringify(recommendations, null, 2).substring(0, 1000));
            } else {
              console.warn('[AI Assistant] AI returned invalid response, using fallback');
              console.warn('[AI Assistant] AI response was:', aiResponse);
              recommendations = {
                plan: [
                  {
                    day: 'Понедельник',
                    workout_type: 'Силовая',
                    exercises: [
                      { 
                        name: 'Приседания', 
                        sets: 4, 
                        reps: '10-12', 
                        rest: '2-3 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'Ноги на ширине плеч, спина прямая, приседайте до параллели бедер с полом'
                      },
                      { 
                        name: 'Жим лежа', 
                        sets: 4, 
                        reps: '8-10', 
                        rest: '2-3 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'Лежа на скамье, опускайте штангу к груди, затем выжимайте вверх'
                      },
                      { 
                        name: 'Тяга штанги в наклоне', 
                        sets: 4, 
                        reps: '8-10', 
                        rest: '2-3 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'Наклонитесь вперед, тяните штангу к нижней части груди, сводите лопатки'
                      },
                    ],
                    duration: 60,
                    notes: 'Базовая силовая тренировка',
                  },
                  {
                    day: 'Среда',
                    workout_type: 'Кардио',
                    exercises: [
                      { 
                        name: 'Бег', 
                        sets: 1, 
                        reps: '20-30 мин', 
                        rest: '5 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2016/11/29/09/16/runner-1868632_1280.jpg',
                        description: 'Бег в умеренном темпе для развития выносливости. Держите темп, при котором можете говорить'
                      },
                      { 
                        name: 'Велосипед', 
                        sets: 1, 
                        reps: '15-20 мин', 
                        rest: '5 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2016/11/29/09/16/runner-1868632_1280.jpg',
                        description: 'Велотренажер или велосипед в среднем темпе. Поддерживайте постоянную скорость'
                      },
                    ],
                    duration: 45,
                    notes: 'Кардио тренировка для выносливости',
                  },
                  {
                    day: 'Пятница',
                    workout_type: 'Силовая',
                    exercises: [
                      { 
                        name: 'Жим ногами', 
                        sets: 4, 
                        reps: '12-15', 
                        rest: '2-3 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'В тренажере для жима ногами, опускайте платформу до угла 90 градусов, затем выжимайте'
                      },
                      { 
                        name: 'Подтягивания', 
                        sets: 3, 
                        reps: '8-10', 
                        rest: '2-3 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'На перекладине, подтягивайтесь до касания подбородком перекладины, медленно опускайтесь'
                      },
                      { 
                        name: 'Отжимания', 
                        sets: 3, 
                        reps: '12-15', 
                        rest: '1-2 мин',
                        image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                        description: 'Корпус прямой, опускайтесь до касания грудью пола, затем выжимайтесь вверх'
                      },
                    ],
                    duration: 60,
                    notes: 'Верх тела и ноги',
                  },
                ],
                recommendations: [
                  'Тренируйтесь регулярно 3-4 раза в неделю',
                  'Следите за техникой выполнения упражнений',
                  'Не забывайте про разминку и заминку',
                  'Пейте достаточно воды во время тренировок',
                  'Высыпайтесь для лучшего восстановления',
                ],
              };
            }
          } catch (error) {
            console.error('[AI Assistant] AI error:', error);
            console.error('[AI Assistant] Error message:', error.message);
            console.error('[AI Assistant] Error stack:', error.stack);
            
            // Если это ошибка типа, пробрасываем дальше (не используем fallback)
            if (error.message && error.message.includes('OPENAI_TYPE_ERROR')) {
              console.error('[AI Assistant] CRITICAL: Type error in AI call, throwing...');
              throw error; // Пробрасываем, чтобы увидеть реальную ошибку
            }
            
            // Всегда возвращаем валидный объект, даже при ошибке
            recommendations = {
              plan: [
                {
                  day: 'Понедельник',
                  workout_type: 'Силовая',
                  exercises: [
                    { 
                      name: 'Приседания', 
                      sets: 4, 
                      reps: '10-12', 
                      rest: '2-3 мин',
                      image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                      description: 'Ноги на ширине плеч, спина прямая, приседайте до параллели бедер с полом'
                    },
                    { 
                      name: 'Жим лежа', 
                      sets: 4, 
                      reps: '8-10', 
                      rest: '2-3 мин',
                      image_url: 'https://cdn.pixabay.com/photo/2017/08/07/14/02/man-2604149_1280.jpg',
                      description: 'Лежа на скамье, опускайте штангу к груди, затем выжимайте вверх'
                    },
                  ],
                  duration: 60,
                  notes: 'Базовая тренировка',
                },
              ],
              recommendations: [
                'AI временно недоступен. Используйте базовый план тренировок.',
                'Тренируйтесь регулярно 3-4 раза в неделю',
                'Следите за техникой выполнения упражнений',
              ],
            };
          }
          
          console.log('[AI Assistant] Final recommendations before break:', recommendations);
        }
        
        console.log('[AI Assistant] After workouts case, recommendations:', recommendations);
        break;

      case 'reading':
        const readingProfileResult = await pool.query(
          'SELECT * FROM user_reading_profile WHERE user_id = $1',
          [userId]
        );
        profile = readingProfileResult.rows[0];

        const readingEntriesResult = await pool.query(
          `SELECT pe.* FROM personal_entries pe
           JOIN personal_categories pc ON pe.category_id = pc.id
           WHERE pe.user_id = $1 AND pc.name = 'reading'
           ORDER BY pe.date DESC LIMIT 10`,
          [userId]
        );
        entries = readingEntriesResult.rows;

        if (!profile) {
          console.log('[AI Assistant] No reading profile found for user:', userId);
          recommendations = {
            recommended_books: [],
            reading_plan: {},
            tips: ['Заполните профиль чтения для получения персональных рекомендаций.'],
          };
        } else {
          const systemPrompt = 'Ты - персональный книжный консультант. Рекомендуй книги в формате JSON. Всегда возвращай валидный JSON. ВСЕГДА используй русские названия книг, даже если оригинальное название на другом языке.';
          
          const userPrompt = `Рекомендуй книги на основе профиля.

ПРОФИЛЬ:
- Любимые жанры: ${(profile.favorite_genres || []).join(', ') || 'не указаны'}
- Цель: ${profile.books_per_month_target || 'не указано'} книг/месяц
- Цель: ${profile.pages_per_day_target || 'не указано'} страниц/день
- Прочитано: ${(profile.read_books || []).join(', ') || 'нет'}

ПОСЛЕДНИЕ ЗАПИСИ:
${entries.map(e => `- ${e.date}: "${e.reading_book_title || 'книга'}", ${e.reading_pages_read || 0} стр`).join('\n') || 'Нет записей'}

ВАЖНО: Рекомендуй 5-7 книг, которые точно понравятся пользователю.
- ВСЕ названия книг должны быть на РУССКОМ ЯЗЫКЕ (используй официальные русские переводы)
- Если книга иностранная, используй её русское название издания
- Авторов можно указывать на языке оригинала, но предпочтительно на русском
- Учитывай жанры и прочитанные книги

Формат ответа (JSON):
{
  "recommended_books": [
    {
      "title": "Название на русском языке",
      "author": "Автор (предпочтительно на русском)",
      "genre": "Жанр",
      "reason": "Почему рекомендую",
      "pages": 300
    }
  ],
  "reading_plan": {
    "daily_pages": 25,
    "books_per_month": 2,
    "schedule": "Читайте 30 минут перед сном"
  },
  "tips": [
      "Совет 1",
      "Совет 2"
  ]
}`;

          try {
            console.log('[AI Assistant] Calling OpenAI for reading...');
            console.log('[AI Assistant] System prompt type:', typeof systemPrompt);
            console.log('[AI Assistant] User prompt type:', typeof userPrompt);
            
            // Убеждаемся, что оба параметра - строки
            const systemStr = typeof systemPrompt === 'string' ? systemPrompt : String(systemPrompt);
            const userStr = typeof userPrompt === 'string' ? userPrompt : String(userPrompt);
            
            const aiResponse = await callOpenAIJSON(systemStr, userStr);
            console.log('[AI Assistant] Reading AI response:', aiResponse);
            
                        if (aiResponse && (aiResponse.recommended_books || aiResponse.tips)) {
                          // Добавляем image_url для книг если его нет
                          if (aiResponse.recommended_books && Array.isArray(aiResponse.recommended_books)) {
                            for (const book of aiResponse.recommended_books) {
                              if (!book.image_url || !book.image_url.startsWith('http')) {
                                try {
                                  // Проверяем сохраненное изображение в БД
                                  const imageResult = await pool.query(
                                    'SELECT image_url FROM exercise_images WHERE name ILIKE $1 AND category = $2 LIMIT 1',
                                    [book.title, 'book']
                                  );
                                  
                                  if (imageResult.rows.length > 0) {
                                    book.image_url = imageResult.rows[0].image_url;
                                    console.log(`[AI Assistant] ✅ Found saved image for book "${book.title}": ${book.image_url}`);
                                  } else {
                                    // Fallback к автогенерации (используем Pexels)
                                    const bookTitle = book.title?.toLowerCase() || '';
                                    let imageUrl = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg'; // default book cover
                                    
                                    if (book.genre?.toLowerCase().includes('фантаст') || book.genre?.toLowerCase().includes('sci-fi')) {
                                      imageUrl = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg';
                                    } else if (book.genre?.toLowerCase().includes('детект') || book.genre?.toLowerCase().includes('mystery')) {
                                      imageUrl = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg';
                                    } else if (book.genre?.toLowerCase().includes('саморазвит') || book.genre?.toLowerCase().includes('self-help')) {
                                      imageUrl = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg';
                                    } else if (book.genre?.toLowerCase().includes('истори') || book.genre?.toLowerCase().includes('history')) {
                                      imageUrl = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg';
                                    }
                                    
                                    book.image_url = imageUrl;
                                    console.log(`[AI Assistant] ✅ Added auto-generated image_url for book "${book.title}": ${book.image_url}`);
                                    
                                    // Автоматически сохраняем в БД
                                    try {
                                      await pool.query(
                                        `INSERT INTO exercise_images (name, category, image_url, source, unsplash_id)
                                         VALUES ($1, $2, $3, $4, $5)
                                         ON CONFLICT (name, category) 
                                         DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
                                        [book.title, 'book', book.image_url, 'pixabay', null]
                                      );
                                      console.log(`[AI Assistant] ✅ Saved image to DB for book "${book.title}"`);
                                    } catch (dbError) {
                                      console.error(`[AI Assistant] Error saving image to DB for book "${book.title}":`, dbError);
                                    }
                                  }
                                } catch (error) {
                                  console.error(`[AI Assistant] Error checking saved image for book "${book.title}":`, error);
                                  book.image_url = 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg';
                                }
                              } else if (book.image_url && book.image_url.startsWith('http')) {
                                // Если AI вернул изображение, сохраняем его в БД
                                try {
                                  await pool.query(
                                        `INSERT INTO exercise_images (name, category, image_url, source)
                                         VALUES ($1, $2, $3, $4)
                                         ON CONFLICT (name, category) 
                                         DO UPDATE SET image_url = EXCLUDED.image_url, updated_at = NOW()`,
                                        [book.title, 'book', book.image_url, 'pixabay']
                                  );
                                  console.log(`[AI Assistant] ✅ Saved AI-provided image to DB for book "${book.title}"`);
                                } catch (dbError) {
                                  console.error(`[AI Assistant] Error saving AI image to DB for book "${book.title}":`, dbError);
                                }
                              }
                            }
                          }
                          recommendations = aiResponse;
                        } else {
              console.warn('[AI Assistant] AI returned invalid response, using fallback');
              recommendations = {
                recommended_books: [
                  {
                    title: 'Атомные привычки',
                    author: 'Джеймс Клир',
                    genre: 'Саморазвитие',
                    reason: 'Отличная книга о формировании полезных привычек',
                    pages: 320,
                    image_url: 'https://cdn.pixabay.com/photo/2015/11/19/21/10/glasses-1052010_1280.jpg',
                  },
                ],
                reading_plan: {
                  daily_pages: 25,
                  books_per_month: 2,
                  schedule: 'Читайте 30 минут перед сном',
                },
                tips: [
                  'Читайте регулярно, даже по 10-15 минут в день',
                  'Ведите список прочитанных книг',
                  'Обсуждайте прочитанное с друзьями',
                ],
              };
            }
          } catch (error) {
            console.error('[AI Assistant] AI error:', error);
            console.error('[AI Assistant] Error message:', error.message);
            // Всегда возвращаем валидный объект, даже при ошибке
            recommendations = {
              recommended_books: [
                {
                  title: 'Атомные привычки',
                  author: 'Джеймс Клир',
                  genre: 'Саморазвитие',
                  reason: 'AI временно недоступен. Попробуйте эту популярную книгу о формировании полезных привычек.',
                  pages: 320,
                  image_url: 'https://images.unsplash.com/photo-1481620540985-b59f836806b4?w=400&h=600&fit=crop',
                },
                {
                  title: 'Магия утра',
                  author: 'Хэл Элрод',
                  genre: 'Саморазвитие',
                  reason: 'Книга о том, как изменить свою жизнь, изменив утренние привычки.',
                  pages: 240,
                  image_url: 'https://images.unsplash.com/photo-1481620540985-b59f836806b4?w=400&h=600&fit=crop',
                },
                {
                  title: 'Семь навыков высокоэффективных людей',
                  author: 'Стивен Кови',
                  genre: 'Саморазвитие',
                  reason: 'Классическая книга о личной эффективности и развитии.',
                  pages: 384,
                  image_url: 'https://images.unsplash.com/photo-1481620540985-b59f836806b4?w=400&h=600&fit=crop',
                },
              ],
              reading_plan: {
                daily_pages: 20,
                books_per_month: 1,
                schedule: 'Читайте регулярно',
              },
              tips: [
                'AI временно недоступен. Продолжайте читать!',
                'Читайте регулярно, даже по 10-15 минут в день',
              ],
            };
          }
        }
        break;

      case 'nutrition':
        // Получаем профиль питания
        const nutritionProfileResult = await pool.query(
          'SELECT * FROM user_nutrition_profile WHERE user_id = $1',
          [userId]
        );
        profile = nutritionProfileResult.rows[0];

        if (!profile) {
          recommendations = {
            meal_plan: [],
            recommendations: ['Заполните профиль питания для получения персональных рекомендаций.'],
          };
        } else {
          const systemPrompt = 'Ты - профессиональный диетолог. Создавай детальные планы питания в формате JSON.';
          const userPrompt = `Создай план питания на неделю на основе профиля:
- Калории: ${profile.daily_calories_goal || 'не указано'} ккал/день
- Белки: ${profile.daily_protein_goal || 'не указано'}г
- Углеводы: ${profile.daily_carbs_goal || 'не указано'}г
- Жиры: ${profile.daily_fats_goal || 'не указано'}г
- Тип диеты: ${profile.diet_type || 'стандартная'}
- Аллергии: ${(profile.allergies || []).join(', ') || 'нет'}

Формат ответа (JSON):
{
  "meal_plan": [
    {
      "day": "Понедельник",
      "meals": [
        {
          "meal_type": "Завтрак",
          "name": "Овсянка с фруктами",
          "calories": 400,
          "protein": 15,
          "carbs": 60,
          "fats": 10,
          "description": "Описание блюда"
        }
      ]
    }
  ],
  "recommendations": ["Совет 1", "Совет 2"]
}`;

          try {
            const aiResponse = await callOpenAIJSON(systemPrompt, userPrompt);
            if (aiResponse && aiResponse.meal_plan) {
              recommendations = aiResponse;
            } else {
              recommendations = {
                meal_plan: [],
                recommendations: ['Не удалось сгенерировать план питания. Попробуйте позже.'],
              };
            }
          } catch (error) {
            console.error('[AI Assistant] Error generating nutrition plan:', error);
            recommendations = {
              meal_plan: [],
              recommendations: ['Ошибка при генерации плана питания.'],
            };
          }
        }
        break;

      case 'education':
        // Получаем профиль образования
        const educationProfileResult = await pool.query(
          'SELECT * FROM user_education_profile WHERE user_id = $1',
          [userId]
        );
        profile = educationProfileResult.rows[0];

        if (!profile) {
          recommendations = {
            courses: [],
            recommendations: ['Заполните профиль образования для получения персональных рекомендаций.'],
          };
        } else {
          const systemPrompt = 'Ты - карьерный консультант. Рекомендуй курсы и образовательные ресурсы в формате JSON.';
          const userPrompt = `Порекомендуй курсы и ресурсы на основе профиля:
- Интересы: ${(profile.areas_of_interest || []).join(', ') || 'не указаны'}
- Текущие навыки: ${(profile.current_skills || []).join(', ') || 'не указаны'}
- Целевые навыки: ${(profile.target_skills || []).join(', ') || 'не указаны'}
- Цели обучения: ${profile.learning_goals || 'не указаны'}
- Часов в неделю: ${profile.hours_per_week || 'не указано'}

Формат ответа (JSON):
{
  "courses": [
    {
      "title": "Название курса",
      "platform": "Платформа",
      "duration": "Длительность",
      "level": "Уровень",
      "description": "Описание",
      "url": "Ссылка"
    }
  ],
  "recommendations": ["Совет 1", "Совет 2"]
}`;

          try {
            const aiResponse = await callOpenAIJSON(systemPrompt, userPrompt);
            if (aiResponse && aiResponse.courses) {
              recommendations = aiResponse;
            } else {
              recommendations = {
                courses: [],
                recommendations: ['Не удалось сгенерировать рекомендации по обучению. Попробуйте позже.'],
              };
            }
          } catch (error) {
            console.error('[AI Assistant] Error generating education recommendations:', error);
            recommendations = {
              courses: [],
              recommendations: ['Ошибка при генерации рекомендаций по обучению.'],
            };
          }
        }
        break;

      case 'finance':
        // Получаем профиль финансов
        const financeProfileResult = await pool.query(
          'SELECT * FROM user_finance_profile WHERE user_id = $1',
          [userId]
        );
        profile = financeProfileResult.rows[0];

        if (!profile) {
          recommendations = {
            tips: [],
            recommendations: ['Заполните финансовый профиль для получения персональных рекомендаций.'],
          };
        } else {
          const systemPrompt = 'Ты - финансовый консультант. Давай практичные советы по управлению финансами в формате JSON.';
          const userPrompt = `Дай финансовые советы на основе профиля:
- Ежемесячный доход: ${profile.monthly_income || 'не указан'} ₽
- Бюджет: ${profile.monthly_budget || 'не указан'} ₽
- Цель накоплений: ${profile.savings_goal || 'не указана'} ₽
- Цель инвестиций: ${profile.investment_goal || 'не указана'} ₽

Формат ответа (JSON):
{
  "tips": [
    {
      "title": "Название совета",
      "category": "Категория",
      "description": "Описание совета"
    }
  ],
  "recommendations": ["Совет 1", "Совет 2"]
}`;

          try {
            const aiResponse = await callOpenAIJSON(systemPrompt, userPrompt);
            if (aiResponse && aiResponse.tips) {
              recommendations = aiResponse;
            } else {
              recommendations = {
                tips: [],
                recommendations: ['Не удалось сгенерировать финансовые советы. Попробуйте позже.'],
              };
            }
          } catch (error) {
            console.error('[AI Assistant] Error generating finance recommendations:', error);
            recommendations = {
              tips: [],
              recommendations: ['Ошибка при генерации финансовых советов.'],
            };
          }
        }
        break;
        
      default:
        console.warn('[AI Assistant] Unknown category:', category);
        recommendations = {
          recommendations: [`Категория "${category}" пока не поддерживается.`],
        };
        break;
    }

    // Убеждаемся, что recommendations не null
    console.log('[AI Assistant] Before final check, recommendations:', recommendations);
    console.log('[AI Assistant] Recommendations type:', typeof recommendations);
    console.log('[AI Assistant] Is array:', Array.isArray(recommendations));
    console.log('[AI Assistant] Is object:', recommendations && typeof recommendations === 'object' && !Array.isArray(recommendations));
    
    if (!recommendations) {
      console.warn('[AI Assistant] Recommendations is null, setting default');
      recommendations = {
        recommendations: ['Рекомендации временно недоступны. Попробуйте позже.'],
      };
    } else if (Array.isArray(recommendations)) {
      console.warn('[AI Assistant] Recommendations is array, converting to object');
      recommendations = {
        recommendations: recommendations,
      };
    }
    
    console.log('[AI Assistant] Sending response:', { 
      hasRecommendations: !!recommendations && Object.keys(recommendations).length > 0,
      recommendationsKeys: recommendations ? Object.keys(recommendations) : [],
      hasProfile: !!profile,
      recommendationsType: typeof recommendations,
      recommendationsValue: recommendations,
    });
    res.json({ recommendations, hasProfile: !!profile });
  } catch (error) {
    console.error('[AI Assistant] Error generating personal recommendations:', error);
    console.error('[AI Assistant] Full error:', error);
    
    // Если это ошибка типа, возвращаем более детальную информацию
    if (error.message && error.message.includes('OPENAI_TYPE_ERROR')) {
      return res.status(500).json({ 
        error: 'AI API type error', 
        details: 'Параметры для AI должны быть строками. Проверьте логи backend.',
        message: error.message 
      });
    }
    
    res.status(500).json({ error: 'Failed to generate recommendations', details: error.message });
  }
});

export default router;

