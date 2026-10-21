import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { runSafely } from '@/utils/runSafely';

import { AnimatedSplashOverlay } from '@/components/ui/AnimatedIcon';
import AppTabs from '@/components/layout/AppTabs';

void runSafely(() => SplashScreen.preventAutoHideAsync());

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
