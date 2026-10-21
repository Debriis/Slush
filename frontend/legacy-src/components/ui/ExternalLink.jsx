import { Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Alert } from 'react-native';
import { runSafely } from '@/utils/runSafely';

export function ExternalLink({ href, onPress, ...rest }) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        onPress?.(event);
        if (event.defaultPrevented) return;
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await runSafely(
            () =>
              openBrowserAsync(href, {
                presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
              }),
            () => Alert.alert('Unable to open link', 'Please try opening this link again.'),
          );
        }
      }}
    />
  );
}
