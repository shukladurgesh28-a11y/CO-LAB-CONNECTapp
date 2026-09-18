/**
 * Central typed API client for CO-LAB CONNECT mobile.
 * Backend (Flask) is the source of truth — the client never invents
 * money, statuses, or records. JWT lives in expo-secure-store only.
 */
import * as SecureStore from 'expo-secure-store';

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://192.168.0.109:5000/api';

const TOKEN_KEY = 'colabconnect.jwt';
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Secure storage unavailable (e.g. restricted device) — session only.
  }
}

interface Options {
  token?: string | null;
  timeoutMs?: number;
}

async function request<T>(method: string, path: string, body?: unknown, opts: Options = {}): Promise<T> {
  const token = opts.token ?? (await getToken());
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      throw new ApiError(res.status, 'Server returned an unreadable response.');
    }
    if (!res.ok || json?.success === false) {
      throw new ApiError(res.status, json?.message || 'Request failed. Please try again.');
    }
    return (json?.data ?? json) as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out. Please check your internet connection.');
    }
    throw new ApiError(0, 'Unable to reach the CO-LAB CONNECT service.');
  } finally {
    clearTimeout(timer);
  }
}

export const apiGet = <T,>(path: string, opts?: Options) => request<T>('GET', path, undefined, opts);
export const apiPost = <T,>(path: string, body?: unknown, opts?: Options) =>
  request<T>('POST', path, body, opts);
export const apiPatch = <T,>(path: string, body?: unknown, opts?: Options) =>
  request<T>('PATCH', path, body, opts);
export const apiPut = <T,>(path: string, body?: unknown, opts?: Options) =>
  request<T>('PUT', path, body, opts);
export const apiDelete = <T,>(path: string, opts?: Options) => request<T>('DELETE', path, undefined, opts);
