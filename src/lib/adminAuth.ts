import { supabase } from '../lib/supabase';

export async function requireAdmin(
  cookies: import('astro').AstroCookies,
  roles: string[] = ['super_admin', 'moderator', 'editor']
) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (sessionError || !session) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !roles.includes(profile.role)) {
    return null;
  }

  return profile;
}