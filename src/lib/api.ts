import { Kit, KitRecord, User, MockEvaluationResult } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (netErr: any) {
    // If Render was waking up from sleep or dropped the TCP socket, retry once
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return apiRequest<T>(endpoint, options, retries - 1);
    }
    throw new Error('Server connection was interrupted. The server may be waking up from sleep—please try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !endpoint.startsWith('/api/auth/login') && !endpoint.startsWith('/api/auth/register')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login?expired=1';
      }
      throw new Error('Your session has expired or is invalid. Please sign in again.');
    }
    throw new Error(data.message || data.error || 'An unexpected API error occurred.');
  }

  return data as T;
}

// -------------------------------------------------------------
// Auth API
// -------------------------------------------------------------
export async function apiRegister(body: { email: string; password: string; name: string }) {
  return apiRequest<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiLogin(body: { email: string; password: string }) {
  return apiRequest<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiGetMe() {
  return apiRequest<{ user: User }>('/api/auth/me');
}

// -------------------------------------------------------------
// Kits API
// -------------------------------------------------------------
export async function apiListKits(): Promise<KitRecord[]> {
  return apiRequest<KitRecord[]>('/api/kits');
}

export async function apiGetKit(id: string): Promise<KitRecord> {
  return apiRequest<KitRecord>(`/api/kits/${id}`);
}

export async function apiGenerateKit(body: { jd: string; company_url: string; days: number }) {
  return apiRequest<KitRecord>('/api/kits/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiUpdateKit(id: string, kit: Kit): Promise<KitRecord> {
  return apiRequest<KitRecord>(`/api/kits/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ kit }),
  });
}

export async function apiDeleteKit(id: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/kits/${id}`, {
    method: 'DELETE',
  });
}

// -------------------------------------------------------------
// Section Regeneration API (The Builder - Section 6)
// -------------------------------------------------------------
export async function apiRegenerateCategory(id: string, category: string): Promise<KitRecord> {
  return apiRequest<KitRecord>(`/api/kits/${id}/regenerate-category`, {
    method: 'POST',
    body: JSON.stringify({ category }),
  });
}

export async function apiRegenerateBrief(id: string): Promise<KitRecord> {
  return apiRequest<KitRecord>(`/api/kits/${id}/regenerate-brief`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function apiRegenerateSchedule(id: string, days: number): Promise<KitRecord> {
  return apiRequest<KitRecord>(`/api/kits/${id}/regenerate-schedule`, {
    method: 'POST',
    body: JSON.stringify({ days }),
  });
}

// -------------------------------------------------------------
// Practice Mode & Mock Interview API (Section 7 & 14)
// -------------------------------------------------------------
export async function apiUpdateCardConfidence(
  kitId: string,
  cardId: string,
  confidence: number
): Promise<{ success: boolean; cardId: string; confidence: number }> {
  return apiRequest<{ success: boolean; cardId: string; confidence: number }>(
    `/api/kits/${kitId}/practice/confidence`,
    {
      method: 'POST',
      body: JSON.stringify({ cardId, confidence }),
    }
  );
}

export async function apiMockEvaluate(
  kitId: string,
  questionId: string,
  userAnswer: string
): Promise<{ questionId: string; feedback: MockEvaluationResult }> {
  return apiRequest<{ questionId: string; feedback: MockEvaluationResult }>(
    `/api/kits/${kitId}/practice/mock-evaluate`,
    {
      method: 'POST',
      body: JSON.stringify({ questionId, userAnswer }),
    }
  );
}
