'use client';

import type { ResumeVersion } from '@job-search-tracker/shared';
import { useDocumentVersions } from './useDocumentVersions';

export function useResumeVersions() {
  return useDocumentVersions<ResumeVersion>('resume_versions');
}
