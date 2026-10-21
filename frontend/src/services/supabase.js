import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { env, missingConfig } from '../config/env';
import { sessionStorage } from './sessionStorage';
export const supabase = missingConfig.length
  ? null
  : createClient(env.supabaseUrl, env.supabaseKey, {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
