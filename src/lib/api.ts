import { localRequest } from './localBackend.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiData = Record<string, any>;

export interface ApiResponse<T = ApiData> {
  ok: boolean;
  status: number;
  data: T;
  demo: boolean;
}

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

const REQUEST_TIMEOUT_MS = 6000;
let demoMode = false;

export function isDemoMode() {
  return demoMode;
}

function runLocally<T>(path: string, method: string, options: RequestOptions): ApiResponse<T> {
  demoMode = true;
  const result = localRequest(method, path, options.body, options.headers);
  return { ...result, data: result.data as T, demo: true };
}

export async function apiRequest<T = ApiData>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  if (demoMode) return runLocally<T>(path, method, options);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(path, {
      method,
      signal: controller.signal,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    // A static host (no Express backend) answers with HTML or a gateway error.
    if (!isJson || res.status >= 500) return runLocally<T>(path, method, options);
    const data = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data, demo: false };
  } catch {
    return runLocally<T>(path, method, options);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
