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
  let role: string | null = null;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    id = body.id;
    role = body.role;
  } else {
    const formData = await request.formData();
    id = formData.get('id') as string;
    role = formData.get('role') as string;
  }

  if (!id || !role) {
    return new Response(JSON.stringify({ error: 'Missing id or role' }), { status: 400 });
  }

  const allowedRoles = ['super_admin', 'moderator', 'editor', 'student', 'teacher', 'parent'];
  if (!allowedRoles.includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400 });
  }

  const { error } = await supabase.rpc('set_user_role', {
    target_id: id,
    new_role: role
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};