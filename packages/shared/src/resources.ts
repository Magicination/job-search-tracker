// Контент раздела «Ресурсы и ссылки» — статический, общий для web и mobile.
// См. 05-resources-content.md за полным первоисточником и пометками об актуальности.
//
// Важно: этот список собран в середине 2026 года. Ссылки на стажировки и условия
// курсов могут устареть — это нормально, не нужно пытаться "вечно поддерживать"
// список программным способом, это просто стартовый набор данных.

export type ResourceBadge = 'free' | 'paid' | 'international' | null;

export interface ResourceLink {
  label: string;
  url: string;
}

export interface ResourceCard {
  title: string;
  badge: ResourceBadge;
  links: ResourceLink[];
  note: string;
}

export interface ResourceSection {
  heading: string;
  cards: ResourceCard[];
  footnote?: string;
}

export const RESOURCE_SECTIONS: ResourceSection[] = [
  {
    heading: 'Агрегаторы вакансий — Product Manager, удалённо',
    cards: [
      {
        title: 'hh.ru',
        badge: 'free',
        links: [
          {
            label: 'Поиск: product manager, удалённо',
            url: 'https://hh.ru/search/vacancy?text=product+manager&schedule=remote',
          },
          {
            label: 'Поиск: junior product manager',
            url: 'https://hh.ru/search/vacancy?text=junior+product+manager&schedule=remote',
          },
        ],
        note: 'Крупнейшая база в РФ. Рекомендуется настроить сохранённый поиск с уведомлениями.',
      },
      {
        title: 'Хабр Карьера',
        badge: 'free',
        links: [
          {
            label: 'Поиск вакансий',
            url: 'https://career.habr.com/vacancies?type=all&q=product+manager&remote=true',
          },
        ],
        note: 'Более техническая аудитория компаний.',
      },
      {
        title: 'getmatch',
        badge: 'free',
        links: [
          {
            label: 'Поиск вакансий',
            url: 'https://getmatch.ru/vacancies?employment_format=remote&q=product%20manager',
          },
        ],
        note: 'Нишевый IT-джобборд, почти всегда указаны зарплатные вилки.',
      },
      {
        title: 'Wellfound (AngelList)',
        badge: 'international',
        links: [
          { label: 'Product manager роли', url: 'https://wellfound.com/role/r/product-manager' },
        ],
        note: 'Стартапы по всему миру, много полностью удалённых позиций. Английский от B1-B2.',
      },
      {
        title: 'RemoteOK',
        badge: 'international',
        links: [
          {
            label: 'Remote product manager jobs',
            url: 'https://remoteok.com/remote-product-manager-jobs',
          },
        ],
        note: 'Только удалённые вакансии, фильтры по зарплате и стеку.',
      },
      {
        title: 'We Work Remotely',
        badge: 'international',
        links: [
          {
            label: 'Remote product jobs',
            url: 'https://weworkremotely.com/categories/remote-product-jobs',
          },
        ],
        note: 'Один из старейших full-remote джобборд, ежедневное обновление.',
      },
      {
        title: 'LinkedIn Jobs (remote)',
        badge: 'free',
        links: [
          {
            label: 'Поиск (f_WT=2 = remote)',
            url: 'https://www.linkedin.com/jobs/search/?keywords=product%20manager&f_WT=2',
          },
        ],
        note: 'Фильтр f_WT=2 = remote. Включить "Open to work" + алёрты.',
      },
      {
        title: 'Epic Growth (Telegram)',
        badge: 'free',
        links: [{ label: 'Канал', url: 'https://t.me/s/epicgrowth' }],
        note: 'Канал для продактов: вакансии, кейсы, разборы интервью.',
      },
    ],
  },
  {
    heading: 'Стажировки',
    footnote:
      'Честно: большинство стажировок в РФ заточены под студентов очной формы и под офис/гибрид в Москве — не под полностью удалённый формат для тех, кто уже отучился. Стажировка скорее ценна как способ получить первую формальную продуктовую строчку в резюме и нетворк, чем как стабильный источник удалённых вакансий. Параллельно стоит идти через джоб-борды на вакансии "junior product manager" напрямую.',
    cards: [
      {
        title: 'Яндекс — менеджер проектов и продукта',
        badge: null,
        links: [{ label: 'Программа', url: 'https://yandex.ru/yaintern/project' }],
        note: 'В основном офис/гибрид в Москве; удалёнка — редкое исключение по согласованию с командой.',
      },
      {
        title: 'МТС Старт',
        badge: null,
        links: [{ label: 'Программы', url: 'https://job.mts.ru/programs' }],
        note: 'Набор открыт весь год, гибкий график, есть продуктовые роли.',
      },
      {
        title: 'Контур — помощник продакт-менеджера',
        badge: null,
        links: [
          {
            label: 'Стажировка',
            url: 'https://kontur.ru/education/programs/intern-not-tech/stazhirovka-dlya-pomoschnika-prodakta',
          },
        ],
        note: '3 месяца, оплачиваемая, явно для новичков без опыта.',
      },
      {
        title: 'Quick Offer — сводный календарь стажировок',
        badge: null,
        links: [{ label: 'Календарь стажировок', url: 'https://quick-offer.ru/service/internship' }],
        note: 'Агрегатор стажировок (Яндекс, Т-Банк, Сбер, VK и др.) — удобно следить за дедлайнами в одном месте.',
      },
      {
        title: 'Авито — карьера в продукте',
        badge: null,
        links: [{ label: 'Продуктовые направления', url: 'https://career.avito.com/directions/product/' }],
        note: 'Стоит проверять регулярно, набор не всегда виден на внешних агрегаторах.',
      },
      {
        title: 'VK Internship',
        badge: null,
        links: [{ label: 'Программа', url: 'https://internship.vk.company/' }],
        note: 'Летние и осенние волны, включая продуктовые направления.',
      },
    ],
  },
  {
    heading: 'SQL и продуктовая аналитика',
    cards: [
      {
        title: 'Симулятор SQL — karpov.courses',
        badge: 'free',
        links: [{ label: 'Симулятор', url: 'https://karpov.courses/simulator-sql' }],
        note: '~1 месяц, PostgreSQL в браузере + продуктовые метрики и Redash-дашборды. Лучшая бесплатная точка входа для PM.',
      },
      {
        title: 'Интерактивный тренажёр SQL — Stepik (ДВФУ)',
        badge: 'free',
        links: [{ label: 'Курс', url: 'https://stepik.org/course/63054/promo' }],
        note: '22 урока, постепенное усложнение — хороший первый шаг перед симулятором karpov.',
      },
      {
        title: 'Курс «Аналитик данных» — karpov.courses',
        badge: 'paid',
        links: [{ label: 'Курс', url: 'https://karpov.courses/analytics' }],
        note: 'Рассматривать позже, после бесплатного симулятора, если нужно системно закрыть пробел в метриках. ~100-130к ₽.',
      },
    ],
  },
  {
    heading: 'Английский (B1 → B2)',
    cards: [
      {
        title: 'Разговорный клуб Skillbox',
        badge: 'paid',
        links: [
          { label: 'Разговорный клуб', url: 'https://eng.skillbox.ru/blog/english-speaking-club' },
        ],
        note: 'Группы B1/B2, регулярная разговорная практика. От ~1590₽/4 встречи.',
      },
      {
        title: 'Английский для IT-специалистов — Skillbox',
        badge: 'paid',
        links: [{ label: 'Курс', url: 'https://eng.skillbox.ru' }],
        note: 'A2-B2, профессиональная лексика, 6 месяцев.',
      },
      {
        title: 'Express-курс «английский для собеседований»',
        badge: 'paid',
        links: [{ label: 'Статья/курс', url: 'https://habr.com/ru/articles/1038798/' }],
        note: 'B1-B2, фокус на behavioral questions и имитацию интервью. Короткий формат.',
      },
    ],
  },
  {
    heading: 'Подготовка к PM-кейсам и собеседованиям',
    cards: [
      {
        title: 'Epic Growth Channel',
        badge: 'free',
        links: [{ label: 'Канал', url: 'https://t.me/s/epicgrowth' }],
        note: 'Кейсы, вакансии, разборы интервью от практикующих PM.',
      },
    ],
  },
];

