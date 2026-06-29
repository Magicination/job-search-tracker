// Серверный fallback для автозаполнения отклика по ссылке на вакансию
// hh.ru. Основной путь — прямой запрос из браузера пользователя (см.
// lib/hhVacancyParser.ts, используется в useApplications.addApplicationFromUrl).
//
// Этот сервер используется только если браузерный запрос не прошёл.
// ВАЖНО: на Vercel этот путь скорее всего НЕ сработает — hh.ru возвращает
// 403 (`{"errors":[{"type":"forbidden"}]}`) для запросов с датацентровых
// IP serverless-функций, это похоже на анти-бот защиту по IP, не на
// проблему авторизации (сам метод GET /vacancies/{id} публичный и не
// требует OAuth). Оставлен как fallback на случай иной сетевой конфигурации.
//
// Поддерживается только hh.ru на этом этапе — расширение на другие площадки
// (LinkedIn, getmatch и т.д.) отложено, см. обсуждение фичи.

import { NextRequest, NextResponse } from 'next/server';
import { isHhUrl, extractHhVacancyId, normalizeHhVacancy } from '../../../lib/hhVacancyParser';

export async function POST(request: NextRequest) {
  let url: string;
  try {
    const body = await request.json();
    url = String(body.url ?? '');
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 });
  }

  if (!isHhUrl(url)) {
    return NextResponse.json(
      { error: 'Автозаполнение пока поддерживает только ссылки hh.ru.' },
      { status: 400 }
    );
  }

  const vacancyId = extractHhVacancyId(url);
  if (!vacancyId) {
    return NextResponse.json(
      { error: 'Не удалось найти ID вакансии в ссылке. Проверьте, что это ссылка вида hh.ru/vacancy/12345678.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`, {
      headers: {
        'User-Agent': 'job-search-tracker/1.0',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Вакансия не найдена — возможно, она снята с публикации или ссылка неверна.' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error(
        `[parse-vacancy] hh.ru API ${response.status} для vacancyId=${vacancyId}. Тело ответа: ${bodyText.slice(0, 500)}`
      );
      return NextResponse.json(
        { error: `hh.ru API вернул ошибку (${response.status}). Попробуйте позже или заполните поля вручную.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const parsed = normalizeHhVacancy(data, url);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[parse-vacancy] Сетевая ошибка при запросе к hh.ru:', err);
    return NextResponse.json(
      { error: 'Не удалось связаться с hh.ru. Проверьте соединение и попробуйте ещё раз.' },
      { status: 502 }
    );
  }
}
