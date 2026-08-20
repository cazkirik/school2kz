import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const profile = await requireAdmin(cookies, ['super_admin']);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Требуется вход с правами супер-админа' }), { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  let id: string | null = null;
  let banned = false;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    id = body.id;
    banned = !!body.banned;
  } else {
    const formData = await request.formData();
    id = formData.get('id') as string;
    banned = formData.get('banned') === 'true';
  }

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
  }

  if (id === profile.id) {
    return new Response(JSON.stringify({ error: 'Нельзя заблокировать самого себя' }), { status: 400 });
  }

  const { error } = await supabase.rpc('admin_set_banned', { target_id: id, value: banned });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};