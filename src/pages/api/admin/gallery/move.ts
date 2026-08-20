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
  const direction = formData.get('direction');

  if (!id || (direction !== 'up' && direction !== 'down')) {
    return new Response('Bad request', { status: 400 });
  }

  const { data: items, error: listErr } = await supabase
    .from('gallery')
    .select('id, sort_order')
    .order('sort_order', { ascending: true });

  if (listErr) {
    return new Response('Failed to load gallery', { status: 500 });
  }

  const index = (items ?? []).findIndex(g => g.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= (items?.length ?? 0)) {
    return redirect('/admin/gallery');
  }

  const a = items![index];
  const b = items![swapWith];

  await supabase.from('gallery').update({ sort_order: b.sort_order }).eq('id', a.id);
  await supabase.from('gallery').update({ sort_order: a.sort_order }).eq('id', b.id);

  return redirect('/admin/gallery');
};