import { supabase } from '../lib/supabase';

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserRole() {
  const session = await getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role || null;
}

export function canAccess(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  EDITOR: 'editor',
  STUDENT: 'student'
} as const;

export const ADMIN_ROUTES = {
  SUPER_ADMIN: ['/admin', '/admin/users', '/admin/settings'],
  MODERATOR: ['/admin', '/admin/news', '/admin/teachers', '/admin/schedule', '/admin/feedback'],
  EDITOR: ['/admin', '/admin/news'],
  STUDENT: []
} as const;