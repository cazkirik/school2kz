import type { APIRoute } from 'astro';
import { supabase } from '../../../../lib/supabase';
import { requireAdmin } from '../../../../lib/adminAuth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const profile = await requireAdmin(cookies, ['super_admin', 'moderator']);
  if (!profile) return redirect('/login?redirect=/admin/schedule');

  const data = await request.json();
  const { id, subject_name, teacher_name, room } = data;
  if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });

  const update: Record<string, string> = {};
  if (subject_name !== undefined) update.subject_name = subject_name;
  if (teacher_name !== undefined) update.teacher_name = teacher_name;
  if (room !== undefined) update.room = room;

  const { error } = await supabase.from('schedules').update(update).eq('id', id);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};