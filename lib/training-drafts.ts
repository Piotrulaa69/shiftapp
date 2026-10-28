import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

type Draft<T> = { savedAt: number; value: T };
const pending = new Map<string, Promise<void>>();

export function trainingDraftKey(userId: string, restaurantId: string, kind: string, id: string): string {
  return `shiftapp:training-draft:v1:${userId}:${restaurantId}:${kind}:${id}`;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  return AsyncStorage.getItem(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); return; }
  await AsyncStorage.setItem(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); return; }
  await AsyncStorage.removeItem(key);
}

function queue(key: string, action: () => Promise<void>): Promise<void> {
  const next = (pending.get(key) ?? Promise.resolve()).catch(() => {}).then(action);
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
  return next;
}

export async function readTrainingDraft<T>(key: string): Promise<Draft<T> | null> {
  try {
    await pending.get(key)?.catch(() => {});
    const raw = await getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft<T>;
    return Number.isFinite(parsed.savedAt) && parsed.value != null ? parsed : null;
  } catch (error) {
    console.warn('readTrainingDraft', error);
    return null;
  }
}

export function writeTrainingDraft<T>(key: string, value: T): Promise<void> {
  return queue(key, () => setItem(key, JSON.stringify({ savedAt: Date.now(), value })));
}

export function clearTrainingDraft(key: string): Promise<void> {
  return queue(key, () => removeItem(key));
}
