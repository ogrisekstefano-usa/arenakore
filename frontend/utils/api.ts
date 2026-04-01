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
  register: (data: {
    username: string; email: string; password: string;
    height_cm?: number; weight_kg?: number; age?: number; training_level?: string;
  }) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

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

  // Leaderboard / Hall of KORE
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

  // ========== BIO-EVOLUTION ENGINE — SPRINT 7 ==========
  getRescanEligibility: (token: string) => request('/nexus/rescan-eligibility', {}, token),
  completeBioscan: (token: string) => request('/nexus/bioscan', { method: 'POST' }, token),

  // ========== NOTIFICATION ENGINE — SPRINT 9 ==========
  getNotifications: (token: string) => request('/notifications', {}, token),
  markNotificationRead: (token: string, id: string) => request(`/notifications/${id}/read`, { method: 'POST' }, token),
  createTestNotification: (token: string) => request('/notifications/test-trigger', { method: 'POST' }, token),
  getDnaHistory: (token: string) => request('/dna/history', {}, token),

  // ========== COACH STUDIO — TEMPLATE ENGINE ==========
  createTemplate: (data: { name: string; exercise: string; target_time: number; target_reps: number; xp_reward: number; difficulty: string; description?: string }, token: string) =>
    request('/templates', { method: 'POST', body: JSON.stringify(data) }, token),

  getTemplates: (token: string) => request('/templates', {}, token),

  deleteTemplate: (templateId: string, token: string) =>
    request(`/templates/${templateId}`, { method: 'DELETE' }, token),

  pushTemplateToCrew: (templateId: string, crewId: string, token: string) =>
    request(`/templates/${templateId}/push`, { method: 'POST', body: JSON.stringify({ crew_id: crewId }) }, token),

  getCrewChallenges: (crewId: string, token: string) =>
    request(`/templates/pushed/${crewId}`, {}, token),

  // ========== GYM HUB — ENTERPRISE ENGINE ==========
  getMyGym: (token: string) => request('/gym/me', {}, token),

  updateMyGym: (data: { name?: string; address?: string; description?: string }, token: string) =>
    request('/gym/me', { method: 'PUT', body: JSON.stringify(data) }, token),

  getGymCoaches: (token: string) => request('/gym/coaches', {}, token),

  addGymCoach: (username: string, token: string) =>
    request('/gym/coaches', { method: 'POST', body: JSON.stringify({ username }) }, token),

  removeGymCoach: (coachId: string, token: string) =>
    request(`/gym/coaches/${coachId}`, { method: 'DELETE' }, token),

  createGymEvent: (data: {
    title: string; description?: string; exercise: string; difficulty: string;
    event_date: string; event_time: string; max_participants: number; xp_reward: number;
  }, token: string) =>
    request('/gym/events', { method: 'POST', body: JSON.stringify(data) }, token),

  getGymEvents: (token: string) => request('/gym/events', {}, token),

  getGymEventDetail: (eventId: string, token: string) =>
    request(`/gym/events/${eventId}`, {}, token),

  getEventQR: (eventId: string, token: string) =>
    request(`/gym/events/${eventId}/qr`, {}, token),

  joinGymEvent: (eventId: string, token: string) =>
    request(`/gym/events/${eventId}/join`, { method: 'POST' }, token),

  enrollViaEventCode: (eventCode: string, token: string) =>
    request(`/gym/join/${eventCode}/enroll`, { method: 'POST' }, token),

  getEventPreview: (eventCode: string) =>
    request(`/gym/join/${eventCode}`),

  updateEventStatus: (eventId: string, status: string, token: string) =>
    request(`/gym/events/${eventId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }, token),

  // ========== KORE SOCIAL PASSPORT ==========
  getCityRank: (city: string, token: string) =>
    request(`/kore/city-rank?city=${encodeURIComponent(city)}`, {}, token),

  getAffiliations: (token: string) => request('/kore/affiliations', {}, token),

  updateAffiliations: (data: { school?: string; university?: string }, token: string) =>
    request('/kore/affiliations', { method: 'PUT', body: JSON.stringify(data) }, token),

  getActionCenter: (token: string) => request('/kore/action-center', {}, token),

  // ========== AK DROPS ENGINE ==========
  getAKBalance: (token: string) => request('/ak/balance', {}, token),
  getAKTools: (token: string) => request('/ak/tools', {}, token),
  unlockTool: (toolId: string, token: string) =>
    request('/ak/unlock-tool', { method: 'POST', body: JSON.stringify({ tool_id: toolId }) }, token),
  earnAK: (reason: string, token: string) =>
    request('/ak/earn', { method: 'POST', body: JSON.stringify({ reason }) }, token),
  getAIPrompt: (token: string) => request('/ak/ai-prompt', {}, token),
  // TalosFit Certified Templates
  getCertifiedTemplates: (token: string) => request('/certified-templates', {}, token),
  unlockCertifiedTemplate: (templateId: string, token: string) =>
    request(`/certified-templates/${templateId}/unlock`, { method: 'POST' }, token),
  // Talent Scout
  getTalentDiscovery: (token: string, filters?: { city?: string; sport?: string; minDna?: number; sortBy?: string }) => {
    const p = new URLSearchParams();
    if (filters?.city) p.append('city', filters.city);
    if (filters?.sport) p.append('sport', filters.sport);
    if (filters?.minDna) p.append('min_dna', String(filters.minDna));
    if (filters?.sortBy) p.append('sort_by', filters.sortBy);
    return request(`/talent/discovery?${p.toString()}`, {}, token);
  },
  draftAthlete: (athleteId: string, token: string, message?: string) =>
    request(`/talent/draft/${athleteId}`, { method: 'POST', body: JSON.stringify({ message }) }, token),
  getMyDrafts: (token: string) => request('/talent/my-drafts', {}, token),

  // ========== GYM_OWNER ENGINE ==========
  getGymMe: (token: string) => request('/gym/me', {}, token),
  getGymDashboard: (token: string) => request('/gym/dashboard', {}, token),
  getGymStaff: (token: string) => request('/gym/staff', {}, token),
  createGym: (data: { name: string; gym_code?: string; brand_color?: string; city?: string }, token: string) =>
    request('/gym/create', { method: 'POST', body: JSON.stringify(data) }, token),
  updateGym: (data: any, token: string) =>
    request('/gym/update', { method: 'PUT', body: JSON.stringify(data) }, token),
  addGymStaff: (email: string, role: string, token: string) =>
    request('/gym/staff/add', { method: 'POST', body: JSON.stringify({ email, role }) }, token),
  removeGymStaff: (userId: string, token: string) =>
    request(`/gym/staff/${userId}`, { method: 'DELETE' }, token),
  joinGym: (gymCode: string, role: string, token: string) =>
    request('/gym/join', { method: 'POST', body: JSON.stringify({ gym_code: gymCode, role }) }, token),
  updateUserRole: (userId: string, role: string, token: string) =>
    request(`/gym/user-role/${userId}`, { method: 'PUT', body: JSON.stringify({ role }) }, token),

  // ========== COACH STUDIO ENGINE ==========
  getCoachAthletes: (token: string, sortBy?: string, sortOrder?: string, minScore?: number) => {
    const params = new URLSearchParams();
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    if (minScore !== undefined) params.append('min_score', String(minScore));
    return request(`/coach/athletes?${params.toString()}`, {}, token);
  },
  getCoachCompliance: (token: string) => request('/coach/compliance', {}, token),
  getCoachRadar: (ids: string[], token: string) => request(`/coach/radar?ids=${ids.join(',')}`, {}, token),
  getCoachAISuggestion: (athleteIds: string[], token: string, focus?: string) =>
    request('/coach/ai-suggestion', { method: 'POST', body: JSON.stringify({ athlete_ids: athleteIds, focus_attribute: focus }) }, token),
  // NEW: Extended Coach Studio v2
  getCoachHeatmap: (token: string) => request('/coach/heatmap', {}, token),
  getCoachAlerts: (token: string) => request('/coach/alerts', {}, token),
  getAthleteHistorical: (athleteId: string, token: string) => request(`/coach/historical/${athleteId}`, {}, token),
  getCoachBattleStats: (token: string) => request('/coach/battle-stats', {}, token),
  simulateCrewBattle: (athleteIds: string[], token: string) =>
    request('/coach/battle-simulate', { method: 'POST', body: JSON.stringify({ athlete_ids: athleteIds }) }, token),
  getCoachAIFull: (token: string) => request('/coach/ai-full', {}, token),
  bulkPushTemplate: (templateId: string, crewIds: string[], token: string) =>
    request('/coach/bulk-push', { method: 'POST', body: JSON.stringify({ template_id: templateId, crew_ids: crewIds }) }, token),
  // SPRINT 26: Enterprise features
  getLiveEvents: (token: string) => request('/coach/live-events', {}, token),
  getCoachTier: (token: string) => request('/coach/tier', {}, token),

  // ========== TRAINING SESSION (Coach Templates) ==========
  getMyTemplate: (token: string) => request('/my-template', {}, token),
  completeTrainingSession: (data: {
    template_push_id: string;
    reps_completed: number;
    quality_score: number;
    duration_seconds: number;
    ai_feedback_score: number;
    performance_score?: number;
  }, token: string) =>
    request('/challenges/complete', { method: 'POST', body: JSON.stringify(data) }, token),

  // ========== PvP CHALLENGE ENGINE ==========
  sendPvPChallenge: (userId: string, discipline: string, xpStake: number, token: string) =>
    request('/pvp/challenge', { method: 'POST', body: JSON.stringify({ challenged_user_id: userId, discipline, xp_stake: xpStake }) }, token),
  getPvPPending: (token: string) => request('/pvp/pending', {}, token),
  getPvPChallenge: (challengeId: string, token: string) => request(`/pvp/challenges/${challengeId}`, {}, token),
  acceptPvPChallenge: (challengeId: string, token: string) =>
    request(`/pvp/challenges/${challengeId}/accept`, { method: 'POST' }, token),
  declinePvPChallenge: (challengeId: string, token: string) =>
    request(`/pvp/challenges/${challengeId}/decline`, { method: 'POST' }, token),
  submitPvPResult: (challengeId: string, data: { reps: number; quality_score: number; duration_seconds: number; peak_acceleration?: number }, token: string) =>
    request(`/pvp/challenges/${challengeId}/submit`, { method: 'POST', body: JSON.stringify(data) }, token),

  // ========== CREW BATTLE ENGINE ==========
  getLiveCrewBattles: (token: string) => request('/battles/crew/live', {}, token),
  getCrewMatchmake: (token: string) => request('/battles/crew/matchmake', {}, token),
  challengeCrew: (crewId: string, token: string, durationHours: number = 24) =>
    request('/battles/crew/challenge', { method: 'POST', body: JSON.stringify({ crew_id: crewId, duration_hours: durationHours }) }, token),
  contributeToCrewBattle: (battleId: string, qualityScore: number, exerciseType: string, token: string) =>
    request(`/battles/crew/${battleId}/contribute`, { method: 'POST', body: JSON.stringify({ quality_score: qualityScore, exercise_type: exerciseType }) }, token),

  // ========== WALLET ENGINE — APPLE + GOOGLE ==========
  generateApplePass: (token: string) => request('/wallet/apple-pass', {}, token),
  generateGooglePass: (token: string) => request('/wallet/google-pass', {}, token),

  // ========== ARENAKORE ID RECOVERY — OTP Flow ==========
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOTP: (email: string, otp: string) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  resetPassword: (reset_token: string, new_password: string, confirm_password: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ reset_token, new_password, confirm_password }) }),

  // ========== NEXUS 5-BEAT DNA SYNC ==========
  saveFiveBeatDna: (dnaResults: Record<string, number>, token: string) =>
    request('/nexus/5beat-dna', { method: 'POST', body: JSON.stringify({ dna_results: dnaResults }) }, token),

  // ========== EMAIL NOTIFY ENGINE ==========
  notifyBioscanConfirm: (token: string) =>
    request('/notify/bioscan-confirm', { method: 'POST' }, token),

  // ========== SCAN RESULT — Indestructible Save ==========
  saveScanResult: (data: {
    kore_score: number;
    stability: number;
    amplitude: number;
    city?: string;
    scan_date?: string;
  }, token: string) =>
    request('/scan/result', { method: 'POST', body: JSON.stringify(data) }, token),
  getCityRanking: (city: string, token: string) =>
    request(`/rankings/city?city=${encodeURIComponent(city)}`, {}, token),

  updateMyCity: (city: string, token: string) =>
    request('/profile/city', { method: 'PUT', body: JSON.stringify({ city }) }, token),

  // ========== PROFILE PERMISSIONS ==========
  updatePermissions: (token: string) =>
    request('/profile/permissions', { method: 'PUT', body: JSON.stringify({ camera_enabled: true, mic_enabled: true }) }, token),

  // ========== GHOST MODE ==========
  toggleGhostMode: (enabled: boolean, token: string) =>
    request('/profile/ghost-mode', { method: 'PUT', body: JSON.stringify({ enabled }) }, token),

  // ========== BIOMETRIC WIPE ==========
  wipeBiometricData: (token: string) =>
    request('/profile/biometric-data', { method: 'DELETE' }, token),

  // ========== KORE HUB REQUEST ==========
  submitHubRequest: (data: { gym_name: string; locality: string; email: string }) =>
    request('/gym/hub-request', { method: 'POST', body: JSON.stringify(data) }),
};
