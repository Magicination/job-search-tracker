'use client';

import { useState } from 'react';

/**
 * Замена CreateFromUrlBar. Прямые запросы к api.hh.ru заблокированы
 * анти-бот защитой hh.ru. Рабочий путь — букмарклет: выполняется в
 * контексте страницы вакансии на hh.ru, читает JobPosting (JSON-LD) как
 * обычный скрипт страницы, без кросс-доменных запросов. Открывает /add
 * с данными в query-параметрах.
 *
 * ВАЖНО: замени APP_URL ниже на реальный домен деплоя перед сборкой.
 */

const APP_URL = 'https://ЗАМЕНИ-НА-СВОЙ-ДОМЕН.vercel.app'; // TODO: заменить на реальный домен перед продакшеном

const BOOKMARKLET_CODE = `javascript:(function(){var APP_URL='${APP_URL}';function getJsonLd(){var s=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<s.length;i++){try{var d=JSON.parse(s[i].textContent);var list=Array.isArray(d)?d:[d];for(var j=0;j<list.length;j++){if(list[j]&&list[j]['@type']==='JobPosting')return list[j];}}catch(e){}}return null;}function text(sel){var el=document.querySelector(sel);return el?el.textContent.trim():'';}var jd=getJsonLd()||{};var company=(jd.hiringOrganization&&jd.hiringOrganization.name)||text('[data-qa="vacancy-company-name"]')||'';var role=jd.title||text('[data-qa="vacancy-title"]')||document.title||'';var salary='';if(jd.baseSalary&&jd.baseSalary.value){var v=jd.baseSalary.value;var cur=jd.baseSalary.currency||'';if(v.minValue&&v.maxValue)salary=v.minValue+'–'+v.maxValue+' '+cur;else if(v.minValue)salary='от '+v.minValue+' '+cur;else if(v.maxValue)salary='до '+v.maxValue+' '+cur;}if(!salary)salary=text('[data-qa="vacancy-salary"]');var experience=text('[data-qa="vacancy-experience"]');var url=window.location.href;var params=new URLSearchParams({company:company,role:role,salary:salary,experience:experience,url:url});window.open(APP_URL+'/add?'+params.toString(),'_blank');})();`;

export function BookmarkletCard() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(BOOKMARKLET_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-border-soft bg-panel p-3">
      <p className="text-sm text-text-dim">
        Автозаполнение по ссылке на hh.ru — через букмарклет: hh.ru блокирует
        прямые запросы к своему API с чужих серверов и из браузера напрямую,
        а букмарклет читает данные прямо со страницы вакансии.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={BOOKMARKLET_CODE}
          onClick={(e) => e.preventDefault()}
          draggable
          className="cursor-grab select-none rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-bg active:cursor-grabbing"
          title="Перетащите на панель закладок браузера"
        >
          Добавить в Job Tracker
        </a>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-border px-3 py-2 text-xs text-text-dim hover:border-border-soft"
        >
          {copied ? 'Скопировано!' : 'Скопировать код'}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-faint">
        Перетащите кнопку на панель закладок. Дальше — открываете вакансию на
        hh.ru, жмёте закладку, попадаете на страницу создания отклика с
        предзаполненными полями.
      </p>
    </div>
  );
}
