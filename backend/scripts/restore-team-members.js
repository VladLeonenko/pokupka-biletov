import pool from '../db.js';

async function restoreTeamMembers() {
  try {
    console.log('🔍 Проверка таблицы team_members...\n');

    // Проверяем, существует ли таблица
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_members'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Таблица team_members не существует. Запустите миграцию 028_create_team_members.sql');
      process.exit(1);
    }

    // Проверяем текущие данные
    const existing = await pool.query('SELECT COUNT(*) as count FROM team_members');
    console.log(`Текущее количество сотрудников в базе: ${existing.rows[0].count}\n`);

    if (parseInt(existing.rows[0].count) > 0) {
      console.log('⚠️  В таблице уже есть сотрудники. Показать их? (y/n)');
      const members = await pool.query('SELECT id, name, role, is_active FROM team_members ORDER BY sort_order');
      members.rows.forEach((m, idx) => {
        console.log(`  ${idx + 1}. ${m.name} - ${m.role} (ID: ${m.id}, активен: ${m.is_active})`);
      });
      console.log('\nПродолжить добавление? (y/n)');
    }

    // Данные для восстановления (на основе add_team_page.sql)
    const teamMembers = [
      {
        name: 'Владислав',
        role: 'Основатель & CEO',
        imageUrl: null, // Можно будет добавить позже
        bio: 'Стратегическое видение и управление проектами',
        skills: ['Стратегия', 'Управление проектами', 'Бизнес-развитие'],
        portfolioUrls: [],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: 'Александр',
        role: 'Lead Developer',
        imageUrl: null,
        bio: 'Разработка сложных веб-приложений',
        skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
        portfolioUrls: [],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: 'Мария',
        role: 'UI/UX Designer',
        imageUrl: null,
        bio: 'Создание интуитивных интерфейсов',
        skills: ['UI/UX Design', 'Figma', 'Прототипирование', 'Дизайн-системы'],
        portfolioUrls: [],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: 'Дмитрий',
        role: 'Backend Developer',
        imageUrl: null,
        bio: 'Разработка серверной части',
        skills: ['Node.js', 'PostgreSQL', 'API Development', 'Микросервисы'],
        portfolioUrls: [],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: 'Елена',
        role: 'Marketing Manager',
        imageUrl: null,
        bio: 'Продвижение и маркетинг',
        skills: ['Digital Marketing', 'SEO', 'Контент-маркетинг', 'Аналитика'],
        portfolioUrls: [],
        isActive: true,
        sortOrder: 5,
      },
    ];

    console.log('\n📝 Добавление сотрудников...\n');

    for (const member of teamMembers) {
      // Проверяем, не существует ли уже такой сотрудник
      const existing = await pool.query(
        'SELECT id FROM team_members WHERE name = $1 AND role = $2',
        [member.name, member.role]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Пропущен: ${member.name} - ${member.role} (уже существует, ID: ${existing.rows[0].id})`);
        continue;
      }

      await pool.query(
        `INSERT INTO team_members(
          name, role, image_url, bio, skills, portfolio_urls, is_active, sort_order
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          member.name,
          member.role,
          member.imageUrl,
          member.bio,
          member.skills,
          member.portfolioUrls,
          member.isActive,
          member.sortOrder,
        ]
      );

      console.log(`✅ Добавлен: ${member.name} - ${member.role}`);
    }

    // Показываем итоговый список
    console.log('\n📋 Итоговый список сотрудников:\n');
    const allMembers = await pool.query(
      'SELECT id, name, role, is_active, sort_order FROM team_members ORDER BY sort_order'
    );
    allMembers.rows.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m.name} - ${m.role} (ID: ${m.id}, активен: ${m.is_active}, порядок: ${m.sort_order})`);
    });

    console.log('\n✅ Восстановление завершено!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

restoreTeamMembers();

