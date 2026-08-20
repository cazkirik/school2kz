import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator', 'editor']);
  if (!profile) {
    return redirect('/login?redirect=/admin/images');
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return new Response('Файл не передан', { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return new Response('Файл больше 5 МБ', { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(file.type)) {
    return new Response('Недопустимый тип файла', { status: 400 });
  }

  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
  const path = `${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from('school-images')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    return new Response('Ошибка загрузки: ' + error.message, { status: 500 });
  }

  return redirect('/admin/images');
};