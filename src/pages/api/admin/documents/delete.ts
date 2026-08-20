import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const profile = await requireAdmin(cookies, ['moderator', 'super_admin']);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Требуется вход с правами модератора' }), { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get('id') as string;
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  const { data: doc } = await supabase.from('documents').select('file_url').eq('id', id).single();
  if (doc?.file_url) {
    const name = doc.file_url.split('/').pop();
    if (name) await supabase.storage.from('school-docs').remove([name]).catch(() => {});
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};