import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env'
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export function getFamilyId(): string | null {
  return localStorage.getItem('family_id');
}

export function setFamilyId(id: string): void {
  localStorage.setItem('family_id', id);
}

export function getFamilyCode(): string | null {
  return localStorage.getItem('family_code');
}

export function setFamilyCode(code: string): void {
  localStorage.setItem('family_code', code);
}

export function clearFamily(): void {
  localStorage.removeItem('family_id');
  localStorage.removeItem('family_code');
}
