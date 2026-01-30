-- Добавление страницы "Команда Primecoder"
-- Извлекаем body из скомпилированного HTML
DO $$
DECLARE
    body_content TEXT;
BEGIN
    -- Читаем body из файла (в реальности нужно будет вставить содержимое)
    -- Для упрощения используем placeholder, который нужно заменить
    
    -- Проверяем, существует ли уже страница
    IF NOT EXISTS (SELECT 1 FROM pages WHERE slug = '/komanda-primecoder') THEN
        INSERT INTO pages (slug, title, body, seo_title, seo_description, is_published)
        VALUES (
            '/komanda-primecoder',
            'Команда Primecoder',
            '<body class="team-page">
    <header>
    <div class="d-flex container header jcsb align-items-center">
         <!-- Логотип -->
         <div class="col-md-2 col-sm-3 col-xs-8">
            <div class="logo ptb-22">
                <a href="/">
                    <picture><source srcset="img/logo.webp" type="image/webp"><img src="img/logo.png" alt="логотип PrimeCoder"></picture>
                </a>
            </div>
        </div>
        <a href="tel:+79999849107" class="mob-dis-none">+7 (999)-984-91-07</a>
        <a href="tel:+74951476577" class="mob-dis-block mob-tel-icon"><picture><source srcset="img/mobile-tel-icon.webp" type="image/webp"><img src="img/mobile-tel-icon.png" alt=""></picture></a>
        <input type="checkbox" id="burger-toggle">
        <label for="burger-toggle" class="burger-menu">
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
        </label>
        <div class="menu">
            <div class="menu-inner">
                <div class="container pt-100">
                    <div class="d-flex main-menu-nav">
                        <div class="col-33">
                            <ul class="d-flex gap-v-20 flex-column menu-navigation">
                                <li><a href="/catalog">Каталог услуг</a></li>
                                <li><a href="/portfolio">Кейсы</a></li>
                                <li><a href="/about">О нас</a></li>
                                <li><a href="/new-client">Стать клиентом</a></li>
                                <li><a href="/promotion">Акции и скидки</a></li>
                            </ul>
                        </div>
                        <div class="col-33">
                            <ul class="d-flex gap-v-20 flex-column menu-navigation">
                                <li><a href="/services">Услуги</a></li>
                                <li><a href="/services#web-site">Разработка сайтов</a></li>
                                <li><a href="/landing">Одностраничный сайт</a></li>
                                <li><a href="/corporate-website">Корпоративный сайт</a></li>
                                <li><a href="/online-shop">Сайта каталог</a></li>
                                <li><a href="/bitrix">Сайт на 1С-Битрикс</a></li>
                                <li><a href="/wordpress">Сайт на WordPress</a></li>
                                <li><a href="/tilda">Сайт на Tilda</a></li>
                            </ul>
                        </div>
                        <div class="col-33">
                            <ul class="d-flex gap-v-20 flex-column menu-navigation">
                                <li><a href="/blog">Блог</a></li>
                                <li><a href="/portfolio">Благотворительность</a></li>
                                <li><a href="/rewievs">Отзывы</a></li>
                                <li><a href="/contacts">Контакты</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </header>
    <div class="container">
        <section class="team-section">
            <div class="header-section">
                <h1>Команда Primecoder</h1>
                <p>Наша команда профессионалов, которая создает выдающиеся цифровые решения</p>
            </div>
            
            <div class="team-grid" id="team-grid">
                <!-- Члены команды будут добавлены динамически -->
            </div>
        </section>
    </div>
    <script src="js/jquery.js"></script>
    <script src="js/app.min.js"></script>
    <script>
        // Инициализация интерактивной страницы команды
        (function() {
            ''use strict'';
            
            // Данные команды
            const teamMembers = [
                {
                    id: 1,
                    name: ''Владислав'',
                    position: ''Основатель & CEO'',
                    image: ''@img/team/vladislav.jpg'',
                    description: ''Стратегическое видение и управление проектами'',
                    color: ''#ffbb00''
                },
                {
                    id: 2,
                    name: ''Александр'',
                    position: ''Lead Developer'',
                    image: ''@img/team/alexander.jpg'',
                    description: ''Разработка сложных веб-приложений'',
                    color: ''#00a8ff''
                },
                {
                    id: 3,
                    name: ''Мария'',
                    position: ''UI/UX Designer'',
                    image: ''@img/team/maria.jpg'',
                    description: ''Создание интуитивных интерфейсов'',
                    color: ''#ff6b9d''
                },
                {
                    id: 4,
                    name: ''Дмитрий'',
                    position: ''Backend Developer'',
                    image: ''@img/team/dmitry.jpg'',
                    description: ''Разработка серверной части'',
                    color: ''#51cf66''
                },
                {
                    id: 5,
                    name: ''Елена'',
                    position: ''Marketing Manager'',
                    image: ''@img/team/elena.jpg'',
                    description: ''Продвижение и маркетинг'',
                    color: ''#ffd43b''
                },
                {
                    id: 6,
                    name: ''Игорь'',
                    position: ''QA Engineer'',
                    image: ''@img/team/igor.jpg'',
                    description: ''Обеспечение качества'',
                    color: ''#845ef7''
                },
                {
                    id: 7,
                    name: ''Анна'',
                    position: ''Project Manager'',
                    image: ''@img/team/anna.jpg'',
                    description: ''Управление проектами'',
                    color: ''#ff8787''
                },
                {
                    id: 8,
                    name: ''Сергей'',
                    position: ''DevOps Engineer'',
                    image: ''@img/team/sergey.jpg'',
                    description: ''Инфраструктура и деплой'',
                    color: ''#20c997''
                },
                {
                    id: 9,
                    name: ''Ольга'',
                    position: ''Content Manager'',
                    image: ''@img/team/olga.jpg'',
                    description: ''Контент и копирайтинг'',
                    color: ''#fd7e14''
                }
            ];
            
            function initTeamPage() {
                const grid = document.getElementById(''team-grid'');
                if (!grid) return;
                
                // Создаем карточки команды
                teamMembers.forEach((member, index) => {
                    const card = document.createElement(''div'');
                    card.className = ''team-card'';
                    card.dataset.id = member.id;
                    card.style.setProperty(''--card-color'', member.color);
                    card.style.animationDelay = (index * 0.1) + ''s'';
                    
                    card.innerHTML = `
                        <div class="team-card-inner">
                            <div class="team-card-front">
                                <div class="team-card-image">
                                    <img src="${member.image}" alt="${member.name}" onerror="this.src=''@img/team/default.jpg''">
                                </div>
                                <div class="team-card-info">
                                    <h3>${member.name}</h3>
                                    <p class="team-position">${member.position}</p>
                                </div>
                            </div>
                            <div class="team-card-back">
                                <h3>${member.name}</h3>
                                <p class="team-position">${member.position}</p>
                                <p class="team-description">${member.description}</p>
                            </div>
                        </div>
                    `;
                    
                    // Интерактивность
                    card.addEventListener(''mouseenter'', function() {
                        this.classList.add(''active'');
                    });
                    
                    card.addEventListener(''mouseleave'', function() {
                        this.classList.remove(''active'');
                    });
                    
                    card.addEventListener(''click'', function() {
                        this.classList.toggle(''flipped'');
                    });
                    
                    grid.appendChild(card);
                });
                
                // Параллакс эффект
                let mouseX = 0;
                let mouseY = 0;
                
                document.addEventListener(''mousemove'', function(e) {
                    mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
                    mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
                    
                    const cards = document.querySelectorAll(''.team-card'');
                    cards.forEach((card, index) => {
                        const delay = index * 0.05;
                        const x = mouseX * (1 + delay);
                        const y = mouseY * (1 + delay);
                        card.style.transform = `translate(${x}px, ${y}px) rotateY(${x * 0.1}deg) rotateX(${-y * 0.1}deg)`;
                    });
                });
            }
            
            // Инициализация после загрузки DOM
            if (document.readyState === ''loading'') {
                document.addEventListener(''DOMContentLoaded'', initTeamPage);
            } else {
                initTeamPage();
            }
        })();
    </script>
    
    <style>
        .team-page {
            background: #0a0a0a;
            color: #fff;
            min-height: 100vh;
        }
        
        .team-section {
            padding: 100px 0;
        }
        
        .header-section {
            text-align: center;
            margin-bottom: 80px;
        }
        
        .header-section h1 {
            font-size: 4rem;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #ffbb00, #00a8ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header-section p {
            font-size: 1.2rem;
            color: #999;
        }
        
        .team-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
            padding: 40px 0;
            perspective: 1000px;
        }
        
        .team-card {
            position: relative;
            height: 400px;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            opacity: 0;
            animation: fadeInUp 0.6s ease forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .team-card-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transform-style: preserve-3d;
            transition: transform 0.6s;
        }
        
        .team-card.flipped .team-card-inner {
            transform: rotateY(180deg);
        }
        
        .team-card-front,
        .team-card-back {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .team-card-back {
            transform: rotateY(180deg);
            background: linear-gradient(135deg, var(--card-color, #ffbb00), rgba(0, 0, 0, 0.8));
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
            text-align: center;
        }
        
        .team-card-image {
            width: 100%;
            height: 70%;
            overflow: hidden;
            position: relative;
        }
        
        .team-card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s;
        }
        
        .team-card.active .team-card-image img {
            transform: scale(1.1);
        }
        
        .team-card-info {
            height: 30%;
            background: rgba(0, 0, 0, 0.8);
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        
        .team-card-info h3 {
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: var(--card-color, #ffbb00);
        }
        
        .team-position {
            font-size: 0.9rem;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .team-card-back h3 {
            font-size: 2rem;
            margin-bottom: 15px;
            color: #fff;
        }
        
        .team-description {
            font-size: 1rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.9);
            margin-top: 20px;
        }
        
        .team-card::before {
            content: '''';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, var(--card-color, #ffbb00), transparent, var(--card-color, #ffbb00));
            border-radius: 20px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: -1;
        }
        
        .team-card.active::before {
            opacity: 0.5;
            animation: borderGlow 2s ease infinite;
        }
        
        @keyframes borderGlow {
            0%, 100% {
                opacity: 0.5;
            }
            50% {
                opacity: 1;
            }
        }
        
        @media (max-width: 768px) {
            .team-grid {
                grid-template-columns: 1fr;
                gap: 30px;
            }
            
            .header-section h1 {
                font-size: 2.5rem;
            }
        }
    </style>',
            'Команда Primecoder - Наша команда профессионалов',
            'Познакомьтесь с командой Primecoder - профессионалами в области веб-разработки, дизайна и маркетинга',
            TRUE
        );
    END IF;
END $$;

