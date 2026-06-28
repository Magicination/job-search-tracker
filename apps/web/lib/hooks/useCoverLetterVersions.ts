'use client';

import type { CoverLetterVersion } from '@job-search-tracker/shared';
import { useDocumentVersions } from './useDocumentVersions';

export function useCoverLetterVersions() {
  return useDocumentVersions<CoverLetterVersion>('cover_letter_versions');
}
