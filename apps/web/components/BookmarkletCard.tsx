'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

/**
 * Автозаполнение отклика по ссылке на hh.ru — через букмарклет.
 * ВАЖНО: React (начиная с недавних версий) блокирует href="javascript:..."
 * при рендере через JSX-проп (защита от XSS) — см.
 * "React has blocked a javascript: URL as a security precaution".
 * Поэтому href для этой ссылки выставляется НАПРЯМУЮ через DOM
 * (linkRef.current.setAttribute), в обход рендера React — так защита
 * не срабатывает, а перетаскивание ссылки на панель закладок работает.
 */
function buildBookmarkletCode(appUrl: string): string {
  return `javascript:(function(){var APP_URL='${appUrl}';function getJsonLd(){var s=document.querySelectorAll('script[type="application/ld+json"]');for(var i=0;i<s.length;i++){try{var d=JSON.parse(s[i].textContent);var list=Array.isArray(d)?d:[d];for(var j=0;j<list.length;j++){if(list[j]&&list[j]['@type']==='JobPosting')return list[j];}}catch(e){}}return null;}function text(sel){var el=document.querySelector(sel);return el?el.textContent.trim():'';}function stripHtml(html){var div=document.createElement('div');div.innerHTML=html;return div.textContent||div.innerText||'';}function guessExperience(desc){if(!desc)return'';var d=desc.toLowerCase();if(/без опыта|не требуется|no experience|entry.level/.test(d))return'Без опыта';var range=d.match(/(\\d+)\\s*[-–]\\s*(\\d+)\\s*(?:лет|года|год|years?)/);if(range)return range[1]+'–'+range[2]+' лет';var single=d.match(/от\\s*(\\d+)\\s*(?:лет|года|год|years?)/);if(single)return'от '+single[1]+' лет';return'';}var jd=getJsonLd()||{};var company=(jd.hiringOrganization&&jd.hiringOrganization.name)||text('[data-qa="vacancy-company-name"]')||'';var role=jd.title||text('[data-qa="vacancy-title"]')||document.title||'';var salary='';if(jd.baseSalary&&jd.baseSalary.value){var v=jd.baseSalary.value;var cur=jd.baseSalary.currency||'';if(v.minValue&&v.maxValue)salary=v.minValue+'–'+v.maxValue+' '+cur;else if(v.minValue)salary='от '+v.minValue+' '+cur;else if(v.maxValue)salary='до '+v.maxValue+' '+cur;}if(!salary)salary=text('[data-qa="vacancy-salary"]');var experience=text('[data-qa="vacancy-experience"]');if(!experience&&jd.description)experience=guessExperience(stripHtml(jd.description));var url=window.location.href;var params=new URLSearchParams({company:company,role:role,salary:salary,experience:experience,url:url});window.open(APP_URL+'/add?'+params.toString(),'_blank');})();`;
}

export function BookmarkletCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setCode(buildBookmarkletCode(window.location.origin));
  }, []);

  // href выставляется в обход React, иначе браузер/React блокирует
  // javascript: URL как потенциальный XSS.
  useEffect(() => {
    if (linkRef.current && code) {
      linkRef.current.setAttribute('href', code);
    }
  }, [code, open]);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-accent-amber/50 px-4 py-2.5 text-sm font-medium text-text-dim transition hover:border-accent-amber hover:text-text"
      >
        📌 Добавить в Job Tracker
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="mb-2 text-sm font-semibold text-text">Автозаполнение по ссылке на hh.ru</h2>
          <ol className="mt-2 flex flex-col gap-1 text-sm text-text-dim">
            <li><span className="text-text-faint">1.</span> Перетащите кнопку ниже на панель закладок браузера.</li>
            <li><span className="text-text-faint">2.</span> Откройте страницу вакансии на hh.ru.</li>
            <li><span className="text-text-faint">3.</span> Нажмите на закладку — откроется страница создания отклика с уже заполненными полями.</li>
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              ref={linkRef}
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
              {copied ? 'Скопировано!' : 'Скопировать код'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
