// Серверный эндпойнт для автозаполнения отклика по ссылке на вакансию hh.ru.
//
// Почему через сервер, а не прямо из браузера: api.hh.ru может ограничивать
// CORS для произвольных доменов, и серверный запрос надёжнее независимо от
// этой политики. Метод GET /vacancies/{id} публичный — авторизация и
// регистрация приложения на dev.hh.ru не требуются (см. документацию
// hhru/api), нужен только корректный User-Agent.
//
// Поддерживается только hh.ru на этом этапе — расширение на другие площадки
// (LinkedIn, getmatch и т.д.) отложено, см. обсуждение фичи.

import { NextRequest, NextResponse } from 'next/server';

interface HhSalary {
  from: number | null;
  to: number | null;
  currency: string | null;
  gross: boolean | null;
}

interface HhVacancyResponse {
  name?: string;
  salary?: HhSalary | null;
  experience?: { name?: string } | null;
  employer?: { name?: string } | null;
  alternate_url?: string;
  description?: string;
}

export interface ParsedVacancy {
  company: string;
  role: string;
  salary: string;
  experienceRequired: string;
  sourceUrl: string;
}

/** Извлекает числовой ID вакансии из любого формата ссылки hh.ru. */
function extractVacancyId(url: string): string | null {
  // Поддерживаем варианты: hh.ru/vacancy/12345, hh.ru/vacancy/12345?query=...,
  // а также региональные домены (hh.kz, hh.by и т.д.) — у них тот же формат пути.
  const match = url.match(/\/vacancy\/(\d+)/);
  return match ? match[1] : null;
}

function formatSalary(salary: HhSalary | null | undefined): string {
  if (!salary) return '';
  const { from, to, currency } = salary;
  const currencySymbol = currency === 'RUR' ? '₽' : currency ?? '';

  if (from && to) return `${from.toLocaleString('ru-RU')}–${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (from) return `от ${from.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (to) return `до ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  return '';
}

export async function POST(request: NextRequest) {
  let url: string;
  try {
    const body = await request.json();
    url = String(body.url ?? '');
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 });
  }

  if (!url.includes('hh.')) {
    return NextResponse.json(
      { error: 'Автозаполнение пока поддерживает только ссылки hh.ru.' },
      { status: 400 }
    );
  }

  const vacancyId = extractVacancyId(url);
  if (!vacancyId) {
    return NextResponse.json(
      { error: 'Не удалось найти ID вакансии в ссылке. Проверьте, что это ссылка вида hh.ru/vacancy/12345678.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`, {
      headers: {
        // hh.ru API требует осмысленный User-Agent (см. официальные примеры
        // в документации hhru/api, формат "Имя/Версия (контакт)"). Избегаем
        // явных placeholder-доменов вида example.com в контакте — некоторые
        // анти-спам/анти-бот фильтры распознают их как признак автоматического
        // трафика и блокируют сильнее, чем полное отсутствие контакта.
        'User-Agent': 'job-search-tracker/1.0',
        Accept: 'application/json',
      },
      // Не кэшируем — данные о вакансии (особенно зарплата/статус) могут устареть.
      cache: 'no-store',
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Вакансия не найдена — возможно, она снята с публикации или ссылка неверна.' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      // Логируем тело ответа hh.ru на сервере (видно в Vercel → Deployments →
      // Functions → Logs) — это покажет точную причину отказа (anti-bot
      // блокировка по IP, требование авторизации и т.д.), а не просто код.
      const bodyText = await response.text().catch(() => '');
      console.error(
        `[parse-vacancy] hh.ru API ${response.status} для vacancyId=${vacancyId}. Тело ответа: ${bodyText.slice(0, 500)}`
      );
      // Временно показываем текст ответа hh.ru прямо в UI (не только в
      // серверных логах) — это упрощает диагностику причины 403/иной
      // ошибки без необходимости лезть в Vercel Dashboard. Снять эту
      // детализацию из пользовательского сообщения можно после того, как
      // причина будет понятна и устранена.
      const detail = bodyText ? ` Детали: ${bodyText.slice(0, 200)}` : '';
      return NextResponse.json(
        { error: `hh.ru API вернул ошибку (${response.status}).${detail}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as HhVacancyResponse;

    const parsed: ParsedVacancy = {
      company: data.employer?.name ?? '',
      role: data.name ?? '',
      salary: formatSalary(data.salary),
      experienceRequired: data.experience?.name ?? '',
      sourceUrl: data.alternate_url ?? url,
    };

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[parse-vacancy] Сетевая ошибка при запросе к hh.ru:', err);
    return NextResponse.json(
      { error: 'Не удалось связаться с hh.ru. Проверьте соединение и попробуйте ещё раз.' },
      { status: 502 }
    );
  }
}
