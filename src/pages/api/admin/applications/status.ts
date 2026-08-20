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
  const status = formData.get('status') as string;

  if (!id || !['new', 'reviewed', 'accepted', 'rejected'].includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid id or status' }), { status: 400 });
  }

  const { error } = await supabase.from('applications').update({ status }).eq('id', id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};