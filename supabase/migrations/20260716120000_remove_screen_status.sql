-- Убираем статус "Скрининг" из пайплайна. Существующие отклики со
-- статусом 'screen' переводим в 'interview' (ближайший по смыслу шаг
-- вперёд) — конкретные случаи можно поправить вручную после миграции.

update public.applications set status = 'interview' where status = 'screen';
update public.application_status_history set to_status = 'interview' where to_status = 'screen';
update public.application_status_history set from_status = 'interview' where from_status = 'screen';

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('applied', 'interview', 'offer', 'rejected'));

alter table public.application_status_history drop constraint if exists application_status_history_to_status_check;
alter table public.application_status_history add constraint application_status_history_to_status_check
  check (to_status in ('applied', 'interview', 'offer', 'rejected'));
