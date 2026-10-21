import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

import { COLORS, MAX_CONTENT_WIDTH, SPACING } from '@/theme/theme';

import { ExternalLink } from '@/components/ui/ExternalLink';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';

// Keep web screen markup deterministic without the animated native-screen adapter.
// TabSlot still owns focus, lazy loading, and the set of visited routes.
function renderWebTab(descriptor, { isFocused, loaded }) {
  const { lazy = true, unmountOnBlur } = descriptor.options;
  if ((unmountOnBlur && !isFocused) || (lazy && !loaded && !isFocused)) {
    return null;
  }

  return (
    <View
      key={descriptor.route.key}
      hidden={!isFocused}
      style={[styles.screen, isFocused ? styles.focusedScreen : styles.inactiveScreen]}
    >
      {descriptor.render()}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} detachInactiveScreens={false} renderFn={renderWebTab} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}
      >
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props) {
  const scheme = useColorScheme();
  const colors = COLORS[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Expo Starter
        </ThemedText>

        {props.children}

        <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={colors.text}
              name={{ ios: 'arrow.up.right.square', web: 'link' }}
              size={12}
            />
          </Pressable>
        </ExternalLink>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    height: '100%',
  },
  focusedScreen: {
    zIndex: 1,
    display: 'flex',
    flexShrink: 0,
    flexGrow: 1,
  },
  inactiveScreen: {
    zIndex: -1,
    display: 'none',
    flexShrink: 1,
    flexGrow: 0,
  },
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: SPACING.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: SPACING.two,
    paddingHorizontal: SPACING.five,
    borderRadius: SPACING.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: SPACING.two,
    maxWidth: MAX_CONTENT_WIDTH,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: SPACING.one,
    paddingHorizontal: SPACING.three,
    borderRadius: SPACING.three,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.one,
    marginLeft: SPACING.three,
  },
});
