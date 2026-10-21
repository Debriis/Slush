import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { env } from '../../config/env';
export function getAuthRedirectUrl() {
  return (
    (Platform.OS === 'web' ? env.redirectUrl : env.nativeRedirectUrl) ||
    Linking.createURL('reset-password')
  );
}
