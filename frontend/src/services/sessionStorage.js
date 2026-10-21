import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Serialize operations; write a fresh chunk set before atomically replacing its index.
let pending = Promise.resolve();
function serialized(operation) {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}
const safeKey = (key) => key.replace(/[^a-zA-Z0-9._-]/g, '_');
async function readKeys(key) {
  const value = await SecureStore.getItemAsync(safeKey(key));
  return value ? JSON.parse(value) : [];
}
export const sessionStorage = {
  getItem(key) {
    return serialized(async () => {
      if (Platform.OS === 'web')
        return typeof window === 'undefined' ? null : AsyncStorage.getItem(key);
      const keys = await readKeys(key);
      if (!keys.length) return null;
      const chunks = await Promise.all(keys.map((k) => SecureStore.getItemAsync(k)));
      return chunks.some((part) => part === null) ? null : chunks.join('');
    });
  },
  setItem(key, value) {
    return serialized(async () => {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') await AsyncStorage.setItem(key, value);
        return;
      }
      const oldKeys = await readKeys(key),
        keys = [];
      const generation = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      for (let i = 0; i < value.length; i += 400) {
        const partKey = `${safeKey(key)}_${generation}_${i}`;
        await SecureStore.setItemAsync(partKey, value.slice(i, i + 400));
        keys.push(partKey);
      }
      await SecureStore.setItemAsync(safeKey(key), JSON.stringify(keys));
      await Promise.all(oldKeys.map((k) => SecureStore.deleteItemAsync(k)));
    });
  },
  removeItem(key) {
    return serialized(async () => {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') await AsyncStorage.removeItem(key);
        return;
      }
      const keys = await readKeys(key);
      await SecureStore.deleteItemAsync(safeKey(key));
      await Promise.all(keys.map((k) => SecureStore.deleteItemAsync(k)));
    });
  },
};
