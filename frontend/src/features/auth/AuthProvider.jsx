import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { api } from '../../services/api';
import { missingConfig } from '../../config/env';
import { Notice, SetupScreen } from '../../components/ui';
import { getAuthRedirectUrl } from './redirect';
import { parseAuthCallback } from './authLinks';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [recovering, setRecovering] = useState(false);
  const cache = useQueryClient();
  const lastUserId = useRef(null);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data, error: authError }) => {
        if (alive) {
          setSession(data.session);
          setError(authError ? 'Could not restore your session.' : '');
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setError('Could not read saved session.');
          setLoading(false);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (alive) {
        if (lastUserId.current && lastUserId.current !== next?.user.id) cache.clear();
        lastUserId.current = next?.user.id || null;
        setSession(next);
        setLoading(false);
        if (event === 'PASSWORD_RECOVERY') setRecovering(true);
        if (event === 'SIGNED_OUT') {
          cache.clear();
          setRecovering(false);
        }
      }
    });
    const state = AppState.addEventListener('change', (value) => {
      if (Platform.OS !== 'web') {
        if (value === 'active') supabase.auth.startAutoRefresh();
        else supabase.auth.stopAutoRefresh();
      }
    });
    // Expo Go email links carry tokens in the fragment; never log or forward them.
    async function handleUrl(url) {
      if (!url || Platform.OS === 'web') return;
      try {
        const parsed = parseAuthCallback(url, getAuthRedirectUrl());
        if (!parsed) return;
        const result = parsed.code
          ? await supabase.auth.exchangeCodeForSession(parsed.code)
          : await supabase.auth.setSession({
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
            });
        if (result.error) throw result.error;
        if (parsed.recovering && alive) setRecovering(true);
      } catch {
        if (alive) setError('This sign-in link is invalid or expired.');
      }
    }
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {
        if (alive) setError('Could not open the sign-in link.');
      });
    const links = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
      state.remove();
      links.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [cache]);
  const provision = useQuery({
    queryKey: ['bootstrap', session?.user.id],
    queryFn: ({ signal }) =>
      api('/me', {
        method: 'POST',
        signal,
        body: { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
      }),
    enabled: !!session && !recovering,
    staleTime: Infinity,
    retry: false,
    networkMode: 'always',
  });
  if (missingConfig.length) return <SetupScreen />;
  if (error)
    return (
      <Notice
        title="Session unavailable"
        message={error}
        action="Try again"
        onPress={() => {
          setError('');
          setLoading(true);
          supabase.auth
            .getSession()
            .then(({ data, error: problem }) => {
              setSession(data.session);
              if (problem) setError('Could not restore your session.');
            })
            .catch(() => setError('Could not restore your session.'))
            .finally(() => setLoading(false));
        }}
      />
    );
  if (loading || (session && !recovering && provision.isPending))
    return <Notice title="Opening your workspace…" loading />;
  if (session && !recovering && provision.isError)
    return (
      <Notice
        title="Could not open your profile"
        message={provision.error.message}
        action="Retry"
        onPress={() => provision.refetch()}
        secondary="Sign out"
        onSecondary={() => {
          void supabase.auth
            .signOut()
            .then(({ error: problem }) => {
              if (problem) setError('Could not sign out.');
            })
            .catch(() => setError('Could not sign out.'));
        }}
      />
    );
  return (
    <AuthContext.Provider
      value={{
        session,
        profile: provision.data,
        recovering,
        finishRecovery: () => setRecovering(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
