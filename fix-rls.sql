-- Исправленная SQL-схема: убирает рекурсивные RLS-политики
-- Выполните в Supabase SQL Editor

-- Удаляем старые рекурсивные политики
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Moderators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can manage profiles" ON profiles;

-- Безопасные политики без рекурсии
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone authenticated can view profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role manages all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Для проверки роли в коде используем простой запрос (без рекурсии):
-- SELECT role FROM profiles WHERE id = auth.uid()
-- Это работает потому что RLS пропускает own profile через первый policy