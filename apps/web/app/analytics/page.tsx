// Экран аналитики удалён по запросу пользователя
export default function AnalyticsPage() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-center text-text-dim">
        <p>Экран аналитики удалён</p>
        <p className="text-sm mt-2">Статистика будет добавлена в следующей версии</p>
      </div>
    </div>
  );
}
  const { applications, history, resumeVersions, loading } = useApplicationAnalytics();
  const { stages, loading: stagesLoading } = useStages();
  const { visible, toggle } = useVisibleSections();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [period, setPeriod] = useState<Period>('all');
  const cutoff = getPeriodCutoff(period);
  const periodApplications = cutoff ? applications.filter((a) => a.applied_date && new Date(a.applied_date) >= cutoff) : applications;
  const periodIds = new Set(periodApplications.map((a) => a.id));
  const periodHistory = cutoff ? history.filter((h) => periodIds.has(h.application_id)) : history;

  if (loading || stagesLoading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-semibold text-text">Аналитика</h1>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-text">Аналитика</h1>
        <p className="py-10 text-center text-sm text-text-dim">
          Пока нет откликов для анализа — добавьте несколько на странице «Отклики»,
          и здесь появится статистика по этапам, источникам и версиям резюме.
        </p>
      </div>
    );
  }

  const bySource = calculateConversionBySource(periodApplications, periodHistory, stages);

  const resumeNameById = new Map(resumeVersions.map((v) => [v.id, v.name]));
  const byResumeVersion = calculateConversionByResumeVersion(periodApplications, periodHistory, stages, resumeNameById);

  const sequentialFunnel = calculateSequentialFunnel(periodHistory, stages);
  const stageDurations = calculateStageDurations(periodHistory, stages);

  const bySourceBreakdown = calculateStageBreakdownByGroup(periodApplications, periodHistory, stages, (app) =>
    app.source.trim() ? app.source.trim() : null
  );
  const byResumeBreakdown = calculateStageBreakdownByGroup(periodApplications, periodHistory, stages, (app) =>
    app.resume_version_id ? resumeNameById.get(app.resume_version_id) ?? null : null
  );

  // Автоинсайт: лучшая по конверсии группа среди источников/версий резюме с достаточной выборкой.
  const insightCandidates = [
    ...bySource.filter((g) => g.total >= 3).map((g) => ({ dimension: 'источник', ...g })),
    ...byResumeVersion.filter((g) => g.total >= 3).map((g) => ({ dimension: 'версия резюме', ...g })),
  ];
  const bestInsight = insightCandidates.length > 0 ? insightCandidates.reduce((best, g) => (g.conversionRate > best.conversionRate ? g : best)) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-text">Аналитика</h1>

      {bestInsight && (
        <div className="flex items-start gap-2 rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-3 text-sm text-text-dim">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
          <span>
            Лучше всего сейчас работает <strong className="text-text">{bestInsight.dimension} «{bestInsight.label}»</strong>{' '}
            — конверсия {bestInsight.conversionRate}% на {bestInsight.total} откликах.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                period === p ? 'border-accent-amber bg-accent-amber/10 text-text' : 'border-border text-text-dim hover:border-border-soft'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:border-border-soft"
        >
          <Settings className="h-3.5 w-3.5" /> Настроить дашборд
        </button>
      </div>

      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)}>
          <h2 className="mb-3 text-sm font-semibold text-text">Какие блоки показывать</h2>
          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {SECTION_IDS.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm text-text-dim">
                <input type="checkbox" checked={visible[id]} onChange={() => toggle(id)} />
                {SECTION_LABELS[id]}
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-faint">Настройка сохраняется в этом браузере.</p>
        </Modal>
      )}
      {periodApplications.length === 0 && (
        <p className="text-sm text-text-dim">За выбранный период откликов нет — выберите другой период или «Всё время».</p>
      )}

      {visible.sequentialFunnel && (
        <CollapsibleSection title="Воронка по шагам" subtitle="Из тех, кто дошёл до этапа — сколько пошли дальше, а не просто «сколько всего когда-либо доходило»">
          {sequentialFunnel.length === 0 ? (
            <p className="text-xs text-text-faint">Нужно минимум 2 обычных (не «проигрышных») этапа, чтобы построить пошаговую воронку.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sequentialFunnel.map((step) => (
                <div key={`${step.fromStageId}-${step.toStageId}`}>
                  <div className="flex items-center justify-between text-xs text-text-dim">
                    <span>{step.fromLabel} → {step.toLabel}</span>
                    <span className="tabular-nums">
                      {step.toCount}/{step.fromCount} · {step.conversionRate}%
                      {step.dropOffCount > 0 && <span className="text-accent-coral"> (−{step.dropOffCount})</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-panel-2">
                    <div className="h-full rounded-full bg-accent-blue" style={{ width: `${step.conversionRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {visible.stageDurations && (
        <CollapsibleSection title="Время на каждом этапе" subtitle="Сколько дней отклик реально проводит на этапе до перехода дальше">
          <div className="flex flex-col gap-2">
            {stageDurations.map((d) => (
              <div key={d.stageId} className="flex items-center justify-between text-sm">
                <span className="text-text-dim">{d.stageName}</span>
                <span className="tabular-nums text-text-faint">
                  {d.sampleSize === 0 ? '—' : `${d.avgDays} дн. (медиана ${d.medianDays})`}
                  {d.sampleSize > 0 && d.sampleSize < 3 && <span className="ml-1 text-[10px] italic">мало данных</span>}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <div className="grid gap-3 sm:grid-cols-1">
        {visible.bySource && (
          <CollapsibleSection title="По источнику">
            <GroupedTableBody groups={bySource} emptyHint="Добавьте источник (hh.ru, LinkedIn и т.д.) в карточках откликов." highlightLow />
            <StageBreakdownTable groups={bySourceBreakdown} stages={stages} />
          </CollapsibleSection>
        )}

        {visible.byResume && (
          <CollapsibleSection title="По версии резюме">
            {byResumeVersion.length >= 2 ? (
              <div className="grid grid-cols-2 gap-3">
                {byResumeVersion.slice(0, 2).map((g) => (
                  <div key={g.label} className="rounded-lg border border-border-soft bg-panel-2 p-2.5">
                    <p className="truncate text-sm text-text" title={g.label}>{g.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-text">{g.conversionRate}%</p>
                    <p className="text-xs text-text-faint">{g.reachedInterviewOrBetter}/{g.total} откликов</p>
                  </div>
                ))}
              </div>
            ) : (
              <GroupedTableBody groups={byResumeVersion} emptyHint="Привяжите отклики к версии резюме на странице «Отклики», чтобы сравнить их эффективность." />
            )}
            {byResumeVersion.length > 2 && (
              <div className="mt-2">
                <GroupedTableBody groups={byResumeVersion.slice(2)} emptyHint="" />
              </div>
            )}
            <StageBreakdownTable groups={byResumeBreakdown} stages={stages} />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
