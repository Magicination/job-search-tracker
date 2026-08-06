'use client';

import { useState } from 'react';
import type { Company } from '@job-search-tracker/shared';

interface AddVacancyProps {
  company: Company;
}

export function AddVacancy({ company }: AddVacancyProps) {
  const [url, setUrl] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('manual');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Введите ссылку на вакансию');
      return;
    }

    // В будущем здесь будет POST запрос к Supabase для создания vacancy_link
    console.log('Saving vacancy:', { company_id: company.id, vacancy_url: url, role, source });
    
    setUrl('');
    setRole('');
    setError('');
  };

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4">
      <h3 className="text-sm font-medium text-neutral-700 mb-2">Добавить вакансию с hh.ru</h3>
      
      {/* Placeholder — будущая форма */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800 mb-2 font-medium">План реализации:</p>
        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
          <li><strong>Поле URL:</strong> Ввести ссылку на hh.ru (например, https://hh.ru/vacancy/123)</li>
          <li><strong>Поле "Роль":</strong> Название вакансии (опционально)</li>
          <li><strong>Создание vacancy_link:</strong> Создать запись в таблице vacancy_links для компании</li>
          <li><strong>Функционал:</strong></li>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
            <li>Показать все вакансии этой компании</li>
            <li>Отслеживать новые открытия</li>
            <li>Будущее: webhook/RSS для автоподтягивания</li>
          </ul>
        </ul>
      </div>

      {/* Будущая форма */}
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <input
          type="url"
          placeholder="https://hh.ru/vacancy/12345"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(''); }}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="text"
          placeholder="Роль (опционально)"
          value={role}
          onChange={(e) => { setRole(e.target.value); setError(''); }}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          Добавить вакансию
        </button>
      </form>
    </div>
  );
}
