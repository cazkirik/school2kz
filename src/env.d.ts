/// <reference types="astro/client" />

interface Profile {
  id: string;
  full_name: string;
  role: 'super_admin' | 'moderator' | 'editor' | 'student';
  created_at: string;
  updated_at: string;
}

declare namespace App {
  interface Locals {
    session: import('@supabase/supabase-js').Session | null;
    profile: Profile | null;
  }
}