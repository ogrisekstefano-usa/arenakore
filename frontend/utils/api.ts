import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ══════════════════════════════════════════════════════════════
// BUILD 35 — "STABILITY OVERDRIVE" · IRONCLAD Network Layer
// ══════════════════════════════════════════════════════════════
const _envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';
const BASE_URL = _envUrl ? `${_envUrl}/api` : 'https://arenakore-api.onrender.com/api';
export const BACKEND_BASE = _envUrl || 'https://arenakore-api.onrender.com';
export const API_BASE = BASE_URL;

console.log('[ARENAKORE API] IRONCLAD v22 · URL:', BASE_URL);

// ═══ SAFE JSON PARSER — checks content-type before parsing ═══
async function safeParseJSON(response: Response, url: string): Promise<any> {
  const ct = response.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    // Non-JSON response — read as text for logging, return safe object
    const text = await response.text().catch(() => '');
    console.warn(`[ARENAKORE] Non-JSON response from ${url}: "${text.slice(0, 100)}"`);
    return { _raw: true, text: text.slice(0, 200) };
  }
  try {
    return await response.json();
  } catch (e) {
    console.warn(`[ARENAKORE] JSON parse failed for ${url}:`, e);
    return { _parseError: true };
  }
}

// ═══ SINGLE FETCH ATTEMPT with timeout ═══
async function singleFetch(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(tid);
  }
}

