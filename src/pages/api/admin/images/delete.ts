import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator', 'editor']);
  if (!profile) {
    return redirect('/login?redirect=/admin/images');
  }

  const formData = await request.formData();
  const name = formData.get('name');

  if (!name || typeof name !== 'string') {
    return new Response('Не указано имя файла', { status: 400 });
  }

  const { error } = await supabase.storage.from('school-images').remove([name]);

  if (error) {
    return new Response('Ошибка удаления: ' + error.message, { status: 500 });
  }

  return redirect('/admin/images');
};