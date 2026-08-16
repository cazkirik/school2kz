# Школьный портал — Средняя школа №2 города Тараз

Двуязычный сайт школы (русский / казахский): новости, публикации, учителя, расписание, кабинет доверия, объявления и закрытая админка. Построен на [Astro](https://astro.build) + [Supabase](https://supabase.com), разворачивается на [Vercel](https://vercel.com).

## Стек

- **Astro 7** (SSR) + `@astrojs/vercel`
- **Tailwind CSS 4** (через `@tailwindcss/vite`)
- **Supabase** — Auth (OTP по email), Postgres, RLS
- **Vercel** — хостинг (бесплатный Hobby-план, поддомен `*.vercel.app`)

## Локальный запуск

```sh
npm install
cp .env.example .env   # впишите ключи Supabase
npm run dev            # http://localhost:4321
```

Переменные окружения (`.env`):

| Переменная | Описание |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | URL вашего Supabase-проекта |
| `PUBLIC_SUPABASE_ANON_KEY` | Публичный (anon) ключ |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Gmail SMTP для уведомлений кабинета доверия (порт 465) |
| `FEEDBACK_NOTIFY_TO` | Адрес, на который слать уведомления о новых обращениях |

## Команды

| Команда | Действие |
| --- | --- |
| `npm run dev` | Сервер разработки (localhost:4321) |
| `npm run build` | Продакшен-сборка в `dist/` + `.vercel/output` |
| `npm run preview` | Просмотр собранного сайта |
| `npm run check` | Проверка типов и ошибок (обязательно перед коммитом) |

## Деплой на Vercel

1. Создайте репозиторий на GitHub и запушьте этот проект.
2. На [vercel.com](https://vercel.com) нажмите **Add New → Project**, выберите репозиторий.
3. Framework Preset: **Astro** (определится автоматически).
4. В Environment Variables добавьте все переменные из `.env`.
5. Deploy. Сайт будет доступен на `https://<project>.vercel.app`.

При каждом пуше в GitHub Vercel пересобирает сайт автоматически.

## Структура

- `src/pages/` — русские страницы; `src/pages/kk/` — казахские.
- `src/components/` — вью и компоненты (Header, Footer, PostCard, TeacherCard).
- `src/layouts/` — `Base.astro`, `Admin.astro`.
- `src/lib/` — клиенты и логика: `supabase.ts`, `auth.ts`, `adminAuth.ts`, `mailer.ts`.
- `src/middleware.ts` — защита `/admin`, security-заголовки.
- `src/i18n/ui.ts` — словарь переводов (ru + kk).
- `src/content/publications/` — публикации (пары `ru.md` + `kk.md`).
- `supabase-schema.sql` — схема БД (profiles, news, teachers, schedules, feedback, announcements) с RLS.
- `scripts/seed.ts` — наполнение БД тестовыми данными.

## Роли

`super_admin` / `moderator` / `editor` — админка; `student` / `teacher` / `parent` — публичный доступ. Смена ролей — через RPC `set_user_role` (только super_admin).