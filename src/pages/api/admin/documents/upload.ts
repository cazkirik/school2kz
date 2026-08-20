import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const POST: APIRoute = async ({ request, cookies }) => {
  const profile = await requireAdmin(cookies, ['moderator', 'super_admin']);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Требуется вход с правами модератора' }), { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const title = (formData.get('title') as string)?.trim() || '';
  const category = (formData.get('category') as string) || 'other';
  const lang = (formData.get('lang') as string) || 'ru';

  if (!file) return new Response(JSON.stringify({ error: 'Файл не выбран' }), { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Допустимы только PDF и Word (.pdf, .doc, .docx)' }), { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Файл больше 15 МБ' }), { status: 400 });
  }
  if (!title) return new Response(JSON.stringify({ error: 'Укажите название документа' }), { status: 400 });

  const safeName = `${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
  const { error: upErr } = await supabase.storage.from('school-docs').upload(safeName, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) return new Response(JSON.stringify({ error: 'Ошибка загрузки: ' + upErr.message }), { status: 500 });

  const url = `${import.meta.env.PUBLIC_SUPABASE_URL}/storage/v1/object/public/school-docs/${safeName}`;
  const { error: dbErr } = await supabase.from('documents').insert({ title, category, lang, file_url: url });
  if (dbErr) {
    await supabase.storage.from('school-docs').remove([safeName]).catch(() => {});
    return new Response(JSON.stringify({ error: 'Ошибка сохранения: ' + dbErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};