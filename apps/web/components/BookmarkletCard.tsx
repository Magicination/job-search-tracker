'use client';

import { useEffect, useState } from 'react';

/**
 * Автозаполнение отклика по ссылке на hh.ru — через букмарклет, а не через
 * прямой запрос к api.hh.ru (тот заблокирован анти-бот защитой и с сервера,
 * и из браузера напрямую). Букмарклет выполняется в контексте страницы
 * вакансии на hh.ru, читает JobPosting (JSON-LD) прямо из DOM и открывает
 * /add с данными в query-параметрах — это не сетевой запрос, поэтому
 * никакая блокировка тут не применяется.
 *
 * APP_URL берём из window.location.origin в момент установки — работает
 * "из коробки" на любом домене деплоя без ручной правки кода.
 */
function buildBookmarkletCode(appUrl: string): string {
  return `javascript:(function(){var APP_URL='${appUrl}';function getJsonLd(){var s=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<s.length;i++){try{var d=JSON.parse(s[i].textContent);var list=Array.isArray(d)?d:[d];for(var j=0;j<list.length;j++){if(list[j]&&list[j]['@type']==='JobPosting')return list[j];}}catch(e){}}return null;}function text(sel){var el=document.querySelector(sel);return el?el.textContent.trim():'';}var jd=getJsonLd()||{};var company=(jd.hiringOrganization&&jd.hiringOrganization.name)||text('[data-qa="vacancy-company-name"]')||'';var role=jd.title||text('[data-qa="vacancy-title"]')||document.title||'';var salary='';if(jd.baseSalary&&jd.baseSalary.value){var v=jd.baseSalary.value;var cur=jd.baseSalary.currency||'';if(v.minValue&&v.maxValue)salary=v.minValue+'–'+v.maxValue+' '+cur;else if(v.minValue)salary='от '+v.minValue+' '+cur;else if(v.maxValue)salary='до '+v.maxValue+' '+cur;}if(!salary)salary=text('[data-qa="vacancy-salary"]');var experience=text('[data-qa="vacancy-experience"]');var url=window.location.href;var params=new URLSearchParams({company:company,role:role,salary:salary,experience:experience,url:url});window.open(APP_URL+'/add?'+params.toString(),'_blank');})();`;
}

export function BookmarkletCard() {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    setCode(buildBookmarkletCode(window.location.origin));
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <p className="text-sm text-text-dim">Автозаполнение отклика по ссылке на hh.ru — в 3 шага:</p>
      <ol className="mt-2 flex flex-col gap-1 text-sm text-text-dim">
        <li>
          <span className="text-text-faint">1.</span> Перетащите кнопку ниже на панель закладок браузера.
        </li>
        <li>
          <span className="text-text-faint">2.</span> Откройте страницу вакансии на hh.ru.
        </li>
        <li>
          <span className="text-text-faint">3.</span> Нажмите на закладку — откроется страница создания
          отклика с уже заполненными полями.
        </li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        
          href={code || '#'}
          onClick={(e) => e.preventDefault()}
          draggable={!!code}
          className="cursor-grab select-none rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-bg active:cursor-grabbing"
          title="Перетащите на панель закладок браузера"
        >
          📌 Добавить в Job Tracker
        </a>
        <button
          onClick={handleCopy}
          disabled={!code}
          className="rounded-lg border border-border px-3 py-2 text-xs text-text-dim hover:border-border-soft disabled:opacity-50"
        >
          {copied ? 'Скопировано!' : 'Скопировать код (если панель закладок скрыта)'}
        </button>
      </div>
    </div>
  );
}
