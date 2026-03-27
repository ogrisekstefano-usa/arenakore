const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore di rete' }));
    throw new Error(error.detail || `Errore ${response.status}`);
  }
  return response.json();
}

export const api = {
  register: (data: { username: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) => request('/auth/me', {}, token),

  checkUsername: (username: string) =>
    request(`/auth/check-username?username=${encodeURIComponent(username)}`),

  completeOnboarding: (data: { role: string; sport: string }, token: string) =>
    request('/auth/onboarding', { method: 'PUT', body: JSON.stringify(data) }, token),

  getBattles: (token: string) => request('/battles', {}, token),

  getDisciplines: (token: string) => request('/disciplines', {}, token),

  getCrews: (token: string) => request('/crews', {}, token),

  savePushToken: (pushToken: string, token: string) =>
    request('/users/push-token', { method: 'POST', body: JSON.stringify({ push_token: pushToken }) }, token),

  participateBattle: (battleId: string, token: string) =>
    request(`/battles/${battleId}/participate`, { method: 'POST' }, token),

  completeBattle: (battleId: string, token: string) =>
    request(`/battles/${battleId}/complete`, { method: 'POST' }, token),

  triggerLiveBattle: (battleId: string, token: string) =>
    request(`/battles/${battleId}/trigger-live`, { method: 'POST' }, token),

  completeChallenge: (data: { performance_score?: number; duration_seconds?: number }, token: string) =>
    request('/challenges/complete', { method: 'POST', body: JSON.stringify(data) }, token),

  getChallengeHistory: (token: string) => request('/challenges/history', {}, token),
};
