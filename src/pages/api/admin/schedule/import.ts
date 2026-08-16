import type { APIRoute } from 'astro';
import Papa from 'papaparse';
import { supabase } from '../../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  if (!accessToken || !refreshToken) {
    return redirect('/login?redirect=/admin/schedule');
  }

  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (sessionError || !session) {
    return redirect('/login?redirect=/admin/schedule');
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
  const file = formData.get('csv') as File;

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
  }

  const text = await file.text();

  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const validRows = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const class_name = row.class_name?.trim();
          const day_of_week = parseInt(row.day_of_week);
          const lesson_number = parseInt(row.lesson_number);
          const subject_name = row.subject_name?.trim();
          const teacher_name = row.teacher_name?.trim() || null;
          const room = row.room?.trim() || null;

          if (!class_name || !day_of_week || !lesson_number || !subject_name) {
            errors.push(`Строка ${i + 2}: отсутствуют обязательные поля`);
            continue;
          }
          if (day_of_week < 1 || day_of_week > 6) {
            errors.push(`Строка ${i + 2}: day_of_week должен быть 1-6`);
            continue;
          }
          if (lesson_number < 1 || lesson_number > 8) {
            errors.push(`Строка ${i + 2}: lesson_number должен быть 1-8`);
            continue;
          }

          validRows.push({
            class_name,
            day_of_week,
            lesson_number,
            subject_name,
            teacher_name,
            room
          });
        }

        if (errors.length > 0) {
          resolve(new Response(JSON.stringify({ error: errors.join('; ') }), { status: 400 }));
          return;
        }

        if (validRows.length === 0) {
          resolve(new Response(JSON.stringify({ error: 'Нет валидных строк для импорта' }), { status: 400 }));
          return;
        }

        // Upsert - используем конфликт по уникальному индексу
        const { error } = await supabase
          .from('schedules')
          .upsert(validRows, {
            onConflict: 'class_name,day_of_week,lesson_number'
          });

        if (error) {
          resolve(new Response(JSON.stringify({ error: error.message }), { status: 500 }));
          return;
        }

        resolve(redirect('/admin/schedule'));
      },
      error: (err: Error) => {
        resolve(new Response(JSON.stringify({ error: err.message }), { status: 400 }));
      }
    });
  });
};