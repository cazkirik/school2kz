import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator']);
  if (!profile) {
    return redirect('/login?redirect=/admin/teachers');
  }

  const formData = await request.formData();
  const last_name = String(formData.get('last_name') ?? '').trim();
  const first_name = String(formData.get('first_name') ?? '').trim();
  const subject = String(formData.get('subject') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const room = String(formData.get('room') ?? '').trim();

  if (!last_name || !first_name || !subject) {
    return new Response('Missing required fields', { status: 400 });
  }

  const full_name = `${last_name} ${first_name}`.trim();

  const { error } = await supabase
    .from('teachers')
    .insert({ last_name, first_name, full_name, subject, phone, email, room });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return redirect('/admin/teachers');
};
