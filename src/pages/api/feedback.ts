import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { z } from 'zod';
import { sendMail } from '../../lib/mailer';
import { sendTelegram } from '../../lib/telegram';

const feedbackSchema = z.object({
  message: z.string().trim().min(1, 'Сообщение не может быть пустым').max(2000, 'Слишком длинное сообщение'),
});

const submitted: Map<string, number[]> = new Map();
const LIMIT = 3;
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

  const notifyTo = process.env.FEEDBACK_NOTIFY_TO;
  if (notifyTo) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#2563eb;margin:0 0 16px">Новое обращение в кабинет доверия</h2>
        <p style="color:#374151;line-height:1.6">Получено новое обращение через форму кабинета доверия. Отметить прочитанным и ответить можно в админке в разделе «Кабинет доверия».</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-top:16px">
          <p style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px">Текст обращения</p>
          <p style="color:#111827;margin:0;white-space:pre-wrap">${message}</p>
        </div>
      </div>`;
    await sendMail(notifyTo, 'Новое обращение в кабинет доверия', html).catch((e) => {
      console.error('SMTP notification failed:', e?.message || e);
    });
  }

  return new Response(JSON.stringify({ message: 'Сообщение успешно отправлено!' }), { status: 200 });
};