// ═══ IRONCLAD REQUEST — 20s timeout, 2 auto-retries at 1.5s intervals ═══
async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'ArenaKore/2.1.0 (iOS; Build 23; IRONCLAD)',
    'Connection': 'keep-alive',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${BASE_URL}${path}`;
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 20000;
  const RETRY_DELAY = 1500;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await singleFetch(url, { ...options, headers }, TIMEOUT_MS);

      if (!response.ok) {
        const errBody = await safeParseJSON(response, url);
        const errMsg = errBody?.detail || errBody?.message || `HTTP ${response.status}`;
        console.error(`[ARENAKORE] HTTP ${response.status} on ${path} (attempt ${attempt}): ${errMsg}`);
        // Don't retry on auth errors (401/403) — they won't self-heal
        if (response.status === 401 || response.status === 403) {
          throw new Error(errMsg);
        }
        lastError = new Error(errMsg);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
          continue;
        }
        throw lastError;
      }

      return await safeParseJSON(response, url);
    } catch (err: any) {
      lastError = err;
      console.error(`[ARENAKORE FETCH ERROR] attempt ${attempt}/${MAX_ATTEMPTS}`, {
        url,
        method: options.method || 'GET',
        error: err?.name + ': ' + err?.message,
      });

      if (err.name === 'AbortError') {
        lastError = new Error(`Timeout ${TIMEOUT_MS / 1000}s su ${path}. Tentativo ${attempt}/${MAX_ATTEMPTS}.`);
      }

      // Retry unless it's the last attempt
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        continue;
      }
    }
  }

  // All attempts failed
  throw lastError || new Error('Connessione al server fallita dopo 3 tentativi.');
}

// Pre-wake Render server — AGGRESSIVE multi-ping to wake from cold start
export function wakeServer() {
  const url = `${BASE_URL.replace('/api', '')}/api/health`;
  // Fire 3 rapid pings — first one wakes the process, second/third ensure it's fully ready
  try { fetch(url, { method: 'GET', headers: { 'User-Agent': 'ArenaKore-Wake/22' } }).catch(() => {}); } catch {}
  setTimeout(() => {
    try { fetch(url, { method: 'GET', headers: { 'User-Agent': 'ArenaKore-Wake/22' } }).catch(() => {}); } catch {}
  }, 500);
  setTimeout(() => {
    try { fetch(url, { method: 'GET', headers: { 'User-Agent': 'ArenaKore-Wake/22' } }).catch(() => {}); } catch {}
  }, 1500);
}

// ── Generic API client ──
export const apiClient = async (path: string, options: RequestInit = {}) => {
  let token: string | null = null;
  try { token = await AsyncStorage.getItem('auth_token'); } catch {}
  const cleanPath = path.startsWith('/api') ? path.replace('/api', '') : path;
  return request(cleanPath, options, token);
};

// ── Raw fetch wrapper ──
const RAW_BASE = 'https://arenakore-api.onrender.com';
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith('/api') ? `${RAW_BASE}${path}` : `${RAW_BASE}/api${path}`;
  return fetch(url, options);
}

export const api = {
  register: (data: {
    username: string; email: string; password: string;
    height_cm?: number; weight_kg?: number; age?: number; training_level?: string;
    gender?: string; preferred_sport?: string;
  }) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // BUILD 22: Login con 3 tentativi automatici, 20s per tentativo, content-type check
  login: async (data: { email: string; password: string }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'ArenaKore/2.1.0 (iOS; Build 23; IRONCLAD)',
      'Connection': 'keep-alive',
    };
    const url = `${BASE_URL}/auth/login`;
    const MAX_ATTEMPTS = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[ARENAKORE LOGIN] Tentativo ${attempt}/${MAX_ATTEMPTS}...`);
        const response = await singleFetch(url, {
          method: 'POST', headers, body: JSON.stringify(data),
        }, 20000);

        if (!response.ok) {
          const errBody = await safeParseJSON(response, url);
          throw new Error(errBody?.detail || `HTTP ${response.status}`);
        }

        const result = await safeParseJSON(response, url);
        if (result?._raw || result?._parseError) {
          throw new Error('Risposta server non valida');
        }
        console.log('[ARENAKORE] Login OK — token:', !!result?.token);
        return result;
      } catch (err: any) {
        lastError = err;
        console.error(`[ARENAKORE LOGIN ERROR] attempt ${attempt}:`, err?.message);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
    }
    throw lastError || new Error('Login fallito dopo 3 tentativi.');
  },

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

  // ═══ SESSION MODES: Practice & Ranked ═══
  completeSessionV2: (data: { mode: string; exercise_type: string; reps: number; quality_score: number; duration_seconds: number; peak_acceleration?: number }, token: string) =>
    request('/nexus/session/complete', { method: 'POST', body: JSON.stringify(data) }, token),

  // ═══ LIVE WAITING ROOM ═══
  joinLiveQueue: (data: { exercise_type: string; discipline: string }, token: string) =>
    request('/live/join-queue', { method: 'POST', body: JSON.stringify(data) }, token),
  getLiveQueueStatus: (token: string) => request('/live/queue-status', {}, token),
  leaveLiveQueue: (token: string) => request('/live/leave-queue', { method: 'POST' }, token),

  // ═══ CHALLENGE ENGINE — Tags & Validation ═══
  createChallenge: (data: { title: string; exercise_type: string; tags: string[]; validation_mode: string; target_reps?: number; target_seconds?: number; target_kg?: number; mode?: string }, token: string) =>
    request('/challenge/create', { method: 'POST', body: JSON.stringify(data) }, token),
  completeChallenge: (data: { challenge_id: string; validation_mode: string; reps?: number; seconds?: number; kg?: number; quality_score?: number; has_video_proof?: boolean; proof_type?: string; declared_time?: number; video_duration?: number }, token: string) =>
    request('/challenge/complete', { method: 'POST', body: JSON.stringify(data) }, token),
  getChallenge: (id: string, token: string) => request(`/challenge/${id}`, {}, token),
  getActiveChallenges: (token: string) => request('/challenge/user/active', {}, token),
  sanityCheck: (data: { exercise_type: string; reps?: number; seconds?: number; kg?: number }, token: string) =>
    request('/challenge/sanity-check', { method: 'POST', body: JSON.stringify(data) }, token),
  getValidationBreakdown: (token: string) => request('/validation/breakdown', {}, token),

  // ═══ VIDEO PROOF ═══
  getChallengesPendingProof: (token: string) => request('/challenges/pending-proof', {}, token),
  getChallengeVideo: (id: string, token: string) => request(`/challenge/${id}/video`, {}, token),

  // ═══ HEALTH AGGREGATOR ═══
  getHealthConnections: (token: string) => request('/health/connections', {}, token),
  connectHealthService: (source: string, token: string) =>
    request('/health/connect', { method: 'POST', body: JSON.stringify({ source }) }, token),
  ingestHealthData: (data: any, token: string) =>
    request('/health/ingest', { method: 'POST', body: JSON.stringify(data) }, token),
  stravaDemoSync: (token: string) =>
    request('/health/strava-demo-sync', { method: 'POST' }, token),
  getRecentHealthData: (source: string | null, token: string) =>
    request(`/health/recent${source ? `?source=${source}` : ''}`, {}, token),
  getSourceMeta: () => request('/health/source-meta', {}),
  peerConfirm: (data: { challenge_id: string; confirmed: boolean }, token: string) =>
    request('/challenge/peer-confirm', { method: 'POST', body: JSON.stringify(data) }, token),

  // ========== QR KORE CROSS-CHECK ENGINE ==========
  qrCreateChallenge: (data: { title: string; exercise_type: string; tags: string[]; challenge_type: string; total_participants: number }, token: string) =>
    request('/qr/create-challenge', { method: 'POST', body: JSON.stringify(data) }, token),
  qrJoinChallenge: (challengeId: string, token: string) =>
    request(`/qr/join-challenge/${challengeId}`, { method: 'POST' }, token),
  qrGenerate: (data: { challenge_id: string; declared_reps?: number; declared_seconds?: number; declared_kg?: number; total_participants: number; challenge_type?: string }, token: string) =>
    request('/qr/generate', { method: 'POST', body: JSON.stringify(data) }, token),
  qrValidate: (data: { qr_token?: string; pin_code?: string }, token: string) =>
    request('/qr/validate', { method: 'POST', body: JSON.stringify(data) }, token),
  qrStatus: (challengeId: string, token: string) =>
    request(`/qr/status/${challengeId}`, {}, token),
  qrParticipants: (challengeId: string, token: string) =>
    request(`/qr/participants/${challengeId}`, {}, token),

  // ========== TEAM COMPARISON MODE ==========
  compareAthletes: (ids: string[], token: string) =>
    request(`/coach/compare-athletes?ids=${ids.join(',')}`, {}, token),

  // ========== PDF EXPORT ==========
  getAthletePdfUrl: (athleteId: string) =>
    `${BASE_URL}/report/athlete-pdf/${athleteId}`,

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

  // ========== KORE ID (Social Identity) ==========
  getCityRank: (city: string, token: string) =>
    request(`/kore/city-rank?city=${encodeURIComponent(city)}`, {}, token),

  getAffiliations: (token: string) => request('/kore/affiliations', {}, token),

  updateAffiliations: (data: { school?: string; university?: string }, token: string) =>
    request('/kore/affiliations', { method: 'PUT', body: JSON.stringify(data) }, token),

  getActionCenter: (token: string) => request('/kore/action-center', {}, token),

  // ========== FLUX ENGINE ==========
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
  getTalentDiscovery: (token: string, filters?: {    city?: string; country?: string; continent?: string;
    discipline?: string; crewStatus?: string;
    sortBy?: string; minDna?: number; minEfficiency?: number;
  }) => {
    const p = new URLSearchParams();
    if (filters?.city) p.append('city', filters.city);
    if (filters?.country) p.append('country', filters.country);
    if (filters?.continent) p.append('continent', filters.continent);
    if (filters?.discipline) p.append('discipline', filters.discipline);
    if (filters?.crewStatus) p.append('crew_status', filters.crewStatus);
    if (filters?.sortBy) p.append('sort_by', filters.sortBy);
    if (filters?.minDna) p.append('min_dna', String(filters.minDna));
    if (filters?.minEfficiency) p.append('min_efficiency', String(filters.minEfficiency));
    return request(`/talent/discovery?${p.toString()}`, {}, token);
  },
  draftAthlete: (athleteId: string, token: string, message?: string) =>
    request(`/talent/draft/${athleteId}`, { method: 'POST', body: JSON.stringify({ message }) }, token),
  getMyDrafts: (token: string) => request('/talent/my-drafts', {}, token),
  getTalentReport: (athleteId: string, token: string, coachNote?: string) =>
    request(`/talent/report/${athleteId}${coachNote ? `?coach_note=${encodeURIComponent(coachNote)}` : ''}`, {}, token),
  toggleScoutVisibility: (visible: boolean, token: string) =>
    request('/users/scout-visibility', { method: 'PUT', body: JSON.stringify({ scout_visible: visible }) }, token),
  getReceivedDrafts: (token: string) => request('/talent/received-drafts', {}, token),
  respondToTalentDraft: (draftId: string, action: 'accept' | 'decline', token: string) =>
    request(`/talent/drafts/${draftId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }, token),

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

  // ========== MULTISPORT CHALLENGE ENGINE ==========
  createMultisportChallenge: (name: string, description: string, durationDays: number, token: string) =>
    request('/multisport/create', { method: 'POST', body: JSON.stringify({ name, description, duration_days: durationDays }) }, token),
  listMultisportChallenges: (token: string) => request('/multisport', {}, token),
  getMultisportChallenge: (id: string, token: string) => request(`/multisport/${id}`, {}, token),
  updateChallengeDays: (id: string, days: any[], token: string) =>
    request(`/multisport/${id}/days`, { method: 'PUT', body: JSON.stringify({ days }) }, token),
  updateChallengeAutomation: (id: string, rules: any[], token: string) =>
    request(`/multisport/${id}/automation`, { method: 'PUT', body: JSON.stringify({ rules }) }, token),
  pushMultisportChallenge: (id: string, crewIds: string[], token: string) =>
    request(`/multisport/${id}/push`, { method: 'POST', body: JSON.stringify({ crew_ids: crewIds }) }, token),
  getChallengeProgress: (id: string, token: string) => request(`/multisport/${id}/progress`, {}, token),
  getGlobalChallengeLeaderboard: (token: string) => request('/challenges/global-leaderboard', {}, token),
  getMultisportMeta: (token: string) => request('/multisport/meta/disciplines', {}, token),

  // ========== DNA ATHLETIC HUB — Multi-Skill & Crew CRM ==========
  getAthletesFullTable: (token: string, sortBy?: string, injuryLevel?: string) => {
    const p = new URLSearchParams();
    if (sortBy) p.append('sort_by', sortBy);
    if (injuryLevel) p.append('injury_level', injuryLevel);
    return request(`/coach/athletes/full?${p.toString()}`, {}, token);
  },
  getAthleteFullProfile: (athleteId: string, token: string) =>
    request(`/coach/athlete/${athleteId}/full-profile`, {}, token),
  getKoreScoreBreakdown: (athleteId: string, token: string) =>
    request(`/coach/kore-score/${athleteId}/breakdown`, {}, token),
  updateAthleteMiltiskill: (athleteId: string, data: { endurance_gps?: number; strength_watts?: number; sleep_score?: number; hrv_score?: number }, token: string) =>
    request(`/coach/athlete/${athleteId}/multiskill`, { method: 'PUT', body: JSON.stringify(data) }, token),
  getCrewManagement: (token: string) => request('/crew/manage', {}, token),
  inviteToCrewByEmail: (crewId: string, email: string, role: string, token: string) =>
    request('/crew/invite', { method: 'POST', body: JSON.stringify({ crew_id: crewId, email, role }) }, token),
  respondToCrewInvitation: (invitationId: string, action: 'accept' | 'decline', token: string) =>
    request(`/crew/invitations/${invitationId}/respond`, { method: 'POST', body: JSON.stringify({ action }) }, token),

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

  // ========== PERFORMANCE RECORDS — KORE Tab ==========
  savePerformanceRecord: (data: {
    tipo: string;
    modalita?: string;
    crew_id?: string;
    disciplina?: string;
    exercise_type?: string;
    snapshots?: { start?: string; peak?: string; finish?: string };
    kpi?: Record<string, any>;
    is_certified?: boolean;
    template_name?: string;
    coach_id?: string;
    validation_status?: string;
    flux_earned?: number;
    source_id?: string;
    source_collection?: string;
    duration_seconds?: number;
    extra_meta?: Record<string, any>;
  }, token: string) =>
    request('/performance/record', { method: 'POST', body: JSON.stringify(data) }, token),

  getKoreHistory: (token: string, params?: { limit?: number; offset?: number; tipo?: string; disciplina?: string }) => {
    let path = '/kore/history';
    const qs: string[] = [];
    if (params?.limit) qs.push(`limit=${params.limit}`);
    if (params?.offset) qs.push(`offset=${params.offset}`);
    if (params?.tipo) qs.push(`tipo=${encodeURIComponent(params.tipo)}`);
    if (params?.disciplina) qs.push(`disciplina=${encodeURIComponent(params.disciplina)}`);
    if (qs.length) path += `?${qs.join('&')}`;
    return request(path, {}, token);
  },

  getKoreStats: (token: string) => request('/kore/stats', {}, token),

  getPersonalRecord: (token: string, exerciseType: string, disciplina: string) =>
    request(`/kore/personal-record?exercise_type=${encodeURIComponent(exerciseType)}&disciplina=${encodeURIComponent(disciplina)}`, {}, token),

  getPerformanceDetail: (token: string, recordId: string) =>
    request(`/kore/record/${recordId}`, {}, token),

  getSiloProfile: (token: string) => request('/kore/silo-profile', {}, token),

  uploadProfilePicture: (token: string, imageBase64: string) =>
    request('/user/profile-picture', { method: 'POST', body: JSON.stringify({ image_base64: imageBase64 }) }, token),

  uploadCoverPhoto: (token: string, imageBase64: string) =>
    request('/user/cover-photo', { method: 'POST', body: JSON.stringify({ image_base64: imageBase64 }) }, token),

  deleteCoverPhoto: (token: string) =>
    request('/user/cover-photo', { method: 'DELETE' }, token),

  deleteProfilePicture: (token: string) =>
    request('/user/profile-picture', { method: 'DELETE' }, token),

  // ========== COACH STUDIO — MOBILE-TO-WEB BRIDGE ==========
  generateWebToken: (token: string) =>
    request('/coach/web-token', { method: 'POST' }, token),

  exchangeWebToken: (otp: string) =>
    request('/auth/web-token-login', {
      method: 'POST',
      body: JSON.stringify({ token: otp })
    }),

  getChallengeDeepLink: (token: string, templateId: string) =>
    request(`/deeplink/challenge/${templateId}`, { method: 'GET' }, token),

  // ========== BUILD 35 — NEW ROUTES ==========
  getChallengeTemplatePresets: (token: string) =>
    request('/challenge-templates/presets', {}, token),

  saveQuickTraining: (data: {
    category: string; duration_seconds: number; rpe: number; exercises: string[];
  }, token: string) =>
    request('/training/quick-session', { method: 'POST', body: JSON.stringify(data) }, token),

  getLiveChallenges: (token: string) =>
    request('/challenges/live', {}, token),

  getRespondEligible: (token: string) =>
    request('/challenges/respond-eligible', {}, token),
};
