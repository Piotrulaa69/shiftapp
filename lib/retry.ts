type SupabaseErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
} | null | undefined;

type SupabaseResultLike = { error?: unknown };

const TRANSIENT_CODES = new Set([
  'PGRST000', 'PGRST001', 'PGRST002',
  '502', '503', '504',
]);

export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const candidate = error as SupabaseErrorLike;
  const code = String(candidate?.code ?? candidate?.status ?? '');
  const message = `${candidate?.name ?? ''} ${candidate?.message ?? String(error)}`.toLowerCase();
  return TRANSIENT_CODES.has(code)
    || message.includes('failed to fetch')
    || message.includes('fetch failed')
    || message.includes('network request failed')
    || message.includes('networkerror')
    || message.includes('load failed')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('connection')
    || message.includes('temporarily unavailable')
    || message.includes('bad gateway')
    || message.includes('gateway timeout')
    || message.includes('service unavailable');
}

export function isSessionError(error: unknown): boolean {
  if (!error) return false;
  const candidate = error as SupabaseErrorLike;
  const code = String(candidate?.code ?? '');
  const status = Number(candidate?.status ?? 0);
  const message = candidate?.message?.toLowerCase() ?? '';
  return code === 'PGRST301'
    || status === 401
    || message.includes('jwt expired')
    || message.includes('invalid jwt')
    || message.includes('not authenticated');
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(request: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    Promise.resolve(request).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Retry only transport/server failures. Validation, RLS and constraint errors return immediately. */
export async function retrySupabase<T extends SupabaseResultLike>(
  operation: () => PromiseLike<T>,
  attempts = 3,
  timeoutMs = 10_000,
): Promise<T> {
  let lastResult: T | undefined;
  let lastThrown: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await withTimeout(operation(), timeoutMs);
      lastResult = result;
      if (!result.error || !isTransientError(result.error) || attempt === attempts - 1) return result;
    } catch (error) {
      lastThrown = error;
      if (!isTransientError(error) || attempt === attempts - 1) throw error;
    }
    await wait(250 * (2 ** attempt) + Math.floor(Math.random() * 100));
  }
  if (lastResult) return lastResult;
  throw lastThrown ?? new Error('Request failed');
}

export function createClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
