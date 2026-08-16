import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator']);
  if (!profile) {
    return redirect('/login?redirect=/admin/teachers');
  }

  const formData = await request.formData();
  const id = formData.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id);

  if (error) {
    return new Response('Failed to delete teacher', { status: 500 });
  }

  return redirect('/admin/teachers');
};