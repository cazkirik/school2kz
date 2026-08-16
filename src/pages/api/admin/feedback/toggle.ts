import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return redirect('/login?redirect=/admin/feedback');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (sessionError || !session) {
    return redirect('/login?redirect=/admin/feedback');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['super_admin', 'moderator'].includes(profile.role)) {
    return redirect('/');
  }

  const formData = await request.formData();
  const id = formData.get('id');
  const isRead = formData.get('is_read') === 'true';

  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const { error } = await supabase
    .from('feedback')
    .update({ is_read: isRead })
    .eq('id', id);

  if (error) {
    return new Response('Failed to update feedback', { status: 500 });
  }

  return redirect('/admin/feedback');
};