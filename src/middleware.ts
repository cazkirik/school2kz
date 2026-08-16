import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect, locals } = context;

  const adminPaths = ['/admin'];
  const isAdminPath = adminPaths.some(path => url.pathname.startsWith(path));

  if (isAdminPath) {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }

    const { data: { session }, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error || !session) {
      return redirect('/login?redirect=' + encodeURIComponent(url.pathname));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at, updated_at')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['super_admin', 'moderator', 'editor'].includes(profile.role)) {
      return redirect('/');
    }

    locals.session = session;
    locals.profile = profile;
  }

  const response = await next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
});
