'use client';

import type { ResumeVersion } from '@job-search-tracker/shared';
import { useDocumentVersions } from './useDocumentVersions';

export function useResumeVersions() {
  const base = useDocumentVersions<ResumeVersion>('resume_versions');

  // Та же сигнатура, что и у useCoverLetterVersions.addVersion (4 параметра),
  // чтобы DocumentVersionsPanel мог использовать общий проп onAdd для обоих
  // случаев — у резюме просто нет поля для текста, 4-й параметр игнорируется.
  const addVersion = (name: string, notes: string, file: File | null) => base.addVersion(name, notes, file);

  return { ...base, addVersion };
}
