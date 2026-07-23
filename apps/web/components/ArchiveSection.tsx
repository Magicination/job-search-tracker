'use client';

import { useState } from 'react';
import type { Application, Company, Stage } from '@job-search-tracker/shared';

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-sm leading-none ${n <= (value ?? 0) ? 'text-accent-amber' : 'text-text-faint hover:text-text-dim'}`}
          title={`${n} из 5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function CompanyGroup({
  company,
  apps,
  stages,
  onRestore,
  onPermanentDelete,
  onUpdateCompany,
}: {
  company: Company | null;
  apps: Application[];
  stages: Stage[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onUpdateCompany?: (companyId: string, fields: Partial<Pick<Company, 'url' | 'rating' | 'note'>>) => void;
}) {
  const stageNameById = new Map(stages.map((s) => [s.id, s.name]));
  const [expanded, setExpanded] = useState(false);
  const name = company?.name || apps[0]?.company || 'Без названия';

  return (
    <div className="rounded-lg border border-border-soft bg-panel">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 p-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-text-faint">{expanded ? '▾' : '▸'}</span>
          <span className="truncate text-sm font-medium text-text">{name}</span>
          <span className="shrink-0 text-xs text-text-faint">({apps.length})</span>
        </div>
        {company && <StarRating value={company.rating} onChange={(v) => onUpdateCompany?.(company.id, { rating: v })} />}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border-soft p-3">
          {company && onUpdateCompany && (
            <div className="flex flex-col gap-2 rounded-lg bg-panel-2 p-2">
              <label className="flex flex-col gap-1 text-xs text-text-dim">
                Сайт компании
                <input
                  defaultValue={company.url ?? ''}
                  onBlur={(e) => onUpdateCompany(company.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-dim">
                Заметка о компании
                <textarea
                  defaultValue={company.note}
                  onBlur={(e) => onUpdateCompany(company.id, { note: e.target.value })}
                  rows={2}
                  placeholder="долго отвечали, отказали без обратной связи..."
                  className="resize-none rounded-md border border-border bg-panel px-2 py-1.5 text-sm text-text outline-none focus-visible:border-accent-blue"
                />
              </label>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border-soft px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{app.role || 'Без названия'}</p>
                  <p className="text-xs text-text-faint">
                    {stageNameById.get(app.stage_id) ?? '—'}
                    {app.applied_date ? ` · ${new Date(app.applied_date).toLocaleDateString('ru-RU')}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => onRestore(app.id)}
                    className="text-xs text-accent-blue hover:underline"
                    title="Вернуть на доску"
                  >
                    Восстановить
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Удалить «${app.role || app.company}» безвозвратно? Это нельзя отменить.`)) {
                        onPermanentDelete(app.id);
                      }
                    }}
                    className="text-xs text-accent-coral hover:underline"
                    title="Удалить навсегда"
                  >
                    Удалить навсегда
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArchiveSection({
  archivedApplications,
  companies,
  stages,
  onRestore,
  onPermanentDelete,
  onUpdateCompany,
}: {
  archivedApplications: Application[];
  companies: Company[];
  stages: Stage[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onUpdateCompany: (companyId: string, fields: Partial<Pick<Company, 'url' | 'rating' | 'note'>>) => void;
}) {
  const [open, setOpen] = useState(false);

  if (archivedApplications.length === 0) return null;

  const byCompanyId = new Map<string, Application[]>();
  const byNameFallback = new Map<string, Application[]>();

  for (const app of archivedApplications) {
    if (app.company_id) {
      const list = byCompanyId.get(app.company_id) ?? [];
      list.push(app);
      byCompanyId.set(app.company_id, list);
    } else {
      const key = app.company || 'Без названия';
      const list = byNameFallback.get(key) ?? [];
      list.push(app);
      byNameFallback.set(key, list);
    }
  }

  const groups: { company: Company | null; apps: Application[] }[] = [];
  for (const [companyId, apps] of byCompanyId) {
    const company = companies.find((c) => c.id === companyId) ?? null;
    groups.push({ company, apps });
  }
  for (const [, apps] of byNameFallback) {
    groups.push({ company: null, apps });
  }
  groups.sort((a, b) => b.apps.length - a.apps.length);

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <h2 className="text-sm font-semibold text-text">Архив ({archivedApplications.length})</h2>
        <span className="text-text-faint">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {groups.map((g, i) => (
            <CompanyGroup
              key={g.company?.id ?? `noname-${i}`}
              company={g.company}
              apps={g.apps}
              stages={stages}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              onUpdateCompany={onUpdateCompany}
            />
          ))}
        </div>
      )}
    </div>
  );
}
