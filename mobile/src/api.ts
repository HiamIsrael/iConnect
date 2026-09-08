import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './config';

const TOKEN_KEY = 'iconnect_token';

export const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as any;
    return data?.error || data?.message || 'Something went wrong.';
  }
  return 'Something went wrong.';
}

export async function apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  const res = await client.get<T>(path, { params });
  return res.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.post<T>(path, body);
  return res.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.put<T>(path, body);
  return res.data;
}

export async function apiDel<T>(path: string): Promise<T> {
  const res = await client.delete<T>(path);
  return res.data;
}

export function imageUrl(path?: string | null) {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}
