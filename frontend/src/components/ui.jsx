import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '../theme/colors';
import { missingConfig } from '../config/env';

export function T({ children, muted, style, ...props }) {
  return (
    <Text {...props} style={[s.text, muted && s.muted, style]}>
      {children}
    </Text>
  );
}
export function Button({ title, onPress, disabled, secondary, small }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        small && s.small,
        (pressed || disabled) && { opacity: 0.5 },
      ]}
    >
      <T style={{ fontWeight: '700', color: secondary ? C.purple : '#FFF' }}>{title}</T>
    </Pressable>
  );
}
export function Field({ label, ...props }) {
  return (
    <View style={{ gap: 8 }}>
      <T muted>{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={C.muted}
        {...props}
        style={[
          s.field,
          props.multiline && { minHeight: 94, textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Row({ children, style }) {
  return <View style={[s.row, style]}>{children}</View>;
}
export function Heading({ title, subtitle, action }) {
  return (
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 8 }}>
        <T style={s.heading}>{title}</T>
        {!!subtitle && <T muted>{subtitle}</T>}
      </View>
      {action}
    </Row>
  );
}
export function Avatar({ profile, size = 44 }) {
  return profile?.avatarUrl ? (
    <Image
      source={{ uri: profile.avatarUrl }}
      accessibilityLabel={`${profile.username}'s avatar`}
      style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: C.elevated }}
    />
  ) : (
    <View style={[s.avatar, { width: size, height: size }]}>
      <T style={{ fontWeight: '800', fontSize: size / 2.5, color: C.purple }}>
        {profile?.username?.slice(0, 2).toUpperCase() || 'S'}
      </T>
    </View>
  );
}
export function Screen({ children, title, subtitle, refreshing, onRefresh }) {
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.purple} />
          ) : undefined
        }
        contentContainerStyle={[s.page, { paddingHorizontal: width < 500 ? 20 : 40 }]}
      >
        <View style={s.content}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T style={s.brand}>
              slush<T style={{ color: C.purple }}>.</T>
            </T>
            <T muted style={{ fontSize: 11, letterSpacing: 2 }}>
              SHOW UP. LEVEL UP.
            </T>
          </Row>
          {!!title && <Heading title={title} subtitle={subtitle} />}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Empty({
  title = 'Nothing here yet',
  message = 'Your genuine activity will appear here.',
  action,
  onPress,
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 38 }}>
      <T style={{ fontSize: 30, color: C.purple }}>◇</T>
      <T style={s.title}>{title}</T>
      <T muted style={{ textAlign: 'center', maxWidth: 360 }}>
        {message}
      </T>
      {!!action && <Button title={action} onPress={onPress} secondary />}
    </Card>
  );
}
export function Notice({ title, message, action, onPress, secondary, onSecondary, loading }) {
  return (
    <Screen>
      <Card>
        {loading && <ActivityIndicator color={C.purple} />}
        <T style={s.title}>{title}</T>
        {!!message && <T muted>{message}</T>}
        {!!action && <Button title={action} onPress={onPress} />}
        {!!secondary && <Button title={secondary} secondary onPress={onSecondary} />}
      </Card>
    </Screen>
  );
}
export function QueryState({ query, children }) {
  if (query.isPending)
    return (
      <Card>
        <ActivityIndicator color={C.purple} />
        <T muted>Loading your data…</T>
      </Card>
    );
  if (query.isError)
    return (
      <Empty
        title="Couldn't load this"
        message={query.error.message}
        action="Retry"
        onPress={() => query.refetch()}
      />
    );
  return children;
}
export function ErrorText({ error }) {
  return error ? (
    <T style={{ color: C.red }} accessibilityRole="alert">
      {error.message || error}
    </T>
  ) : null;
}
export function Chips({ options, value, onChange }) {
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: key === value }}
          onPress={() => onChange(key)}
          style={[s.chip, key === value && { backgroundColor: C.accent, borderColor: C.accent }]}
        >
          <T style={{ fontSize: 12 }}>{label}</T>
        </Pressable>
      ))}
    </Row>
  );
}
export function More({ query }) {
  return query.hasNextPage ? (
    <Button
      secondary
      title={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
      disabled={query.isFetchingNextPage}
      onPress={() => query.fetchNextPage()}
    />
  ) : null;
}
export const itemsOf = (query) => query.data?.pages.flatMap((page) => page.items) || [];
export function SetupScreen() {
  return (
    <Screen title="Your next streak starts here." subtitle="SLUSH · Your coding journey, together.">
      <Card>
        <T style={s.title}>Connect your workspace</T>
        <T muted>
          The app is installed. Configure your own Supabase project and API to create a real
          account. No sample users or statistics are generated.
        </T>
        <T style={{ color: C.purple }}>Required in frontend/.env:</T>
        {missingConfig.map((key) => (
          <T key={key} style={{ fontSize: 12 }}>
            {key}
          </T>
        ))}
        <T muted>
          See docs/setup.md, then restart Expo. On your phone, use your computer’s LAN IP for the
          API address.
        </T>
      </Card>
    </Screen>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { paddingTop: 20, paddingBottom: 40, alignItems: 'center', flexGrow: 1 },
  content: { width: '100%', maxWidth: 1060, gap: 24 },
  brand: { fontSize: 32, fontWeight: '900', letterSpacing: -2 },
  text: { fontSize: 14, lineHeight: 22, color: C.text },
  muted: { color: C.muted },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  card: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  secondary: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  small: { paddingVertical: 7, paddingHorizontal: 12, minHeight: 36 },
  field: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 15,
  },
  avatar: {
    backgroundColor: C.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    backgroundColor: C.card,
  },
});
