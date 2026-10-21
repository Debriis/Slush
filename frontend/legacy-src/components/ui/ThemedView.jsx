import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export function ThemedView({ style, type, ...otherProps }) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}
