import { parseAuthCallback } from './authLinks.js';

/** Supabase owns OAuth state/provider validation; never accept client-supplied identities. */
export async function startGoogleSignIn({ client, platform, expoGo, redirectTo, openBrowser }) {
  if (platform !== 'web' && expoGo)
    throw new Error('Google sign-in is available in the web app. In Expo Go, use email sign-in.');
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: platform !== 'web',
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data?.url) throw new Error('Could not start Google sign-in. Please try again.');
  if (platform === 'web') return;
  const result = await openBrowser(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return;
  if (result.type !== 'success')
    throw new Error('Google sign-in did not complete. Please try again.');
  const callback = parseAuthCallback(result.url, redirectTo);
  if (!callback) throw new Error('Google sign-in returned an invalid callback.');
  const session = callback.code
    ? await client.auth.exchangeCodeForSession(callback.code)
    : await client.auth.setSession({
        access_token: callback.access_token,
        refresh_token: callback.refresh_token,
      });
  if (session.error) throw new Error('Could not finish Google sign-in. Please try again.');
}
