import { Box, Container, Typography, Paper, Divider, List, ListItem, ListItemText } from '@mui/material';
import { SeoMetaTags } from '@/components/common/SeoMetaTags';

export function PrivacyPolicyPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      <SeoMetaTags
        title="Политика конфиденциальности - PrimeCoder"
        description="Политика конфиденциальности и обработки персональных данных веб-студии PrimeCoder"
        url={currentUrl}
      />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 6 }, borderRadius: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            Политика конфиденциальности
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Дата последнего обновления: {new Date().toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {/* 1. Общие положения */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              1. Общие положения
            </Typography>
            <Typography variant="body1" paragraph>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей веб-сайта <strong>primecoder.ru</strong> (далее — «Сайт»), принадлежащего ООО «ПраймКодер» (далее — «Оператор», «Мы», «Нас»).
            </Typography>
            <Typography variant="body1" paragraph>
              Использование Сайта означает безоговорочное согласие Пользователя с настоящей Политикой и указанными в ней условиями обработки его персональной информации.
            </Typography>
            <Typography variant="body1" paragraph>
              В случае несогласия с условиями Политики Пользователь должен прекратить использование Сайта.
            </Typography>
            <Typography variant="body1" paragraph>
              Настоящая Политика применяется только к Сайту. Оператор не контролирует и не несет ответственности за сайты третьих лиц, на которые Пользователь может перейти по ссылкам, доступным на Сайте.
            </Typography>
          </Box>

          {/* 2. Основные понятия */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              2. Основные понятия
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Оператор"
                  secondary="ООО «ПраймКодер», юридическое лицо, организующее и (или) осуществляющее обработку персональных данных, а также определяющее цели обработки персональных данных, состав персональных данных, подлежащих обработке, действия (операции), совершаемые с персональными данными."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Персональные данные"
                  secondary="Любая информация, относящаяся к прямо или косвенно определенному или определяемому физическому лицу (субъекту персональных данных)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Обработка персональных данных"
                  secondary="Любое действие или совокупность действий, совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными, включая сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение персональных данных."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Субъект персональных данных"
                  secondary="Пользователь Сайта, физическое лицо, к которому относятся персональные данные."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Cookies"
                  secondary="Небольшие текстовые файлы, размещаемые на устройстве Пользователя для обеспечения работы Сайта, улучшения пользовательского опыта и сбора статистики."
                />
              </ListItem>
            </List>
          </Box>

          {/* 3. Правовые основания обработки */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              3. Правовые основания обработки персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор обрабатывает персональные данные Пользователей на следующих правовых основаниях:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="•"
                  secondary="Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных»;"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="•"
                  secondary="Федеральный закон от 13.03.2006 № 38-ФЗ «О рекламе»;"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="•"
                  secondary="Согласие субъекта персональных данных на обработку его персональных данных;"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="•"
                  secondary="Договоры, заключаемые между Оператором и субъектом персональных данных;"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="•"
                  secondary="Иные нормативные правовые акты Российской Федерации."
                />
              </ListItem>
            </List>
          </Box>

          {/* 4. Какие данные мы собираем */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              4. Категории обрабатываемых персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор обрабатывает следующие категории персональных данных:
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              4.1. Данные, предоставляемые Пользователем при регистрации и использовании Сайта:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Фамилия, имя, отчество;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Адрес электронной почты (e-mail);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Номер телефона;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Пароль (хранится в зашифрованном виде);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Иные данные, добровольно предоставленные Пользователем." />
              </ListItem>
            </List>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              4.2. Данные, собираемые автоматически при использовании Сайта:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• IP-адрес;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Тип браузера и операционной системы;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Информация об устройстве (разрешение экрана, тип устройства);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Данные о посещенных страницах и времени нахождения на Сайте;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Источник перехода на Сайт (реферер);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Cookies и аналогичные технологии;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Геолокационные данные (при предоставлении согласия)." />
              </ListItem>
            </List>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              4.3. Данные, собираемые при оформлении заказов:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Реквизиты для выставления счетов;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Адрес доставки (при необходимости);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• История заказов и покупок;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Предпочтения и интересы (избранное, корзина)." />
              </ListItem>
            </List>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              4.4. Данные, собираемые при использовании сервисов личного развития:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Профили тренировок (рост, вес, возраст, цели, уровень подготовки);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Профили питания (цели по калориям, тип диеты, аллергии);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Профили чтения (любимые жанры, цели по книгам);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Профили образования (области интересов, целевые навыки);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Финансовые данные (доход, бюджет, цели по накоплениям, категории расходов);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Записи о тренировках, питании, чтении, обучении, финансах;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Метрики и статистика (продуктивность, энергия, настроение, сон)." />
              </ListItem>
            </List>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              4.5. Данные, собираемые при обращении в службу поддержки:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• История обращений и переписки;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Скриншоты и файлы, приложенные к обращению;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Информация о проблемах и их решении." />
              </ListItem>
            </List>
          </Box>

          {/* 5. Цели обработки */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              5. Цели обработки персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор обрабатывает персональные данные в следующих целях:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="5.1. Предоставление услуг и функционала Сайта:"
                  secondary="Регистрация и авторизация пользователей, обработка заказов, предоставление доступа к сервисам личного развития, обработка платежей, доставка товаров и услуг."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5.2. Коммуникация с Пользователем:"
                  secondary="Ответы на запросы, отправка уведомлений о статусе заказов, информационные рассылки (при наличии согласия), техническая поддержка."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5.3. Улучшение качества услуг:"
                  secondary="Анализ поведения пользователей на Сайте, улучшение пользовательского опыта, разработка новых функций, персонализация контента и рекомендаций."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5.4. Маркетинг и реклама:"
                  secondary="Проведение маркетинговых исследований, показ персонализированной рекламы (при наличии согласия), участие в акциях и специальных предложениях."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5.5. Соблюдение законодательства:"
                  secondary="Выполнение требований законодательства Российской Федерации, в том числе налогового, бухгалтерского законодательства, защита прав и законных интересов Оператора и третьих лиц."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="5.6. Безопасность:"
                  secondary="Предотвращение мошенничества, обеспечение безопасности Сайта и пользователей, защита от несанкционированного доступа."
                />
              </ListItem>
            </List>
          </Box>

          {/* 6. Способы обработки */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              6. Способы и сроки обработки персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Обработка персональных данных осуществляется с использованием средств автоматизации и без использования таких средств.
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор применяет следующие способы обработки персональных данных: сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (распространение, предоставление, доступ), обезличивание, блокирование, удаление, уничтожение.
            </Typography>
            <Typography variant="body1" paragraph>
              <strong>Сроки обработки персональных данных:</strong>
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Персональные данные обрабатываются в течение срока действия договора с Пользователем;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• После прекращения действия договора персональные данные обрабатываются в течение сроков, установленных законодательством Российской Федерации (в том числе для налогового и бухгалтерского учета — не менее 5 лет);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Данные профилей личного развития хранятся до момента удаления аккаунта Пользователем или до истечения 3 лет с момента последней активности;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Cookies хранятся в соответствии с настройками браузера Пользователя (обычно до 1 года);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Логи и технические данные хранятся не более 90 дней." />
              </ListItem>
            </List>
          </Box>

          {/* 7. Передача данных третьим лицам */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              7. Передача персональных данных третьим лицам
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор может передавать персональные данные следующим категориям третьих лиц:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="7.1. Платежные системы и банки:"
                  secondary="Для обработки платежей и проведения финансовых операций (при оформлении заказов)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="7.2. Службы доставки:"
                  secondary="Для доставки товаров и документов (при необходимости)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="7.3. Сервисы аналитики:"
                  secondary="Для анализа поведения пользователей и улучшения Сайта (Google Analytics, Яндекс.Метрика и аналогичные сервисы). Данные передаются в обезличенном виде."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="7.4. Хостинг-провайдеры и облачные сервисы:"
                  secondary="Для хранения данных и обеспечения работы Сайта. Все данные хранятся на серверах, расположенных на территории Российской Федерации или стран, обеспечивающих адекватную защиту персональных данных."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="7.5. Государственные органы:"
                  secondary="В случаях, предусмотренных законодательством Российской Федерации, по запросам уполномоченных государственных органов."
                />
              </ListItem>
            </List>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Оператор не продает персональные данные третьим лицам. Передача данных осуществляется только в целях, указанных в настоящей Политике, и только при наличии соответствующих договоров о конфиденциальности.
            </Typography>
          </Box>

          {/* 8. Cookies */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              8. Использование файлов Cookie и аналогичных технологий
            </Typography>
            <Typography variant="body1" paragraph>
              Сайт использует файлы Cookie и аналогичные технологии для:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Обеспечения работы Сайта и его функций;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Сохранения настроек и предпочтений Пользователя;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Анализа использования Сайта и улучшения его функциональности;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Персонализации контента и рекламы;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Обеспечения безопасности." />
              </ListItem>
            </List>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Пользователь может настроить браузер для отказа от приема Cookie или уведомления о их отправке. Однако отключение Cookie может привести к ограничению функциональности Сайта.
            </Typography>
            <Typography variant="body1" paragraph>
              На Сайте используются следующие типы Cookie:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="• Обязательные (необходимые):"
                  secondary="Обеспечивают базовую функциональность Сайта (авторизация, корзина, безопасность). Не могут быть отключены."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="• Функциональные:"
                  secondary="Запоминают выборы и настройки Пользователя для улучшения пользовательского опыта."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="• Аналитические:"
                  secondary="Помогают понять, как Пользователи взаимодействуют с Сайтом, собирая информацию в обезличенном виде."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="• Маркетинговые:"
                  secondary="Используются для показа релевантной рекламы и отслеживания эффективности рекламных кампаний (только при наличии согласия)."
                />
              </ListItem>
            </List>
          </Box>

          {/* 9. Меры защиты */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              9. Меры по защите персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования, предоставления, распространения, а также от иных неправомерных действий:
            </Typography>
            <List>
              <ListItem>
                <ListItemText secondary="• Использование защищенных протоколов передачи данных (HTTPS, SSL/TLS);" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Шифрование паролей и чувствительных данных;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Регулярное обновление программного обеспечения и систем безопасности;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Ограничение доступа к персональным данным только уполномоченным сотрудникам;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Регулярное резервное копирование данных;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Мониторинг и логирование доступа к данным;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Обучение сотрудников правилам обработки персональных данных;" />
              </ListItem>
              <ListItem>
                <ListItemText secondary="• Использование систем защиты от вредоносного программного обеспечения и DDoS-атак." />
              </ListItem>
            </List>
          </Box>

          {/* 10. Права субъектов */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              10. Права субъектов персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              В соответствии с Федеральным законом № 152-ФЗ «О персональных данных», Пользователь имеет право:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="10.1. Право на получение информации:"
                  secondary="Получать информацию, касающуюся обработки его персональных данных, в том числе содержащую подтверждение факта обработки персональных данных Оператором, правовые основания и цели обработки, применяемые Оператором способы обработки."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.2. Право на доступ:"
                  secondary="Получать доступ к своим персональным данным, включая право на получение копии любой записи, содержащей персональные данные."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.3. Право на уточнение:"
                  secondary="Требовать уточнения персональных данных, их блокирования или уничтожения, если персональные данные являются неполными, устаревшими, неточными, незаконно полученными или не являются необходимыми для заявленной цели обработки."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.4. Право на отзыв согласия:"
                  secondary="Отозвать согласие на обработку персональных данных (за исключением случаев, когда обработка необходима для исполнения договора или требований законодательства)."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.5. Право на удаление:"
                  secondary="Требовать удаления персональных данных при достижении целей обработки, отзыве согласия или выявлении неправомерной обработки."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.6. Право на ограничение обработки:"
                  secondary="Требовать ограничения обработки персональных данных в определенных случаях."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.7. Право на возражение:"
                  secondary="Возражать против обработки персональных данных в целях маркетинга."
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="10.8. Право на портативность данных:"
                  secondary="Получать персональные данные в структурированном, общепринятом и машиночитаемом формате и передавать их другому оператору."
                />
              </ListItem>
            </List>
            <Typography variant="body1" paragraph sx={{ mt: 2 }}>
              Для реализации указанных прав Пользователь может направить запрос Оператору по адресу электронной почты: <strong>info@primecoder.ru</strong> или почтовому адресу, указанному в разделе «Контакты».
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор обязуется рассмотреть запрос в течение 30 дней с момента его получения и направить ответ по указанным Пользователем контактным данным.
            </Typography>
          </Box>

          {/* 11. Обработка данных несовершеннолетних */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              11. Обработка персональных данных несовершеннолетних
            </Typography>
            <Typography variant="body1" paragraph>
              Сайт не предназначен для лиц, не достигших возраста 18 лет. Оператор не собирает намеренно персональные данные несовершеннолетних без согласия их законных представителей.
            </Typography>
            <Typography variant="body1" paragraph>
              Если Оператор узнает, что были собраны персональные данные несовершеннолетнего без согласия законного представителя, Оператор примет меры для удаления такой информации в кратчайшие сроки.
            </Typography>
            <Typography variant="body1" paragraph>
              Родители или законные представители несовершеннолетних имеют право ознакомиться с персональными данными ребенка, потребовать их исправления или удаления, а также отозвать согласие на обработку.
            </Typography>
          </Box>

          {/* 12. Трансграничная передача */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              12. Трансграничная передача персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор обеспечивает хранение персональных данных на серверах, расположенных на территории Российской Федерации.
            </Typography>
            <Typography variant="body1" paragraph>
              В случае необходимости трансграничной передачи персональных данных Оператор обеспечивает соблюдение требований законодательства Российской Федерации и принимает меры для обеспечения адекватной защиты персональных данных в стране, в которую осуществляется передача.
            </Typography>
            <Typography variant="body1" paragraph>
              Трансграничная передача персональных данных на территории иностранных государств, не обеспечивающих адекватную защиту прав субъектов персональных данных, может осуществляться только в случаях, предусмотренных законодательством Российской Федерации, и только с письменного согласия субъекта персональных данных.
            </Typography>
          </Box>

          {/* 13. Изменения в политике */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              13. Изменения в Политике конфиденциальности
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор имеет право вносить изменения в настоящую Политику конфиденциальности. Актуальная версия Политики всегда доступна на Сайте по адресу: <strong>primecoder.ru/politic</strong> или <strong>primecoder.ru/privacy</strong>.
            </Typography>
            <Typography variant="body1" paragraph>
              При внесении существенных изменений Оператор уведомит Пользователей путем размещения уведомления на Сайте или отправки уведомления на указанный при регистрации адрес электронной почты.
            </Typography>
            <Typography variant="body1" paragraph>
              Продолжение использования Сайта после внесения изменений означает согласие Пользователя с новой редакцией Политики.
            </Typography>
          </Box>

          {/* 14. Контакты */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              14. Контактная информация Оператора
            </Typography>
            <Typography variant="body1" paragraph>
              По всем вопросам, связанным с обработкой персональных данных, Пользователь может обратиться к Оператору:
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Полное наименование:"
                  secondary="Общество с ограниченной ответственностью «ПраймКодер»"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Электронная почта:"
                  secondary={<strong>info@primecoder.ru</strong>}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Телефон:"
                  secondary="+7 (495) 147-65-77"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Адрес:"
                  secondary="Москва, ул. Земляной Вал, 50Ас5"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Сайт:"
                  secondary="primecoder.ru"
                />
              </ListItem>
            </List>
          </Box>

          {/* 15. Уведомление о регистрации в Роскомнадзоре */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              15. Уведомление об обработке персональных данных
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор уведомляет уполномоченный орган по защите прав субъектов персональных данных (Роскомнадзор) о своем намерении осуществлять обработку персональных данных до начала обработки, если обработка подлежит уведомлению в соответствии с требованиями Федерального закона № 152-ФЗ «О персональных данных».
            </Typography>
            <Typography variant="body1" paragraph>
              Реестр операторов, осуществляющих обработку персональных данных, ведется Роскомнадзором и доступен на официальном сайте: <strong>pd.rkn.gov.ru</strong>.
            </Typography>
          </Box>

          {/* 16. Заключительные положения */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              16. Заключительные положения
            </Typography>
            <Typography variant="body1" paragraph>
              Настоящая Политика конфиденциальности является неотъемлемой частью Пользовательского соглашения, размещенного на Сайте.
            </Typography>
            <Typography variant="body1" paragraph>
              Все споры, возникающие в связи с применением настоящей Политики, подлежат разрешению в соответствии с законодательством Российской Федерации.
            </Typography>
            <Typography variant="body1" paragraph>
              Если какое-либо положение настоящей Политики будет признано недействительным или не имеющим юридической силы, это не повлияет на действительность остальных положений.
            </Typography>
            <Typography variant="body1" paragraph>
              Оператор оставляет за собой право в любое время изменять настоящую Политику с уведомлением Пользователей в порядке, предусмотренном разделом 13 настоящей Политики.
            </Typography>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Используя Сайт, Вы подтверждаете, что прочитали, поняли и согласны с условиями настоящей Политики конфиденциальности.
          </Typography>
        </Paper>
      </Container>
    </>
  );
}

