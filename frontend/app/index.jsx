import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/AuthProvider';
export default function Index() {
  const { session, recovering } = useAuth();
  return <Redirect href={session ? (recovering ? '/reset-password' : '/home') : '/login'} />;
}
