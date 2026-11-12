type StoredForm<T> = { value: T } | null;

/** A server timestamp cannot prove that a different local form is disposable. */
export function selectTrainingFormDraft<T extends { title: string }>(
  current: T, primary: StoredForm<T>, recovery: StoredForm<T>,
): { value: T; fromRecovery: boolean } | null {
  for (const [saved, fromRecovery] of [[primary, false], [recovery, true]] as const) {
    if (!saved || typeof saved.value?.title !== 'string') continue;
    const value = { ...current, ...saved.value };
    if (JSON.stringify(value) !== JSON.stringify(current)) return { value, fromRecovery };
  }
  return null;
}
