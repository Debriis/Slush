import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import { getAuthRedirectUrl } from './redirect';
import { useAuth } from './AuthProvider';
import { Screen, Card, T, Field, Button, ErrorText, s } from '../../components/ui';
import { C } from '../../theme/colors';
import { startGoogleSignIn } from './googleAuth';
import { describeAuthError } from './authErrors';

export default function AuthScreen({ mode }) {
  const { session, recovering, finishRecovery } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [username, setUsername] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [cooldown, setCooldown] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function navigate(path) {
    // Release focus before the navigator hides the outgoing web screen.
    if (Platform.OS === 'web') document.activeElement?.blur?.();
    router.replace(path);
  }
  const reset = mode === 'reset',
    register = mode === 'register',
    update = reset && session && recovering;
  async function googleSignIn() {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await startGoogleSignIn({
        client: supabase,
        platform: Platform.OS,
        expoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
        redirectTo: getAuthRedirectUrl(),
        openBrowser: WebBrowser.openAuthSessionAsync,
      });
    } catch (problem) {
      setError(
        Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
          ? problem.message
          : 'Could not sign in with Google. Check your connection or try email sign-in. Google must be enabled in Supabase.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (submitting.current || cooldown) return;
    setError('');
    setMessage('');
    if (
      (!update && !/^\S+@\S+\.\S+$/.test(email.trim())) ||
      (!reset && password.length < 8) ||
      (update && password.length < 8) ||
      (register && !/^[a-zA-Z0-9_]{3,30}$/.test(username))
    ) {
      setError(
        'Enter a valid email, a password of at least 8 characters, and a username of 3–30 letters, numbers or underscores where required.',
      );
      return;
    }
    setBusy(true);
    submitting.current = true;
    try {
      let result;
      if (update) result = await supabase.auth.updateUser({ password });
      else if (reset)
        result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getAuthRedirectUrl(),
        });
      else if (register)
        result = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: username.toLowerCase() },
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });
      else result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (update) {
        finishRecovery();
        navigate('/home');
      } else if (reset)
        setMessage('If an account exists, a password reset link has been sent. Check your inbox.');
      else if (register && !result.data.session)
        setMessage('Check your inbox to confirm your email, then sign in.');
      else navigate('/home');
    } catch (problem) {
      const failure = describeAuthError(problem, mode);
      setError(failure.message);
      // A local retry delay, not a claim that the server quota resets in 60 seconds.
      if (failure.cooldown) setCooldown(60);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Card
        style={{ maxWidth: 540, width: '100%', alignSelf: 'center', padding: 30, marginTop: 24 }}
      >
        <T style={{ color: C.purple, letterSpacing: 3, fontSize: 11 }}>
          YOUR CODING JOURNEY. TOGETHER.
        </T>
        <T style={[s.heading, { fontSize: 36, lineHeight: 43 }]}>
          {reset
            ? update
              ? 'A fresh start.'
              : 'Back to your streak.'
            : register
              ? 'Build your momentum.'
              : 'Welcome back, coder.'}
        </T>
        <T muted>
          {reset
            ? 'Securely reset your password with your email.'
            : 'Track genuine progress. Find your people. Make showing up a habit.'}
        </T>
        {register && (
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
          />
        )}
        {!update && (
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
        {(!reset || update) && (
          <Field
            label={update ? 'New password' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={register || update ? 'new-password' : 'current-password'}
          />
        )}
        <ErrorText error={error} />
        {!!message && (
          <T style={{ color: C.green }} accessibilityRole="alert">
            {message}
          </T>
        )}
        <Button
          title={
            busy
              ? 'Please wait…'
              : cooldown
                ? `Retry available in ${cooldown}s`
                : reset
                  ? update
                    ? 'Save new password'
                    : 'Send reset link'
                  : register
                    ? 'Create my account'
                    : 'Sign in'
          }
          disabled={busy || cooldown > 0}
          onPress={submit}
        />
        {!reset && (
          <Button secondary title="Continue with Google" disabled={busy} onPress={googleSignIn} />
        )}
        {!reset && (
          <Button
            secondary
            title={register ? 'Already a member? Sign in' : 'New to SLUSH? Create an account'}
            onPress={() => navigate(register ? '/login' : '/register')}
          />
        )}
        <Button
          secondary
          title={reset ? 'Back to sign in' : 'Forgot password?'}
          onPress={() => navigate(reset ? '/login' : '/reset-password')}
        />
        <T muted style={{ fontSize: 11, textAlign: 'center' }}>
          Your progress starts at zero. Your work makes it count.
        </T>
      </Card>
    </Screen>
  );
}
