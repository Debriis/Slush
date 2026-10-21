import { Stack, DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { C } from '../src/theme/colors';
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (count, error) => error.status !== 401 && error.status !== 403 && count < 2,
    },
    mutations: { retry: false },
  },
});
function Routes() {
  const { session, recovering } = useAuth();
  return (
    <ThemeProvider
      value={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: C.bg,
          card: C.card,
          primary: C.purple,
          text: C.text,
          border: C.border,
        },
      }}
    >
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!session || recovering}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!session && !recovering}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="clans/[id]" options={{ title: 'Clan workspace' }} />
          <Stack.Screen name="users/[id]" options={{ title: 'Coder profile' }} />
          <Stack.Screen name="leetcode" options={{ title: 'LeetCode activity' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <StatusBar style="light" />
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
