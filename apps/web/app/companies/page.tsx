'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCompanies } from '../../lib/hooks/useCompanies';
import { Building2, TrendingUp, AlertCircle, Search, FileText } from 'lucide-react';
import type { Company } from '@job-search-tracker/shared';

export default function CompaniesPage() {
  const { companies, loading, updateCompany } = useCompanies();
  
  const [searchQuery, setSearchQuery] = useState('');
  const companiesList = useMemo(() => {
    if (!companies.length) return [];
    return companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [companies, searchQuery]);

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

  return (
    <div className="min-h-screen p-6 md:p-8 bg-neutral-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Компании</h1>
            <p className="text-neutral-500 mt-2">{companies.length} компаний</p>
          </div>
          
          {/* Поиск */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 md:w-64"
            />
          </div>
        </div>

        {/* Компании */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companiesList.map((company) => (
            <div key={company.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow min-h-[180px]">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h2 className="text-lg font-semibold text-neutral-900 truncate" title={company.name}>{company.name}</h2>
                    
                    {/* Рейтинг */}
                    {company.rating && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Рейтинг: ★ {company.rating}
                      </span>
                    )}

                    {/* Сайт */}
                    {company.url && (
                      <a 
                        href={company.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700"
                      >
                        <Building2 className="w-3 h-3 mr-1" />
                        Сайт компании
                      </a>
                    )}
                  </div>
                </div>

                {/* Заметка */}
                {company.note && (
                  <div className="bg-neutral-50 rounded p-2 text-xs text-neutral-600">
                    <span className="font-medium">Заметка:</span>
                    <span>{company.note}</span>
                  </div>
                )}

                {/* Статистика */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                  <Link 
                    href={`/applications`}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Все отклики компании
                  </Link>

                  {/* Будущее: статистика из applications */}
                  <div className="text-xs text-neutral-500">
                    Статистика будет добавлена в следующей версии
                  </div>

                  {/* Кнопка добавления вакансии (placeholder) */}
                  <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                    [+] Добавить вакансию из hh.ru
                  </div>
                </div>
              </div>

              {/* Кнопка редактирования заметок/рейтинга */}
              <div className="px-4 py-2 bg-neutral-50 border-t border-neutral-200">
                <textarea 
                  placeholder="Заметки о компании..."
                  defaultValue={company.note || ''}
                  onChange={(e) => updateCompany(company.id, { note: e.target.value })}
                  className="w-full text-xs p-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={1}
                />
              </div>
            </div>
          ))}

          {/* Добавить компанию */}
          <Link 
            href="/applications/add" 
            className="flex flex-col items-center justify-center min-h-[140px] bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-300 hover:border-blue-400 transition-colors cursor-pointer group"
          >
            <div className="p-2 rounded-full bg-white shadow-sm group-hover:bg-blue-50 transition-colors">
              <Building2 className="w-6 h-6 text-neutral-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <span className="mt-2 text-neutral-500 text-xs font-medium">Добавить компанию</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
