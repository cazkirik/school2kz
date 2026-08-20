import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { sendTelegram } from '../../lib/telegram';

const feedbackSchema = z.object({
  message: z.string().trim().min(1, 'Сообщение не может быть пустым').max(2000, 'Слишком длинное сообщение'),
});

const submitted: Map<string, number[]> = new Map();
const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const now = Date.now();
  const times = (submitted.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= LIMIT) {
    return new Response(JSON.stringify({ error: 'Слишком много обращений. Попробуйте позже.' }), { status: 429 });
  }
  submitted.set(ip, [...times, now]);

  let body: unknown;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Неверный формат запроса' }), { status: 400 });
  }

  const result = feedbackSchema.safeParse(body);
  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error.issues[0].message }), { status: 400 });
  }

  const message = result.data.message
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '\n');

  const { error } = await supabase.from('feedback').insert({ message });
  if (error) return new Response(JSON.stringify({ error: 'Ошибка при отправке' }), { status: 500 });

  await sendTelegram(
    `<b>📩 Новое обращение в кабинет доверия</b>\n\n${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`,
  ).catch((e) => {
    console.error('Telegram notification failed:', e?.message || e);
  });

  return new Response(JSON.stringify({ message: 'Сообщение успешно отправлено!' }), { status: 200 });
};