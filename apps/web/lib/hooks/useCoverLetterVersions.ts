'use client';

import type { CoverLetterVersion } from '@job-search-tracker/shared';
import { useDocumentVersions } from './useDocumentVersions';

export function useCoverLetterVersions() {
  const base = useDocumentVersions<CoverLetterVersion>('cover_letter_versions');

  // Явная обёртка с именованным параметром bodyText — удобнее для UI, чем
  // передавать raw extraFields на каждый вызов.
  const addVersion = (name: string, notes: string, file: File | null, bodyText: string) =>
    base.addVersion(name, notes, file, { body_text: bodyText });

  return { ...base, addVersion };
}
