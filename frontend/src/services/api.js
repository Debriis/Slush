import { env } from '../config/env';
import { supabase } from './supabase';
import { requestJson } from './http';
export async function api(path, { method = 'GET', body, signal } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to continue.');
  try {
    return await requestJson(`${env.apiUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.status === 401) await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    throw error;
  }
}
