import createClient, { type Middleware } from 'openapi-fetch';
import type { components, paths } from './schema';
import { storage } from '../lib/storage';

export type Schemas = components['schemas'];

const TOKEN_KEY = 'ielts.token';

export const tokenStore = {
  get: (): string | null => storage.get(TOKEN_KEY),
  set: (token: string) => storage.set(TOKEN_KEY, token),
  clear: () => storage.remove(TOKEN_KEY),
};

/** Error thrown for non-2xx responses; `code` mirrors the backend's ApiError.code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const unauthorizedListeners = new Set<() => void>();
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = tokenStore.get();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  onResponse({ response, request }) {
    if (response.status === 401 && !request.url.endsWith('/api/auth/login')) {
      tokenStore.clear();
      unauthorizedListeners.forEach((l) => l());
    }
    return response;
  },
};

export const api = createClient<paths>({ baseUrl: '' });
api.use(authMiddleware);

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Unwraps an openapi-fetch result, throwing ApiError on failure. */
export async function unwrap<T>(promise: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await promise;
  if (!response.ok) {
    const body = (error ?? {}) as { code?: string; message?: string };
    throw new ApiError(
      response.status,
      body.code ?? 'HTTP_' + response.status,
      body.message ?? response.statusText,
    );
  }
  return data as T;
}

/** Authenticated fetch for endpoints outside the typed client (file downloads, multipart uploads). */
export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401) {
    tokenStore.clear();
    unauthorizedListeners.forEach((l) => l());
  }
  if (!response.ok) {
    let body: { code?: string; message?: string } = {};
    try {
      body = await response.json();
    } catch {
      /* not JSON */
    }
    throw new ApiError(
      response.status,
      body.code ?? 'HTTP_' + response.status,
      body.message ?? response.statusText,
    );
  }
  return response;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong';
}
