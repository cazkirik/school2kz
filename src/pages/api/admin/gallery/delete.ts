import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator']);
  if (!profile) {
    return redirect('/login?redirect=/admin/gallery');
  }

  const formData = await request.formData();
  const id = formData.get('id');

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const { error } = await supabase.from('gallery').delete().eq('id', id);

  if (error) {
    return new Response('Failed to delete gallery item', { status: 500 });
  }

  return redirect('/admin/gallery');
};