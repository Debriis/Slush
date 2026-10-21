import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { validateFrontendConfig } from './validation';
import { resolveApiAddress } from './apiAddress';
const values = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  apiUrl: resolveApiAddress(process.env.EXPO_PUBLIC_API_URL, {
    web: Platform.OS === 'web',
    hostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
    override: process.env.EXPO_PUBLIC_WEB_API_URL,
  }),
  redirectUrl: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL,
  nativeRedirectUrl: process.env.EXPO_PUBLIC_NATIVE_AUTH_REDIRECT_URL,
};
export const missingConfig = validateFrontendConfig(values, { native: Platform.OS !== 'web' });
export const env = Object.freeze(values);
