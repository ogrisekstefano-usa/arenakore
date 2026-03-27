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

  completeOnboarding: (data: { role?: string; sport: string; category?: string; is_versatile?: boolean }, token: string) =>
    request('/auth/onboarding', { method: 'PUT', body: JSON.stringify(data) }, token),

  getSportCategories: () => request('/sports/categories'),

  getSportsByCategory: (categoryId: string) => request(`/sports/${categoryId}`),

  searchSports: (query: string) => request(`/sports/search/${encodeURIComponent(query)}`),

  getBattles: (token: string) => request('/battles', {}, token),

  getDisciplines: (token: string) => request('/disciplines', {}, token),

  getCrews: (token: string) => request('/crews', {}, token),

  // Crew Management v2
  createCrew: (data: { name: string; tagline?: string; category?: string }, token: string) =>
    request('/crews/create', { method: 'POST', body: JSON.stringify(data) }, token),

  getMyCrews: (token: string) => request('/crews/my-crews', {}, token),

  getCrewDetail: (crewId: string, token: string) => request(`/crews/${crewId}`, {}, token),

  getCrewFeed: (crewId: string, token: string) => request(`/crews/${crewId}/feed`, {}, token),

  inviteToCrew: (crewId: string, username: string, token: string) =>
    request(`/crews/${crewId}/invite`, { method: 'POST', body: JSON.stringify({ username }) }, token),

  getPendingInvites: (token: string) => request('/crews/invites', {}, token),

  acceptInvite: (inviteId: string, token: string) =>
    request(`/crews/invites/${inviteId}/accept`, { method: 'POST' }, token),

  declineInvite: (inviteId: string, token: string) =>
    request(`/crews/invites/${inviteId}/decline`, { method: 'POST' }, token),

  searchUsers: (query: string, token: string) => request(`/users/search/${encodeURIComponent(query)}`, {}, token),

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

  // Leaderboard / Glory Wall
  getLeaderboard: (type: string, token: string, category?: string, timeRange?: string) => {
    let path = `/leaderboard?type=${type}`;
    if (category) path += `&category=${encodeURIComponent(category)}`;
    if (timeRange) path += `&time_range=${timeRange}`;
    return request(path, {}, token);
  },

  getMyRank: (token: string, category?: string) => {
    let path = '/leaderboard/my-rank';
    if (category) path += `?category=${encodeURIComponent(category)}`;
    return request(path, {}, token);
  },

  // Nexus Sync Sessions
  startNexusSession: (data: { exercise_type: string; target_reps?: number }, token: string) =>
    request('/nexus/session/start', { method: 'POST', body: JSON.stringify(data) }, token),

  completeNexusSession: (sessionId: string, data: any, token: string) =>
    request(`/nexus/session/${sessionId}/complete`, { method: 'POST', body: JSON.stringify(data) }, token),

  getNexusSessions: (token: string) => request('/nexus/sessions', {}, token),
};
