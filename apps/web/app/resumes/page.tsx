'use client';

import { useResumeVersions } from '../../lib/hooks/useResumeVersions';
import { DocumentVersionsPanel } from '../../components/DocumentVersionsPanel';

export default function ResumesPage() {
  const { versions, addVersion, deleteVersion } = useResumeVersions();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-text">Резюме</h1>
      <p className="text-sm text-text-dim">
        Разные версии резюме под разные вакансии — привязываются к отклику на странице «Отклики», а конверсия
        по версиям видна на странице «Аналитика».
      </p>
      <DocumentVersionsPanel
        title="Версии резюме"
        emptyHint="Создайте версию, если планируете тестировать разные варианты резюме — потом на странице «Аналитика» будет видно, какая версия даёт лучшую конверсию."
        versions={versions}
        onAdd={addVersion}
        onDelete={deleteVersion}
        defaultOpen
      />
    </div>
  );
}
