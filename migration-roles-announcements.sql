-- Миграция: роли teacher/parent + таблица announcements

-- 1. Расширить CHECK на profiles.role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'moderator', 'editor', 'student', 'teacher', 'parent'));

-- 2. Таблица announcements
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

DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors can manage announcements" ON announcements;
CREATE POLICY "Editors can manage announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('editor', 'moderator', 'super_admin'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_lang ON announcements(lang, date DESC);

-- 3. Триггер updated_at для announcements
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
