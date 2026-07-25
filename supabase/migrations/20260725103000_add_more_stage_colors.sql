-- Расширяем палитру цветов для собственных этапов канбана.
alter table public.stages drop constraint if exists stages_color_check;
alter table public.stages add constraint stages_color_check
  check (color in ('blue', 'amber', 'teal', 'coral', 'violet', 'rose', 'lime', 'neutral'));