// Книги — без ссылок, просто текстовый список для карточки.
export const PM_BOOKS: string[] = [
  '«Inspired» — Марти Каган',
  '«Cracking the PM Interview» — Гейл Лакман Макдауэлл',
  '«Спроси маму» — Роб Фитцпатрик',
];

// Стандартные источники вакансий — для select в UI откликов. Пользователь
// может выбрать один из них или ввести своё значение (поле остаётся
// свободным текстом в БД, этот список — только подсказка для UI).
export const STANDARD_APPLICATION_SOURCES: string[] = [
  'hh.ru',
  'LinkedIn',
  'Хабр Карьера',
  'getmatch',
  'Wellfound',
  'RemoteOK',
  'We Work Remotely',
  'Рекомендация',
  'Прямой контакт с компанией',
];

// Стандартные уровни требуемого опыта — для select в UI откликов. Поле
// experience_required остаётся свободным текстом в БД (так автозаполнение
// из hh.ru API может записать туда формат "1–3 года", который не совпадает
// ни с одним из этих пунктов) — пользователь может выбрать один из списка
// или ввести своё значение, как и с источником.
export const STANDARD_EXPERIENCE_LEVELS: string[] = ['Junior', 'Mid', 'Senior', 'Lead'];

// Категории расшаренных ресурсов, которые добавляют сами пользователи —
// используются и для select при добавлении, и для группировки в UI.
export const SHARED_RESOURCE_CATEGORY_LABELS: Record<
  'job_boards' | 'internships' | 'sql_analytics' | 'english' | 'interview_prep' | 'other',
  string
> = {
  job_boards: 'Агрегаторы вакансий',
  internships: 'Стажировки',
  sql_analytics: 'SQL и аналитика',
  english: 'Английский',
  interview_prep: 'Подготовка к интервью',
  other: 'Другое',
};
