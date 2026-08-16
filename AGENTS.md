# School — школьный портал на Astro

Двуязычный сайт школы (русский / казахский): новости, публикации, учителя, расписание, кабинет доверия, объявления и закрытая админка.

## Цели проекта

1. Публичный сайт: быстрый, статически собираемый (Astro), без тяжёлых зависимостей.
2. Полная двуязычность: **каждая страница и каждый контент-файл существуют в паре ru + kk**.
3. Авторизация через Supabase Auth (OTP по email) + ролевая админка.
4. Роли пользователей, определённые в `profiles.role`:
   - `super_admin` — всё: пользователи, роли, контент, расписание, обратная связь.
   - `moderator` — контент, учителя, расписание, кабинет доверия.
   - `editor` — только новости и объявления.
   - `student` / `teacher` / `parent` — публичный доступ, без админки.

## Команды

- `npm run dev` — сервер разработки (http://localhost:4321)
- `npm run build` — сборка статики в `dist/`
- `npm run preview` — локальный просмотр собранного сайта
- `npm run check` — **обязательно после любых изменений кода** (astro check: типы + ошибки)

На Windows вместо `npm` используйте `npm.cmd`.

## Expected Repository Structure

- `src/pages/` — русские страницы (тонкие обёртки); `src/pages/kk/` — казахские.
- `src/components/` — вью и переиспользуемые компоненты (Header, Footer, PostCard, TeacherCard).
- `src/layouts/` — `Base.astro` (общий каркас, CSS-переменные), `Admin.astro` (каркас админки).
- `src/lib/` — клиенты и логика: `supabase.ts`, `auth.ts` (роли), `adminAuth.ts`.
- `src/middleware.ts` — защита `/admin` и `/kk/admin`, security-заголовки.
- `src/i18n/ui.ts` — словарь переводов UI. **Ключи добавляются в оба языка одновременно.**
- `src/content/` — контент-коллекции: `news/`, `publications/` (пары `ru.md` + `kk.md` в одной папке слага).
- `src/content.config.ts` — схема коллекций.
- `src/siteConfig.ts` — название школы, адрес, телефон, соцсети.
- `src/styles/global.css` — глобальные стили.
- `supabase-schema.sql` — схема БД (profiles, news, teachers, schedules, feedback, announcements) с RLS.
- `scripts/seed.ts` — наполнение БД тестовыми данными.

## Правила архитектуры

- Страницы — тонкие обёртки, вся вёрстка в компонентах.
- Стили — в `<style>` внутри компонентов, CSS-переменные заданы в `Base.astro` (фирменный цвет `#2563eb`).
- Маршруты: русский — `/`, `/news/`, `/publications/`, `/about/`, `/contacts/`, `/schedule/`, `/teachers/`, `/feedback/`, `/cabinet/`; казахский — с префиксом `/kk`.
- Админка: `/admin` и `/kk/admin` (routing в `middleware.ts`, доступ по ролям из `src/lib/auth.ts`).
- Supabase-клиент — только через `src/lib/supabase.ts` (singleton, env `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_ANON_KEY`).
- Любая работа с данными должна уважать RLS: запросы идут от пользователя (`supabase.auth`), **никогда** не использовать service_role на клиенте.
- Не добавлять комментарии в код без необходимости.
- **Дизайн**: любая UI/UX-задача следует `docs/specs/design-rules.md` — перед вёрсткой сверяться с актуальными источниками (cursor.directory, mcpmarket, поиск трендов), затем проектировать. Письма — таблицами, inline-стили.

## Роли и маршрутизация работы

При запросе выберите применимый путь:

1. **Контент-задача** (новость/публикация) — правки в `src/content/`, пары `ru.md`+`kk.md`. Схема frontmatter внизу этого файла.
2. **UI-задача** (страница/компонент/перевод) — `src/components`, `src/layouts`, `src/i18n/ui.ts`, префикс `/kk` для казахских маршрутов.
3. **Задача админки/доступа** (роли, middleware) — `src/lib/auth.ts`, `src/lib/adminAuth.ts`, `src/middleware.ts`.
4. **Задача данных** (таблицы, RLS, запросы) — `supabase-schema.sql`, SQL-миграции (`*.sql` в корне), страницы `src/pages/api/**`.

Для типичной задачи делайте минимум: **одна фича = один язык = одна пара файлов (ru+kk)**, без сноса соседних функций.

## Workflow доставки

1. Внесите изменения в код/контент.
2. Запустите `npm run check` (astro check) — он обязан пройти без ошибок.
3. Проверьте затронутые страницы на обоих языках (`/` и `/kk/`).
4. Для изменений данных — примените SQL-миграцию в Supabase и проверьте RLS-политики.

## Как добавить новость / публикацию

Папка с общим слагом в коллекции, внутри два файла:

- `src/content/news/<slug>/ru.md` + `src/content/news/<slug>/kk.md`
- `src/content/publications/<slug>/ru.md` + `src/content/publications/<slug>/kk.md`

Слаг в URL одинаковый для обоих языков. Детальные страницы: `/news/<slug>/`, `/kk/news/<slug>/`.

Frontmatter обязателен:

```yaml
---
title: "Заголовок"
date: 2025-09-15
lang: "ru"   # "ru" или "kk"
description: "Короткое описание для карточки и SEO"
author: "Имя автора"   # только для publications
---
Текст записи в Markdown.
```

Файлы **нужно создавать парой** (ru + kk).

## Спецификации

Долговечные спецификации лежат в `docs/specs/*.md` (намерение, контракты, acceptance criteria) и подключаются через `opencode.json` (instructions). Если вы меняете контракт (роли, RLS, схему данных) — обновите или создайте соответствующую спецификацию.

## Документация

- https://docs.astro.build/en/guides/content-collections/
- https://docs.astro.build/en/guides/internationalization/
- https://supabase.com/docs (Auth + RLS)