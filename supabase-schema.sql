-- Supabase Schema для Школьного Портала
-- Выполните этот SQL в Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. profiles (пользователи с ролями)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('super_admin', 'moderator', 'editor', 'student', 'teacher', 'parent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS на profiles строится БЕЗ self-join (иначе бесконечная рекурсия).
-- Смена ролей выполняется только через SECURITY DEFINER функцию set_user_role ниже.
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Anyone authenticated can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow trigger insert on profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- SECURITY DEFINER RPC: назначение роли (только super_admin, без рекурсии RLS).
CREATE OR REPLACE FUNCTION public.set_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_role text;
  super_admin_count int;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: only super_admin can change roles';
  END IF;

  IF new_role NOT IN ('super_admin', 'moderator', 'editor', 'student', 'teacher', 'parent') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT role INTO target_role FROM public.profiles WHERE id = target_id;
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF target_id = auth.uid() AND new_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Нельзя снять права супер-админа с самого себя';
  END IF;

  IF target_role = 'super_admin' AND new_role <> 'super_admin' THEN
    SELECT count(*) INTO super_admin_count FROM public.profiles WHERE role = 'super_admin';
    IF super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Нельзя снять права последнего супер-админа';
    END IF;
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = NOW() WHERE id = target_id;
END;
$$;

-- Триггер: автосоздание профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. news (новости)
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  lang TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'kk')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view news" ON news FOR SELECT USING (true);
CREATE POLICY "Editors can insert news" ON news FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);
CREATE POLICY "Editors can update news" ON news FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);
CREATE POLICY "Editors can delete news" ON news FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);

-- 3. teachers (учителя)
CREATE TABLE IF NOT EXISTS teachers (
  id BIGSERIAL PRIMARY KEY,
  last_name TEXT NOT NULL DEFAULT '',
  first_name TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  experience INT,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  room TEXT DEFAULT '',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Moderators can manage teachers" ON teachers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'super_admin'))
);

-- 4. schedules (расписание)
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  class_name TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  lesson_number INT NOT NULL CHECK (lesson_number BETWEEN 1 AND 8),
  subject_name TEXT NOT NULL DEFAULT '',
  teacher_name TEXT DEFAULT '',
  room TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_name, day_of_week, lesson_number)
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schedules" ON schedules FOR SELECT USING (true);
CREATE POLICY "Moderators can manage schedules" ON schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'super_admin'))
);

-- 5. feedback (кабинет доверия - анонимные сообщения)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Moderators can view feedback" ON feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'super_admin'))
);
CREATE POLICY "Moderators can update feedback" ON feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'super_admin'))
);

-- 6. announcements (объявления)
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'students', 'teachers', 'parents')),
  pinned BOOLEAN DEFAULT FALSE,
  lang TEXT NOT NULL DEFAULT 'ru' CHECK (lang IN ('ru', 'kk')),
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Editors can manage announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_news_lang ON news(lang, date DESC);
CREATE INDEX IF NOT EXISTS idx_schedules_class ON schedules(class_name);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_lang ON announcements(lang, date DESC);

-- Триггер updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Галерея (фото школы, управляется через админку)
CREATE TABLE IF NOT EXISTS gallery (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption_ru TEXT NOT NULL DEFAULT '',
  caption_kk TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Admins can manage gallery" ON gallery FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator', 'super_admin'))
);

-- Хранилище изображений
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('school-images', 'school-images', TRUE, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'])
ON CONFLICT (id) DO UPDATE SET public = TRUE;

CREATE POLICY "Anyone can view school images" ON storage.objects FOR SELECT USING (bucket_id = 'school-images');
CREATE POLICY "Admins can upload school images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'school-images'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);
CREATE POLICY "Admins can delete school images" ON storage.objects FOR DELETE USING (
  bucket_id = 'school-images'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);

-- RPC: список пользователей с email (только для директора)
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id, u.email, p.full_name, p.role, p.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles me WHERE me.id = auth.uid() AND me.role = 'super_admin'
  )
  ORDER BY p.created_at ASC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;