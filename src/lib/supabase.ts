import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Kodi's Supabase project. The publishable key is meant to ship inside the app: what each person can
// read or change is decided by the database's security rules, not by keeping this key secret.
// To point the app at another project, set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY in .env.
const DEFAULT_URL = 'https://gdejrrogcdahwbrcelpi.supabase.co';
const DEFAULT_KEY = 'sb_publishable_gdrse28ByABqkat2T9LaNw_0tLdJ0ry';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY || DEFAULT_KEY;

export const isConfigured = url.startsWith('https://') && key.length > 20;

export const supabase = createClient(url || 'https://not-configured.supabase.co', key || 'not-configured', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the sign-in token only while the app is open.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export const PHOTO_BUCKET = 'listing-photos';

export function photoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Turns a Supabase or Edge Function error into a message people can act on. */
export async function errorMessage(error: unknown): Promise<string> {
  if (!error) return '';
  const e = error as { message?: string; context?: { json?: () => Promise<{ error?: string }> } };
  if (e.context && typeof e.context.json === 'function') {
    try {
      const body = await e.context.json();
      if (body?.error) return body.error;
    } catch {
      // fall through to the plain message
    }
  }
  return e.message ?? String(error);
}
