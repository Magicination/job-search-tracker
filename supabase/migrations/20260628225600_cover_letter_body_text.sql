-- Текст сопроводительного письма напрямую в форме, не только файлом —
-- пользователь может ввести сам текст версии (или приложить файл, или и
-- то и другое одновременно). Аддитивно, только cover_letter_versions.

alter table cover_letter_versions add column body_text text not null default '';
