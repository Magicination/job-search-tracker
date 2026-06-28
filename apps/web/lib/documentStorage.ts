// Загрузка/удаление файлов резюме и сопроводительных писем в Supabase
// Storage. Bucket 'application-documents' приватный — доступ только через
// RLS-политики storage.objects (см. миграцию 20260627124328), путь файла
// обязательно начинается с {user_id}/, иначе insert/select будет отклонён
// политикой на уровне базы (не просто на уровне клиента — это настоящая
// защита, а не "доверие" фронтенду).

import { supabase } from './supabase';

const BUCKET = 'application-documents';
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'rtf', 'odt'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ — более чем достаточно для резюме

export interface UploadResult {
  path: string;
  fileName: string;
}

export function validateDocumentFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Формат .${ext} не поддерживается. Разрешены: ${ALLOWED_EXTENSIONS.join(', ')}.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Файл слишком большой (максимум 10 МБ).';
  }
  return null;
}

/**
 * Загружает файл в подпапку пользователя. Имя файла в Storage делается
 * случайным (не оригинальным), чтобы избежать конфликтов при одинаковых
 * именах от одного пользователя — оригинальное имя сохраняется отдельно
 * в колонке file_name для отображения в UI.
 */
export async function uploadDocumentFile(userId: string, file: File): Promise<UploadResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const randomName = `${crypto.randomUUID()}.${ext}`;
  const path = `${userId}/${randomName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(`Не удалось загрузить файл: ${error.message}`);
  }

  return { path, fileName: file.name };
}

/** Удаляет файл из Storage. Не бросает исключение, если файла уже нет. */
export async function deleteDocumentFile(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Создаёт временную подписанную ссылку для скачивания/просмотра файла —
 * bucket приватный, поэтому прямого публичного URL не существует.
 * Ссылка действует 60 секунд, этого достаточно для немедленного открытия.
 */
export async function getDocumentDownloadUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) return null;
  return data.signedUrl;
}
