import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { sendTelegram } from '../../lib/telegram';
import { z } from 'zod';

const schema = z.object({
  child_name: z.string().trim().min(2, 'Укажите ФИО ребёнка'),
  birth_date: z.string().trim().min(1, 'Укажите дату рождения'),
  parent_name: z.string().trim().min(2, 'Укажите ФИО родителя'),
  phone: z.string().trim().regex(/^\+?[0-9\s()-]{9,18}$/, 'Некорректный телефон'),
  email: z.string().email('Некорректный e-mail').optional().or(z.literal('')),
  grade: z.string().default('1'),
  lang: z.enum(['ru', 'kk']).default('ru'),
});

const submitted = new Map<string, number[]>();
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const now = Date.now();
  const times = (submitted.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= LIMIT) {
    return new Response(JSON.stringify({ error: 'Слишком много заявок. Попробуйте позже.' }), { status: 429 });
  }
  submitted.set(ip, [...times, now]);

  let body: unknown;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Неверный формат запроса' }), { status: 400 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error.issues[0].message }), { status: 400 });
  }

  const { error } = await supabase.from('applications').insert({
    ...result.data,
    email: result.data.email || null,
  });
  if (error) {
    return new Response(JSON.stringify({ error: 'Ошибка при отправке заявки' }), { status: 500 });
  }

  await sendTelegram(
    `<b>📝 Новая заявка: запись в 1 класс</b>\n\n` +
    `<b>Ребёнок:</b> ${result.data.child_name}\n` +
    `<b>Дата рождения:</b> ${result.data.birth_date}\n` +
    `<b>Родитель:</b> ${result.data.parent_name}\n` +
    `<b>Телефон:</b> ${result.data.phone}\n` +
    (result.data.email ? `<b>E-mail:</b> ${result.data.email}\n` : '') +
    `<b>Класс:</b> ${result.data.grade}\n\n` +
    `https://school2kz.vercel.app/admin/applications`
  ).catch((e: any) => {
    console.error('Telegram notification failed:', e?.message || e);
  });

  return new Response(JSON.stringify({ message: 'Заявка отправлена' }), { status: 200 });
};