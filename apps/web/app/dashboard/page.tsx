'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Application, Stage, Company } from '@job-search-tracker/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';
import { useStages } from '../../lib/hooks/useStages';
import { useCompanies } from '../../lib/hooks/useCompanies';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { Badge } from '../../components/Badge';
import { SkeletonCard } from '../../components/Skeleton';
import { Lightbulb, TrendingUp, TrendingDown, Calendar, MapPin, Briefcase, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react';

const STATUSES = {
  applied: { name: 'Отправлен', color: 'blue' },
  interview: { name: 'Интервью', color: 'amber' },
  offer: { name: 'Оффер', color: 'teal' },
  rejected: { name: 'Отклонён', color: 'coral' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { stages } = useStages();
  const { companies } = useCompanies();
  const { applications, history, resumeVersions, loading } = useApplicationAnalytics();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    archived: 0,
    byStage: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byCompany: {} as Record<string, number>,
  });

  const [topCompanies, setTopCompanies] = useState<Company[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!user || loading) return;

    // Calculate statistics
    const activeApps = applications.filter((a) => !a.archived);
    const archivedApps = applications.filter((a) => a.archived);

    const byStage = stages.reduce((acc, stage) => {
      acc[stage.id] = activeApps.filter((a) => a.stage_id === stage.id).length;
      return acc;
    }, {} as Record<string, number>);

    const bySource = applications.reduce((acc, app) => {
      const source = app.source.trim() || 'Без источника';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCompany = applications.reduce((acc, app) => {
      if (app.company_id) {
        const company = companies.find((c) => c.id === app.company_id);
        const name = company?.name || app.company || 'Без компании';
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Top companies by rating and application count
    const companyStats = companies.map((company) => {
      const count = byCompany[company.name] || 0;
      return { ...company, count };
    }).filter((c) => c.count > 0).sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Recent applications (last 10)
    const recent = [...applications].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 10);

    setStats({
      total: applications.length,
      active: activeApps.length,
      archived: archivedApps.length,
      byStage,
      bySource,
      byCompany,
    });

    setTopCompanies(companyStats.slice(0, 5));
    setRecentApplications(recent);
  }, [user, loading, applications, stages, companies]);

  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'Неизвестно';
    const stage = stages.find((s) => s.id === stageId);
    return stage?.name || 'Неизвестно';
  };

  const getStatusBadge = (stageId: string | null) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return null;
    return (
      <Badge label={stage.name} variant={stage.color} />
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    return new Date(timeStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConversionTrend = () => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    if (!first.total || !last.total) return null;
    const change = last.total - first.total;
    const percent = (change / first.total) * 100;
    return { change, percent };
  };

  const trend = getConversionTrend();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text">Дашборд откликов</h1>
        <button
          onClick={() => router.push('/applications')}
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim transition hover:border-border-soft"
        >
          Перейти к откликам
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard lines={1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-dim">Всего откликов</p>
              <p className="text-2xl font-semibold text-text">{stats.total}</p>
            </div>
            <Calendar className="h-6 w-6 text-accent-blue" />
          </div>
        </SkeletonCard>

        <SkeletonCard lines={1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-dim">Активные</p>
              <p className="text-2xl font-semibold text-text">{stats.active}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-accent-teal" />
          </div>
        </SkeletonCard>

        <SkeletonCard lines={1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-dim">До интервью</p>
              <p className="text-2xl font-semibold text-text">
                {stages.find((s) => s.name === 'Интервью')?.id
                  ? stats.byStage[stages.find((s) => s.name === 'Интервью')?.id] || 0
                  : 0}
              </p>
            </div>
            <Users className="h-6 w-6 text-accent-amber" />
          </div>
        </SkeletonCard>

        <SkeletonCard lines={1}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-dim">Офферы</p>
              <p className="text-2xl font-semibold text-text">
                {stages.find((s) => s.name === 'Оффер')?.id
                  ? stats.byStage[stages.find((s) => s.name === 'Оффер')?.id] || 0
                  : 0}
              </p>
            </div>
            <Briefcase className="h-6 w-6 text-accent-teal" />
          </div>
        </SkeletonCard>
      </div>

      {/* Trend */}
      {trend && (
        <div className="rounded-lg border border-border-soft bg-panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Динамика откликов</h3>
              <p className="mt-1 text-xs text-text-dim">
                За {trend.change > 0 ? '+' : ''}{trend.change} отклик{trend.change !== 1 && trend.change !== -1 ? 'ов' : ''}
                {trend.percent > 0 ? ` (+${Math.round(trend.percent)}%)` : trend.percent < 0 ? ` (${Math.round(trend.percent)}%)` : ''}
                за период
              </p>
            </div>
            {trend.change > 0 ? (
              <TrendingUp className="h-5 w-5 text-accent-teal" />
            ) : (
              <TrendingDown className="h-5 w-5 text-accent-coral" />
            )}
          </div>
        </div>
      )}

      {/* Top Companies */}
      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Топ компаний</h2>
        {topCompanies.length === 0 ? (
          <p className="text-xs text-text-dim">Данные о компаниях ещё не заполнены</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {topCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center gap-2 rounded-lg border border-border-soft bg-panel-2 px-3 py-2"
              >
                <span className="text-sm text-text">{company.name}</span>
                <span className="text-xs text-text-dim">({company.count} откликов)</span>
                {company.rating && (
                  <Badge variant={company.rating >= 4 ? 'teal' : company.rating >= 3 ? 'blue' : 'neutral'} size="xs">
                    ★ {company.rating}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source Distribution */}
      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Источники откликов</h2>
        {Object.entries(stats.bySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([source, count]) => (
            <div key={source} className="flex items-center justify-between text-sm">
              <span className="text-text-dim truncate max-w-[200px]" title={source}>
                {source}
              </span>
              <span className="tabular-nums text-text-faint">{count}</span>
            </div>
          ))}
      </div>

      {/* Recent Applications Table */}
      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-text">Последние отклики</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-faint">
                <th className="pb-2 pl-1 font-normal">Компания</th>
                <th className="pb-2 px-1 font-normal">Роль</th>
                <th className="pb-2 px-1 font-normal">Источник</th>
                <th className="pb-2 px-1 font-normal">Дата отклика</th>
                <th className="pb-2 px-1 font-normal">Этап</th>
                <th className="pb-2 pr-1 font-normal">Зарплата</th>
              </tr>
            </thead>
            <tbody>
              {recentApplications.map((app) => (
                <tr key={app.id} className="border-t border-border-soft">
                  <td className="py-2 pl-1 text-text-dim">
                    {app.company || '—'}
                  </td>
                  <td className="py-2 px-1 text-text-dim">{app.role || '—'}</td>
                  <td className="py-2 px-1 text-text-dim">
                    {app.source || '—'}
                  </td>
                  <td className="py-2 px-1 text-text-dim">
                    {formatDate(app.applied_date)}
                  </td>
                  <td className="py-2 px-1">
                    {getStatusBadge(app.stage_id)}
                  </td>
                  <td className="py-2 pr-1 text-text-dim">{app.salary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {recentApplications.length === 0 && (
          <p className="py-4 text-center text-xs text-text-dim">
            Откликов пока нет — добавьте на странице «Отклики»
          </p>
        )}
      </div>

      {/* MapPin - Location hint */}
      <div className="rounded-lg border border-border-soft bg-panel p-4">
        <div className="flex items-start gap-3 text-sm text-text-dim">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" />
          <div>
            <p>
              Этот дашборд показывает сводную статистику по всем вашим откликам на вакансии.
            </p>
            <p className="mt-1">
              Используйте фильтры на странице «Отклики» для более детального анализа.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
