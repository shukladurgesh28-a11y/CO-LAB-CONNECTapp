import { apiPost, apiGet, setToken } from '@/lib/api';
import type { User } from '@/types';

interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await apiPost<LoginResponse>('/auth/login', { email, password }, { token: null });
  await setToken(data.token);
  return data;
}

export async function register(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'worker';
}): Promise<{ user: User; otp?: string }> {
  // No JWT is issued before OTP verification (backend rule).
  return apiPost('/auth/register', input, { token: null });
}

export async function verifyOtp(phone: string, otp: string): Promise<LoginResponse> {
  const data = await apiPost<LoginResponse>('/auth/otp/verify', { phone, otp }, { token: null });
  if (data.token) await setToken(data.token);
  return data;
}

export async function resendOtp(phone: string): Promise<void> {
  await apiPost('/auth/resend-otp', { phone }, { token: null });
}

export async function logout(): Promise<void> {
  await setToken(null);
}

export async function me(): Promise<User> {
  return apiGet<User>('/auth/me');
}
