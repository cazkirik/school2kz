import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import Papa from 'papaparse';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const teachers = [
  { last_name: 'Ахметова', first_name: 'Айгуль', full_name: 'Ахметова Айгуль', subject: 'Математика', experience: 15, phone: '+7 700 111 22 33', room: '201' },
  { last_name: 'Ибраева', first_name: 'Динара', full_name: 'Ибраева Динара', subject: 'Казахский язык', experience: 12, phone: '+7 700 222 33 44', room: '202' },
  { last_name: 'Смирнов', first_name: 'Олег', full_name: 'Смирнов Олег', subject: 'Физика', experience: 20, phone: '+7 700 333 44 55', room: '203' },
  { last_name: 'Ким', first_name: 'Светлана', full_name: 'Ким Светлана', subject: 'Русский язык', experience: 18, phone: '+7 700 444 55 66', room: '204' },
  { last_name: 'Беков', first_name: 'Тимур', full_name: 'Беков Тимур', subject: 'Информатика', experience: 8, phone: '+7 700 555 66 77', room: '205' },
  { last_name: 'Жунусова', first_name: 'Алия', full_name: 'Жунусова Алия', subject: 'Биология', experience: 10, phone: '+7 700 666 77 88', room: '206' },
];

const schedules = Papa.parse(readFileSync('public/schedule-template.csv', 'utf-8'), { header: true }).data
  .filter((r: any) => r.class_name && r.subject_name)
  .map((r: any) => ({
    class_name: r.class_name.trim(),
    day_of_week: parseInt(r.day_of_week, 10),
    lesson_number: parseInt(r.lesson_number, 10),
    subject_name: r.subject_name.trim(),
    teacher_name: r.teacher_name?.trim() || '',
    room: r.room?.trim() || '',
  }));

async function seed() {
  console.log(`Seeding ${teachers.length} teachers...`);
  const { error: tErr } = await supabase.from('teachers').insert(teachers);
  if (tErr) console.error('Teachers error:', tErr.message);

  console.log(`Seeding ${schedules.length} schedule entries...`);
  const { error: sErr } = await supabase.from('schedules').insert(schedules);
  if (sErr) console.error('Schedule error:', sErr.message);

  console.log('Done!');
}

seed();