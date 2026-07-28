'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCompanies } from '../../lib/hooks/useCompanies';
import { useApplicationAnalytics } from '../../lib/hooks/useApplicationAnalytics';
import { useStages } from '../../lib/hooks/useStages';
import { Building2, ExternalLink, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { AddVacancy } from '../../components/AddVacancy';

export default function CompaniesPage() {
  const { companies, loading, findOrCreateCompany, updateCompany } = useCompanies();
  const { applications } = useApplicationAnalytics();
  const { stages } = useStages();
  
  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-neutral-50">
        <h1 className="text-3xl font-bold mb-8">Компании</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const companyStats = companies.map((company) => {
    const companyApps = applications.filter((app) => app.company_id === company.id && !app.archived);
    
    return {
      ...company,
      applicationCount: companyApps.length,
      hasOpenApplications: companyApps.some(app => stages.some(s => s.auto_archive !== true)) === false,
    };
  });

  return (
    <div className="min-h-screen p-6 md:p-8 bg-neutral-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Компании</h1>
            <p className="text-neutral-500 mt-2">{companyStats.length} компаний в откликах</p>
          </div>
          <Link href="/applications" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            ← На все отклики
          </Link>
        </div>

        {/* Компании */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companyStats.map((company) => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Компания */}
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-neutral-900">{company.name}</h2>
                    {company.rating && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Рейтинг: ★ {company.rating}
                      </span>
                    )}
                  </div>
                  {company.url && (
                    <a 
                      href={company.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                      title="Сайт компании"
                    >
                      <Building2 className="w-5 h-5" />
                    </a>
                  )}
                </div>

                {/* Заметка о компании */}
                {company.note && (
                  <div className="bg-neutral-50 rounded p-3 text-sm text-neutral-600">
                    <p className="font-medium">Заметка:</p>
                    <p>{company.note}</p>
                  </div>
                )}

                {/* Статистика */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Откликов:</span>
                    <span className="font-semibold text-neutral-900">{company.applicationCount}</span>
                  </div>
                  
                  {company.applicationCount > 0 && (
                    <Link 
                      href={`/applications?company_id=${company.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                    >
                      Посмотреть отклики
                      <TrendingUp className="w-4 h-4 ml-1" />
                    </Link>
                  )}

                  {company.hasOpenApplications && (
                    <div className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Есть открытые отклики
                    </div>
                  )}
                  
                  {!company.hasOpenApplications && company.applicationCount > 0 && (
                    <div className="text-sm text-orange-600 flex items-center mt-1">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Проверьте статусы откликов
                    </div>
                  )}
                </div>

                {/* Кнопка добавления вакансии */}
                <div className="bg-neutral-50 p-3 border-t border-neutral-200">
                  <AddVacancy company={company} />
                </div>
              </div>
            </div>
          ))}

          {/* Add new company */}
          <Link 
            href="/applications/add" 
            className="flex flex-col items-center justify-center min-h-[280px] bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300 hover:border-blue-400 transition-colors cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-white shadow-sm group-hover:bg-blue-50 transition-colors">
              <Building2 className="w-8 h-8 text-neutral-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <span className="mt-3 text-neutral-500 font-medium">Добавить компанию</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
