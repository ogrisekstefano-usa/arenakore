from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Body, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os
import logging
import random
import string
import io
import base64
import zipfile
import hashlib
import json as stdlib_json
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.colormasks import SolidFillColorMask
import email_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('SECRET_KEY', 'arenadare-nexus-secret-2024-v1')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()

# ── Self-hosted MediaPipe static files (eliminates CDN cold start)
# Served at /api/static/mediapipe/* (goes through Kubernetes ingress to port 8001)
import os as _os
_static_dir = _os.path.join(_os.path.dirname(__file__), "static")
_os.makedirs(_static_dir, exist_ok=True)
app.mount("/api/static", StaticFiles(directory=_static_dir), name="static")
api_router = APIRouter(prefix="/api")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user


# ================================================================
# RBAC — Role Based Access Control
# ================================================================

def normalize_role(user: dict) -> str:
    """Normalize role to standard format. Legacy roles get mapped to ATHLETE."""
    raw = user.get("role") or ""
    # Handle legacy/non-standard roles
    if raw in ("ADMIN", "GYM_OWNER", "COACH", "ATHLETE"):
        return raw
    if user.get("is_admin"):
        return "ADMIN"
    return "ATHLETE"


def require_role(*allowed_roles: str):
    """Factory for role-checking FastAPI dependencies. Only admins bypass role checks.
    Founders do NOT bypass — they must have the correct role set explicitly.
    """
    async def checker(current_user: dict = Depends(get_current_user)):
        # Only is_admin=True gets unrestricted access (not is_founder!)
        if current_user.get("is_admin", False):
            return current_user
        role = normalize_role(current_user)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Accesso negato. Ruoli consentiti: {list(allowed_roles)}. Ruolo attuale: {role}"
            )
        return current_user
    return checker


def require_gym_access(current_user: dict = Depends(get_current_user)):
    """Ensure user belongs to a gym (GYM_OWNER or COACH)."""
    role = normalize_role(current_user)
    if role not in ("ADMIN", "GYM_OWNER", "COACH") and not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=403,
            detail="Accesso consentito solo a Coach e GYM Owner"
        )
    return current_user


async def get_user_gym(user: dict) -> Optional[dict]:
    """Get the gym associated with a user (by gym_id or owned gym)."""
    gym_id = user.get("gym_id")
    if gym_id:
        return await db.gyms.find_one({"_id": gym_id})
    # GYM_OWNER: find their owned gym
    if normalize_role(user) in ("GYM_OWNER", "ADMIN"):
        return await db.gyms.find_one({"owner_id": user["_id"]})
    return None


def require_enterprise():
    """Require ENTERPRISE (elite) tier. Free/Pro get 402."""
    async def checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("is_founder", False) or current_user.get("is_admin", False):
            return current_user
        gym = await get_user_gym(current_user)
        if not gym or gym.get("subscription_tier") not in ("elite", "enterprise"):
            raise HTTPException(
                status_code=402,
                detail="ENTERPRISE plan required. Upgrade at coachstudio/billing."
            )
        return current_user
    return checker


# ================================================================
# WEBSOCKET — LIVE MONITOR ENGINE
# ================================================================

class ConnectionManager:
    def __init__(self):
        self._connections: dict = {}  # gym_id_str -> List[WebSocket]

    async def connect(self, ws: WebSocket, gym_id: str):
        await ws.accept()
        self._connections.setdefault(gym_id, []).append(ws)

    def disconnect(self, ws: WebSocket, gym_id: str):
        if gym_id in self._connections:
            try:
                self._connections[gym_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, gym_id: str, data: dict):
        dead = []
        for ws in self._connections.get(gym_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, gym_id)


ws_manager = ConnectionManager()


@app.websocket("/api/ws/live-monitor/{gym_id}")
async def websocket_live_monitor(websocket: WebSocket, gym_id: str, token: str = ""):
    """WebSocket endpoint for real-time scan monitoring in Coach Studio."""
    # Validate token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001)
            return
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user or (normalize_role(user) not in ("COACH", "GYM_OWNER", "ADMIN") and not user.get("is_founder")):
            await websocket.close(code=4003)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket, gym_id)
    try:
        # Keep alive with heartbeat
        while True:
            await asyncio.sleep(25)
            await websocket.send_json({"type": "heartbeat", "ts": datetime.utcnow().isoformat()})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, gym_id)
    except Exception:
        ws_manager.disconnect(websocket, gym_id)


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    # Bio-calibration fields
    height_cm: float | None = None
    weight_kg: float | None = None
    age: int | None = None
    training_level: str | None = None
    gender: str | None = None  # UOMO | DONNA | ALTRO


class UserLogin(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str
    confirm_password: str


class OnboardingUpdate(BaseModel):
    role: Optional[str] = "Kore Member"
    sport: str
    category: Optional[str] = None
    is_versatile: Optional[bool] = False


class PushTokenData(BaseModel):
    push_token: str


class ChallengeComplete(BaseModel):
    battle_id: Optional[str] = None
    performance_score: Optional[float] = None
    duration_seconds: Optional[int] = None
    # Training Session extensions
    template_push_id: Optional[str] = None
    reps_completed: Optional[int] = None
    quality_score: Optional[float] = None
    ai_feedback_score: Optional[float] = None  # 0-100 — AI assessment of form quality


class CrewCreate(BaseModel):
    name: str
    tagline: Optional[str] = ""
    category: Optional[str] = None


class CrewInvite(BaseModel):
    username: str


class CrewChallengeRequest(BaseModel):
    crew_id: str
    duration_hours: Optional[int] = 24


class BattleContributeRequest(BaseModel):
    quality_score: float
    exercise_type: str = "squat"


class PvPChallengeRequest(BaseModel):
    challenged_user_id: str
    discipline: str  # "power" | "agility" | "endurance"
    xp_stake: int = 100  # 50 | 100 | 200 | 500


class PvPSubmitRequest(BaseModel):
    reps: int
    quality_score: float
    duration_seconds: int
    peak_acceleration: Optional[float] = 0.0


class GymCreate(BaseModel):
    name: str
    gym_code: Optional[str] = None
    brand_color: Optional[str] = "#00F2FF"
    city: Optional[str] = None


# =====================================================================
# CHALLENGE ENGINE — Tags & Validation Modes
# =====================================================================

class ChallengeEngineCreate(BaseModel):
    """Create a tagged challenge with validation mode"""
    title: str = "SFIDA PERSONALE"
    exercise_type: str = "squat"
    tags: List[str]  # ["POWER", "FLOW", "PULSE"] — at least one
    validation_mode: str  # "AUTO_COUNT" | "MANUAL_ENTRY" | "SENSOR_IMPORT"
    target_reps: Optional[int] = None
    target_seconds: Optional[int] = None
    target_kg: Optional[float] = None
    mode: str = "personal"  # "personal" | "ranked" | "duel"


class ChallengeEngineComplete(BaseModel):
    """Complete/close a challenge with results"""
    challenge_id: str
    validation_mode: str  # "AUTO_COUNT" | "MANUAL_ENTRY" | "SENSOR_IMPORT"
    reps: Optional[int] = 0
    seconds: Optional[float] = 0.0
    kg: Optional[float] = 0.0
    quality_score: Optional[float] = 80.0
    has_video_proof: bool = False
    proof_type: Optional[str] = "NONE"  # "NONE" | "GPS_IMPORT" | "VIDEO_TIME_CHECK" | "PEER_CONFIRMATION"
    declared_time: Optional[float] = 0.0
    video_duration: Optional[float] = 0.0
    # Advanced Validation Engine fields
    bpm_avg: Optional[float] = None       # Wearable BPM average during challenge
    bpm_peak: Optional[float] = None      # Wearable BPM peak
    speed_kmh: Optional[float] = None     # Speed in km/h (for sprint/running challenges)
    intensity_category: Optional[str] = None  # "HIGH_INTENSITY" | "MEDIUM" | "LOW"
    gps_lat: Optional[float] = None       # GPS latitude at challenge completion
    gps_lng: Optional[float] = None       # GPS longitude at challenge completion
    audio_peaks: Optional[List[float]] = None  # Timestamps (seconds) of audio impact peaks


# FLUX multipliers per validation mode
VALIDATION_FLUX_MULTIPLIERS = {
    "AUTO_COUNT": 1.0,     # 100% — Full NEXUS validation
    "MANUAL_ENTRY": 0.5,   # 50% — No sensor proof
    "SENSOR_IMPORT": 0.75, # 75% — External device
}

# FLUX multipliers per verification status
VERIFICATION_FLUX_MULTIPLIERS = {
    "UNVERIFIED": 0.5,       # Grey — manual, no proof → 50% FLUX, No Rank
    "PROOF_PENDING": 0.75,   # Yellow — video uploaded, awaiting check
    "AI_VERIFIED": 1.0,      # Cyan — NEXUS Vision confirmed → 100% FLUX, Full Rank
    "TECH_VERIFIED": 0.9,    # Blue — HealthKit/Strava/BLE data confirmed → 90% FLUX, Standard Rank
    "SUSPICIOUS": 0.25,      # Orange — biometric mismatch → 25% FLUX, No Rank
}

# World records reference (approximate) for biometric sanity check
WORLD_RECORDS = {
    "squat": {"max_reps_60s": 70, "max_kg": 500},
    "pushup": {"max_reps_60s": 90, "max_kg": 0},
    "burpee": {"max_reps_60s": 40, "max_kg": 0},
    "pullup": {"max_reps_60s": 50, "max_kg": 200},
    "deadlift": {"max_reps_60s": 30, "max_kg": 501},
    "bench_press": {"max_reps_60s": 50, "max_kg": 355},
    "plank": {"max_seconds": 600, "max_kg": 0},
    "skip": {"max_reps_60s": 300, "max_kg": 0},
    "lunge": {"max_reps_60s": 60, "max_kg": 200},
}


def biometric_sanity_check(exercise_type: str, reps: int, seconds: float, kg: float, user_personal_bests: dict) -> dict:
    """Check if submitted data is biometrically plausible.
    Returns: {passed: bool, flags: [...], requires_video: bool, message: str}
    """
    flags = []
    requires_video = False

    wr = WORLD_RECORDS.get(exercise_type, {"max_reps_60s": 100, "max_kg": 500, "max_seconds": 600})

    # Check against world records
    if reps > 0 and reps > wr.get("max_reps_60s", 999):
        flags.append("EXCEEDS_WORLD_RECORD_REPS")
        requires_video = True
    if kg > 0 and kg > wr.get("max_kg", 999):
        flags.append("EXCEEDS_WORLD_RECORD_KG")
        requires_video = True
    if seconds > 0 and seconds > wr.get("max_seconds", 99999):
        flags.append("EXCEEDS_WORLD_RECORD_TIME")

    # Check against personal bests (+50% spike)
    pb_reps = user_personal_bests.get("best_reps", 0)
    pb_kg = user_personal_bests.get("best_kg", 0)
    pb_seconds = user_personal_bests.get("best_seconds", 0)

    if pb_reps > 0 and reps > pb_reps * 1.5:
        flags.append("SPIKE_OVER_PB_REPS")
        requires_video = True
    if pb_kg > 0 and kg > pb_kg * 1.5:
        flags.append("SPIKE_OVER_PB_KG")
        requires_video = True

    passed = not requires_video
    if requires_video:
        message = "Kore, questo è un incremento mostruoso! Per validarlo nella classifica Ranked e ricevere il 100% dei FLUX, abbiamo bisogno di una prova video."
    else:
        message = "INTEGRITY OK"

    return {
        "passed": passed,
        "flags": flags,
        "requires_video": requires_video,
        "message": message,
    }


async def get_user_personal_bests(user_id, exercise_type: str) -> dict:
    """Fetch user's personal bests for a given exercise from completed challenges"""
    pipeline = [
        {"$match": {"user_id": user_id, "status": "completed", "exercise_type": exercise_type}},
        {"$group": {
            "_id": None,
            "best_reps": {"$max": "$results.reps"},
            "best_kg": {"$max": "$results.kg"},
            "best_seconds": {"$max": "$results.seconds"},
        }}
    ]
    result = await db.challenges_engine.aggregate(pipeline).to_list(1)
    if result:
        return {
            "best_reps": result[0].get("best_reps", 0) or 0,
            "best_kg": result[0].get("best_kg", 0) or 0,
            "best_seconds": result[0].get("best_seconds", 0) or 0,
        }
    return {"best_reps": 0, "best_kg": 0, "best_seconds": 0}


# =====================================================================
# ADVANCED VALIDATION ENGINE — Biometric Correlation, Proximity Witness, Audio Analytics
# =====================================================================

# BPM thresholds per intensity category for biometric correlation
BPM_THRESHOLDS = {
    "sprint":         {"min_bpm": 140, "speed_threshold_kmh": 20},
    "downhill":       {"min_bpm": 120, "speed_threshold_kmh": 30},
    "crossfit":       {"min_bpm": 130, "speed_threshold_kmh": 0},
    "hiit":           {"min_bpm": 135, "speed_threshold_kmh": 0},
    "boxing":         {"min_bpm": 125, "speed_threshold_kmh": 0},
    "mezzofondo":     {"min_bpm": 130, "speed_threshold_kmh": 12},
    "burpee":         {"min_bpm": 130, "speed_threshold_kmh": 0},
    "squat":          {"min_bpm": 100, "speed_threshold_kmh": 0},
    "deadlift":       {"min_bpm": 100, "speed_threshold_kmh": 0},
    "bench_press":    {"min_bpm": 95,  "speed_threshold_kmh": 0},
    "pullup":         {"min_bpm": 100, "speed_threshold_kmh": 0},
}

# HIGH_INTENSITY exercise types (require BPM check if wearable data present)
HIGH_INTENSITY_EXERCISES = {"sprint", "downhill", "crossfit", "hiit", "boxing", "mezzofondo", "burpee"}

# Impact-based exercises (eligible for audio analytics)
IMPACT_EXERCISES = {"boxing", "tennis", "deadlift", "bench_press", "squat", "pullup", "kettlebell"}


def biometric_correlation_check(
    exercise_type: str, bpm_avg: float | None, bpm_peak: float | None,
    speed_kmh: float | None, intensity_category: str | None,
    reps: int, seconds: float
) -> dict:
    """Cross-check speed vs BPM. If an athlete claims a record sprint at resting BPM → SUSPICIOUS."""
    result = {"status": "CLEAR", "flags": [], "requires_review": False, "message": ""}

    if bpm_avg is None:
        # No wearable data — can't correlate
        is_high = exercise_type in HIGH_INTENSITY_EXERCISES or (intensity_category or "").upper() == "HIGH_INTENSITY"
        if is_high:
            result["flags"].append("NO_WEARABLE_DATA_HIGH_INTENSITY")
            result["message"] = "Sfida ad alta intensità senza dati BPM. Validazione limitata."
        return result

    thresholds = BPM_THRESHOLDS.get(exercise_type, {"min_bpm": 100, "speed_threshold_kmh": 0})
    min_bpm = thresholds["min_bpm"]
    speed_thresh = thresholds["speed_threshold_kmh"]

    # Core check: high speed + low BPM = suspicious
    if speed_kmh and speed_kmh > speed_thresh > 0 and bpm_avg < min_bpm:
        result["status"] = "SUSPICIOUS"
        result["flags"].append("SPEED_BPM_MISMATCH")
        result["requires_review"] = True
        result["message"] = (
            f"Velocità {speed_kmh:.1f} km/h con BPM medio {bpm_avg:.0f}. "
            f"Per {exercise_type}, il BPM minimo atteso è {min_bpm}. Revisione richiesta."
        )

    # Check: high intensity exercise with resting BPM
    if bpm_avg < 75 and exercise_type in HIGH_INTENSITY_EXERCISES:
        result["status"] = "SUSPICIOUS"
        result["flags"].append("RESTING_BPM_HIGH_INTENSITY")
        result["requires_review"] = True
        result["message"] = (
            f"BPM medio {bpm_avg:.0f} troppo basso per esercizio ad alta intensità ({exercise_type}). "
            "Possibile dato wearable errato o attività non svolta."
        )

    # Check: BPM peak suspiciously low for long duration
    if bpm_peak and bpm_peak < 100 and seconds > 120 and exercise_type in HIGH_INTENSITY_EXERCISES:
        result["flags"].append("LOW_PEAK_BPM_LONG_DURATION")
        if result["status"] != "SUSPICIOUS":
            result["status"] = "REVIEW_SUGGESTED"

    if not result["flags"]:
        result["status"] = "BPM_CORRELATED"
        result["message"] = f"BPM {bpm_avg:.0f} correlato con attività {exercise_type}. Dati coerenti."

    return result


def audio_analytics_check(exercise_type: str, audio_peaks: list | None, declared_reps: int) -> dict:
    """Validate audio impact peaks vs declared reps for impact-based exercises."""
    result = {"eligible": False, "status": "N/A", "peak_count": 0, "rep_match_pct": 0, "waveform_data": []}

    if exercise_type not in IMPACT_EXERCISES:
        return result

    result["eligible"] = True

    if not audio_peaks or len(audio_peaks) == 0:
        result["status"] = "NO_AUDIO_DATA"
        return result

    peak_count = len(audio_peaks)
    result["peak_count"] = peak_count

    # Generate waveform representation (normalized 0-1 amplitudes between peaks)
    if len(audio_peaks) >= 2:
        total_dur = audio_peaks[-1] - audio_peaks[0] if audio_peaks[-1] > audio_peaks[0] else 30
        waveform = []
        for i, t in enumerate(audio_peaks):
            waveform.append({"t": round(t, 2), "amplitude": round(0.7 + random.random() * 0.3, 2), "is_peak": True})
            # Add some mid-points
            if i < len(audio_peaks) - 1:
                mid_t = (t + audio_peaks[i + 1]) / 2
                waveform.append({"t": round(mid_t, 2), "amplitude": round(0.1 + random.random() * 0.25, 2), "is_peak": False})
        result["waveform_data"] = waveform

    # Rep matching
    if declared_reps > 0:
        match_pct = min(100, round((peak_count / declared_reps) * 100))
        result["rep_match_pct"] = match_pct
        if match_pct >= 80:
            result["status"] = "AUDIO_CORRELATED"
        elif match_pct >= 50:
            result["status"] = "PARTIAL_MATCH"
        else:
            result["status"] = "LOW_CORRELATION"
    else:
        result["status"] = "PEAKS_DETECTED"

    return result


import math

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def proximity_witness_check(user_id, challenge_id: str, gps_lat: float | None, gps_lng: float | None) -> dict:
    """Check if another ARENA KORE user completed a challenge within 10m and ±2min → Invisible Trust."""
    result = {"witness_found": False, "witness_username": None, "distance_m": None, "time_diff_s": None}

    if gps_lat is None or gps_lng is None:
        return result

    now = datetime.utcnow()
    time_window = timedelta(minutes=2)

    # Find other users' completed challenges within the last 2 minutes with GPS data
    recent_challenges = await db.challenges_engine.find({
        "status": "completed",
        "user_id": {"$ne": user_id},
        "completed_at": {"$gte": now - time_window},
        "gps_lat": {"$exists": True, "$ne": None},
        "gps_lng": {"$exists": True, "$ne": None},
    }).to_list(20)

    for rc in recent_challenges:
        rc_lat = rc.get("gps_lat")
        rc_lng = rc.get("gps_lng")
        if rc_lat and rc_lng:
            dist = haversine_distance(gps_lat, gps_lng, rc_lat, rc_lng)
            if dist <= 10.0:  # Within 10 meters
                rc_user = await db.users.find_one({"_id": rc["user_id"]})
                rc_username = rc_user["username"] if rc_user else "KORE"
                time_diff = abs((now - rc["completed_at"]).total_seconds())

                result["witness_found"] = True
                result["witness_username"] = rc_username
                result["distance_m"] = round(dist, 1)
                result["time_diff_s"] = round(time_diff)

                # Auto-validate both challenges
                await db.challenges_engine.update_one(
                    {"_id": rc["_id"]},
                    {"$set": {
                        "proximity_witness": {"user_id": str(user_id), "distance_m": round(dist, 1)},
                        "verification_status": "AI_VERIFIED",
                    }}
                )
                break

    return result

# Tag → DNA stat mapping for increment prediction
TAG_DNA_MAP = {
    "POWER": ["forza", "potenza"],
    "FLOW": ["agilita", "tecnica"],
    "PULSE": ["velocita", "resistenza"],
}

# Tag colors (Apple Semantic)
TAG_COLORS = {
    "POWER": "#FF3B30",
    "FLOW": "#34C759",
    "PULSE": "#007AFF",
}


class GymUpdate(BaseModel):
    name: Optional[str] = None
    brand_color: Optional[str] = None
    gym_code: Optional[str] = None
    city: Optional[str] = None


class GymStaffAdd(BaseModel):
    email: str
    role: str = "COACH"  # "COACH" | "GYM_OWNER"


class GymJoin(BaseModel):
    gym_code: str
    role: str = "ATHLETE"  # Role requested when joining


def user_to_response(user: dict) -> dict:
    is_nexus_certified = bool(
        user.get("onboarding_completed") and
        user.get("baseline_scanned_at") and
        user.get("dna")
    )
    # Calculate total scans from dna_scans array
    total_scans = len(user.get("dna_scans", []))
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "language": user.get("language", "IT"),
        "role": normalize_role(user),
        "gym_id": str(user["gym_id"]) if user.get("gym_id") else None,
        "sport": user.get("sport"),
        "xp": user.get("xp", 0),
        "flux": user.get("xp", 0),
        "level": user.get("level", 1),
        "onboarding_completed": user.get("onboarding_completed", False),
        "is_nexus_certified": is_nexus_certified,
        "baseline_scanned_at": user.get("baseline_scanned_at").isoformat() if user.get("baseline_scanned_at") else None,
        "scout_visible": user.get("scout_visible", True),
        "dna": user.get("dna"),
        "avatar_color": user.get("avatar_color", "#00E5FF"),
        "is_admin": user.get("is_admin", False),
        "is_founder": user.get("is_founder", False),
        "founder_number": user.get("founder_number"),
        "height_cm": user.get("height_cm"),
        "weight_kg": user.get("weight_kg"),
        "age": user.get("age"),
        "gender": user.get("gender"),
        "is_pro": (user.get("level", 1) >= 10 or user.get("xp", 0) >= 3000),
        "pro_unlocked": user.get("pro_unlocked", False),
        "ghost_mode": user.get("ghost_mode", False),
        "camera_enabled": user.get("camera_enabled", False),
        "mic_enabled": user.get("mic_enabled", False),
        "city": user.get("city"),
        "ak_credits": user.get("ak_credits", 0),
        "unlocked_tools": user.get("unlocked_tools", []),
        "total_scans": total_scans,
        "bmi": user.get("bmi"),
        "bio_coefficient": user.get("bio_coefficient"),
        "profile_picture": user.get("profile_picture"),
        "cover_photo": user.get("cover_photo"),
        "preferred_sport": user.get("preferred_sport") or user.get("sport"),
        "training_level": user.get("training_level", "Amateur"),
    }


@api_router.post("/auth/register")
async def register(data: UserRegister):
    if len(data.username) < 3:
        raise HTTPException(status_code=400, detail="Username troppo corto (min. 3 caratteri)")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password troppo corta (min. 8 caratteri)")
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(status_code=400, detail="Username già in uso")
    if await db.users.find_one({"email": data.email.strip().lower()}):
        raise HTTPException(status_code=400, detail="Email già registrata")

    colors = ["#00E5FF", "#FFD700", "#FF3B30", "#34C759", "#AF52DE", "#FF9F0A"]

    # THE FOUNDER PROTOCOL: First 100 users get permanent Founder badge
    total_users = await db.users.count_documents({})
    is_founder = total_users < 100

    user = {
        "username": data.username.strip(),
        "email": data.email.strip().lower(),
        "password_hash": hash_password(data.password),
        "role": None,
        "sport": "ATHLETICS",
        "training_level": data.training_level or "LEGACY",
        "height_cm": data.height_cm,
        "weight_kg": data.weight_kg,
        "age": data.age,
        "gender": data.gender,  # UOMO | DONNA | ALTRO
        "xp": 0,
        "level": 1,
        "ak_credits": 0,
        "unlocked_tools": [],
        "onboarding_completed": False,
        "avatar_color": random.choice(colors),
        "dna": None,
        "is_founder": is_founder,
        "founder_number": (total_users + 1) if is_founder else None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    token = create_token(str(result.inserted_id))
    return {"token": token, "user": user_to_response(user)}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email.strip().lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(str(user["_id"]))
    return {"token": token, "user": user_to_response(user)}


# =====================================================================
# ARENAKORE ID RECOVERY — bcrypt-secured OTP Flow
# Step 1: POST /auth/forgot-password  → generate OTP, store SHA256
# Step 2: POST /auth/verify-otp       → verify OTP, return reset_token
# Step 3: POST /auth/reset-password   → hash new password with bcrypt
# Production: replace dev_otp with real SMTP/SendGrid delivery
# =====================================================================

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Generate 6-digit OTP and store SHA256 hash in DB (10 min expiry)."""
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    # Generic response to prevent email enumeration
    if not user:
        return {"status": "sent", "message": "Se l'email esiste, riceverai il codice OTP."}

    import random as _rand
    otp_code = str(_rand.randint(100000, 999999))
    otp_hash = stdlib_json.dumps(otp_code)  # stored plain for dev; use hashlib in prod
    # Use SHA256 for OTP (faster than bcrypt; short-lived code doesn't need bcrypt cost)
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()

    await db.password_resets.delete_many({"email": email})
    await db.password_resets.insert_one({
        "email": email,
        "otp_hash": otp_hash,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
        "verified": False,
        "used": False,
    })

    # TODO PRODUCTION: send otp_code via email (SMTP / SendGrid)
    logging.info(f"[ID-RECOVERY] OTP per {email}: {otp_code}")

    # DEV MODE: return OTP in response — remove in production
    return {
        "status": "sent",
        "message": "Codice OTP generato. Controlla la tua email.",
        "dev_otp": otp_code,   # REMOVE IN PRODUCTION — solo per demo/dev
    }


@api_router.post("/auth/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    """Verify 6-digit OTP and return a short-lived reset_token."""
    email = data.email.strip().lower()
    reset = await db.password_resets.find_one({
        "email": email,
        "used": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not reset:
        raise HTTPException(status_code=400, detail="Codice OTP scaduto. Richiedi un nuovo codice.")

    submitted_hash = hashlib.sha256(data.otp.strip().encode()).hexdigest()
    if submitted_hash != reset["otp_hash"]:
        raise HTTPException(status_code=400, detail="Codice OTP non valido.")

    # Generate 15-minute reset token signed with SECRET_KEY
    reset_token = jwt.encode(
        {
            "sub": str(reset["_id"]),
            "email": email,
            "type": "password_reset",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    await db.password_resets.update_one(
        {"_id": reset["_id"]}, {"$set": {"verified": True}}
    )
    return {"status": "verified", "reset_token": reset_token}


@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """
    Use verified reset_token to update password.
    New password is hashed with bcrypt via hash_password().
    """
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Le password non corrispondono.")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password troppo corta (minimo 8 caratteri).")

    try:
        payload = jwt.decode(data.reset_token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise HTTPException(status_code=400, detail="Token non valido.")
        email = payload.get("email")
    except JWTError:
        raise HTTPException(status_code=400, detail="Token scaduto o non valido.")

    reset = await db.password_resets.find_one({
        "email": email, "verified": True, "used": False
    })
    if not reset:
        raise HTTPException(status_code=400, detail="Sessione di recupero non valida.")

    # Hash new password with bcrypt (irreversible, salted)
    new_hash = hash_password(data.new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.update_one({"_id": reset["_id"]}, {"$set": {"used": True}})

    return {"status": "success", "message": "Password aggiornata. Accedi con le nuove credenziali."}


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_response(current_user)


@api_router.get("/auth/check-username")
async def check_username(username: str):
    existing = await db.users.find_one({"username": username})
    return {"available": existing is None}


# ================================================================
# PROFILE UPDATE — Settings sync + Bio-kinetic recalculation
# ================================================================

class ProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    weight: float | None = None
    height: float | None = None
    gender: str | None = None
    language: str | None = None
    preferred_sport: str | None = None
    training_level: str | None = None

@api_router.put("/auth/update-profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}

    # Profile fields
    if data.first_name is not None:
        update_fields["first_name"] = data.first_name.strip()
    if data.last_name is not None:
        update_fields["last_name"] = data.last_name.strip()
    if data.language is not None:
        update_fields["language"] = data.language.strip().upper()

    # Username change — validate uniqueness
    if data.username is not None and data.username.strip() != current_user.get("username", ""):
        new_username = data.username.strip()
        if len(new_username) < 3:
            raise HTTPException(status_code=400, detail="Username troppo corto (min. 3 caratteri)")
        existing = await db.users.find_one({"username": new_username, "_id": {"$ne": current_user["_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Username già in uso")
        update_fields["username"] = new_username

    # Training level / Competency
    if data.training_level is not None:
        valid_levels = ["Rookie", "Amateur", "Semi-Pro", "Pro", "Elite"]
        tl = data.training_level.strip()
        if tl in valid_levels:
            update_fields["training_level"] = tl

    # Preferred sport
    if data.preferred_sport is not None:
        update_fields["preferred_sport"] = data.preferred_sport.strip()
        update_fields["sport"] = data.preferred_sport.strip()

    # Physical data — triggers bio-kinetic recalculation flag
    bio_changed = False
    if data.weight is not None:
        update_fields["weight_kg"] = data.weight
        bio_changed = True
    if data.height is not None:
        update_fields["height_cm"] = data.height
        bio_changed = True
    if data.gender is not None:
        update_fields["gender"] = data.gender.strip().upper()
        bio_changed = True

    # If physical data changed, recalculate biocinematic modifiers
    if bio_changed:
        weight = data.weight or current_user.get("weight_kg") or 70
        height = data.height or current_user.get("height_cm") or 175
        # Bio-kinetic coefficient: affects DNA scaling during NEXUS scans
        bmi = weight / ((height / 100) ** 2) if height > 0 else 22
        bio_coefficient = round(min(1.2, max(0.8, 1.0 + (22 - bmi) * 0.01)), 3)
        update_fields["bio_coefficient"] = bio_coefficient
        update_fields["bmi"] = round(bmi, 1)
        update_fields["bio_recalculated_at"] = datetime.now(timezone.utc)

    if not update_fields:
        return {"detail": "Nessuna modifica", "user": user_to_response(current_user)}

    await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_fields})
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"detail": "Profilo aggiornato", "user": user_to_response(updated)}


class ProfilePictureBody(BaseModel):
    image_base64: str  # Base64 encoded image data (can include data:image/... prefix)


@api_router.post("/user/profile-picture")
async def upload_profile_picture(body: ProfilePictureBody, current_user: dict = Depends(get_current_user)):
    """
    Upload/update profile picture. Accepts base64-encoded image.
    Stores as base64 in the user document (for MVP; move to object storage later).
    """
    raw = body.image_base64.strip()
    # Validate it's not too large (max ~2MB base64 = ~2.7M chars)
    if len(raw) > 3_000_000:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 2MB)")
    # Ensure data URI prefix
    if not raw.startswith("data:image"):
        raw = f"data:image/jpeg;base64,{raw}"

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"profile_picture": raw, "profile_picture_updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"detail": "Foto profilo aggiornata", "user": user_to_response(updated)}


@api_router.delete("/user/profile-picture")
async def delete_profile_picture(current_user: dict = Depends(get_current_user)):
    """Delete avatar / profile picture."""
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"profile_picture": "", "profile_picture_updated_at": ""}},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"detail": "Foto profilo rimossa", "user": user_to_response(updated)}



# ── COVER PHOTO (Separate Hero Background for KORE Tab) ──

class CoverPhotoBody(BaseModel):
    image_base64: str

@api_router.post("/user/cover-photo")
async def upload_cover_photo(body: CoverPhotoBody, current_user: dict = Depends(get_current_user)):
    """Upload/update KORE hero cover photo (separate from avatar)."""
    raw = body.image_base64.strip()
    if len(raw) > 3_000_000:
        raise HTTPException(status_code=400, detail="Immagine troppo grande (max 2MB)")
    if not raw.startswith("data:image"):
        raw = f"data:image/jpeg;base64,{raw}"
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"cover_photo": raw, "cover_photo_updated_at": datetime.now(timezone.utc)}},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"detail": "Foto copertina aggiornata", "user": user_to_response(updated)}


@api_router.delete("/user/cover-photo")
async def delete_cover_photo(current_user: dict = Depends(get_current_user)):
    """Delete KORE hero cover photo."""
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$unset": {"cover_photo": "", "cover_photo_updated_at": ""}},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"detail": "Foto copertina rimossa", "user": user_to_response(updated)}

@api_router.get("/user/lookup/{user_id}")
async def user_lookup(user_id: str, current_user: dict = Depends(get_current_user)):
    """Resolve a Kore ID (from QR scan) to basic public profile data."""
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    if not target:
        raise HTTPException(status_code=404, detail="Kore non trovato")

    dna_vals = list((target.get("dna") or {}).values())
    dna_avg = round(sum(dna_vals) / len(dna_vals)) if dna_vals else 0

    return {
        "id": str(target["_id"]),
        "username": target.get("username", ""),
        "avatar_color": target.get("avatar_color", "#00E5FF"),
        "level": target.get("level", 1),
        "flux": target.get("xp", 0),
        "dna_avg": dna_avg,
        "is_nexus_certified": bool(target.get("onboarding_completed") and target.get("baseline_scanned_at") and target.get("dna")),
        "is_founder": target.get("is_founder", False),
        "founder_number": target.get("founder_number"),
        "city": target.get("city"),
        "sport": target.get("sport"),
    }


@api_router.put("/auth/onboarding")
async def complete_onboarding(data: OnboardingUpdate, current_user: dict = Depends(get_current_user)):
    dna = {
        "velocita": random.randint(42, 92),
        "forza": random.randint(42, 92),
        "resistenza": random.randint(42, 92),
        "agilita": random.randint(42, 92),
        "tecnica": random.randint(42, 92),
        "potenza": random.randint(42, 92),
    }
    now_ts = datetime.now(timezone.utc)
    dna_scan_entry = {"dna": dna, "scanned_at": now_ts, "scan_type": "baseline"}
    update_data = {
        "role": data.role or "Kore Member",
        "sport": data.sport,
        "category": data.category,
        "is_versatile": data.is_versatile or False,
        "xp": 100,
        "dna": dna,
        "dna_scans": [dna_scan_entry],
        "baseline_scanned_at": now_ts,
        "onboarding_completed": True,
    }
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return user_to_response(updated)


# ====================================
# SPORTS DATABASE (50+ sport, 8 Macro-Categorie)
# ====================================

SPORTS_DATABASE = {
    "atletica": {
        "label": "ATLETICA", "icon": "🏃", "color": "#FF6B00",
        "sports": [
            {"id": "sprint", "label": "Sprint", "icon": "⚡"},
            {"id": "mezzofondo", "label": "Mezzofondo", "icon": "🏃"},
            {"id": "maratona", "label": "Maratona", "icon": "🏅"},
            {"id": "salto_alto", "label": "Salto in Alto", "icon": "🦘"},
            {"id": "salto_lungo", "label": "Salto in Lungo", "icon": "📏"},
            {"id": "lancio_peso", "label": "Lancio del Peso", "icon": "🏋️"},
            {"id": "lancio_disco", "label": "Lancio del Disco", "icon": "🥏"},
            {"id": "giavellotto", "label": "Giavellotto", "icon": "🎯"},
            {"id": "decathlon", "label": "Decathlon", "icon": "🔟"},
            {"id": "ostacoli", "label": "Corsa ad Ostacoli", "icon": "🚧"},
        ],
    },
    "combat": {
        "label": "COMBAT", "icon": "🥊", "color": "#FF3B30",
        "sports": [
            {"id": "boxe", "label": "Boxe", "icon": "🥊"},
            {"id": "mma", "label": "MMA", "icon": "🥋"},
            {"id": "kickboxing", "label": "Kickboxing", "icon": "🦶"},
            {"id": "judo", "label": "Judo", "icon": "🥋"},
            {"id": "karate", "label": "Karate", "icon": "🤛"},
            {"id": "taekwondo", "label": "Taekwondo", "icon": "🦵"},
            {"id": "wrestling", "label": "Wrestling", "icon": "💪"},
            {"id": "muay_thai", "label": "Muay Thai", "icon": "🇹🇭"},
            {"id": "bjj", "label": "Brazilian Jiu-Jitsu", "icon": "🤼"},
            {"id": "scherma", "label": "Scherma", "icon": "🤺"},
        ],
    },
    "acqua": {
        "label": "ACQUA", "icon": "🌊", "color": "#007AFF",
        "sports": [
            {"id": "nuoto", "label": "Nuoto", "icon": "🏊"},
            {"id": "pallanuoto", "label": "Pallanuoto", "icon": "🤽"},
            {"id": "tuffi", "label": "Tuffi", "icon": "🤿"},
            {"id": "surf", "label": "Surf", "icon": "🏄"},
            {"id": "canottaggio", "label": "Canottaggio", "icon": "🚣"},
            {"id": "kayak", "label": "Kayak", "icon": "🛶"},
            {"id": "vela", "label": "Vela", "icon": "⛵"},
        ],
    },
    "team": {
        "label": "TEAM SPORT", "icon": "⚽", "color": "#34C759",
        "sports": [
            {"id": "calcio", "label": "Calcio", "icon": "⚽"},
            {"id": "basket", "label": "Basket", "icon": "🏀"},
            {"id": "pallavolo", "label": "Pallavolo", "icon": "🏐"},
            {"id": "rugby", "label": "Rugby", "icon": "🏉"},
            {"id": "hockey", "label": "Hockey", "icon": "🏒"},
            {"id": "football", "label": "Football Americano", "icon": "🏈"},
            {"id": "handball", "label": "Handball", "icon": "🤾"},
            {"id": "baseball", "label": "Baseball", "icon": "⚾"},
            {"id": "cricket", "label": "Cricket", "icon": "🏏"},
        ],
    },
    "fitness": {
        "label": "FITNESS", "icon": "🏋️", "color": "#D4AF37",
        "sports": [
            {"id": "crossfit", "label": "CrossFit", "icon": "🔥"},
            {"id": "powerlifting", "label": "Powerlifting", "icon": "🏋️"},
            {"id": "bodybuilding", "label": "Bodybuilding", "icon": "💪"},
            {"id": "calisthenics", "label": "Calisthenics", "icon": "🤸"},
            {"id": "hiit", "label": "HIIT", "icon": "⏱️"},
            {"id": "functional", "label": "Functional Training", "icon": "🔄"},
            {"id": "strongman", "label": "Strongman", "icon": "🏆"},
        ],
    },
    "outdoor": {
        "label": "OUTDOOR", "icon": "🏔️", "color": "#30B0C7",
        "sports": [
            {"id": "ciclismo", "label": "Ciclismo", "icon": "🚴"},
            {"id": "trail_running", "label": "Trail Running", "icon": "🏞️"},
            {"id": "arrampicata", "label": "Arrampicata", "icon": "🧗"},
            {"id": "sci", "label": "Sci", "icon": "⛷️"},
            {"id": "snowboard", "label": "Snowboard", "icon": "🏂"},
            {"id": "skateboard", "label": "Skateboard", "icon": "🛹"},
            {"id": "parkour", "label": "Parkour", "icon": "🏃‍♂️"},
            {"id": "golf", "label": "Golf", "icon": "⛳"},
            {"id": "tennis", "label": "Tennis", "icon": "🎾"},
            {"id": "padel", "label": "Padel", "icon": "🏓"},
        ],
    },
    "mind_body": {
        "label": "MIND & BODY", "icon": "🧘", "color": "#AF52DE",
        "sports": [
            {"id": "yoga", "label": "Yoga", "icon": "🧘"},
            {"id": "pilates", "label": "Pilates", "icon": "🤸"},
            {"id": "tai_chi", "label": "Tai Chi", "icon": "☯️"},
            {"id": "ginnastica_artistica", "label": "Ginnastica Artistica", "icon": "🤸"},
            {"id": "ginnastica_ritmica", "label": "Ginnastica Ritmica", "icon": "🎀"},
            {"id": "danza", "label": "Danza", "icon": "💃"},
        ],
    },
    "extreme": {
        "label": "EXTREME", "icon": "🔥", "color": "#FF2D55",
        "sports": [
            {"id": "triathlon", "label": "Triathlon", "icon": "🏊‍♂️"},
            {"id": "ironman", "label": "Ironman", "icon": "🦾"},
            {"id": "ultra_trail", "label": "Ultra Trail", "icon": "🏔️"},
            {"id": "obstacle_race", "label": "Obstacle Race", "icon": "🏅"},
            {"id": "freerunning", "label": "Freerunning", "icon": "🤸"},
            {"id": "tiro", "label": "Tiro a Segno", "icon": "🎯"},
        ],
    },
}


@api_router.get("/sports/categories")
async def get_sport_categories():
    """Return the 8 macro-categories for onboarding Level 1"""
    categories = []
    for cat_id, cat in SPORTS_DATABASE.items():
        categories.append({
            "id": cat_id,
            "label": cat["label"],
            "icon": cat["icon"],
            "color": cat["color"],
            "sport_count": len(cat["sports"]),
        })
    return categories


@api_router.get("/sports/{category_id}")
async def get_sports_by_category(category_id: str):
    """Return sports within a specific category for onboarding Level 2"""
    if category_id not in SPORTS_DATABASE:
        raise HTTPException(status_code=404, detail="Categoria non trovata")
    cat = SPORTS_DATABASE[category_id]
    return {
        "category": cat["label"],
        "icon": cat["icon"],
        "color": cat["color"],
        "sports": cat["sports"],
    }


@api_router.get("/sports/search/{query}")
async def search_sports(query: str):
    """Smart search across all sports for the predictive search"""
    query_lower = query.lower()
    results = []
    for cat_id, cat in SPORTS_DATABASE.items():
        for sport in cat["sports"]:
            if query_lower in sport["label"].lower() or query_lower in sport["id"].lower():
                results.append({
                    **sport,
                    "category": cat_id,
                    "category_label": cat["label"],
                    "category_color": cat["color"],
                })
    return results


@api_router.get("/battles")
async def get_battles(current_user: dict = Depends(get_current_user)):
    battles = await db.battles.find().sort("created_at", -1).to_list(20)
    return [
        {
            "id": str(b["_id"]),
            "title": b["title"],
            "description": b["description"],
            "sport": b["sport"],
            "status": b["status"],
            "xp_reward": b["xp_reward"],
            "participants_count": b.get("participants_count", 0),
            "exercise": b.get("exercise", "squat"),
            "forge_mode": b.get("forge_mode", "personal"),
            "pro_level": b.get("pro_level", False),
            "dna_requirements": b.get("dna_requirements"),
        }
        for b in battles
    ]


@api_router.post("/users/push-token")
async def save_push_token(data: PushTokenData, current_user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"push_token": data.push_token}}
    )
    return {"status": "ok"}


@api_router.post("/battles/{battle_id}/participate")
async def participate_battle(battle_id: str, current_user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"_id": ObjectId(battle_id)})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle non trovata")

    # Check if already participating
    existing = await db.battle_participants.find_one({
        "battle_id": ObjectId(battle_id),
        "user_id": current_user["_id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Già iscritto a questa battle")

    await db.battle_participants.insert_one({
        "battle_id": ObjectId(battle_id),
        "user_id": current_user["_id"],
        "joined_at": datetime.now(timezone.utc),
        "completed": False,
        "score": None,
    })
    await db.battles.update_one(
        {"_id": ObjectId(battle_id)},
        {"$inc": {"participants_count": 1}}
    )
    return {"status": "joined", "battle_id": battle_id}


@api_router.post("/battles/{battle_id}/complete")
async def complete_battle(battle_id: str, current_user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"_id": ObjectId(battle_id)})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle non trovata")

    participant = await db.battle_participants.find_one({
        "battle_id": ObjectId(battle_id),
        "user_id": current_user["_id"]
    })
    if not participant:
        raise HTTPException(status_code=400, detail="Non sei iscritto a questa battle")
    if participant.get("completed"):
        raise HTTPException(status_code=400, detail="Battle già completata")

    # Calculate XP: base + performance bonus
    base_xp = battle.get("xp_reward", 100)
    bonus_xp = random.randint(10, 50)
    total_xp = base_xp + bonus_xp

    # Update participant
    await db.battle_participants.update_one(
        {"_id": participant["_id"]},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc), "score": random.randint(70, 100)}}
    )

    # Update user XP
    old_xp = current_user.get("xp", 0)
    new_xp = old_xp + total_xp
    old_level = current_user.get("level", 1)
    new_level = max(1, new_xp // 500 + 1)
    level_up = new_level > old_level

    # Update DNA stats (simulate improvement from battle)
    old_dna = current_user.get("dna") or {
        "velocita": 50, "forza": 50, "resistenza": 50,
        "agilita": 50, "tecnica": 50, "potenza": 50
    }
    new_dna = {}
    records_broken = []
    for key in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
        old_val = old_dna.get(key, 50)
        boost = random.randint(0, 5)
        new_val = min(100, old_val + boost)
        new_dna[key] = new_val
        if new_val > old_val and boost >= 3:
            records_broken.append(key)

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"xp": new_xp, "level": new_level, "dna": new_dna}}
    )

    # Save challenge result
    await db.challenge_results.insert_one({
        "user_id": current_user["_id"],
        "battle_id": ObjectId(battle_id),
        "battle_title": battle.get("title", "Challenge"),
        "sport": battle.get("sport", "Unknown"),
        "xp_earned": total_xp,
        "base_xp": base_xp,
        "bonus_xp": bonus_xp,
        "records_broken": records_broken,
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level,
        "new_dna": new_dna,
        "completed_at": datetime.now(timezone.utc),
    })

    updated = await db.users.find_one({"_id": current_user["_id"]})

    return {
        "status": "completed",
        "xp_earned": total_xp,
        "base_xp": base_xp,
        "bonus_xp": bonus_xp,
        "new_xp": new_xp,
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level,
        "records_broken": records_broken,
        "new_dna": new_dna,
        "user": user_to_response(updated),
    }


@api_router.post("/battles/{battle_id}/trigger-live")
async def trigger_live_battle(battle_id: str, current_user: dict = Depends(get_current_user)):
    # Handle both ObjectId and legacy string IDs (seeded data)
    try:
        battle = await db.battles.find_one({"_id": ObjectId(battle_id)})
        battle_filter = {"_id": ObjectId(battle_id)}
        battle_parts_filter = {"battle_id": ObjectId(battle_id)}
    except Exception:
        battle = await db.battles.find_one({"id": battle_id})
        battle_filter = {"id": battle_id}
        battle_parts_filter = {"battle_id": battle_id}
    if not battle:
        raise HTTPException(status_code=404, detail="Battle non trovata")

    await db.battles.update_one(battle_filter, {"$set": {"status": "live"}})

    # Get all participants' push tokens for notification
    participants = await db.battle_participants.find(battle_parts_filter).to_list(100)

    tokens = []
    for p in participants:
        u = await db.users.find_one({"_id": p["user_id"]})
        if u and u.get("push_token"):
            tokens.append(u["push_token"])

    return {
        "status": "live",
        "battle_title": battle.get("title"),
        "sport": battle.get("sport"),
        "notification_targets": len(tokens),
    }


@api_router.post("/challenges/complete")
async def complete_challenge(data: ChallengeComplete, current_user: dict = Depends(get_current_user)):
    """Complete a nexus trigger challenge (scan-based) without a specific battle.
    Optionally attached to a coach template push (template_push_id).
    """
    performance = data.performance_score or random.uniform(65, 98)
    duration = data.duration_seconds or random.randint(15, 60)

    # Calculate XP based on performance
    base_xp = 75
    perf_bonus = int(performance * 0.5)
    time_bonus = max(0, 30 - (duration // 10)) * 2
    total_xp = base_xp + perf_bonus + time_bonus

    old_xp = current_user.get("xp", 0)
    new_xp = old_xp + total_xp
    old_level = current_user.get("level", 1)
    new_level = max(1, new_xp // 500 + 1)
    level_up = new_level > old_level

    old_dna = current_user.get("dna") or {
        "velocita": 50, "forza": 50, "resistenza": 50,
        "agilita": 50, "tecnica": 50, "potenza": 50
    }
    new_dna = {}
    records_broken = []
    for key in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
        old_val = old_dna.get(key, 50)
        boost = random.randint(0, 4)
        new_val = min(100, old_val + boost)
        new_dna[key] = new_val
        if new_val > old_val and boost >= 3:
            records_broken.append(key)

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"xp": new_xp, "level": new_level, "dna": new_dna}}
    )

    # ── Coach Template Session completion ──
    coach_notified = False
    if data.template_push_id:
        try:
            push_oid = ObjectId(data.template_push_id)
            push_doc = await db.challenge_pushes.find_one({"_id": push_oid})
            if push_doc:
                completion_record = {
                    "user_id": current_user["_id"],
                    "username": current_user.get("username"),
                    "reps_completed": data.reps_completed,
                    "quality_score": data.quality_score,
                    "ai_feedback_score": data.ai_feedback_score,
                    "performance_score": round(performance, 1),
                    "duration_seconds": duration,
                    "xp_earned": total_xp,
                    "completed_at": datetime.utcnow(),
                }
                await db.challenge_pushes.update_one(
                    {"_id": push_oid},
                    {"$push": {"completions": completion_record}}
                )
                # Notify Coach
                coach_id = push_doc.get("coach_id")
                if coach_id:
                    await db.notifications.insert_one({
                        "user_id": coach_id,
                        "type": "training_completed",
                        "title": "SESSIONE COMPLETATA",
                        "message": (
                            f"{current_user.get('username')} ha completato '{push_doc.get('template_name')}' "
                            f"· {data.reps_completed or '?'} rep · Q{round(data.quality_score or 0)}% "
                            f"· AI Score: {round(data.ai_feedback_score or 0)}"
                        ),
                        "icon": "checkmark-circle",
                        "color": "#00F2FF",
                        "read": False,
                        "created_at": datetime.utcnow(),
                        "meta": {
                            "template_name": push_doc.get("template_name"),
                            "athlete_id": str(current_user["_id"]),
                        },
                    })
                    coach_notified = True
        except Exception:
            pass  # Non-blocking — session still succeeds

    # ── WebSocket Broadcast: notify gym coaches in real-time ──
    gym = await get_user_gym(current_user)
    if gym:
        gym_id_str = str(gym["_id"])
        await ws_manager.broadcast(gym_id_str, {
            "type": "scan_complete",
            "athlete": current_user.get("username"),
            "athlete_id": str(current_user["_id"]),
            "avatar_color": current_user.get("avatar_color", "#00F2FF"),
            "exercise": data.reps_completed and "squat" or "session",
            "reps": data.reps_completed,
            "quality": data.quality_score,
            "xp_earned": total_xp,
            "template_name": push_doc.get("template_name") if 'push_doc' in dir() and push_doc else None,
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Also save to live_events collection for polling fallback
        await db.live_events.insert_one({
            "gym_id": gym["_id"],
            "type": "scan_complete",
            "athlete": current_user.get("username"),
            "athlete_id": current_user["_id"],
            "avatar_color": current_user.get("avatar_color", "#00F2FF"),
            "reps": data.reps_completed,
            "quality": data.quality_score,
            "xp_earned": total_xp,
            "created_at": datetime.utcnow(),
        })

    updated = await db.users.find_one({"_id": current_user["_id"]})

    # Award AK Credits for scan completion
    await award_ak_credits(current_user["_id"], "nexus_scan")

    # ── PERFORMANCE RECORD: Persist full metadata ──
    is_coach_template = bool(data.template_push_id)
    tmpl_name = None
    tmpl_coach_id = None
    if is_coach_template and 'push_doc' in dir() and push_doc:
        tmpl_name = push_doc.get("template_name")
        tmpl_coach_id = str(push_doc.get("coach_id")) if push_doc.get("coach_id") else None
    await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo="COACH_PROGRAM" if is_coach_template else "ALLENAMENTO",
        modalita="INDIVIDUALE",
        disciplina=current_user.get("sport", "Fitness"),
        exercise_type="session",
        kpi={
            "primary_result": {"type": "REPS", "value": data.reps_completed or 0, "unit": "rep"},
            "quality_score": data.quality_score or 0,
        },
        is_certified=is_coach_template,
        template_name=tmpl_name,
        coach_id=tmpl_coach_id,
        validation_status="AI_VERIFIED" if is_coach_template else "UNVERIFIED",
        flux_earned=total_xp,
        extra_meta={"duration_seconds": duration},
    )

    return {
        "duration_seconds": duration,
        "xp_earned": total_xp,
        "base_xp": base_xp,
        "perf_bonus": perf_bonus,
        "time_bonus": time_bonus,
        "new_xp": new_xp,
        "level_up": level_up,
        "old_level": old_level,
        "new_level": new_level,
        "records_broken": records_broken,
        "new_dna": new_dna,
        "coach_notified": coach_notified,
        "user": user_to_response(updated),
    }


@api_router.get("/challenges/history")
async def get_challenge_history(current_user: dict = Depends(get_current_user)):
    results = await db.challenge_results.find(
        {"user_id": current_user["_id"]}
    ).sort("completed_at", -1).to_list(20)

    return [
        {
            "id": str(r["_id"]),
            "battle_title": r.get("battle_title", "Nexus Scan"),
            "sport": r.get("sport", "General"),
            "xp_earned": r.get("xp_earned", 0),
            "records_broken": r.get("records_broken", []),
            "level_up": r.get("level_up", False),
            "completed_at": r.get("completed_at", "").isoformat() if r.get("completed_at") else None,
        }
        for r in results
    ]



# =====================================================================
# VALIDATION BREAKDOWN — Compute athlete's trust reputation
# =====================================================================
@api_router.get("/validation/breakdown")
async def get_validation_breakdown(current_user: dict = Depends(get_current_user)):
    """Returns the percentage breakdown of how an athlete's challenges were validated."""
    user_id = current_user["_id"]

    # Get all completed challenges for this user
    completed = await db.challenges_engine.find({
        "user_id": user_id,
        "status": "completed",
    }).to_list(500)

    # Also check legacy challenge_results
    legacy = await db.challenge_results.find({"user_id": user_id}).to_list(500)
    total_count = len(completed) + len(legacy)

    if total_count == 0:
        return {
            "total_challenges": 0,
            "breakdown": {
                "NEXUS_VERIFIED": {"count": 0, "pct": 0},
                "GPS_VERIFIED": {"count": 0, "pct": 0},
                "BPM_CORRELATED": {"count": 0, "pct": 0},
                "AUDIO_CORRELATED": {"count": 0, "pct": 0},
                "PROXIMITY_WITNESS": {"count": 0, "pct": 0},
                "PEER_CONFIRMED": {"count": 0, "pct": 0},
                "MANUAL_ENTRY": {"count": 0, "pct": 0},
            },
            "trust_score": 0,
            "primary_method": "NONE",
        }

    # Count validation methods
    methods = {
        "NEXUS_VERIFIED": 0, "GPS_VERIFIED": 0, "BPM_CORRELATED": 0,
        "AUDIO_CORRELATED": 0, "PROXIMITY_WITNESS": 0, "PEER_CONFIRMED": 0,
        "MANUAL_ENTRY": 0,
    }

    for c in completed:
        vs = c.get("verification_status", "UNVERIFIED")
        vm = c.get("verdict", {}).get("validation_mode", "MANUAL_ENTRY")
        pt = c.get("proof_type", "NONE")
        bpm = c.get("bpm_correlation", {})
        audio = c.get("audio_analysis", {})
        pw = c.get("proximity_witness", {})

        if vs == "AI_VERIFIED" and vm in ("AUTO_COUNT", "SENSOR_IMPORT"):
            methods["NEXUS_VERIFIED"] += 1
        elif vs == "AI_VERIFIED" and pt == "GPS_IMPORT":
            methods["GPS_VERIFIED"] += 1
        elif bpm.get("status") == "BPM_CORRELATED":
            methods["BPM_CORRELATED"] += 1
        elif audio.get("status") == "AUDIO_CORRELATED":
            methods["AUDIO_CORRELATED"] += 1
        elif pw.get("witness_found"):
            methods["PROXIMITY_WITNESS"] += 1
        elif pt == "PEER_CONFIRMATION":
            methods["PEER_CONFIRMED"] += 1
        else:
            methods["MANUAL_ENTRY"] += 1

    # Legacy challenges count as NEXUS_VERIFIED (they went through scan)
    methods["NEXUS_VERIFIED"] += len(legacy)

    # Calculate percentages
    breakdown = {}
    for m, count in methods.items():
        pct = round((count / total_count) * 100, 1) if total_count > 0 else 0
        breakdown[m] = {"count": count, "pct": pct}

    # Trust score (weighted: higher-trust methods earn more trust)
    trust_weights = {
        "NEXUS_VERIFIED": 1.0, "GPS_VERIFIED": 0.9, "BPM_CORRELATED": 0.95,
        "AUDIO_CORRELATED": 0.8, "PROXIMITY_WITNESS": 0.85, "PEER_CONFIRMED": 0.7,
        "MANUAL_ENTRY": 0.3,
    }
    weighted_sum = sum(methods[m] * trust_weights[m] for m in methods)
    trust_score = round((weighted_sum / total_count) * 100) if total_count > 0 else 0

    # Find primary method
    primary = max(methods, key=methods.get)

    return {
        "total_challenges": total_count,
        "breakdown": breakdown,
        "trust_score": min(100, trust_score),
        "primary_method": primary,
    }



# =====================================================================
# UNIVERSAL DATA AGGREGATOR — Health Stack, Strava, BLE Sensors
# =====================================================================

# Data source trust levels (higher = more trusted)
SOURCE_TRUST = {
    "NEXUS_VISION": 1.0,
    "BLE_SENSOR": 0.92,
    "STRAVA": 0.88,
    "APPLE_HEALTH": 0.85,
    "GOOGLE_HEALTH": 0.85,
    "MANUAL": 0.3,
}

# Source display metadata
SOURCE_META = {
    "NEXUS_VISION":  {"icon": "eye",        "label": "NÈXUS Vision",     "color": "#00E5FF"},
    "BLE_SENSOR":    {"icon": "watch",       "label": "Sensore Diretto",  "color": "#FF9500"},
    "STRAVA":        {"icon": "bicycle",     "label": "Strava",           "color": "#FC4C02"},
    "APPLE_HEALTH":  {"icon": "heart",       "label": "Apple Health",     "color": "#FF2D55"},
    "GOOGLE_HEALTH": {"icon": "fitness",     "label": "Google Health",    "color": "#4285F4"},
    "MANUAL":        {"icon": "create",      "label": "Manuale",          "color": "#8E8E93"},
}


class HealthIngestPayload(BaseModel):
    source: str  # APPLE_HEALTH | GOOGLE_HEALTH | STRAVA | BLE_SENSOR
    data_type: str  # BPM | GPS_TRACK | WATTS | REP_COUNT | ACTIVITY_SUMMARY
    values: list  # Array of data points
    timestamp_start: Optional[str] = None  # ISO timestamp
    timestamp_end: Optional[str] = None
    challenge_id: Optional[str] = None  # Explicit match
    metadata: Optional[dict] = None  # Source-specific extra data


@api_router.post("/health/ingest")
async def ingest_health_data(data: HealthIngestPayload, current_user: dict = Depends(get_current_user)):
    """Universal data ingestion endpoint. Accepts data from any health source."""
    user_id = current_user["_id"]

    if data.source not in SOURCE_TRUST:
        raise HTTPException(400, f"Fonte non supportata: {data.source}")

    valid_types = {"BPM", "GPS_TRACK", "WATTS", "REP_COUNT", "ACTIVITY_SUMMARY", "STEPS", "CALORIES"}
    if data.data_type not in valid_types:
        raise HTTPException(400, f"Tipo dati non supportato: {data.data_type}")

    now = datetime.utcnow()

    # Parse timestamps
    ts_start = None
    ts_end = None
    try:
        if data.timestamp_start:
            ts_start = datetime.fromisoformat(data.timestamp_start.replace("Z", "+00:00")).replace(tzinfo=None)
        if data.timestamp_end:
            ts_end = datetime.fromisoformat(data.timestamp_end.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        ts_start = now - timedelta(minutes=5)
        ts_end = now

    # Store the raw health data
    health_doc = {
        "user_id": user_id,
        "source": data.source,
        "data_type": data.data_type,
        "values": data.values,
        "timestamp_start": ts_start or now,
        "timestamp_end": ts_end or now,
        "metadata": data.metadata or {},
        "ingested_at": now,
        "correlated_challenge_id": None,
    }

    # ═══ AUTO-CORRELATION: Match with active challenges ═══
    correlated_challenge = None
    tolerance = timedelta(minutes=2)

    if data.challenge_id:
        # Explicit match
        try:
            ch = await db.challenges_engine.find_one({"_id": ObjectId(data.challenge_id), "user_id": user_id})
            if ch:
                correlated_challenge = ch
                health_doc["correlated_challenge_id"] = str(ch["_id"])
        except Exception:
            pass
    elif ts_start:
        # Auto-match by time window: find challenges that overlap with the health data window
        candidates = await db.challenges_engine.find({
            "user_id": user_id,
            "status": {"$in": ["active", "in_progress", "completed"]},
            "$or": [
                {"created_at": {"$gte": ts_start - tolerance, "$lte": (ts_end or ts_start) + tolerance}},
                {"completed_at": {"$gte": ts_start - tolerance, "$lte": (ts_end or ts_start) + tolerance}},
            ]
        }).sort("created_at", -1).to_list(5)

        if candidates:
            correlated_challenge = candidates[0]
            health_doc["correlated_challenge_id"] = str(candidates[0]["_id"])

    result = await db.health_data.insert_one(health_doc)

    # If correlated with a challenge, update the challenge with source data
    if correlated_challenge:
        update_fields = {"data_sources": correlated_challenge.get("data_sources", []) + [data.source]}
        # Remove duplicates
        update_fields["data_sources"] = list(set(update_fields["data_sources"]))

        # Auto-upgrade verification based on source trust
        current_vs = correlated_challenge.get("verification_status", "UNVERIFIED")
        source_trust = SOURCE_TRUST.get(data.source, 0.3)
        if source_trust >= 0.85 and current_vs in ("UNVERIFIED", "PROOF_PENDING"):
            if data.data_type == "GPS_TRACK":
                update_fields["verification_status"] = "TECH_VERIFIED"
                update_fields["proof_type"] = "GPS_IMPORT"
            elif data.data_type == "BPM" and data.source == "BLE_SENSOR":
                update_fields["verification_status"] = "TECH_VERIFIED"
                # Inject BPM data into challenge for biometric correlation
                if data.values:
                    bpm_vals = [v.get("bpm", v) if isinstance(v, dict) else v for v in data.values if v]
                    if bpm_vals:
                        avg_bpm = sum(float(b) for b in bpm_vals) / len(bpm_vals)
                        peak_bpm = max(float(b) for b in bpm_vals)
                        update_fields["bpm_avg_external"] = round(avg_bpm, 1)
                        update_fields["bpm_peak_external"] = round(peak_bpm, 1)

        await db.challenges_engine.update_one(
            {"_id": correlated_challenge["_id"]},
            {"$set": update_fields}
        )

    return {
        "status": "ingested",
        "health_data_id": str(result.inserted_id),
        "source": data.source,
        "data_type": data.data_type,
        "data_points": len(data.values),
        "correlated_challenge_id": health_doc["correlated_challenge_id"],
        "source_trust": SOURCE_TRUST.get(data.source, 0.3),
    }


@api_router.get("/health/connections")
async def get_health_connections(current_user: dict = Depends(get_current_user)):
    """Get user's connected health services status."""
    user_id = current_user["_id"]
    user = await db.users.find_one({"_id": user_id})
    connections = user.get("health_connections", {})

    # Get last sync times per source
    sources = ["APPLE_HEALTH", "GOOGLE_HEALTH", "STRAVA", "BLE_SENSOR"]
    result = []
    for src in sources:
        conn = connections.get(src, {})
        last_sync = await db.health_data.find_one(
            {"user_id": user_id, "source": src},
            sort=[("ingested_at", -1)]
        )
        result.append({
            "source": src,
            "connected": conn.get("connected", False),
            "display_name": SOURCE_META[src]["label"],
            "icon": SOURCE_META[src]["icon"],
            "color": SOURCE_META[src]["color"],
            "last_sync": last_sync["ingested_at"].isoformat() if last_sync else None,
            "total_syncs": await db.health_data.count_documents({"user_id": user_id, "source": src}),
            "metadata": conn.get("metadata", {}),
        })
    return {"connections": result}


@api_router.post("/health/connect")
async def connect_health_service(source: str = Body(...), metadata: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
    """Connect or disconnect a health service."""
    user_id = current_user["_id"]
    if source not in SOURCE_TRUST or source == "MANUAL":
        raise HTTPException(400, "Fonte non supportata")

    user = await db.users.find_one({"_id": user_id})
    connections = user.get("health_connections", {})
    is_connected = connections.get(source, {}).get("connected", False)

    connections[source] = {
        "connected": not is_connected,
        "connected_at": datetime.utcnow() if not is_connected else None,
        "metadata": metadata if not is_connected else {},
    }

    await db.users.update_one({"_id": user_id}, {"$set": {"health_connections": connections}})
    return {"source": source, "connected": not is_connected}


# ═══ STRAVA WEBHOOK (DEMO MODE) ═══
@api_router.get("/webhooks/strava")
async def strava_webhook_verify(hub_mode: str = Query(None, alias="hub.mode"),
                                hub_challenge: str = Query(None, alias="hub.challenge"),
                                hub_verify_token: str = Query(None, alias="hub.verify_token")):
    """Strava webhook subscription verification (GET)."""
    if hub_mode == "subscribe" and hub_verify_token == "ARENAKORE_STRAVA_VERIFY":
        return {"hub.challenge": hub_challenge}
    raise HTTPException(403, "Token di verifica non valido")


@api_router.post("/webhooks/strava")
async def strava_webhook_event(request: Request):
    """Receive Strava activity events. In demo mode, log and acknowledge."""
    body = await request.json()
    event_type = body.get("aspect_type", "")
    object_type = body.get("object_type", "")
    owner_id = body.get("owner_id")

    if object_type == "activity" and event_type == "create":
        # In production: fetch activity details from Strava API
        # In demo mode: just acknowledge
        await db.strava_events.insert_one({
            "strava_owner_id": owner_id,
            "event_type": event_type,
            "object_type": object_type,
            "raw_event": body,
            "received_at": datetime.utcnow(),
            "processed": False,
        })
    return {"status": "ok"}


@api_router.post("/health/strava-demo-sync")
async def strava_demo_sync(current_user: dict = Depends(get_current_user)):
    """Simulate a Strava sync with realistic demo data."""
    user_id = current_user["_id"]

    demo_activities = [
        {
            "source": "STRAVA", "data_type": "ACTIVITY_SUMMARY",
            "values": [{
                "activity_name": "Morning Run - Parco Sempione",
                "distance_km": 8.4, "elevation_m": 45, "avg_speed_kmh": 12.6,
                "avg_bpm": 152, "max_bpm": 178, "calories": 520,
                "duration_seconds": 2400, "type": "Run",
                "segment_efforts": 3, "kudos": 12,
            }],
            "metadata": {"strava_id": f"demo_{random.randint(100000,999999)}"},
        },
        {
            "source": "STRAVA", "data_type": "GPS_TRACK",
            "values": [
                {"lat": 45.4747, "lng": 9.1794, "t": 0, "speed": 11.2},
                {"lat": 45.4752, "lng": 9.1801, "t": 120, "speed": 12.8},
                {"lat": 45.4768, "lng": 9.1815, "t": 240, "speed": 13.1},
                {"lat": 45.4780, "lng": 9.1808, "t": 360, "speed": 12.5},
                {"lat": 45.4791, "lng": 9.1795, "t": 480, "speed": 11.9},
            ],
            "metadata": {"city": "Milano", "segment": "Parco Sempione Loop"},
        },
        {
            "source": "STRAVA", "data_type": "BPM",
            "values": [
                {"t": 0, "bpm": 85}, {"t": 60, "bpm": 120}, {"t": 180, "bpm": 148},
                {"t": 300, "bpm": 155}, {"t": 600, "bpm": 162}, {"t": 900, "bpm": 158},
                {"t": 1200, "bpm": 165}, {"t": 1500, "bpm": 170}, {"t": 1800, "bpm": 175},
                {"t": 2100, "bpm": 168}, {"t": 2400, "bpm": 145},
            ],
            "metadata": {"device": "Garmin HRM-Pro Plus"},
        },
    ]

    results = []
    for act in demo_activities:
        doc = {
            "user_id": user_id, "source": act["source"], "data_type": act["data_type"],
            "values": act["values"], "metadata": act.get("metadata", {}),
            "timestamp_start": datetime.utcnow() - timedelta(hours=2),
            "timestamp_end": datetime.utcnow() - timedelta(hours=1, minutes=20),
            "ingested_at": datetime.utcnow(), "correlated_challenge_id": None,
        }
        r = await db.health_data.insert_one(doc)
        results.append({"id": str(r.inserted_id), "type": act["data_type"]})

    # Mark Strava as connected
    await db.users.update_one({"_id": user_id}, {"$set": {
        "health_connections.STRAVA": {"connected": True, "connected_at": datetime.utcnow(), "metadata": {"demo": True}},
    }})

    return {"status": "synced", "activities": results, "demo_mode": True}


@api_router.get("/health/recent")
async def get_recent_health_data(source: str = None, limit: int = 20, current_user: dict = Depends(get_current_user)):
    """Get recent health data for the user, optionally filtered by source."""
    user_id = current_user["_id"]
    query = {"user_id": user_id}
    if source:
        query["source"] = source

    docs = await db.health_data.find(query).sort("ingested_at", -1).limit(limit).to_list(limit)
    return [{
        "id": str(d["_id"]),
        "source": d["source"],
        "data_type": d["data_type"],
        "values": d["values"],
        "metadata": d.get("metadata", {}),
        "ingested_at": d["ingested_at"].isoformat(),
        "correlated_challenge_id": d.get("correlated_challenge_id"),
        "source_meta": SOURCE_META.get(d["source"], {}),
    } for d in docs]


@api_router.get("/health/source-meta")
async def get_source_metadata():
    """Get display metadata for all data sources."""
    return {"sources": SOURCE_META, "trust_levels": SOURCE_TRUST}



@api_router.get("/disciplines")
async def get_disciplines(current_user: dict = Depends(get_current_user)):
    disciplines = await db.disciplines.find().to_list(50)
    return [
        {
            "id": str(d["_id"]),
            "name": d["name"],
            "description": d["description"],
            "category": d["category"],
            "coach_only": d.get("coach_only", False),
            "icon": d.get("icon", "⚡"),
        }
        for d in disciplines
    ]


@api_router.get("/crews")
async def get_crews(current_user: dict = Depends(get_current_user)):
    crews = await db.crews.find().to_list(20)
    return [
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "sport": c["sport"],
            "members_count": c.get("members_count", 0),
            "xp_total": c.get("xp_total", 0),
        }
        for c in crews
    ]


@app.on_event("startup")
async def seed_data():
    # Start Bio-Evolution notification scheduler
    scheduler.add_job(
        check_notification_triggers,
        'interval', hours=6,
        id='bio_evolution_notif',
        replace_existing=True,
    )
    # ═══ DUEL TIMEOUT ENFORCER — Check every hour for expired 48h duels ═══
    scheduler.add_job(
        enforce_duel_timeouts,
        'interval', hours=1,
        id='duel_timeout_enforcer',
        replace_existing=True,
    )
    # ═══ QR VALIDATION TIMEOUT — Check every 15min for expired 1h QR validations ═══
    scheduler.add_job(
        enforce_qr_timeouts,
        'interval', minutes=15,
        id='qr_timeout_enforcer',
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[NotifEngine] Scheduler started — running every 6h")
    logger.info("[DuelEnforcer] Scheduler started — running every 1h")
    logger.info("[QR-Enforcer] Scheduler started — running every 15min")

    # ── Performance Records Indexes ──
    await db.performance_records.create_index([("user_id", 1), ("completed_at", -1)])
    await db.performance_records.create_index([("user_id", 1), ("tipo", 1)])
    await db.performance_records.create_index([("user_id", 1), ("disciplina", 1)])

    # THE FOUNDER PROTOCOL — Retroactive badge for first 100 users
    founder_count = await db.users.count_documents({"is_founder": True})
    if founder_count == 0:
        # Get the first 100 users by creation date and mark as founders
        early_users = await db.users.find().sort("created_at", 1).to_list(100)
        for idx, u in enumerate(early_users):
            if not u.get("is_founder"):
                await db.users.update_one(
                    {"_id": u["_id"]},
                    {"$set": {"is_founder": True, "founder_number": idx + 1}}
                )
        if early_users:
            logger.info(f"Founder Protocol: {len(early_users)} founders retroactively badged")

    if await db.battles.count_documents({}) == 0:
        battles = [
            {"title": "Sprint Challenge 100m", "description": "Chi è il più veloce? Sfida aperta a tutti gli atleti della piattaforma.", "sport": "Atletica", "status": "live", "xp_reward": 150, "participants_count": 24, "created_at": datetime.now(timezone.utc), "exercise": "squat", "forge_mode": "battle", "pro_level": False, "dna_requirements": None},
            {"title": "Power Lifting Battle", "description": "Massima potenza, minimo peso. Il rapporto perfetto tra forza e corpo.", "sport": "Powerlifting", "status": "live", "xp_reward": 200, "participants_count": 12, "created_at": datetime.now(timezone.utc), "exercise": "squat", "forge_mode": "battle", "pro_level": False, "dna_requirements": None},
            {"title": "CrossFit WOD Arena", "description": "WOD della settimana: 21-15-9 Thruster + Pull-up. Cronometro.", "sport": "CrossFit", "status": "upcoming", "xp_reward": 100, "participants_count": 45, "created_at": datetime.now(timezone.utc), "exercise": "squat", "forge_mode": "personal", "pro_level": False, "dna_requirements": None},
            {"title": "Boxe Tecnica Libera", "description": "Dimostra la tua tecnica. I Coach valutano il gesto atletico.", "sport": "Boxe", "status": "completed", "xp_reward": 120, "participants_count": 8, "created_at": datetime.now(timezone.utc), "exercise": "punch", "forge_mode": "personal", "pro_level": False, "dna_requirements": None},
            {"title": "Nuoto 50m Stile Libero", "description": "La vasca è il tuo ring. Fai il tuo miglior tempo.", "sport": "Nuoto", "status": "upcoming", "xp_reward": 180, "participants_count": 30, "created_at": datetime.now(timezone.utc), "exercise": "squat", "forge_mode": "battle", "pro_level": False, "dna_requirements": None},
            {"title": "ELITE PUNCH PROTOCOL", "description": "Accesso riservato. Solo atleti con DNA esplosivo certificato. Punch d'élite a velocità massima.", "sport": "Combat Elite", "status": "live", "xp_reward": 500, "participants_count": 3, "created_at": datetime.now(timezone.utc), "exercise": "punch", "forge_mode": "battle", "pro_level": True, "dna_requirements": {"velocita": 70, "potenza": 75}},
            {"title": "LEGENDARY SQUAT ARENA", "description": "Solo i più forti. Forza e resistenza devono essere al top per entrare.", "sport": "Strength Elite", "status": "upcoming", "xp_reward": 750, "participants_count": 1, "created_at": datetime.now(timezone.utc), "exercise": "squat", "forge_mode": "duel", "pro_level": True, "dna_requirements": {"forza": 80, "resistenza": 65}},
            {"title": "APEX PREDATOR DUEL", "description": "Il duello finale. Richiede DNA completo sopra soglia critica. Nessun margine d'errore.", "sport": "Apex Division", "status": "upcoming", "xp_reward": 1000, "participants_count": 0, "created_at": datetime.now(timezone.utc), "exercise": "punch", "forge_mode": "duel", "pro_level": True, "dna_requirements": {"velocita": 80, "forza": 80, "agilita": 75, "potenza": 85}},
        ]
        await db.battles.insert_many(battles)

    if await db.disciplines.count_documents({}) == 0:
        disciplines = [
            {"name": "Tecnica Sprint", "description": "Analisi biomeccanica della corsa veloce e del gesto atletico.", "category": "Atletica", "coach_only": False, "icon": "⚡"},
            {"name": "Strength Training", "description": "Protocolli di forza massimale, ipertrofia e potenza.", "category": "Forza", "coach_only": False, "icon": "💪"},
            {"name": "Mobilità Funzionale", "description": "Esercizi per la mobilità articolare e la flessibilità sportiva.", "category": "Recovery", "coach_only": False, "icon": "🧘"},
            {"name": "Periodizzazione Avanzata", "description": "Pianificazione del carico per atleti e coach di alto livello.", "category": "Programmazione", "coach_only": True, "icon": "📊"},
            {"name": "Nutrizione Sportiva", "description": "Protocolli nutrizionali per la performance e il recupero.", "category": "Nutrizione", "coach_only": False, "icon": "🥗"},
            {"name": "HIIT Protocol", "description": "Interval training ad alta intensità per massimizzare il VO2max.", "category": "Cardio", "coach_only": False, "icon": "🔥"},
            {"name": "Forza Esplosiva", "description": "Tecnica avanzata per sviluppare potenza e velocità di reazione.", "category": "Forza", "coach_only": True, "icon": "💥"},
            {"name": "Analisi Video Movimento", "description": "Review e correzione del gesto tecnico con feedback visivo.", "category": "Analisi", "coach_only": True, "icon": "🎬"},
        ]
        await db.disciplines.insert_many(disciplines)

    if await db.crews.count_documents({}) == 0:
        crews = [
            {"name": "Alpha Runners", "sport": "Atletica", "members_count": 23, "xp_total": 12400},
            {"name": "Iron Brotherhood", "sport": "Powerlifting", "members_count": 15, "xp_total": 9800},
            {"name": "Nexus CF Team", "sport": "CrossFit", "members_count": 34, "xp_total": 18200},
            {"name": "Strike Force", "sport": "Boxe", "members_count": 11, "xp_total": 7300},
            {"name": "Aqua Elite", "sport": "Nuoto", "members_count": 19, "xp_total": 10500},
        ]
        await db.crews.insert_many(crews)

    # ── CHICAGO CITY RANKING — Seed athletes + Migrate Stefano
    # UNCONDITIONAL: Always ensure Stefano (founder/admin) is in CHICAGO with
    # the correct DNA + XP to be guaranteed rank #1 in Chicago.
    await db.users.update_one(
        {"is_admin": True},
        {"$set": {
            "city": "CHICAGO",
            "xp": 9999,
            "level": 20,
            "dna": {
                "velocita": 87.0, "forza": 83.0, "resistenza": 91.0,
                "tecnica": 88.0, "mentalita": 94.0, "flessibilita": 79.0,
            },
        }}
    )

    chicago_seed_exists = await db.users.count_documents({"city": "CHICAGO", "is_seed": True})
    if chicago_seed_exists == 0:
        now = datetime.now(timezone.utc)
        _seed_dna_base = lambda vel,fr,res,agi,tec,pot,men,fle: {
            "velocita": vel, "forza": fr, "resistenza": res, "agilita": agi,
            "tecnica": tec, "potenza": pot, "mentalita": men, "flessibilita": fle,
        }
        chicago_athletes = [
            {
                "username": "T.BUTLER", "email": "t.butler@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 4200, "level": 9,
                "dna": _seed_dna_base(83, 81, 84, 82, 80, 83, 79, 77),
                "avatar_color": "#FF453A", "sport": "BASKETBALL", "category": "TEAM SPORT",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "ELITE", "pro_unlocked": True, "created_at": now,
            },
            {
                "username": "M.JORDAN", "email": "m.jordan@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 3800, "level": 8,
                "dna": _seed_dna_base(82, 79, 83, 80, 78, 82, 76, 74),
                "avatar_color": "#BF5AF2", "sport": "BASKETBALL", "category": "TEAM SPORT",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "ELITE", "pro_unlocked": True, "created_at": now,
            },
            {
                "username": "L.GRANT", "email": "l.grant@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 2900, "level": 6,
                "dna": _seed_dna_base(78, 76, 79, 77, 75, 78, 74, 73),
                "avatar_color": "#30D158", "sport": "ATLETICA", "category": "ATLETICA",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "ELITE", "pro_unlocked": False, "created_at": now,
            },
            {
                "username": "C.HAYES", "email": "c.hayes@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 2100, "level": 5,
                "dna": _seed_dna_base(74, 71, 78, 73, 72, 76, 70, 68),
                "avatar_color": "#FF9F0A", "sport": "BOXE", "category": "COMBAT",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "LEGACY", "pro_unlocked": False, "created_at": now,
            },
            {
                "username": "D.ROSE", "email": "d.rose@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 1500, "level": 4,
                "dna": _seed_dna_base(76, 68, 72, 75, 74, 70, 72, 71),
                "avatar_color": "#0A84FF", "sport": "ATLETICA", "category": "ATLETICA",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "LEGACY", "pro_unlocked": False, "created_at": now,
            },
            {
                "username": "K.PAYNE", "email": "k.payne@chicago.kore",
                "password_hash": hash_password("Seed@Chicago1"),
                "city": "CHICAGO", "xp": 900, "level": 3,
                "dna": _seed_dna_base(65, 68, 70, 67, 66, 69, 63, 62),
                "avatar_color": "#FFD60A", "sport": "CROSSFIT", "category": "FITNESS",
                "is_seed": True, "is_founder": False, "is_admin": False,
                "training_level": "LEGACY", "pro_unlocked": False, "created_at": now,
            },
        ]
        await db.users.insert_many(chicago_athletes)
        logger.info("[CityRanking] Seeded 6 Chicago athletes")


# ====================================
# CREW MANAGEMENT ENDPOINTS
# ====================================

@api_router.post("/crews/create")
async def create_crew(data: CrewCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.crews_v2.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Nome Crew già esistente")

    crew = {
        "name": data.name,
        "tagline": data.tagline or "",
        "category": data.category,
        "owner_id": current_user["_id"],
        "members": [current_user["_id"]],
        "members_count": 1,
        "xp_total": current_user.get("xp", 0),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.crews_v2.insert_one(crew)
    crew["_id"] = result.inserted_id

    # Add activity feed entry
    await db.crew_feed.insert_one({
        "crew_id": result.inserted_id,
        "type": "crew_created",
        "user_id": current_user["_id"],
        "username": current_user["username"],
        "message": f"{current_user['username']} ha fondato la Crew!",
        "created_at": datetime.now(timezone.utc),
    })

    return crew_to_response(crew, current_user)


@api_router.get("/crews/my-crews")
async def get_my_crews(current_user: dict = Depends(get_current_user)):
    crews = await db.crews_v2.find(
        {"members": current_user["_id"]}
    ).to_list(20)
    return [crew_to_response(c, current_user) for c in crews]


@api_router.get("/crews/invites")
async def get_pending_invites(current_user: dict = Depends(get_current_user)):
    invites = await db.crew_invites.find({
        "to_user_id": current_user["_id"],
        "status": "pending",
    }).to_list(20)

    result = []
    for inv in invites:
        crew = await db.crews_v2.find_one({"_id": inv["crew_id"]})
        from_user = await db.users.find_one({"_id": inv["from_user_id"]})
        result.append({
            "id": str(inv["_id"]),
            "crew_id": str(inv["crew_id"]),
            "crew_name": crew["name"] if crew else "Unknown",
            "crew_category": crew.get("category") if crew else None,
            "crew_tagline": crew.get("tagline", "") if crew else "",
            "from_username": from_user["username"] if from_user else "Unknown",
            "created_at": inv["created_at"].isoformat(),
        })
    return result


@api_router.post("/crews/{crew_id}/invite")
async def invite_to_crew(crew_id: str, data: CrewInvite, current_user: dict = Depends(get_current_user)):
    crew = await db.crews_v2.find_one({"_id": ObjectId(crew_id)})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")
    if current_user["_id"] not in crew["members"]:
        raise HTTPException(status_code=403, detail="Non fai parte di questa Crew")

    target = await db.users.find_one({"username": data.username})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["_id"] in crew["members"]:
        raise HTTPException(status_code=400, detail="Utente già presente")

    existing = await db.crew_invites.find_one({
        "crew_id": ObjectId(crew_id),
        "to_user_id": target["_id"],
        "status": "pending",
    })
    if existing:
        raise HTTPException(status_code=400, detail="Invito già inviato")

    await db.crew_invites.insert_one({
        "crew_id": ObjectId(crew_id),
        "from_user_id": current_user["_id"],
        "to_user_id": target["_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })

    # ── EMAIL ENGINE: Fire-and-forget crew invite email to target user
    target_email = target.get("email", "")
    if target_email:
        asyncio.create_task(
            email_service.send_crew_invite_email(
                to_email=target_email,
                to_name=target.get("username", "KORE"),
                from_name=current_user.get("username", "KORE"),
                crew_name=crew.get("name", "CREW"),
                invite_id=crew_id,
            )
        )

    return {"status": "invited", "username": data.username}


@api_router.post("/crews/invites/{invite_id}/accept")
async def accept_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    invite = await db.crew_invites.find_one({"_id": ObjectId(invite_id)})
    if not invite or invite["to_user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Invito non trovato")
    if invite["status"] != "pending":
        raise HTTPException(status_code=400, detail="Invito non più valido")

    await db.crew_invites.update_one(
        {"_id": ObjectId(invite_id)},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc)}}
    )

    crew = await db.crews_v2.find_one({"_id": invite["crew_id"]})
    if crew and current_user["_id"] not in crew["members"]:
        await db.crews_v2.update_one(
            {"_id": invite["crew_id"]},
            {
                "$push": {"members": current_user["_id"]},
                "$inc": {"members_count": 1, "xp_total": current_user.get("xp", 0)},
            }
        )

    # Activity feed
    await db.crew_feed.insert_one({
        "crew_id": invite["crew_id"],
        "type": "member_joined",
        "user_id": current_user["_id"],
        "username": current_user["username"],
        "message": f"{current_user['username']} si è unito alla Crew!",
        "created_at": datetime.now(timezone.utc),
    })

    updated = await db.crews_v2.find_one({"_id": invite["crew_id"]})
    return {"status": "accepted", "crew": crew_to_response(updated, current_user) if updated else None}


@api_router.post("/crews/invites/{invite_id}/decline")
async def decline_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    invite = await db.crew_invites.find_one({"_id": ObjectId(invite_id)})
    if not invite or invite["to_user_id"] != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Invito non trovato")

    await db.crew_invites.update_one(
        {"_id": ObjectId(invite_id)},
        {"$set": {"status": "declined"}}
    )
    return {"status": "declined"}


@api_router.get("/crews/{crew_id}")
async def get_crew_detail(crew_id: str, current_user: dict = Depends(get_current_user)):
    crew = await db.crews_v2.find_one({"_id": ObjectId(crew_id)})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")

    owner_id = crew.get("owner_id")

    # Get members with role info
    members = []
    for mid in crew.get("members", []):
        u = await db.users.find_one({"_id": mid})
        if u:
            is_coach = (mid == owner_id)
            members.append({
                "id": str(u["_id"]),
                "username": u["username"],
                "avatar_color": u.get("avatar_color", "#00F2FF"),
                "xp": u.get("xp", 0),
                "level": u.get("level", 1),
                "sport": u.get("sport"),
                "role": "Coach" if is_coach else u.get("role", "Kore Member"),
                "is_coach": is_coach,
                "dna": u.get("dna"),
            })

    # Calculate crew weighted average DNA
    crew_dna_avg = calculate_crew_weighted_average(members)

    return {
        **crew_to_response(crew, current_user),
        "members": members,
        "crew_dna_average": crew_dna_avg,
    }


@api_router.get("/crews/{crew_id}/feed")
async def get_crew_feed(crew_id: str, current_user: dict = Depends(get_current_user)):
    entries = await db.crew_feed.find(
        {"crew_id": ObjectId(crew_id)}
    ).sort("created_at", -1).to_list(30)

    return [
        {
            "id": str(e["_id"]),
            "type": e.get("type"),
            "username": e.get("username"),
            "message": e.get("message"),
            "created_at": e.get("created_at", "").isoformat() if e.get("created_at") else None,
        }
        for e in entries
    ]


@api_router.get("/crews/{crew_id}/battle-stats")
async def get_crew_battle_stats(crew_id: str, current_user: dict = Depends(get_current_user)):
    """Get the crew's weighted-average DNA from all members for crew vs crew battles"""
    crew = await db.crews_v2.find_one({"_id": ObjectId(crew_id)})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")

    members_data = []
    for mid in crew.get("members", []):
        u = await db.users.find_one({"_id": mid})
        if u:
            members_data.append({
                "xp": u.get("xp", 0),
                "dna": u.get("dna"),
            })

    crew_avg = calculate_crew_weighted_average(members_data)

    # Calculate total XP recalculated from members
    total_xp = sum(m.get("xp", 0) for m in members_data)

    return {
        "crew_id": str(crew["_id"]),
        "crew_name": crew["name"],
        "members_count": len(members_data),
        "total_xp": total_xp,
        "weighted_average_dna": crew_avg,
    }


# =====================================================================
# CREW BATTLE ENGINE — LIVE BATTLES, MATCHMAKING & SCORING
# =====================================================================

def calculate_kore_battle_score(members_data: list, total_xp: int) -> float:
    """
    KORE Battle Score: prevents 'mass vs skill' battles.
    Formula: weighted_dna_avg * 0.7 + xp_bonus_per_member * 0.3
    Max score ≈ 100 (70 from DNA + 30 from XP)
    """
    if not members_data:
        return 30.0
    weighted_avg = calculate_crew_weighted_average(members_data)
    dna_avg = sum(weighted_avg.values()) / len(weighted_avg) if weighted_avg else 50.0
    # XP bonus capped at 30pts — avg XP per member / 500 (max 500 avg XP = full bonus)
    avg_xp = total_xp / max(len(members_data), 1)
    xp_bonus = min(30.0, avg_xp / 500 * 30)
    return round(dna_avg * 0.7 + xp_bonus, 1)


@api_router.get("/battles/crew/live")
async def get_live_crew_battles(current_user: dict = Depends(get_current_user)):
    """Live crew battle dashboard — returns active battles with real-time scores"""
    battles = await db.crew_battles.find(
        {"status": {"$in": ["live", "pending"]}}
    ).sort("created_at", -1).to_list(10)

    # Find user's crews
    my_crews = await db.crews_v2.find({"members": current_user["_id"]}).to_list(5)
    my_crew_ids = {str(c["_id"]) for c in my_crews}

    result = []
    now = datetime.utcnow()
    for b in battles:
        # Auto-complete expired battles
        ends_at = b.get("ends_at")
        if ends_at and now > ends_at and b.get("status") == "live":
            crew_a_total = b.get("crew_a_kore_score", 50) + b.get("crew_a_contribution", 0)
            crew_b_total = b.get("crew_b_kore_score", 50) + b.get("crew_b_contribution", 0)
            winner_id = b["crew_a_id"] if crew_a_total >= crew_b_total else b["crew_b_id"]
            await db.crew_battles.update_one(
                {"_id": b["_id"]},
                {"$set": {"status": "completed", "winner_crew_id": winner_id}}
            )
            continue  # Skip completed

        crew_a_score = b.get("crew_a_kore_score", 50) + b.get("crew_a_contribution", 0)
        crew_b_score = b.get("crew_b_kore_score", 50) + b.get("crew_b_contribution", 0)
        total = (crew_a_score + crew_b_score) or 100

        result.append({
            "id": str(b["_id"]),
            "status": b.get("status"),
            "crew_a": {
                "id": str(b["crew_a_id"]),
                "name": b["crew_a_name"],
                "score": round(crew_a_score, 1),
                "pct": round(crew_a_score / total * 100, 1),
                "is_my_crew": str(b["crew_a_id"]) in my_crew_ids,
            },
            "crew_b": {
                "id": str(b["crew_b_id"]),
                "name": b["crew_b_name"],
                "score": round(crew_b_score, 1),
                "pct": round(crew_b_score / total * 100, 1),
                "is_my_crew": str(b["crew_b_id"]) in my_crew_ids,
            },
            "user_in_battle": str(b.get("crew_a_id")) in my_crew_ids or str(b.get("crew_b_id")) in my_crew_ids,
            "ends_at": ends_at.isoformat() if ends_at else None,
        })

    return result


@api_router.get("/battles/crew/matchmake")
async def matchmake_crew_battle(current_user: dict = Depends(get_current_user)):
    """AI Matchmaking: find crews with similar KORE Battle Score (±30% window)"""
    my_crew = await db.crews_v2.find_one({"members": current_user["_id"]})

    if not my_crew:
        top_crews = await db.crews_v2.find().sort("xp_total", -1).limit(3).to_list(3)
        return {
            "has_crew": False,
            "my_crew_name": None,
            "my_kore_score": 0,
            "suggestions": [
                {"id": str(c["_id"]), "name": c["name"],
                 "members_count": len(c.get("members", [])),
                 "kore_battle_score": 50, "score_diff": 50,
                 "is_stronger": True, "already_challenged": False}
                for c in top_crews
            ],
        }

    # My crew score
    my_members = []
    for mid in my_crew.get("members", []):
        u = await db.users.find_one({"_id": mid})
        if u:
            my_members.append({"xp": u.get("xp", 0), "dna": u.get("dna")})
    my_xp = sum(m.get("xp", 0) for m in my_members)
    my_score = calculate_kore_battle_score(my_members, my_xp)

    # Active battles to mark already-challenged crews
    active = await db.crew_battles.find({
        "$or": [{"crew_a_id": my_crew["_id"]}, {"crew_b_id": my_crew["_id"]}],
        "status": {"$in": ["pending", "live"]}
    }).to_list(20)
    challenged_ids = {str(ab.get("crew_a_id")) for ab in active} | {str(ab.get("crew_b_id")) for ab in active}

    # Find matching crews (±30%)
    all_crews = await db.crews_v2.find({"_id": {"$ne": my_crew["_id"]}}).to_list(50)
    matches = []
    for crew in all_crews:
        c_members = []
        for mid in crew.get("members", []):
            u = await db.users.find_one({"_id": mid})
            if u:
                c_members.append({"xp": u.get("xp", 0), "dna": u.get("dna")})
        c_xp = sum(m.get("xp", 0) for m in c_members)
        c_score = calculate_kore_battle_score(c_members, c_xp)
        diff_pct = abs(c_score - my_score) / max(my_score, 1)

        if diff_pct <= 0.35:  # 35% window for wider suggestions
            matches.append({
                "id": str(crew["_id"]),
                "name": crew["name"],
                "members_count": len(crew.get("members", [])),
                "kore_battle_score": round(c_score, 1),
                "score_diff": round(abs(c_score - my_score), 1),
                "is_stronger": c_score > my_score,
                "already_challenged": str(crew["_id"]) in challenged_ids,
                "category": crew.get("category", ""),
            })

    matches.sort(key=lambda x: x["score_diff"])
    return {
        "has_crew": True,
        "my_crew_id": str(my_crew["_id"]),
        "my_crew_name": my_crew["name"],
        "my_kore_score": round(my_score, 1),
        "suggestions": matches[:3],
    }


@api_router.post("/battles/crew/challenge")
async def challenge_crew_to_battle(data: CrewChallengeRequest, current_user: dict = Depends(get_current_user)):
    """Challenge a crew to a live battle — costs FLUX"""
    my_crew = await db.crews_v2.find_one({"members": current_user["_id"]})
    if not my_crew:
        raise HTTPException(status_code=400, detail="Devi essere in una crew")

    # ── FLUX FEE for Crew Challenge ──
    fee = FLUX_PUBLISH_FEES.get("crew", 15)
    user_flux = current_user.get("xp", 0)
    if user_flux < fee:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "FLUX_INSUFFICIENT",
                "message": f"Servono {fee} FLUX per sfidare una Crew. Hai {user_flux} FLUX.",
                "required": fee,
                "current": user_flux,
            }
        )

    # Deduct fee
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"xp": -fee, "flux": -fee}}
    )
    await db.flux_transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "crew_challenge_fee",
        "amount": -fee,
        "description": "Fee sfida Crew vs Crew",
        "created_at": datetime.now(timezone.utc),
    })

    try:
        opp_crew = await db.crews_v2.find_one({"_id": ObjectId(data.crew_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Crew non trovata")
    if not opp_crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")
    if str(my_crew["_id"]) == data.crew_id:
        raise HTTPException(status_code=400, detail="Non puoi sfidare la tua crew")

    existing = await db.crew_battles.find_one({
        "$or": [
            {"crew_a_id": my_crew["_id"], "crew_b_id": opp_crew["_id"]},
            {"crew_a_id": opp_crew["_id"], "crew_b_id": my_crew["_id"]},
        ],
        "status": {"$in": ["pending", "live"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Sfida già attiva con questa crew")

    # Matchmaking guard: reject if KORE scores differ by >40%
    my_members, opp_members = [], []
    for mid in my_crew.get("members", []):
        u = await db.users.find_one({"_id": mid})
        if u:
            my_members.append({"xp": u.get("xp", 0), "dna": u.get("dna")})
    for mid in opp_crew.get("members", []):
        u = await db.users.find_one({"_id": mid})
        if u:
            opp_members.append({"xp": u.get("xp", 0), "dna": u.get("dna")})

    my_score = calculate_kore_battle_score(my_members, sum(m.get("xp", 0) for m in my_members))
    opp_score = calculate_kore_battle_score(opp_members, sum(m.get("xp", 0) for m in opp_members))
    diff_pct = abs(my_score - opp_score) / max(max(my_score, opp_score), 1)
    if diff_pct > 0.45:
        raise HTTPException(status_code=400, detail=f"Livelli troppo diversi — differenza {round(diff_pct*100)}%. Usa il Matchmaking AI.")

    now = datetime.utcnow()
    battle_doc = {
        "crew_a_id": my_crew["_id"],
        "crew_a_name": my_crew["name"],
        "crew_a_kore_score": my_score,
        "crew_a_contribution": 0.0,
        "crew_b_id": opp_crew["_id"],
        "crew_b_name": opp_crew["name"],
        "crew_b_kore_score": opp_score,
        "crew_b_contribution": 0.0,
        "status": "live",
        "created_by": current_user["_id"],
        "started_at": now,
        "ends_at": now + timedelta(hours=data.duration_hours),
        "created_at": now,
    }
    result = await db.crew_battles.insert_one(battle_doc)

    # Notify sleeping members of both crews
    all_member_ids = list(my_crew.get("members", [])) + list(opp_crew.get("members", []))
    for mid in all_member_ids:
        if mid != current_user["_id"]:
            await db.notifications.insert_one({
                "user_id": mid,
                "type": "battle_started",
                "title": "BATTLE LIVE",
                "message": f"{my_crew['name']} ha sfidato {opp_crew['name']}! Contribuisci ora.",
                "icon": "flash",
                "color": "#FF453A",
                "read": False,
                "created_at": now,
            })

    return {
        "status": "battle_started",
        "battle_id": str(result.inserted_id),
        "crew_a": {"name": my_crew["name"], "score": my_score},
        "crew_b": {"name": opp_crew["name"], "score": opp_score},
        "ends_at": battle_doc["ends_at"].isoformat(),
    }


@api_router.post("/battles/crew/{battle_id}/contribute")
async def contribute_to_crew_battle(battle_id: str, data: BattleContributeRequest, current_user: dict = Depends(get_current_user)):
    """Log a NEXUS scan contribution to a live crew battle"""
    try:
        battle = await db.crew_battles.find_one({"_id": ObjectId(battle_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Battle non trovata")
    if not battle or battle.get("status") != "live":
        raise HTTPException(status_code=400, detail="Battle non è live")

    now = datetime.utcnow()
    if battle.get("ends_at") and now > battle["ends_at"]:
        raise HTTPException(status_code=400, detail="Battle terminata")

    in_a = await db.crews_v2.find_one({"_id": battle["crew_a_id"], "members": current_user["_id"]})
    in_b = await db.crews_v2.find_one({"_id": battle["crew_b_id"], "members": current_user["_id"]})
    if not in_a and not in_b:
        raise HTTPException(status_code=403, detail="Non sei in nessuna delle due crew")

    # Weighted contribution: quality × (1 + xp/10000) × 5pts base
    user_xp = current_user.get("xp", 100)
    contribution_pts = round((data.quality_score / 100) * (1 + user_xp / 10000) * 5, 2)
    field = "crew_a_contribution" if in_a else "crew_b_contribution"
    await db.crew_battles.update_one({"_id": ObjectId(battle_id)}, {"$inc": {field: contribution_pts}})

    # Record individual contribution for the live feed
    crew_side = "A" if in_a else "B"
    crew_name = battle["crew_a_name"] if in_a else battle["crew_b_name"]
    await db.battle_feed.insert_one({
        "battle_id": battle_id,
        "user_id": str(current_user["_id"]),
        "username": current_user.get("username", "Kore"),
        "crew_side": crew_side,
        "crew_name": crew_name,
        "contribution_pts": contribution_pts,
        "quality_score": data.quality_score,
        "reps": getattr(data, 'reps', 0),
        "created_at": now,
    })

    # Recalculate weighted averages for both crews
    all_contribs_a = await db.battle_feed.find({"battle_id": battle_id, "crew_side": "A"}).to_list(200)
    all_contribs_b = await db.battle_feed.find({"battle_id": battle_id, "crew_side": "B"}).to_list(200)

    def weighted_avg(contribs):
        if not contribs:
            return 0
        total_weight = sum(c.get("quality_score", 50) for c in contribs)
        if total_weight == 0:
            return 0
        return sum(c["contribution_pts"] * (c.get("quality_score", 50) / total_weight) for c in contribs) * len(contribs)

    new_a_contrib = round(weighted_avg(all_contribs_a), 2)
    new_b_contrib = round(weighted_avg(all_contribs_b), 2)
    await db.crew_battles.update_one(
        {"_id": ObjectId(battle_id)},
        {"$set": {"crew_a_contribution": new_a_contrib, "crew_b_contribution": new_b_contrib,
                  "crew_a_active_members": len(set(c["user_id"] for c in all_contribs_a)),
                  "crew_b_active_members": len(set(c["user_id"] for c in all_contribs_b))}}
    )

    updated = await db.crew_battles.find_one({"_id": ObjectId(battle_id)})
    a_score = updated.get("crew_a_kore_score", 0) + updated.get("crew_a_contribution", 0)
    b_score = updated.get("crew_b_kore_score", 0) + updated.get("crew_b_contribution", 0)

    # Proactive: if losing by >15pts, notify sleeping members
    my_side_score = a_score if in_a else b_score
    opp_score = b_score if in_a else a_score
    if opp_score - my_side_score > 15:
        losing_crew_id = battle["crew_a_id"] if in_a else battle["crew_b_id"]
        losing_crew = await db.crews_v2.find_one({"_id": losing_crew_id})
        if losing_crew:
            for mid in losing_crew.get("members", []):
                existing_notif = await db.notifications.find_one({
                    "user_id": mid, "type": "battle_losing",
                    "created_at": {"$gte": now - timedelta(hours=1)}
                })
                if not existing_notif:
                    await db.notifications.insert_one({
                        "user_id": mid, "type": "battle_losing",
                        "title": "CREW IN PERICOLO",
                        "message": f"La tua crew sta perdendo di {round(opp_score - my_side_score, 1)} punti! Fai un NEXUS Scan.",
                        "icon": "warning", "color": "#FF9500",
                        "read": False, "created_at": now,
                    })

    # ── PERFORMANCE RECORD: Persist Crew Battle contribution ──
    my_crew_id = str(battle["crew_a_id"]) if in_a else str(battle["crew_b_id"])
    await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo="CREW_BATTLE",
        modalita="CREW",
        crew_id=my_crew_id,
        disciplina=current_user.get("sport", "Fitness"),
        exercise_type=data.exercise_type,
        kpi={
            "primary_result": {"type": "PUNTEGGIO", "value": contribution_pts, "unit": "pts"},
            "quality_score": data.quality_score,
        },
        is_certified=False,
        validation_status="AI_VERIFIED",
        flux_earned=0,
        source_id=battle_id,
        source_collection="crew_battles",
    )

    return {
        "status": "contributed",
        "contribution_pts": contribution_pts,
        "crew_side": "A" if in_a else "B",
        "crew_a_score": round(a_score, 1),
        "crew_b_score": round(b_score, 1),
    }


@api_router.get("/battles/crew/{battle_id}/detail")
async def get_crew_battle_detail(battle_id: str, current_user: dict = Depends(get_current_user)):
    """Get full battle detail with power bar, weighted averages, and live feed."""
    try:
        battle = await db.crew_battles.find_one({"_id": ObjectId(battle_id)})
    except Exception:
        raise HTTPException(404, "Battle non trovata")
    if not battle:
        raise HTTPException(404, "Battle non trovata")

    a_base = battle.get("crew_a_kore_score", 50)
    b_base = battle.get("crew_b_kore_score", 50)
    a_contrib = battle.get("crew_a_contribution", 0)
    b_contrib = battle.get("crew_b_contribution", 0)
    a_total = a_base + a_contrib
    b_total = b_base + b_contrib
    grand_total = a_total + b_total or 100

    # Live feed (last 20 entries)
    feed = await db.battle_feed.find(
        {"battle_id": battle_id}
    ).sort("created_at", -1).to_list(20)

    feed_entries = []
    for f in reversed(feed):
        feed_entries.append({
            "username": f.get("username", "Kore"),
            "crew_side": f.get("crew_side"),
            "crew_name": f.get("crew_name", ""),
            "pts": round(f.get("contribution_pts", 0), 1),
            "reps": f.get("reps", 0),
            "quality": f.get("quality_score", 0),
            "time": f.get("created_at").isoformat() if f.get("created_at") else None,
        })

    return {
        "id": str(battle["_id"]),
        "status": battle.get("status"),
        "ends_at": battle.get("ends_at").isoformat() if battle.get("ends_at") else None,
        "crew_a": {
            "name": battle["crew_a_name"],
            "base_score": round(a_base, 1),
            "contribution": round(a_contrib, 1),
            "total": round(a_total, 1),
            "pct": round(a_total / grand_total * 100, 1),
            "active_members": battle.get("crew_a_active_members", 0),
        },
        "crew_b": {
            "name": battle["crew_b_name"],
            "base_score": round(b_base, 1),
            "contribution": round(b_contrib, 1),
            "total": round(b_total, 1),
            "pct": round(b_total / grand_total * 100, 1),
            "active_members": battle.get("crew_b_active_members", 0),
        },
        "feed": feed_entries,
    }



async def search_users(query: str, current_user: dict = Depends(get_current_user)):
    """Search users by username for crew invites"""
    users = await db.users.find({
        "username": {"$regex": query, "$options": "i"},
        "_id": {"$ne": current_user["_id"]},
    }).to_list(10)
    return [
        {
            "id": str(u["_id"]),
            "username": u["username"],
            "avatar_color": u.get("avatar_color", "#00F2FF"),
            "xp": u.get("xp", 0),
            "level": u.get("level", 1),
        }
        for u in users
    ]


# ====================================
# PVP CHALLENGE ENGINE — SPRINT 19
# ====================================

DISCIPLINE_CONFIG = {
    "power":     {"exercise": "squat",  "duration": 30,  "label": "POWER",     "xp_multiplier": 1.2, "dna_keys": ["forza", "potenza"]},
    "agility":   {"exercise": "punch",  "duration": 30,  "label": "AGILITY",   "xp_multiplier": 1.2, "dna_keys": ["velocita", "agilita"]},
    "endurance": {"exercise": "squat",  "duration": 60,  "label": "ENDURANCE", "xp_multiplier": 1.5, "dna_keys": ["resistenza", "potenza"]},
}


def validate_scan_anti_cheat(reps: int, quality_score: float, duration_seconds: int, target_duration: int) -> dict:
    """AI Anti-Cheat: validates scan integrity. Returns score 0-100 + issues."""
    issues = []
    score = 100

    # Rep rate check (reasonable: 0.2–1.5 reps/sec)
    if duration_seconds > 0:
        rep_rate = reps / max(duration_seconds, 1)
        if rep_rate > 1.8:
            issues.append("REP_RATE_TOO_HIGH")
            score -= 40
        elif rep_rate < 0.08 and reps > 5:
            issues.append("REP_RATE_INCONSISTENT")
            score -= 20

    # Perfect quality is suspicious when paired with high reps
    if quality_score >= 97 and reps >= 15:
        issues.append("QUALITY_TOO_PERFECT")
        score -= 25

    # Duration must be within ±30% of target
    if target_duration > 0:
        ratio = duration_seconds / target_duration
        if ratio < 0.5:
            issues.append("DURATION_TOO_SHORT")
            score -= 35
        elif ratio > 2.5:
            issues.append("DURATION_TOO_LONG")
            score -= 10

    # Minimum effort check
    if duration_seconds >= 20 and reps < 2:
        issues.append("TOO_FEW_REPS")
        score -= 20

    return {"score": max(0, score), "issues": issues, "valid": max(0, score) >= 60}


# ================================================================
# COACH STUDIO ENGINE — Desktop Command Center
# ================================================================

DNA_KEYS = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
DNA_LABELS = {"velocita": "Velocità", "forza": "Forza", "resistenza": "Resistenza",
              "agilita": "Agilità", "tecnica": "Tecnica", "potenza": "Potenza"}

EXERCISE_DNA_MAP = {
    "squat":   ["forza", "resistenza", "potenza"],
    "punch":   ["velocita", "agilita", "potenza"],
    "lunge":   ["resistenza", "agilita", "tecnica"],
    "press":   ["forza", "potenza", "tecnica"],
    "plank":   ["resistenza", "tecnica", "forza"],
    "sprint":  ["velocita", "potenza", "agilita"],
}


def build_athlete_profile(user: dict, last_scan: dict | None = None, compliance_pct: float = 0) -> dict:
    dna = user.get("dna") or {}
    dna_avg = round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1) if dna else 0
    return {
        "id": str(user["_id"]),
        "username": user.get("username", ""),
        "level": user.get("level", 1),
        "xp": user.get("xp", 0),
        "sport": user.get("sport", "—"),
        "role": user.get("role", "ATHLETE"),
        "dna": {k: dna.get(k, 50) for k in DNA_KEYS},
        "dna_avg": dna_avg,
        "kore_score": dna_avg,
        "avatar_color": user.get("avatar_color", "#00F2FF"),
        "last_scan_at": last_scan.get("scanned_at").isoformat() if last_scan and last_scan.get("scanned_at") else None,
        "days_since_scan": (datetime.utcnow() - last_scan["scanned_at"]).days if last_scan and last_scan.get("scanned_at") else None,
        "compliance_pct": round(compliance_pct, 1),
    }


@api_router.get("/coach/athletes")
async def get_coach_athletes(
    sort_by: str = "dna_avg",
    sort_order: str = "desc",
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Coach Studio — Athlete analytics table with filters"""
    # Get all crews where current user is coach/owner
    coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(20)
    all_member_ids = list({mid for crew in coach_crews for mid in crew.get("members", [])})

    # Fallback: if no crew, return sample athletes for demo
    if not all_member_ids:
        athletes = await db.users.find({"_id": {"$ne": current_user["_id"]}}).limit(12).to_list(12)
    else:
        athletes = await db.users.find({"_id": {"$in": all_member_ids}}).to_list(50)

    # Get compliance data
    pushes = await db.challenge_pushes.find(
        {"coach_id": current_user["_id"], "status": "active"}
    ).to_list(20)

    profiles = []
    for user in athletes:
        # Last scan
        last_scan = await db.scan_results.find_one(
            {"user_id": user["_id"]}, sort=[("scanned_at", -1)]
        )
        # Compliance: how many pushed templates did this athlete complete?
        completed = sum(
            1 for push in pushes
            for completion in push.get("completions", [])
            if completion.get("user_id") == user["_id"]
        )
        compliance_pct = (completed / max(len(pushes), 1)) * 100 if pushes else 0
        profiles.append(build_athlete_profile(user, last_scan, compliance_pct))

    # Filter
    if min_score is not None:
        profiles = [p for p in profiles if p["dna_avg"] >= min_score]
    if max_score is not None:
        profiles = [p for p in profiles if p["dna_avg"] <= max_score]

    # Sort
    reverse = sort_order == "desc"
    profiles.sort(key=lambda p: p.get(sort_by, 0) or 0, reverse=reverse)

    return {
        "athletes": profiles,
        "total": len(profiles),
        "crew_count": len(coach_crews),
    }


@api_router.get("/coach/compliance")
async def get_coach_compliance(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Coach Studio — Template compliance chart data"""
    pushes = await db.challenge_pushes.find(
        {"coach_id": current_user["_id"]}
    ).sort("pushed_at", -1).to_list(20)

    result = []
    for push in pushes:
        crew = await db.crews_v2.find_one({"_id": push.get("crew_id")})
        total_athletes = len(crew.get("members", [])) if crew else 1
        completions = push.get("completions", [])
        unique_completers = len({str(c.get("user_id")) for c in completions})
        pct = round((unique_completers / max(total_athletes, 1)) * 100, 1)
        avg_quality = round(
            sum(c.get("quality_score", 0) for c in completions) / max(len(completions), 1), 1
        ) if completions else 0
        avg_reps = round(
            sum(c.get("reps_completed", 0) for c in completions) / max(len(completions), 1), 1
        ) if completions else 0
        result.append({
            "push_id": str(push["_id"]),
            "template_name": push.get("template_name", "—"),
            "crew_name": crew["name"] if crew else "—",
            "pushed_at": push["pushed_at"].isoformat() if push.get("pushed_at") else None,
            "total_athletes": total_athletes,
            "completers": unique_completers,
            "compliance_pct": pct,
            "avg_quality": avg_quality,
            "avg_reps": avg_reps,
            "completions": [
                {"username": c.get("username", "?"), "quality": c.get("quality_score", 0),
                 "reps": c.get("reps_completed", 0), "ai_score": c.get("ai_feedback_score", 0)}
                for c in completions
            ],
        })

    return {"templates": result, "total": len(result)}


@api_router.get("/coach/radar")
async def get_coach_radar(
    ids: str = "",
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Coach Studio — DNA Radar data for up to 4 athletes comparison"""
    id_list = [i.strip() for i in ids.split(",") if i.strip()][:4]
    athletes = []
    for aid in id_list:
        try:
            user = await db.users.find_one({"_id": ObjectId(aid)})
            if user:
                dna = user.get("dna") or {}
                athletes.append({
                    "id": str(user["_id"]),
                    "username": user.get("username"),
                    "avatar_color": user.get("avatar_color", "#00F2FF"),
                    "dna": {k: dna.get(k, 50) for k in DNA_KEYS},
                    "dna_avg": round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1),
                })
        except Exception:
            pass
    # Group stats
    if athletes:
        group_dna = {k: round(sum(a["dna"][k] for a in athletes) / len(athletes), 1) for k in DNA_KEYS}
    else:
        group_dna = {k: 50 for k in DNA_KEYS}

    return {"athletes": athletes, "group_avg": group_dna, "labels": DNA_LABELS}


@api_router.post("/coach/ai-suggestion")
async def get_ai_training_suggestion(
    data: dict,
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Coach Studio AI — Suggest training plan based on group DNA"""
    athlete_ids = data.get("athlete_ids", [])[:12]
    focus_attribute = data.get("focus_attribute", None)

    # Load athletes
    athletes_data = []
    for aid in athlete_ids:
        try:
            user = await db.users.find_one({"_id": ObjectId(aid)})
            if user:
                athletes_data.append(user.get("dna") or {})
        except Exception:
            pass

    if not athletes_data:
        # Demo suggestion
        return {
            "group_avg": {k: 65 for k in DNA_KEYS},
            "weakest": "resistenza",
            "strongest": "velocita",
            "suggestion": _build_suggestion({k: 65 for k in DNA_KEYS}),
        }

    group_avg = {k: round(sum(d.get(k, 50) for d in athletes_data) / len(athletes_data), 1) for k in DNA_KEYS}
    weakest = min(group_avg, key=lambda k: group_avg[k])
    strongest = max(group_avg, key=lambda k: group_avg[k])
    target = focus_attribute if focus_attribute in DNA_KEYS else weakest

    return {
        "group_avg": group_avg,
        "athlete_count": len(athletes_data),
        "weakest": weakest,
        "strongest": strongest,
        "suggestion": _build_suggestion(group_avg, target),
    }


def _build_suggestion(group_avg: dict, focus: str = None) -> dict:
    """Build AI training suggestion based on group DNA averages"""
    focus = focus or min(group_avg, key=lambda k: group_avg[k])
    focus_val = group_avg.get(focus, 60)

    # Intensity tier based on group average
    group_mean = sum(group_avg.values()) / len(group_avg)
    if group_mean < 55:
        intensity = "low"
        base_reps, base_time = 10, 40
    elif group_mean < 72:
        intensity = "medium"
        base_reps, base_time = 15, 50
    else:
        intensity = "high"
        base_reps, base_time = 20, 60

    # Build exercise blocks targeting the weakest attribute
    exercises_for_focus = [ex for ex, attrs in EXERCISE_DNA_MAP.items() if focus in attrs]
    primary_ex = exercises_for_focus[0] if exercises_for_focus else "squat"
    secondary_ex = [e for e in ["squat", "punch", "sprint", "plank"] if e != primary_ex][0]

    return {
        "focus_attribute": focus,
        "focus_label": DNA_LABELS.get(focus, focus),
        "group_mean": round(group_mean, 1),
        "intensity": intensity,
        "blocks": [
            {
                "exercise": primary_ex,
                "label": primary_ex.upper(),
                "reps": base_reps,
                "duration_seconds": base_time,
                "sets": 3,
                "rest_seconds": 60,
                "rationale": f"Migliora {DNA_LABELS.get(focus, focus)} (attuale: {focus_val})"
            },
            {
                "exercise": secondary_ex,
                "label": secondary_ex.upper(),
                "reps": max(8, base_reps - 4),
                "duration_seconds": max(30, base_time - 15),
                "sets": 2,
                "rest_seconds": 45,
                "rationale": "Mantenimento forza complementare"
            },
        ],
        "total_duration_min": round((base_time * 5 + 60 * 4) / 60, 0),
        "xp_reward": int(base_reps * 10 + (30 if intensity == "high" else 15)),
        "ai_note": f"Gruppo di {len(group_avg)} attributi: media {round(group_mean, 0)}. Focus su {DNA_LABELS.get(focus, focus)} ({focus_val}/100). Volume calibrato su intensità {intensity.upper()}.",
    }


# ================================================================
# TALENT SCOUT ENGINE — DNA-Relative Discovery & Drafting
# ================================================================

def calculate_dna_relative_score(user: dict) -> float:
    """
    DNA-Relative Score: identifies athletes expressing high potential
    relative to their level and biometric base.
    Formula: dna_avg × (1 + talent_factor) where talent_factor rewards
    lower-level athletes with high DNA (diamonds in the rough).
    """
    dna = user.get("dna") or {}
    dna_vals = [dna.get(k, 50) for k in DNA_KEYS]
    if not dna_vals:
        return 0.0
    dna_avg = sum(dna_vals) / len(dna_vals)
    level = user.get("level", 1)
    xp = user.get("xp", 0)
    # Lower-level athletes with high DNA get a higher talent multiplier
    # (a level-3 athlete with 80 avg DNA is more "promising" than a level-10 with 80)
    talent_factor = max(0, (10 - min(level, 10)) / 10) * 0.35
    # XP efficiency bonus: athletes who achieve high DNA with less XP
    xp_efficiency = max(0, 1 - (xp / 10000)) * 0.15  # Bonus for less-grinded athletes
    relative_score = dna_avg * (1 + talent_factor + xp_efficiency)
    return round(min(relative_score, 110), 1)  # Cap at 110 (exceptional talent)


@api_router.get("/talent/discovery")
async def talent_discovery(
    sort_by: str = "efficiency_ratio",
    sort_order: str = "desc",
    city: Optional[str] = None,
    country: Optional[str] = None,
    continent: Optional[str] = None,
    discipline: Optional[str] = None,
    crew_status: Optional[str] = None,
    min_dna: Optional[float] = None,
    min_efficiency: Optional[float] = None,
    limit: int = 20,
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Talent Scout: Efficiency Ratio = diamonds-in-the-rough formula"""
    filters: dict = {"ghost_mode": {"$ne": True}, "scout_visible": {"$ne": False}}
    if city:
        filters["city"] = {"$regex": city, "$options": "i"}
    elif country:
        filters["city"] = {"$regex": country, "$options": "i"}
    elif continent:
        CONT = {"EU":["MILANO","ROMA","PARIS","MADRID","LONDON","BERLIN"],
                "NA":["CHICAGO","NEW YORK","LOS ANGELES","TORONTO"],
                "AS":["TOKYO","SEOUL","DUBAI","SINGAPORE"],"SA":["SAO PAULO"],"AF":["LAGOS"],"OC":["SYDNEY"]}
        cities = CONT.get(continent.upper(), [])
        if cities:
            filters["city"] = {"$in": cities}

    athletes = await db.users.find(filters).limit(200).to_list(200)
    profiles = []
    for user in athletes:
        if str(user["_id"]) == str(current_user["_id"]):
            continue
        dna = user.get("dna") or {}
        dna_vals = [dna.get(k, 50) for k in DNA_KEYS]
        dna_avg = round(sum(dna_vals) / len(dna_vals), 1) if dna_vals else 0
        level = user.get("level", 1)
        efficiency_ratio = round(min(150, dna_avg * (11 - min(level, 10)) / 10), 1)
        relative = calculate_dna_relative_score(user)
        if min_dna is not None and dna_avg < min_dna:
            continue
        if min_efficiency is not None and efficiency_ratio < min_efficiency:
            continue
        # Discipline filter
        if discipline:
            DISC_MAP = {"endurance":["resistenza"],"power":["forza","potenza"],"agility":["velocita","agilita"],"mobility":["agilita","tecnica"]}
            keys = DISC_MAP.get(discipline, [])
            if keys and (sum(dna.get(k,50) for k in keys)/max(len(keys),1)) < 65:
                continue
        # Crew status
        crews = await db.crews_v2.find({"members": user["_id"]}).to_list(3)
        is_in_crew = len(crews) > 0
        if crew_status == "free_agent" and is_in_crew:
            continue
        if crew_status == "in_crew" and not is_in_crew:
            continue
        already_drafted = await db.talent_drafts.find_one({"coach_id": current_user["_id"], "athlete_id": user["_id"]})
        is_certified = bool(user.get("onboarding_completed") and user.get("dna"))
        dom_key = max(DNA_KEYS, key=lambda k: dna.get(k, 50)) if dna else "forza"
        disc_label = {"resistenza":"ENDURANCE","forza":"POWER","potenza":"POWER","velocita":"AGILITY","agilita":"AGILITY","tecnica":"TECHNIQUE"}.get(dom_key,"GENERAL")
        profiles.append({
            "id": str(user["_id"]),
            "username": user.get("username"),
            "city": user.get("city", "—"),
            "sport": user.get("sport", "—"),
            "level": level,
            "xp": user.get("xp", 0),
            "avatar_color": user.get("avatar_color", "#00F2FF"),
            "dna_avg": dna_avg,
            "dna": {k: dna.get(k, 50) for k in DNA_KEYS},
            "efficiency_ratio": efficiency_ratio,
            "relative_score": relative,
            "talent_tier": "ELITE" if relative >= 95 else "PRO" if relative >= 80 else "RISING" if relative >= 65 else "SCOUT",
            "dominant_discipline": disc_label,
            "is_certified": is_certified,
            "is_free_agent": not is_in_crew,
            "crews": [c.get("name") for c in crews],
            "already_drafted": bool(already_drafted),
        })
    sort_key = {"efficiency_ratio":"efficiency_ratio","dna_avg":"dna_avg","relative_score":"relative_score","level":"level","xp":"xp"}.get(sort_by,"efficiency_ratio")
    profiles.sort(key=lambda p: p.get(sort_key, 0) or 0, reverse=sort_order == "desc")
    return {"athletes": profiles[:limit], "total": len(profiles),
            "filters": {"city": city, "country": country, "continent": continent, "discipline": discipline, "crew_status": crew_status}}



@api_router.get("/talent/report/{athlete_id}")
async def get_talent_report(athlete_id: str, coach_note: str = "", current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Generate a full Talent Report for one athlete (trading-card style)"""
    try:
        user = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if not user:
        raise HTTPException(status_code=404, detail="Kore non trovato")

    dna = user.get("dna") or {}
    dna_vals = [dna.get(k, 50) for k in DNA_KEYS]
    dna_avg = round(sum(dna_vals) / len(dna_vals), 1) if dna_vals else 50
    level = user.get("level", 1)
    xp = user.get("xp", 0)
    efficiency = round(min(150, dna_avg * (11 - min(level, 10)) / 10), 1)

    # World average DNA (computed from all users with dna)
    all_users = await db.users.find({"dna": {"$ne": None}}, {"dna": 1}).to_list(100)
    if all_users:
        world_avg = {}
        for k in DNA_KEYS:
            vals = [u.get("dna", {}).get(k, 50) for u in all_users if u.get("dna")]
            world_avg[k] = round(sum(vals) / len(vals), 1) if vals else 50
    else:
        world_avg = {k: 60 for k in DNA_KEYS}

    # KORE Score + injury risk
    six_axis = compute_six_axis(user)
    kore = compute_kore_score(user, [])
    injury = compute_injury_risk_detail(six_axis)

    # Last 6 scans for trend
    scans = await db.scan_results.find({"user_id": user["_id"]}).sort("scanned_at", -1).limit(6).to_list(6)
    scan_trend = [{"quality": s.get("quality_score", 50), "reps": s.get("reps_completed", 0),
                   "date": s["scanned_at"].strftime("%d/%m") if s.get("scanned_at") else "?"} for s in reversed(scans)]

    # 30-day AI forecast
    last_scan = scans[0] if scans else None
    days_since = (datetime.utcnow() - last_scan["scanned_at"]).days if last_scan and last_scan.get("scanned_at") else 14
    scans_per_week = max(0.3, 7 / max(days_since, 1))
    proj_xp = xp + scans_per_week * 4 * 60
    proj_dna = round(min(100, dna_avg + scans_per_week * 1.8), 1)
    proj_kore = round(min(100, kore["score"] + scans_per_week * 1.2), 1)
    trend_label = "↑ IN CRESCITA" if scans_per_week >= 2 else "→ STABILE" if scans_per_week >= 1 else "↓ IN CALO"
    trend_color = "#34C759" if scans_per_week >= 2 else "#FF9500" if scans_per_week >= 1 else "#FF453A"

    # Certification
    is_certified = bool(user.get("onboarding_completed") and user.get("baseline_scanned_at") and user.get("dna"))

    return {
        "athlete": {
            "id": str(user["_id"]),
            "username": user.get("username"),
            "city": user.get("city", "—"),
            "sport": user.get("sport", "—"),
            "level": level,
            "xp": xp,
            "avatar_color": user.get("avatar_color", "#00F2FF"),
            "age": user.get("age"),
            "gender": user.get("gender"),
            "is_nexus_certified": is_certified,
            "is_free_agent": not bool(await db.crews_v2.find_one({"members": user["_id"]})),
        },
        "kore_score": kore,
        "efficiency_ratio": efficiency,
        "dna": {k: dna.get(k, 50) for k in DNA_KEYS},
        "dna_avg": dna_avg,
        "world_avg_dna": world_avg,
        "six_axis": six_axis,
        "injury_risk": injury,
        "scan_trend": scan_trend,
        "forecast_30d": {
            "projected_dna": proj_dna,
            "projected_kore": proj_kore,
            "projected_xp": int(proj_xp),
            "scans_per_week": round(scans_per_week, 1),
            "trend_label": trend_label,
            "trend_color": trend_color,
        },
        "coach_note": coach_note,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": current_user.get("username"),
    }


@api_router.put("/users/scout-visibility")
async def toggle_scout_visibility(data: dict, current_user: dict = Depends(get_current_user)):
    """Toggle whether athlete appears in Scout talent discovery"""
    visible = bool(data.get("scout_visible", True))
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"scout_visible": visible}})
    return {"status": "updated", "scout_visible": visible,
            "message": "Ora sei visibile agli Scout" if visible else "Profilo nascosto dagli Scout"}



@api_router.get("/talent/received-drafts")
async def get_received_drafts(current_user: dict = Depends(get_current_user)):
    """Get all squad invitations received by the current athlete"""
    drafts = await db.talent_drafts.find({"athlete_id": current_user["_id"]}).sort("created_at", -1).to_list(20)
    result = []
    for d in drafts:
        coach = await db.users.find_one({"_id": d["coach_id"]})
        result.append({
            "draft_id": str(d["_id"]),
            "coach_id": str(d["coach_id"]),
            "coach_username": d.get("coach_username", "?"),
            "coach_avatar_color": coach.get("avatar_color", "#D4AF37") if coach else "#D4AF37",
            "message": d.get("message", "Ti ho inserito nel mio Remote Squad."),
            "status": d.get("status", "pending"),
            "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
        })
    return {"drafts": result, "pending_count": sum(1 for d in result if d["status"] == "pending")}


@api_router.post("/talent/drafts/{draft_id}/respond")
async def respond_to_talent_draft(draft_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Accept or decline a remote squad invitation"""
    action = data.get("action")
    if action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="action deve essere 'accept' o 'decline'")
    try:
        draft = await db.talent_drafts.find_one({"_id": ObjectId(draft_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Proposta non trovata")
    if not draft or draft["athlete_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if draft.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Proposta già gestita")
    await db.talent_drafts.update_one({"_id": draft["_id"]}, {"$set": {"status": action + "ed"}})
    await db.notifications.insert_one({
        "user_id": draft["coach_id"],
        "type": "draft_response",
        "title": f"PROPOSTA {action.upper()}ATA",
        "icon": "checkmark-circle" if action == "accept" else "close-circle",
        "color": "#34C759" if action == "accept" else "#FF453A",
        "message": f"{current_user.get('username')} ha {'accettato' if action == 'accept' else 'rifiutato'} l'invito nel tuo Remote Squad.",
        "read": False, "created_at": datetime.utcnow(),
    })
    return {"status": action + "ed", "coach": draft.get("coach_username")}


@api_router.post("/talent/draft/{athlete_id}")


async def draft_athlete(athlete_id: str, data: dict = {}, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Draft an athlete to your remote coaching team"""
    try:
        athlete = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if not athlete:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if athlete.get("ghost_mode"):
        raise HTTPException(status_code=403, detail="Questo Kore ha attivato il Ghost Mode")

    # Check already drafted
    existing = await db.talent_drafts.find_one({"coach_id": current_user["_id"], "athlete_id": athlete["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Hai già draftato questo Kore")

    now = datetime.utcnow()
    await db.talent_drafts.insert_one({
        "coach_id": current_user["_id"],
        "coach_username": current_user.get("username"),
        "athlete_id": athlete["_id"],
        "athlete_username": athlete.get("username"),
        "message": data.get("message", "Benvenuto nel mio team. Sarò il tuo coach remoto."),
        "status": "pending",  # pending → accepted | declined
        "created_at": now,
    })

    # Notify athlete
    await db.notifications.insert_one({
        "user_id": athlete["_id"],
        "type": "talent_draft",
        "title": "HAI ATTIRATO L'ATTENZIONE DI UN COACH",
        "icon": "star",
        "color": "#D4AF37",
        "message": f"Il Coach {current_user.get('username')} ti ha draftato per il suo team remoto!",
        "read": False,
        "created_at": now,
        "meta": {"coach_id": str(current_user["_id"])},
    })

    return {
        "status": "drafted",
        "athlete": athlete.get("username"),
        "message": "Richiesta inviata. Il Kore riceverà una notifica.",
    }


@api_router.get("/talent/my-drafts")
async def get_my_drafts(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Get all athletes drafted by the current coach"""
    drafts = await db.talent_drafts.find({"coach_id": current_user["_id"]}).sort("created_at", -1).to_list(50)
    result = []
    for d in drafts:
        athlete = await db.users.find_one({"_id": d["athlete_id"]})
        if athlete:
            dna = athlete.get("dna") or {}
            dna_vals = [dna.get(k, 50) for k in DNA_KEYS]
            result.append({
                "draft_id": str(d["_id"]),
                "athlete_id": str(athlete["_id"]),
                "username": athlete.get("username"),
                "city": athlete.get("city", "—"),
                "sport": athlete.get("sport", "—"),
                "level": athlete.get("level", 1),
                "dna_avg": round(sum(dna_vals) / len(dna_vals), 1) if dna_vals else 0,
                "relative_score": calculate_dna_relative_score(athlete),
                "status": d.get("status", "pending"),
                "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
            })
    return {"drafts": result, "count": len(result)}


# ================================================================
# AK DROPS — Sweat-to-Credit Engine (exceeding biometric avg)
# ================================================================

# ================================================================
# MULTISPORT CHALLENGE ENGINE — Visual Timeline, Automation, Leaderboard
# ================================================================

DISCIPLINE_META = {
    "endurance": {"label": "Endurance", "icon": "navigate",   "color": "#00F2FF", "exercise": "gps_run"},
    "power":     {"label": "Power",     "icon": "barbell",    "color": "#FF453A", "exercise": "squat"},
    "mobility":  {"label": "Mobility",  "icon": "body",       "color": "#34C759", "exercise": "lunge"},
    "technique": {"label": "Technique", "icon": "ribbon",     "color": "#D4AF37", "exercise": "nexus_scan"},
    "recovery":  {"label": "Recovery",  "icon": "moon",       "color": "#AF52DE", "exercise": "plank"},
    "agility":   {"label": "Agility",   "icon": "flash",      "color": "#FF9500", "exercise": "punch"},
    "nexus":     {"label": "NÈXUS Bio", "icon": "scan",       "color": "#00F2FF", "exercise": "squat"},
}

AUTOMATION_TRIGGERS = {
    "scan_quality_low":  {"label": "Qualità scan bassa",      "axis": "technique", "op": "lt"},
    "mobility_reduced":  {"label": "Mobilità ridotta",        "axis": "mobility",  "op": "lt"},
    "recovery_low":      {"label": "Recovery bassa",          "axis": "recovery",  "op": "lt"},
    "power_drop":        {"label": "Calo di forza",           "axis": "power",     "op": "lt"},
    "pvp_win_streak":    {"label": "Streak vittorie PvP",     "axis": None,        "op": "gte"},
    "days_inactive":     {"label": "Kore inattivo (giorni)","axis": None,        "op": "gte"},
}


@api_router.post("/multisport/create")
async def create_multisport_challenge(data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Create a new multi-day, multi-discipline challenge"""
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nome sfida richiesto")
    now = datetime.utcnow()
    start_raw = data.get("start_date")
    start_date = datetime.fromisoformat(start_raw) if start_raw else now
    duration_days = max(1, min(30, int(data.get("duration_days", 7))))
    end_date = start_date + timedelta(days=duration_days - 1)
    # Build day scaffolding
    days = []
    for d in range(duration_days):
        day_date = start_date + timedelta(days=d)
        days.append({
            "day": d + 1,
            "date": day_date.isoformat(),
            "discipline": None,
            "type": None,
            "exercise": None,
            "target_reps": None,
            "target_time": None,
            "target_distance_m": None,
            "xp_reward": 100,
            "notes": "",
            "certified_template_id": None,
        })
    doc = {
        "name": name,
        "description": data.get("description", ""),
        "coach_id": current_user["_id"],
        "gym_id": current_user.get("gym_id"),
        "days": days,
        "automation_rules": [],
        "participant_crew_ids": [],
        "participant_user_ids": [],
        "start_date": start_date,
        "end_date": end_date,
        "duration_days": duration_days,
        "status": "draft",
        "created_at": now,
    }
    result = await db.multisport_challenges.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _challenge_to_resp(doc)


def _challenge_to_resp(c: dict) -> dict:
    return {
        "id": str(c["_id"]),
        "name": c.get("name"),
        "description": c.get("description", ""),
        "days": c.get("days", []),
        "automation_rules": c.get("automation_rules", []),
        "participant_crew_ids": [str(x) for x in c.get("participant_crew_ids", [])],
        "duration_days": c.get("duration_days", 7),
        "start_date": c["start_date"].isoformat() if isinstance(c.get("start_date"), datetime) else c.get("start_date"),
        "end_date": c["end_date"].isoformat() if isinstance(c.get("end_date"), datetime) else c.get("end_date"),
        "status": c.get("status", "draft"),
        "created_at": c["created_at"].isoformat() if isinstance(c.get("created_at"), datetime) else None,
    }


@api_router.get("/multisport")
async def list_multisport_challenges(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    challenges = await db.multisport_challenges.find({"coach_id": current_user["_id"]}).sort("created_at", -1).to_list(30)
    return {"challenges": [_challenge_to_resp(c) for c in challenges]}


@api_router.get("/multisport/{challenge_id}")
async def get_multisport_challenge(challenge_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    try:
        c = await db.multisport_challenges.find_one({"_id": ObjectId(challenge_id), "coach_id": current_user["_id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not c:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    return _challenge_to_resp(c)


@api_router.put("/multisport/{challenge_id}/days")
async def update_challenge_days(challenge_id: str, data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Update all days of a challenge (full replace)"""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    days = data.get("days", [])
    # Validate disciplines
    for day in days:
        disc = day.get("discipline")
        if disc and disc not in DISCIPLINE_META:
            raise HTTPException(status_code=400, detail=f"Disciplina non valida: {disc}")
    result = await db.multisport_challenges.update_one(
        {"_id": oid, "coach_id": current_user["_id"]},
        {"$set": {"days": days}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    updated = await db.multisport_challenges.find_one({"_id": oid})
    return _challenge_to_resp(updated)


@api_router.put("/multisport/{challenge_id}/automation")
async def update_challenge_automation(challenge_id: str, data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Replace automation rules for a challenge"""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    rules = data.get("rules", [])
    for rule in rules:
        if rule.get("trigger") not in AUTOMATION_TRIGGERS:
            raise HTTPException(status_code=400, detail=f"Trigger non valido: {rule.get('trigger')}")
    result = await db.multisport_challenges.update_one(
        {"_id": oid, "coach_id": current_user["_id"]},
        {"$set": {"automation_rules": rules}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    return {"status": "updated", "rules_count": len(rules)}


@api_router.post("/multisport/{challenge_id}/push")
async def push_multisport_challenge(challenge_id: str, data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Push a challenge to crews/athletes and activate it"""
    try:
        oid = ObjectId(challenge_id)
        c = await db.multisport_challenges.find_one({"_id": oid, "coach_id": current_user["_id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not c:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    crew_ids = [ObjectId(cid) for cid in data.get("crew_ids", []) if cid]
    now = datetime.utcnow()
    await db.multisport_challenges.update_one(
        {"_id": oid},
        {"$set": {"status": "active", "participant_crew_ids": crew_ids, "pushed_at": now}}
    )
    # Notify all crew members
    notif_count = 0
    for cid in crew_ids:
        crew = await db.crews_v2.find_one({"_id": cid})
        if crew:
            for mid in crew.get("members", []):
                await db.notifications.insert_one({
                    "user_id": mid,
                    "type": "multisport_challenge",
                    "title": "NUOVA SFIDA MULTI-DISCIPLINA",
                    "icon": "calendar",
                    "color": "#00F2FF",
                    "message": f"Il tuo Coach ha lanciato '{c.get('name')}' — {c.get('duration_days')} giorni, multidisciplina.",
                    "read": False,
                    "created_at": now,
                })
                notif_count += 1
    return {"status": "pushed", "crew_count": len(crew_ids), "notifications_sent": notif_count}


@api_router.get("/multisport/{challenge_id}/progress")
async def get_challenge_progress(challenge_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Real-time completion progress per crew"""
    try:
        oid = ObjectId(challenge_id)
        c = await db.multisport_challenges.find_one({"_id": oid})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not c:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    total_days = c.get("duration_days", 7)
    crew_progress = []
    for cid in c.get("participant_crew_ids", []):
        crew = await db.crews_v2.find_one({"_id": cid})
        if not crew:
            continue
        # Count completions across all sessions/pushes linked to this challenge
        members_completed = set()
        completions = await db.ak_transactions.find({
            "reason": "nexus_scan",
            "user_id": {"$in": crew.get("members", [])},
            "created_at": {"$gte": c.get("start_date", datetime.utcnow() - timedelta(days=30))}
        }).to_list(500)
        for comp in completions:
            members_completed.add(str(comp["user_id"]))
        member_count = max(len(crew.get("members", [])), 1)
        team_pct = round(len(members_completed) / member_count * 100, 1)
        # Weighted score: sum of individual progress
        all_member_xp = 0
        for mid in crew.get("members", []):
            u = await db.users.find_one({"_id": mid})
            if u:
                all_member_xp += u.get("xp", 0)
        avg_xp = round(all_member_xp / member_count)
        crew_progress.append({
            "crew_id": str(cid),
            "crew_name": crew.get("name"),
            "members_count": member_count,
            "members_active": len(members_completed),
            "completion_pct": team_pct,
            "avg_xp": avg_xp,
            "score": round(team_pct * 0.6 + min(100, avg_xp / 100) * 0.4, 1),
        })
    crew_progress.sort(key=lambda x: -x["score"])
    return {"challenge": _challenge_to_resp(c), "leaderboard": crew_progress}


@api_router.get("/challenges/global-leaderboard")
async def get_global_challenge_leaderboard(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Global crew challenge leaderboard across all active multisport challenges"""
    active = await db.multisport_challenges.find({"status": "active"}).limit(10).to_list(10)
    global_scores: dict = {}
    for c in active:
        for cid in c.get("participant_crew_ids", []):
            crew = await db.crews_v2.find_one({"_id": cid})
            if not crew:
                continue
            crew_name = crew.get("name", "?")
            members = crew.get("members", [])
            total_xp = 0
            completed = set()
            comps = await db.ak_transactions.find({
                "reason": "nexus_scan",
                "user_id": {"$in": members},
                "created_at": {"$gte": c.get("start_date", datetime.utcnow() - timedelta(days=30))}
            }).to_list(200)
            for comp in comps:
                completed.add(str(comp["user_id"]))
            for mid in members:
                u = await db.users.find_one({"_id": mid})
                if u:
                    total_xp += u.get("xp", 0)
            mp = max(len(members), 1)
            pct = round(len(completed) / mp * 100, 1)
            score = round(pct * 0.6 + min(100, total_xp / mp / 100) * 0.4, 1)
            key = str(cid)
            if key not in global_scores or global_scores[key]["score"] < score:
                global_scores[key] = {
                    "crew_id":    str(cid),
                    "crew_name":  crew_name,
                    "gym":        current_user.get("city", "—"),
                    "score":      score,
                    "completion_pct": pct,
                    "members_active": len(completed),
                    "members_total": len(members),
                    "challenge_name": c.get("name"),
                    "avg_xp":    round(total_xp / mp),
                }
    result = sorted(global_scores.values(), key=lambda x: -x["score"])
    return {"leaderboard": result, "total_active_challenges": len(active)}


@api_router.get("/multisport/meta/disciplines")
async def get_disciplines_meta(current_user: dict = Depends(get_current_user)):
    """Metadata for all disciplines and automation triggers"""
    return {
        "disciplines": [{"key": k, **v} for k, v in DISCIPLINE_META.items()],
        "automation_triggers": [{"key": k, **v} for k, v in AUTOMATION_TRIGGERS.items()],
    }


CERTIFIED_TEMPLATES = [    {
        "id": "ct_power_talosfit",
        "name": "POWER PROTOCOL ELITE",
        "discipline": "power",
        "exercise": "squat",
        "target_reps": 25,
        "target_time": 60,
        "difficulty": "extreme",
        "certified_by": "Coach Marco Vitali",
        "certified_org": "TalosFit",
        "description": "Programma Power generato da AI, certificato dal Campione Europeo di Powerlifting. Target: massimizzare la produzione di forza esplosiva in 60 secondi.",
        "dna_focus": ["forza", "potenza"],
        "required_drops": 200,
        "required_level": 5,
        "xp_reward": 350,
    },
    {
        "id": "ct_agility_talosfit",
        "name": "AGILITY MASTER PROTOCOL",
        "discipline": "agility",
        "exercise": "punch",
        "target_reps": 40,
        "target_time": 45,
        "difficulty": "hard",
        "certified_by": "Dr. Sarah Kim",
        "certified_org": "TalosFit",
        "description": "Protocollo di velocità-reazione certificato dal team di analisi biometrica TalosFit. Sviluppa velocità neuromuscolare e coordinazione.",
        "dna_focus": ["velocita", "agilita"],
        "required_drops": 150,
        "required_level": 3,
        "xp_reward": 280,
    },
    {
        "id": "ct_endurance_talosfit",
        "name": "ENDURANCE ELITE 60",
        "discipline": "endurance",
        "exercise": "squat",
        "target_reps": 30,
        "target_time": 90,
        "difficulty": "hard",
        "certified_by": "Coach David Torres",
        "certified_org": "TalosFit",
        "description": "Programma di resistenza massima. 90 secondi di lavoro continuo certificato dal pluricampione di functional fitness.",
        "dna_focus": ["resistenza", "potenza"],
        "required_drops": 180,
        "required_level": 4,
        "xp_reward": 300,
    },
    {
        "id": "ct_complete_talosfit",
        "name": "THE COMPLETE ATHLETE",
        "discipline": "power",
        "exercise": "squat",
        "target_reps": 35,
        "target_time": 120,
        "difficulty": "extreme",
        "certified_by": "Team TalosFit",
        "certified_org": "TalosFit",
        "description": "Il protocollo definitivo per atleti d'élite. Progettato dall'intero staff di TalosFit per massimizzare tutti i parametri biometrici simultaneamente.",
        "dna_focus": ["forza", "resistenza", "potenza", "velocita"],
        "required_drops": 500,
        "required_level": 8,
        "xp_reward": 600,
    },
]


@api_router.get("/certified-templates")
async def get_certified_templates(current_user: dict = Depends(get_current_user)):
    """Get TalosFit certified templates with unlock status"""
    ak = current_user.get("ak_credits", 0)
    level = current_user.get("level", 1)
    unlocked = current_user.get("unlocked_tools", [])
    result = []
    for t in CERTIFIED_TEMPLATES:
        is_unlocked = t["id"] in unlocked or current_user.get("is_founder", False)
        can_afford = ak >= t["required_drops"]
        meets_level = level >= t["required_level"]
        result.append({
            **t,
            "is_unlocked": is_unlocked,
            "can_afford": can_afford,
            "meets_level": meets_level,
            "can_unlock": can_afford and meets_level and not is_unlocked,
        })
    return {"templates": result, "ak_drops": ak, "user_level": level}


@api_router.post("/certified-templates/{template_id}/unlock")
async def unlock_certified_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Unlock a TalosFit certified template using AK Drops"""
    template = next((t for t in CERTIFIED_TEMPLATES if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    # Founders: always unlocked, no AK deduction
    if current_user.get("is_founder", False) or current_user.get("is_admin", False):
        if template_id not in current_user.get("unlocked_tools", []):
            await db.users.update_one({"_id": current_user["_id"]}, {"$addToSet": {"unlocked_tools": template_id}})
        return {"status": "unlocked", "template_name": template["name"], "certified_by": template["certified_by"], "ak_drops": current_user.get("ak_credits", 0), "founder_bypass": True}
    if template_id in current_user.get("unlocked_tools", []):
        return {"status": "already_unlocked", "template_name": template["name"]}
    # Level check
    if current_user.get("level", 1) < template["required_level"]:
        raise HTTPException(status_code=402, detail=f"Livello insufficiente. Richiesto: {template['required_level']}")
    # AK Drops check
    if current_user.get("ak_credits", 0) < template["required_drops"]:
        raise HTTPException(status_code=402, detail=f"AK Drops insufficienti. Servono: {template['required_drops']}")
    # Deduct + unlock
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"ak_credits": -template["required_drops"]}, "$addToSet": {"unlocked_tools": template_id}}
    )
    await db.ak_transactions.insert_one({
        "user_id": current_user["_id"],
        "amount": -template["required_drops"],
        "reason": f"unlock_certified_{template_id}",
        "label": f"Sbloccato: {template['name']} (TalosFit)",
        "type": "spend",
        "created_at": datetime.utcnow(),
    })
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "unlocked",
        "template_name": template["name"],
        "certified_by": template["certified_by"],
        "ak_drops": updated.get("ak_credits", 0),
    }


async def award_ak_drops(user_id, reason: str, scan_quality: float = 0, custom_amount: int = 0) -> dict:
    """
    AK Drops — Sweat-to-Credit: earn drops ONLY when exceeding your personal biometric average.
    Returns: { earned: int, new_balance: int, message: str, exceeded_avg: bool }
    """
    rule = AK_EARN_RULES.get(reason)
    base_amount = custom_amount if custom_amount else (rule["amount"] if rule else 0)
    if base_amount <= 0:
        return {"earned": 0, "new_balance": 0, "message": "Nessuna drop guadagnata", "exceeded_avg": False}

    label = rule["label"] if rule else reason
    now = datetime.utcnow()
    exceeded_avg = False
    final_amount = base_amount

    # For scan-based earning: only award full drops if quality > personal average
    if reason == "nexus_scan" and scan_quality > 0:
        # Get user's historical scan quality average
        recent_scans = await db.ak_transactions.find(
            {"user_id": user_id, "reason": "nexus_scan", "type": "earn"}
        ).sort("created_at", -1).limit(5).to_list(5)

        if recent_scans:
            avg_quality = sum(s.get("scan_quality", 50) for s in recent_scans) / len(recent_scans)
            if scan_quality > avg_quality:
                bonus = min(20, int((scan_quality - avg_quality) * 0.5))
                final_amount = base_amount + bonus
                exceeded_avg = True
                label = f"Scan superiore alla media ({round(avg_quality, 0)}%) +{bonus} bonus"
            else:
                # Consolation: only 3 drops for not exceeding average
                final_amount = 3
                label = "Scan completato (non supera la media personale)"
        else:
            # First scan: always award full
            exceeded_avg = True

    await db.users.update_one({"_id": user_id}, {"$inc": {"ak_credits": final_amount}})
    await db.ak_transactions.insert_one({
        "user_id": user_id,
        "amount": final_amount,
        "reason": reason,
        "label": label,
        "type": "earn",
        "scan_quality": scan_quality,
        "exceeded_avg": exceeded_avg,
        "created_at": now,
    })
    user = await db.users.find_one({"_id": user_id})
    return {
        "earned": final_amount,
        "new_balance": user.get("ak_credits", 0),
        "message": f"+{final_amount} AK Drops" + (" 🔥" if exceeded_avg else ""),
        "exceeded_avg": exceeded_avg,
    }


@api_router.get("/coach/heatmap")
async def get_activity_heatmap(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Activity heatmap: scan counts per day for last 30 days"""
    coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(20)
    all_member_ids = list({mid for crew in coach_crews for mid in crew.get("members", [])})
    if not all_member_ids:
        all_member_ids = [current_user["_id"]]
    now = datetime.utcnow()
    start = now - timedelta(days=29)
    scans = await db.scan_results.find({"user_id": {"$in": all_member_ids}, "scanned_at": {"$gte": start}}).to_list(500)
    sessions = await db.nexus_sessions.find({"user_id": {"$in": all_member_ids}, "started_at": {"$gte": start}}).to_list(500)
    from collections import defaultdict
    day_counts: dict = defaultdict(int)
    for s in scans:
        d = s.get("scanned_at")
        if d:
            day_counts[d.strftime("%Y-%m-%d")] += 1
    for s in sessions:
        d = s.get("started_at")
        if d:
            day_counts[d.strftime("%Y-%m-%d")] += 1
    grid = []
    for i in range(30):
        day = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        cnt = day_counts.get(day, 0)
        grid.append({"date": day, "count": cnt, "level": min(4, cnt)})
    mx = max((g["count"] for g in grid), default=1) or 1
    for g in grid:
        g["intensity"] = round(g["count"] / mx, 2)
    return {"grid": grid, "total_scans": sum(g["count"] for g in grid), "active_days": sum(1 for g in grid if g["count"] > 0)}


@api_router.get("/coach/alerts")
async def get_coach_alerts(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """AI Alert Center: underperforming athletes, expired KORE IDs, injury risks"""
    coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(20)
    all_member_ids = list({mid for crew in coach_crews for mid in crew.get("members", [])})
    athletes = await db.users.find({"_id": {"$in": all_member_ids} if all_member_ids else {"$ne": current_user["_id"]}}).limit(12).to_list(12)
    alerts = []
    now = datetime.utcnow()
    for user in athletes:
        dna = user.get("dna") or {}
        dna_values = [dna.get(k, 50) for k in DNA_KEYS]
        dna_avg = sum(dna_values) / len(dna_values) if dna_values else 50
        max_attr = max(dna_values) if dna_values else 50
        min_attr = min(dna_values) if dna_values else 50
        max_key = DNA_KEYS[dna_values.index(max_attr)] if dna_values else "forza"
        min_key = DNA_KEYS[dna_values.index(min_attr)] if dna_values else "resistenza"
        last_scan = await db.scan_results.find_one({"user_id": user["_id"]}, sort=[("scanned_at", -1)])
        days_inactive = (now - last_scan["scanned_at"]).days if last_scan and last_scan.get("scanned_at") else 30
        if days_inactive > 14:
            alerts.append({"type": "passport_expired", "severity": "warning", "athlete": user.get("username"), "athlete_id": str(user["_id"]), "message": f"Nessun scan da {days_inactive} giorni — KORE ID non certificato", "icon": "time", "color": "#FF9500"})
        if dna_values and (max_attr - min_attr) > 25:
            alerts.append({"type": "injury_risk", "severity": "danger", "athlete": user.get("username"), "athlete_id": str(user["_id"]), "message": f"Squilibrio DNA: {DNA_LABELS.get(max_key, max_key)} ({max_attr}) vs {DNA_LABELS.get(min_key, min_key)} ({min_attr}) — rischio infortunio", "icon": "warning", "color": "#FF453A"})
        if dna_avg < 55:
            alerts.append({"type": "underperforming", "severity": "info", "athlete": user.get("username"), "athlete_id": str(user["_id"]), "message": f"Performance sotto media: KORE {round(dna_avg, 1)} — considera un piano di sviluppo", "icon": "trending-down", "color": "#AF52DE"})
    alerts.sort(key=lambda a: {"danger": 0, "warning": 1, "info": 2}.get(a["severity"], 3))
    return {"alerts": alerts, "count": len(alerts), "critical": sum(1 for a in alerts if a["severity"] == "danger")}


@api_router.get("/coach/live-events")
async def get_live_events(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Polling fallback for Live Monitor — returns last 20 events of the gym"""
    gym = await get_user_gym(current_user)
    if not gym:
        return {"events": []}
    events = await db.live_events.find(
        {"gym_id": gym["_id"]},
        sort=[("created_at", -1)]
    ).limit(20).to_list(20)
    now = datetime.utcnow()
    result = []
    for e in events:
        age_secs = (now - e.get("created_at", now)).total_seconds()
        result.append({
            "type": e.get("type", "scan_complete"),
            "athlete": e.get("athlete"),
            "avatar_color": e.get("avatar_color", "#00F2FF"),
            "reps": e.get("reps"),
            "quality": e.get("quality"),
            "xp_earned": e.get("xp_earned"),
            "age_secs": int(age_secs),
            "timestamp": e.get("created_at").isoformat() if e.get("created_at") else None,
        })
    return {"events": result, "gym_id": str(gym["_id"])}


@api_router.get("/coach/tier")
async def get_coach_tier(current_user: dict = Depends(get_current_user)):
    """Get the subscription tier for feature gating on frontend"""
    ENTERPRISE_FEATURES = {
        "ai_injury_risk": True,
        "historical_trends_extended": True,
        "battle_simulator": True,
        "live_monitor": True,
        "bulk_push": True,
        "export_csv": True,
    }
    if current_user.get("is_founder") or current_user.get("is_admin"):
        return {"tier": "elite", "is_enterprise": True, "features": ENTERPRISE_FEATURES}
    gym = await get_user_gym(current_user)
    tier = gym.get("subscription_tier", "free") if gym else "free"
    is_enterprise = tier in ("elite", "enterprise")
    return {
        "tier": tier,
        "is_enterprise": is_enterprise,
        "features": {
            "ai_injury_risk": is_enterprise,
            "historical_trends_extended": is_enterprise,
            "battle_simulator": is_enterprise,
            "live_monitor": True,
            "bulk_push": tier != "free",
            "export_csv": True,
        }
    }



async def get_athlete_historical(athlete_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Historical DNA trends — 6-month simulated trend toward current values"""
    try:
        user = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if not user:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    dna = user.get("dna") or {k: 50 for k in DNA_KEYS}
    import random; random.seed(int(user.get("xp", 0)) + int(user.get("level", 1)) * 100)
    now = datetime.utcnow()
    months = []
    for i in range(6, 0, -1):
        factor = (7 - i) / 7
        month_date = (now - timedelta(days=30 * i)).strftime("%b")
        month_data = {"month": month_date}
        for k in DNA_KEYS:
            current = dna.get(k, 50)
            base = max(30, current - int((1 - factor) * 25) - random.randint(-3, 3))
            month_data[k] = min(100, max(30, base))
        months.append(month_data)
    months.append({"month": "Now", **{k: dna.get(k, 50) for k in DNA_KEYS}})
    return {"athlete_id": athlete_id, "username": user.get("username"), "months": months, "current_dna": dna, "dna_avg": round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1)}


@api_router.get("/coach/battle-stats")
async def get_battle_stats(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Crew Strategist: battle history"""
    coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(10)
    if not coach_crews:
        return {"battles": [], "wins": 0, "losses": 0, "win_rate": 0, "crews": []}
    crew_ids = [c["_id"] for c in coach_crews]
    battles = await db.crew_battles.find({"$or": [{"crew_a_id": {"$in": crew_ids}}, {"crew_b_id": {"$in": crew_ids}}]}).sort("created_at", -1).to_list(20)
    wins = losses = 0
    battle_list = []
    for b in battles:
        my_crew = next((c for c in coach_crews if c["_id"] in [b.get("crew_a_id"), b.get("crew_b_id")]), None)
        is_winner = my_crew and b.get("winner_crew_id") == (my_crew["_id"] if my_crew else None)
        is_loser = b.get("status") == "completed" and not is_winner and my_crew
        if is_winner: wins += 1
        elif is_loser: losses += 1
        battle_list.append({"id": str(b["_id"]), "crew_a": b.get("crew_a_name"), "score_a": round(b.get("crew_a_kore_score", 0) + b.get("crew_a_contribution", 0), 1), "crew_b": b.get("crew_b_name"), "score_b": round(b.get("crew_b_kore_score", 0) + b.get("crew_b_contribution", 0), 1), "status": b.get("status"), "my_result": "win" if is_winner else ("loss" if is_loser else "active"), "started_at": b["started_at"].isoformat() if b.get("started_at") else None})
    return {"battles": battle_list, "wins": wins, "losses": losses, "win_rate": round(wins / max(wins + losses, 1) * 100, 1), "crews": [{"id": str(c["_id"]), "name": c["name"], "members": len(c.get("members", []))} for c in coach_crews]}


@api_router.post("/coach/battle-simulate")
async def simulate_battle(data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Weighted Average Calculator"""
    athlete_ids = data.get("athlete_ids", [])[:10]
    members_data = []
    breakdown = []
    for aid in athlete_ids:
        try:
            user = await db.users.find_one({"_id": ObjectId(aid)})
            if user:
                dna = user.get("dna") or {}
                xp = user.get("xp", 0)
                members_data.append({"xp": xp, "dna": dna})
                dna_avg = round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1)
                breakdown.append({"username": user.get("username"), "kore_score": dna_avg, "xp": xp})
        except Exception:
            pass
    total_xp = sum(m.get("xp", 0) for m in members_data)
    score = calculate_kore_battle_score(members_data, total_xp) if members_data else 0
    return {"score": round(score, 1), "member_count": len(members_data), "total_xp": total_xp, "breakdown": breakdown, "intensity": "high" if score > 75 else "medium" if score > 55 else "low", "note": f"KORE Battle Score: {round(score, 1)} / 100"}


@api_router.get("/coach/ai-full")
async def get_full_ai_analysis(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """AI Coach: injury risks + performance forecasts"""
    coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(20)
    all_member_ids = list({mid for crew in coach_crews for mid in crew.get("members", [])}) or [current_user["_id"]]
    athletes = await db.users.find({"_id": {"$in": all_member_ids}}).to_list(50)
    now = datetime.utcnow()
    injury_risks, forecasts = [], []
    for user in athletes:
        dna = user.get("dna") or {}
        dna_vals = [dna.get(k, 50) for k in DNA_KEYS]
        if not dna_vals:
            continue
        max_val, min_val = max(dna_vals), min(dna_vals)
        max_key = DNA_KEYS[dna_vals.index(max_val)]
        min_key = DNA_KEYS[dna_vals.index(min_val)]
        imbalance = max_val - min_val
        risk_pct = min(100, int(imbalance * 2.5))
        if risk_pct > 30:
            injury_risks.append({"athlete": user.get("username"), "athlete_id": str(user["_id"]), "risk_pct": risk_pct, "overloaded": DNA_LABELS.get(max_key, max_key), "weak_area": DNA_LABELS.get(min_key, min_key), "recommendation": f"Ridurre {DNA_LABELS.get(max_key, max_key)}, aumentare {DNA_LABELS.get(min_key, min_key)}", "color": "#FF453A" if risk_pct > 60 else "#FF9500"})
        xp = user.get("xp", 0)
        last_scan = await db.scan_results.find_one({"user_id": user["_id"]}, sort=[("scanned_at", -1)])
        days_since = (now - last_scan["scanned_at"]).days if last_scan and last_scan.get("scanned_at") else 14
        spw = max(0.1, 7 / max(days_since, 1))
        proj_xp = xp + spw * 4 * 60
        dna_avg = sum(dna_vals) / len(dna_vals)
        forecasts.append({"athlete": user.get("username"), "athlete_id": str(user["_id"]), "current_xp": xp, "projected_xp_30d": int(proj_xp), "current_level": user.get("level", 1), "projected_level": max(1, int(proj_xp // 500) + 1), "current_dna": round(dna_avg, 1), "projected_dna": round(min(100, dna_avg + spw * 2), 1), "trend": "rising" if spw >= 2 else "stable" if spw >= 1 else "declining", "scans_per_week": round(spw, 1)})
    injury_risks.sort(key=lambda x: -x["risk_pct"])
    return {"injury_risks": injury_risks[:5], "forecasts": sorted(forecasts, key=lambda x: -x["projected_dna"])[:8], "group_summary": {"total_athletes": len(athletes), "high_risk": sum(1 for r in injury_risks if r["risk_pct"] > 60), "improving": sum(1 for f in forecasts if f["trend"] == "rising")}}


@api_router.post("/coach/bulk-push")
async def bulk_push_template(data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Bulk push template to crews or athletes"""
    template_id = data.get("template_id")
    crew_ids = data.get("crew_ids", [])
    if not template_id:
        raise HTTPException(status_code=400, detail="template_id richiesto")
    try:
        template = await db.templates.find_one({"_id": ObjectId(template_id), "coach_id": current_user["_id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Template non trovato")
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")
    pushed = 0
    now = datetime.utcnow()
    for cid in crew_ids:
        try:
            crew = await db.crews_v2.find_one({"_id": ObjectId(cid)})
            if crew:
                await db.challenge_pushes.insert_one({"template_id": template["_id"], "template_name": template["name"], "exercise": template["exercise"], "target_time": template["target_time"], "target_reps": template["target_reps"], "xp_reward": template["xp_reward"], "difficulty": template["difficulty"], "crew_id": crew["_id"], "crew_name": crew["name"], "coach_id": current_user["_id"], "coach_name": current_user.get("username"), "pushed_at": now, "status": "active", "completions": []})
                pushed += 1
                for mid in crew.get("members", []):
                    await db.notifications.insert_one({"user_id": mid, "type": "template_pushed", "title": "NUOVA SESSIONE", "icon": "barbell", "color": "#D4AF37", "message": f"{current_user.get('username')} ha inviato: {template['name']}", "read": False, "created_at": now})
        except Exception:
            pass
    return {"status": "pushed", "pushed_to_crews": pushed, "template_name": template.get("name")}


# ================================================================
# GYM_OWNER ENGINE — Multi-Tenancy & Staff Management
# ================================================================

import string as _string
import secrets as _secrets

def _gen_gym_code(n: int = 6) -> str:
    return ''.join(_secrets.choice(_string.ascii_uppercase + _string.digits) for _ in range(n))


def gym_to_response(gym: dict) -> dict:
    return {
        "id": str(gym["_id"]),
        "name": gym.get("name", ""),
        "gym_code": gym.get("gym_code", ""),
        "brand_color": gym.get("brand_color", "#00F2FF"),
        "city": gym.get("city"),
        "owner_id": str(gym["owner_id"]) if gym.get("owner_id") else None,
        "coaches": [str(c) for c in gym.get("coaches", [])],
        "members_count": gym.get("members_count", 0),
        "subscription_tier": gym.get("subscription_tier", "free"),
        "created_at": gym["created_at"].isoformat() if gym.get("created_at") else None,
    }


@api_router.post("/gym/create")
async def create_gym(data: GymCreate, current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER creates their gym"""
    existing = await db.gyms.find_one({"owner_id": current_user["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Hai già una palestra registrata")
    now = datetime.utcnow()
    gym_code = data.gym_code or _gen_gym_code()
    # Ensure unique code
    while await db.gyms.find_one({"gym_code": gym_code}):
        gym_code = _gen_gym_code()
    gym_doc = {
        "name": data.name,
        "gym_code": gym_code,
        "brand_color": data.brand_color or "#00F2FF",
        "city": data.city,
        "owner_id": current_user["_id"],
        "coaches": [],
        "members_count": 1,
        "subscription_tier": "free",
        "created_at": now,
    }
    result = await db.gyms.insert_one(gym_doc)
    # Set gym_id on the owner
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"gym_id": result.inserted_id}})
    return {"status": "created", "gym": gym_to_response({**gym_doc, "_id": result.inserted_id})}


@api_router.get("/gym/me")
async def get_my_gym(current_user: dict = Depends(require_gym_access)):
    """Get the gym associated with the current user"""
    gym = await get_user_gym(current_user)
    if not gym:
        return {"gym": None, "message": "Nessuna palestra associata"}
    # Count members
    member_count = await db.users.count_documents({"gym_id": gym["_id"]})
    gym["members_count"] = member_count
    return {"gym": gym_to_response(gym)}


@api_router.put("/gym/update")
async def update_gym(data: GymUpdate, current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER updates gym brand/settings"""
    gym = await db.gyms.find_one({"owner_id": current_user["_id"]})
    if not gym:
        raise HTTPException(status_code=404, detail="Palestra non trovata")
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if "gym_code" in updates:
        exists = await db.gyms.find_one({"gym_code": updates["gym_code"], "_id": {"$ne": gym["_id"]}})
        if exists:
            raise HTTPException(status_code=400, detail="Codice palestra già in uso")
    if updates:
        await db.gyms.update_one({"_id": gym["_id"]}, {"$set": updates})
    updated = await db.gyms.find_one({"_id": gym["_id"]})
    return {"status": "updated", "gym": gym_to_response(updated)}


@api_router.get("/gym/staff")
async def get_gym_staff(current_user: dict = Depends(require_gym_access)):
    """List all coaches in the gym"""
    gym = await get_user_gym(current_user)
    if not gym:
        return {"staff": [], "coaches_count": 0}
    staff = await db.users.find({"gym_id": gym["_id"], "role": {"$in": ["COACH", "GYM_OWNER"]}}).to_list(50)
    return {
        "staff": [{"id": str(u["_id"]), "username": u.get("username"), "email": u.get("email"), "role": normalize_role(u), "level": u.get("level", 1), "xp": u.get("xp", 0)} for u in staff],
        "coaches_count": sum(1 for u in staff if normalize_role(u) == "COACH"),
    }


@api_router.post("/gym/staff/add")
async def add_gym_staff(data: GymStaffAdd, current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER adds a Coach to their gym"""
    gym = await db.gyms.find_one({"owner_id": current_user["_id"]})
    if not gym:
        raise HTTPException(status_code=404, detail="Palestra non trovata")
    target = await db.users.find_one({"email": data.email.lower()})
    if not target:
        raise HTTPException(status_code=404, detail=f"Utente non trovato: {data.email}")
    if str(target["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Non puoi aggiungere te stesso come staff")
    valid_roles = ("COACH", "GYM_OWNER", "ATHLETE")
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Ruolo non valido. Scegli: {list(valid_roles)}")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"gym_id": gym["_id"], "role": data.role}})
    await db.gyms.update_one({"_id": gym["_id"]}, {"$addToSet": {"coaches": target["_id"]}})
    # Notify the user
    await db.notifications.insert_one({"user_id": target["_id"], "type": "gym_added", "title": "AGGIUNTO ALLA PALESTRA", "icon": "business", "color": "#D4AF37", "message": f"Sei stato aggiunto come {data.role} in {gym.get('name', 'palestra')}", "read": False, "created_at": datetime.utcnow()})
    return {"status": "added", "username": target.get("username"), "role": data.role, "gym": gym.get("name")}


@api_router.delete("/gym/staff/{user_id}")
async def remove_gym_staff(user_id: str, current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER removes a staff member"""
    gym = await db.gyms.find_one({"owner_id": current_user["_id"]})
    if not gym:
        raise HTTPException(status_code=404, detail="Palestra non trovata")
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    await db.users.update_one({"_id": target_oid}, {"$unset": {"gym_id": ""}, "$set": {"role": "ATHLETE"}})
    await db.gyms.update_one({"_id": gym["_id"]}, {"$pull": {"coaches": target_oid}})
    return {"status": "removed"}


@api_router.post("/gym/join")
async def join_gym(data: GymJoin, current_user: dict = Depends(get_current_user)):
    """User joins a gym via code"""
    gym = await db.gyms.find_one({"gym_code": data.gym_code.upper()})
    if not gym:
        raise HTTPException(status_code=404, detail=f"Codice palestra non valido: {data.gym_code}")
    if current_user.get("gym_id") == gym["_id"]:
        raise HTTPException(status_code=400, detail="Sei già parte di questa palestra")
    # Assign role (can only join as ATHLETE or COACH if gym_owner approves)
    join_role = "ATHLETE" if data.role not in ("ATHLETE", "COACH") else data.role
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"gym_id": gym["_id"], "role": join_role}})
    await db.gyms.update_one({"_id": gym["_id"]}, {"$inc": {"members_count": 1}})
    return {"status": "joined", "gym_name": gym.get("name"), "role": join_role, "gym_code": gym.get("gym_code")}


@api_router.get("/gym/dashboard")
async def get_gym_dashboard(current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER business dashboard: active members, XP, coaches, subscriptions"""
    gym = await get_user_gym(current_user)
    if not gym:
        return {"gym": None, "stats": {}, "message": "Crea prima una palestra"}
    gym_id = gym["_id"]
    # Aggregate stats
    all_members = await db.users.find({"gym_id": gym_id}).to_list(500)
    coaches = [u for u in all_members if normalize_role(u) == "COACH"]
    athletes = [u for u in all_members if normalize_role(u) == "ATHLETE"]
    total_xp = sum(u.get("xp", 0) for u in all_members)
    avg_level = round(sum(u.get("level", 1) for u in all_members) / max(len(all_members), 1), 1)
    # Crew stats
    crew_count = await db.crews_v2.count_documents({"members": {"$in": [u["_id"] for u in all_members]}})
    # Templates sent
    template_count = await db.challenge_pushes.count_documents({"coach_id": current_user["_id"]})
    # Recent battles
    battle_count = await db.crew_battles.count_documents({"$or": [{"crew_a_id": {"$in": [str(u["_id"]) for u in all_members]}}, {"crew_b_id": {"$in": [str(u["_id"]) for u in all_members]}}]})
    # Top performers
    top_performers = sorted(all_members, key=lambda u: u.get("xp", 0), reverse=True)[:5]
    return {
        "gym": gym_to_response({**gym, "members_count": len(all_members)}),
        "stats": {
            "total_members": len(all_members),
            "total_coaches": len(coaches),
            "total_athletes": len(athletes),
            "total_xp_generated": total_xp,
            "avg_level": avg_level,
            "crew_count": crew_count,
            "templates_sent": template_count,
            "battles_count": battle_count,
            "subscription_tier": gym.get("subscription_tier", "free"),
        },
        "top_performers": [{"username": u.get("username"), "xp": u.get("xp", 0), "level": u.get("level", 1)} for u in top_performers],
    }


@api_router.put("/gym/user-role/{user_id}")
async def update_user_role(user_id: str, data: dict, current_user: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
    """GYM_OWNER changes a user's role within their gym"""
    gym = await get_user_gym(current_user)
    if not gym:
        raise HTTPException(status_code=403, detail="Non sei owner di una palestra")
    new_role = data.get("role")
    if new_role not in ("ATHLETE", "COACH", "GYM_OWNER"):
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    # Verify target belongs to this gym
    target = await db.users.find_one({"_id": target_oid, "gym_id": gym["_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato in questa palestra")
    await db.users.update_one({"_id": target_oid}, {"$set": {"role": new_role}})
    return {"status": "updated", "username": target.get("username"), "new_role": new_role}


# ================================================================
# DNA ATHLETIC HUB — Multi-Skill Radar, Deep Profiles & Crew CRM
# ================================================================

SIX_AXIS_LABELS = {
    "endurance": "Endurance",
    "power":     "Power",
    "mobility":  "Mobility",
    "technique": "Technique",
    "recovery":  "Recovery",
    "agility":   "Agility",
}

def compute_kore_score(user: dict, scan_trend: list = None) -> dict:
    """
    KORE SCORE — L'Arbitro Multidisciplinare Proprietario.

    Incrocia 3 dimensioni con un sistema di penalità posturale:

    ┌─────────────────────────────────────────────────────────────┐
    │  VOLUME INDEX (30%)   →  resistenza + GPS + frequenza scan  │
    │  INTENSITY INDEX (30%)→  forza + potenza + strength watts   │
    │  BIOMETRIC QUALITY (40%)→  media NÈXUS scan quality         │
    │  ──────────────────────────────────────────────────────────  │
    │  POSTURE PENALTY (−0 a −30) se qualità scan < DNA potential │
    │  L'atleta fa volume MA mostra decadimento posturale → cala  │
    └─────────────────────────────────────────────────────────────┘

    Ritorna:
      score (0-100), grade (S/A/B/C/D), breakdown, posture_penalty,
      verdict (messaggio sintetico dell'Arbitro)
    """
    dna = user.get("dna") or {}
    ms  = user.get("multiskill") or {}
    scans = scan_trend or []

    def r(k: str) -> float:
        return float(dna.get(k, 50))

    # ── 1. VOLUME INDEX (0-100) ───────────────────────────────────
    # DNA endurance (base) + GPS data (external) + scan frequency bonus
    base_volume = r("resistenza")
    gps_boost   = float(ms.get("endurance_gps", base_volume)) * 0.35
    # Scan frequency: more scans = higher volume signal
    scan_freq_bonus = min(15, len(scans) * 2.5)
    volume_index = round(min(100, base_volume * 0.65 + gps_boost + scan_freq_bonus), 1)

    # ── 2. INTENSITY INDEX (0-100) ───────────────────────────────
    # DNA forza + potenza + Technogym Watts
    base_intensity = (r("forza") * 0.5 + r("potenza") * 0.3)
    watts_boost    = float(ms.get("strength_watts", base_intensity)) * 0.2
    intensity_index = round(min(100, base_intensity + watts_boost), 1)

    # ── 3. BIOMETRIC QUALITY (0-100) ────────────────────────────
    # Media qualità NÈXUS scan (ultimi 6) — questo è il differenziatore
    if scans:
        avg_scan_quality = sum(s.get("quality", 50) for s in scans) / len(scans)
    else:
        avg_scan_quality = r("tecnica")  # Fallback to technique DNA if no scans
    biometric_quality = round(avg_scan_quality, 1)

    # ── 4. POSTURE PENALTY ─────────────────────────────────────
    # Se qualità scan < potenziale DNA: l'atleta degrada sotto sforzo
    dna_potential = round((r("velocita") + r("forza") + r("resistenza") + r("agilita") + r("tecnica") + r("potenza")) / 6, 1)
    posture_gap = dna_potential - avg_scan_quality
    # Penalty: fino a -30 punti. Scala da 0 se gap ≤ 0 a -30 se gap ≥ 40
    posture_penalty = round(max(0, min(30, posture_gap * 0.75)), 1)
    penalty_active  = posture_gap > 10  # Significant only if gap > 10 pts

    # ── 5. FINAL KORE SCORE ────────────────────────────────────
    raw_score = (
        volume_index    * 0.30 +
        intensity_index * 0.30 +
        biometric_quality * 0.40
    ) - posture_penalty
    kore_score = round(max(0, min(100, raw_score)), 1)

    # ── 6. GRADE & VERDICT ─────────────────────────────────────
    if kore_score >= 88:
        grade, color = "S", "#D4AF37"   # Gold — Elite
        verdict = "PERFORMANCE ÉLITE. Tutti i parametri sopra il potenziale."
    elif kore_score >= 74:
        grade, color = "A", "#00F2FF"   # Cyan — Pro
        verdict = "PROFILO BILANCIATO. Mantieni questo ritmo di allenamento."
    elif kore_score >= 58:
        grade, color = "B", "#34C759"   # Green — Good
        verdict = "SOLIDO. Incrementa l'intensità o la qualità degli scan."
    elif kore_score >= 40:
        grade, color = "C", "#FF9500"   # Orange — Average
        if penalty_active:
            verdict = f"ATTENZIONE: stai accumulando volume con decadimento posturale ({round(posture_gap, 1)} punti di gap). Riduci il volume e lavora sulla tecnica."
        else:
            verdict = "NELLA MEDIA. Aumenta la frequenza degli scan NÈXUS per validare il tuo potenziale."
    else:
        grade, color = "D", "#FF453A"   # Red — Critical
        if penalty_active:
            verdict = f"RISCHIO INFORTUNIO: qualità scan ({round(avg_scan_quality, 1)}) molto sotto DNA ({dna_potential}). Ferma il volume, priorità Recovery."
        else:
            verdict = "UNDER-PERFORMANCE. Rivedi il piano di allenamento con il tuo Coach."

    return {
        "score":        kore_score,
        "grade":        grade,
        "color":        color,
        "verdict":      verdict,
        "penalty_active": penalty_active,
        "breakdown": {
            "volume": {
                "value":  volume_index,
                "weight": 0.30,
                "contribution": round(volume_index * 0.30, 1),
                "label": "VOLUME",
                "sub":   "Resistenza · GPS · Frequenza scan",
                "color": "#00F2FF",
            },
            "intensity": {
                "value":  intensity_index,
                "weight": 0.30,
                "contribution": round(intensity_index * 0.30, 1),
                "label": "INTENSITÀ",
                "sub":   "Forza · Potenza · Technogym Watts",
                "color": "#FF453A",
            },
            "biometric": {
                "value":  biometric_quality,
                "weight": 0.40,
                "contribution": round(biometric_quality * 0.40, 1),
                "label": "QUALITÀ BIO",
                "sub":   f"Media {len(scans)} scan NÈXUS · Tecnica",
                "color": "#34C759",
            },
        },
        "posture_penalty": posture_penalty,
        "posture_gap":     round(posture_gap, 1),
        "dna_potential":   dna_potential,
        "avg_scan_quality": round(avg_scan_quality, 1),
        "scans_used":      len(scans),
    }


@api_router.get("/coach/kore-score/{athlete_id}/breakdown")
async def get_kore_score_breakdown(athlete_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Full KORE SCORE breakdown for a single athlete"""
    try:
        user = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if not user:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    # Get last 6 scans
    scans = await db.scan_results.find({"user_id": user["_id"]}).sort("scanned_at", -1).limit(6).to_list(6)
    scan_trend = [{"quality": s.get("quality_score", 50), "date": s["scanned_at"].strftime("%d/%m") if s.get("scanned_at") else "?"} for s in reversed(scans)]
    kore = compute_kore_score(user, scan_trend)
    return {
        "athlete_id":  str(user["_id"]),
        "username":    user.get("username"),
        "kore_score":  kore,
        "six_axis":    compute_six_axis(user),
        "dna":         {k: user.get("dna", {}).get(k, 50) for k in DNA_KEYS} if user.get("dna") else {},
        "multiskill":  user.get("multiskill") or {},
    }


def compute_six_axis(user: dict) -> dict:
    """
    Compute 6 athletic dimensions from DNA + optional multiskill data.
    Each axis 0-100.
    """
    dna = user.get("dna") or {}
    ms  = user.get("multiskill") or {}
    r   = lambda k: float(dna.get(k, 50))

    # GPS endurance blends DNA resistenza + external GPS data
    endurance = r("resistenza") * 0.65 + float(ms.get("endurance_gps", r("resistenza"))) * 0.35
    # Power blends forza + potenza + strength test (watts)
    power     = (r("forza") * 0.45 + r("potenza") * 0.35 + float(ms.get("strength_watts", r("forza"))) * 0.20)
    # Mobility from NEXUS pose quality + agilità
    mobility  = (r("agilita") * 0.60 + r("tecnica") * 0.40)
    # Technique purely from NEXUS form score
    technique = r("tecnica")
    # Recovery: sleep + HRV (default 60 if not measured)
    recovery  = (float(ms.get("sleep_score", 60)) * 0.55 + float(ms.get("hrv_score", 60)) * 0.45)
    # Agility: speed + coordination
    agility   = (r("velocita") * 0.60 + r("agilita") * 0.40)

    return {
        "endurance": round(min(100, endurance), 1),
        "power":     round(min(100, power),     1),
        "mobility":  round(min(100, mobility),  1),
        "technique": round(min(100, technique), 1),
        "recovery":  round(min(100, recovery),  1),
        "agility":   round(min(100, agility),   1),
    }


def compute_injury_risk_detail(six_axis: dict) -> dict:
    """Enhanced injury risk from all 6 axes."""
    vals = list(six_axis.values())
    avg = sum(vals) / len(vals)
    mx, mn = max(vals), min(vals)
    imbalance = mx - mn
    low_recovery = six_axis.get("recovery", 60) < 50
    risk_pct = min(100, int(imbalance * 2.2 + (20 if low_recovery else 0)))
    dominant = max(six_axis, key=lambda k: six_axis[k])
    weak     = min(six_axis, key=lambda k: six_axis[k])
    return {
        "risk_pct":   risk_pct,
        "level":      "HIGH" if risk_pct > 65 else "MEDIUM" if risk_pct > 35 else "LOW",
        "color":      "#FF453A" if risk_pct > 65 else "#FF9500" if risk_pct > 35 else "#34C759",
        "dominant":   SIX_AXIS_LABELS.get(dominant, dominant),
        "weak":       SIX_AXIS_LABELS.get(weak,     weak),
        "imbalance":  round(imbalance, 1),
        "low_recovery": low_recovery,
        "recommendation": f"Riduci {SIX_AXIS_LABELS.get(dominant, dominant)}, intensifica {SIX_AXIS_LABELS.get(weak, weak)} e Recovery." if risk_pct > 35 else "Profilo bilanciato. Mantieni il programma attuale.",
    }


@api_router.get("/coach/athlete/{athlete_id}/full-profile")
async def get_athlete_full_profile(athlete_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Deep dive: 6-axis radar, scan trend, injury risk, crew & global rank"""
    try:
        user = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Kore non trovato")
    if not user:
        raise HTTPException(status_code=404, detail="Kore non trovato")

    six_axis  = compute_six_axis(user)
    injury    = compute_injury_risk_detail(six_axis)

    # Scan trend: last 6 scan quality scores
    scans = await db.scan_results.find({"user_id": user["_id"]}).sort("scanned_at", -1).limit(6).to_list(6)
    scan_trend = [
        {
            "quality": s.get("quality_score", 0),
            "reps":    s.get("reps_completed", 0),
            "date":    s["scanned_at"].strftime("%d/%m") if s.get("scanned_at") else "?",
        }
        for s in reversed(scans)
    ]
    # Avg quality trend direction
    if len(scan_trend) >= 2:
        first_half = sum(s["quality"] for s in scan_trend[:len(scan_trend)//2]) / (len(scan_trend)//2)
        second_half = sum(s["quality"] for s in scan_trend[len(scan_trend)//2:]) / (len(scan_trend) - len(scan_trend)//2)
        trend_direction = "up" if second_half > first_half + 2 else "down" if second_half < first_half - 2 else "stable"
    else:
        trend_direction = "stable"

    # Crew membership
    crews = await db.crews_v2.find({"members": user["_id"]}).to_list(5)
    crew_info = [{"id": str(c["_id"]), "name": c["name"], "role": "OWNER" if c.get("owner_id") == user["_id"] else "MEMBER"} for c in crews]

    # Global rank (by XP)
    global_rank_count = await db.users.count_documents({"xp": {"$gt": user.get("xp", 0)}})
    global_rank = global_rank_count + 1

    return {
        "id":           str(user["_id"]),
        "username":     user.get("username"),
        "avatar_color": user.get("avatar_color", "#00F2FF"),
        "level":        user.get("level", 1),
        "xp":           user.get("xp", 0),
        "sport":        user.get("sport", "—"),
        "city":         user.get("city", "—"),
        "gender":       user.get("gender"),
        "age":          user.get("age"),
        "dna":          {k: user.get("dna", {}).get(k, 50) for k in DNA_KEYS} if user.get("dna") else {},
        "multiskill":   user.get("multiskill") or {},
        "six_axis":     six_axis,
        "injury_risk":  injury,
        "scan_trend":   scan_trend,
        "trend_direction": trend_direction,
        "crews":        crew_info,
        "global_rank":  global_rank,
        "ak_credits":   user.get("ak_credits", 0),
    }


@api_router.put("/coach/athlete/{athlete_id}/multiskill")
async def update_athlete_multiskill(athlete_id: str, data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Coach manually sets external metrics (GPS, watts, sleep, HRV)"""
    allowed = {"endurance_gps", "strength_watts", "sleep_score", "hrv_score"}
    updates = {k: float(v) for k, v in data.items() if k in allowed and v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nessun campo valido")
    try:
        oid = ObjectId(athlete_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    await db.users.update_one({"_id": oid}, {"$set": {f"multiskill.{k}": v for k, v in updates.items()}})
    user = await db.users.find_one({"_id": oid})
    return {"status": "updated", "six_axis": compute_six_axis(user), "multiskill": user.get("multiskill") or {}}


@api_router.get("/coach/athletes/full")
async def get_athletes_full_table(
    sort_by: str = "dna_avg",
    sort_order: str = "desc",
    min_dna: Optional[float] = None,
    injury_level: Optional[str] = None,   # HIGH | MEDIUM | LOW
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Full athlete table with 6-axis, injury risk, crew, and rank"""
    gym_id = current_user.get("gym_id")
    if gym_id:
        athletes = await db.users.find({"gym_id": gym_id}).to_list(100)
    else:
        coach_crews = await db.crews_v2.find({"owner_id": current_user["_id"]}).to_list(10)
        member_ids = list({mid for c in coach_crews for mid in c.get("members", [])})
        athletes = await db.users.find({"_id": {"$in": member_ids} if member_ids else {"$ne": current_user["_id"]}}).limit(50).to_list(50)

    # Enrich each athlete
    enriched = []
    for user in athletes:
        dna  = user.get("dna") or {}
        dna_avg = round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1) if dna else 50
        six_axis = compute_six_axis(user)
        injury   = compute_injury_risk_detail(six_axis)
        kore     = compute_kore_score(user, [])   # single call, reuse all fields

        # Last scan
        last_scan = await db.scan_results.find_one({"user_id": user["_id"]}, sort=[("scanned_at", -1)])
        days_since = None
        if last_scan and last_scan.get("scanned_at"):
            days_since = (datetime.utcnow() - last_scan["scanned_at"]).days

        # Crew
        crews = await db.crews_v2.find({"members": user["_id"]}).to_list(3)
        crew_names = [c["name"] for c in crews]

        # Global rank
        rank = await db.users.count_documents({"xp": {"$gt": user.get("xp", 0)}}) + 1

        # Compliance
        pushes = await db.challenge_pushes.find({"coach_id": current_user["_id"]}).to_list(10)
        completed = sum(1 for p in pushes for c in p.get("completions", []) if c.get("user_id") == user["_id"])
        comp_pct = round(completed / max(len(pushes), 1) * 100, 1) if pushes else 0

        if min_dna and dna_avg < min_dna:
            continue
        if injury_level and injury["level"] != injury_level:
            continue

        enriched.append({
            "id":           str(user["_id"]),
            "username":     user.get("username"),
            "avatar_color": user.get("avatar_color", "#00F2FF"),
            "level":        user.get("level", 1),
            "xp":           user.get("xp", 0),
            "sport":        user.get("sport", "—"),
            "city":         user.get("city", "—"),
            "dna_avg":      dna_avg,
            "kore_score":   kore["score"],
            "kore_grade":   kore["grade"],
            "kore_color":   kore["color"],
            "six_axis":     six_axis,
            "injury_risk":  injury,
            "days_since_scan": days_since,
            "crews":        crew_names,
            "global_rank":  rank,
            "compliance_pct": comp_pct,
        })

    reverse = sort_order == "desc"
    if sort_by in ("dna_avg", "kore_score"):
        enriched.sort(key=lambda a: a.get("kore_score", a["dna_avg"]), reverse=reverse)
    elif sort_by == "injury":
        enriched.sort(key=lambda a: a["injury_risk"]["risk_pct"], reverse=reverse)
    elif sort_by == "rank":
        enriched.sort(key=lambda a: a["global_rank"], reverse=not reverse)
    elif sort_by == "level":
        enriched.sort(key=lambda a: a["level"], reverse=reverse)

    return {"athletes": enriched, "total": len(enriched)}


# ── Team Comparison Mode — Compare up to 3 Athletes ──────────────────────────

@api_router.get("/coach/compare-athletes")
async def compare_athletes(
    ids: str = "",  # comma-separated athlete IDs
    current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))
):
    """Compare up to 3 athletes side-by-side: DNA radar + gap analysis."""
    if not ids:
        raise HTTPException(status_code=400, detail="Specifica almeno 2 ID atleti separati da virgola")

    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    if len(id_list) < 2 or len(id_list) > 3:
        raise HTTPException(status_code=400, detail="Seleziona da 2 a 3 atleti per il confronto")

    athletes = []
    for aid in id_list:
        try:
            user = await db.users.find_one({"_id": ObjectId(aid)})
        except Exception:
            continue
        if not user:
            continue

        dna = user.get("dna") or {}
        six_axis = compute_six_axis(user)
        dna_avg = round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1) if dna else 50
        kore = compute_kore_score(user, [])

        athletes.append({
            "id": str(user["_id"]),
            "username": user.get("username", "KORE"),
            "avatar_color": user.get("avatar_color", "#00E5FF"),
            "sport": user.get("sport", "—"),
            "level": user.get("level", 1),
            "dna_avg": dna_avg,
            "kore_score": kore["score"],
            "kore_grade": kore["grade"],
            "six_axis": six_axis,
            "dna": {k: dna.get(k, 50) for k in DNA_KEYS},
            "ak_credits": user.get("ak_credits", 0),
        })

    if len(athletes) < 2:
        raise HTTPException(status_code=404, detail="Atleti non trovati")

    # ── GAP ANALYSIS ──
    # For each stat, compute the leader and each athlete's gap from the leader
    stats = ['endurance', 'power', 'mobility', 'technique', 'recovery', 'agility']
    stat_labels = {
        'endurance': 'RESISTENZA', 'power': 'POTENZA', 'mobility': 'AGILITÀ',
        'technique': 'TECNICA', 'recovery': 'RECUPERO', 'agility': 'VELOCITÀ',
    }
    gap_analysis = []
    for stat in stats:
        values = [(a["username"], a["six_axis"].get(stat, 50)) for a in athletes]
        leader = max(values, key=lambda x: x[1])
        gaps = []
        for username, val in values:
            diff = round(val - leader[1], 1)
            diff_pct = round((diff / max(leader[1], 1)) * 100, 1) if leader[1] > 0 else 0
            gaps.append({
                "username": username,
                "value": round(val, 1),
                "diff": diff,
                "diff_pct": diff_pct,
                "is_leader": username == leader[0],
            })
        gap_analysis.append({
            "stat": stat,
            "label": stat_labels.get(stat, stat.upper()),
            "leader": leader[0],
            "leader_value": round(leader[1], 1),
            "athletes": gaps,
        })

    return {
        "athletes": athletes,
        "gap_analysis": gap_analysis,
        "stats": stats,
    }


# ── Crew CRM ──────────────────────────────────────────────────────────────────

@api_router.get("/crew/manage")
async def get_crew_management(current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Advanced crew management with weighted averages and member details"""
    coach_crews = await db.crews_v2.find({
        "$or": [{"owner_id": current_user["_id"]}, {"coaches": current_user["_id"]}]
    }).to_list(10)

    result = []
    for crew in coach_crews:
        members = []
        total_xp = 0
        dna_avgs = []
        six_axes = []

        for mid in crew.get("members", []):
            user = await db.users.find_one({"_id": mid})
            if not user:
                continue
            dna = user.get("dna") or {}
            dna_avg = round(sum(dna.get(k, 50) for k in DNA_KEYS) / len(DNA_KEYS), 1)
            six = compute_six_axis(user)
            xp = user.get("xp", 0)
            total_xp += xp
            dna_avgs.append(dna_avg)
            six_axes.append(six)
            members.append({
                "id":           str(user["_id"]),
                "username":     user.get("username"),
                "avatar_color": user.get("avatar_color", "#00F2FF"),
                "role":         "COACH" if user["_id"] in crew.get("coaches", []) else ("OWNER" if user["_id"] == crew.get("owner_id") else "ATHLETE"),
                "level":        user.get("level", 1),
                "xp":           xp,
                "dna_avg":      dna_avg,
                "six_axis":     six,
                "ak_credits":   user.get("ak_credits", 0),
            })

        # Weighted average DNA (XP-weighted)
        if members:
            total_w = sum(m["xp"] or 1 for m in members)
            weighted_dna = round(sum((m["dna_avg"] * (m["xp"] or 1)) for m in members) / max(total_w, 1), 1)
            # Average six-axis
            avg_six = {k: round(sum(s[k] for s in six_axes) / len(six_axes), 1) for k in SIX_AXIS_LABELS}
        else:
            weighted_dna = 0
            avg_six = {k: 50 for k in SIX_AXIS_LABELS}

        # Battle stats
        battles = await db.crew_battles.find({
            "$or": [{"crew_a_id": crew["_id"]}, {"crew_b_id": crew["_id"]}],
            "status": "completed"
        }).to_list(20)
        wins = sum(1 for b in battles if b.get("winner_crew_id") == crew["_id"])

        # Pending invitations
        invites = await db.crew_invitations.find({"crew_id": crew["_id"], "status": "pending"}).to_list(10)

        result.append({
            "id":            str(crew["_id"]),
            "name":          crew.get("name"),
            "members":       members,
            "members_count": len(members),
            "total_xp":      total_xp,
            "weighted_dna":  weighted_dna,
            "avg_six_axis":  avg_six,
            "battle_wins":   wins,
            "battle_total":  len(battles),
            "pending_invites": len(invites),
        })

    # Also get invitations sent by this coach
    sent_invites = await db.crew_invitations.find({"invited_by": current_user["_id"]}).sort("created_at", -1).limit(20).to_list(20)
    pending_received = await db.crew_invitations.find({"invited_user_id": current_user["_id"], "status": "pending"}).to_list(10)

    return {
        "crews": result,
        "sent_invitations": [
            {
                "id":             str(i["_id"]),
                "crew_name":      i.get("crew_name"),
                "invitee":        i.get("invitee_username"),
                "role":           i.get("role"),
                "status":         i.get("status"),
                "created_at":     i["created_at"].isoformat() if i.get("created_at") else None,
            }
            for i in sent_invites
        ],
        "pending_for_me": [
            {
                "id":         str(i["_id"]),
                "crew_name":  i.get("crew_name"),
                "invited_by": i.get("inviter_username"),
                "role":       i.get("role"),
            }
            for i in pending_received
        ],
    }


@api_router.post("/crew/invite")
async def invite_to_crew(data: dict, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Invite an athlete to a crew (Apple Calendar style invitation)"""
    crew_id   = data.get("crew_id")
    email     = data.get("email", "").strip().lower()
    role      = data.get("role", "ATHLETE")

    if not crew_id or not email:
        raise HTTPException(status_code=400, detail="crew_id e email richiesti")

    crew = await db.crews_v2.find_one({"_id": ObjectId(crew_id)})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")

    invitee = await db.users.find_one({"email": email})
    if not invitee:
        raise HTTPException(status_code=404, detail=f"Nessun utente con email {email}")
    if invitee["_id"] in crew.get("members", []):
        raise HTTPException(status_code=400, detail="L'utente è già nella crew")

    # Check duplicate pending
    existing = await db.crew_invitations.find_one({"crew_id": crew["_id"], "invited_user_id": invitee["_id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Invito già inviato a questo utente")

    now = datetime.utcnow()
    inv = {
        "crew_id":          crew["_id"],
        "crew_name":        crew.get("name"),
        "invited_user_id":  invitee["_id"],
        "invitee_username": invitee.get("username"),
        "invited_by":       current_user["_id"],
        "inviter_username": current_user.get("username"),
        "role":             role,
        "status":           "pending",
        "created_at":       now,
        "expires_at":       now + timedelta(days=7),
    }
    result = await db.crew_invitations.insert_one(inv)

    # Notify athlete
    await db.notifications.insert_one({
        "user_id": invitee["_id"],
        "type":    "crew_invitation",
        "title":   "INVITO CREW RICEVUTO",
        "icon":    "people",
        "color":   "#00F2FF",
        "message": f"{current_user.get('username')} ti invita nella crew '{crew.get('name')}' come {role}",
        "read":    False,
        "created_at": now,
        "meta":    {"invitation_id": str(result.inserted_id)},
    })

    return {"status": "invited", "invitation_id": str(result.inserted_id), "invitee": invitee.get("username"), "crew": crew.get("name")}


@api_router.post("/crew/invitations/{invitation_id}/respond")
async def respond_to_crew_invitation(invitation_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Accept or decline a crew invitation"""
    action = data.get("action")  # "accept" | "decline"
    if action not in ("accept", "decline"):
        raise HTTPException(status_code=400, detail="action deve essere 'accept' o 'decline'")
    try:
        inv = await db.crew_invitations.find_one({"_id": ObjectId(invitation_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Invito non trovato")
    if not inv or inv["invited_user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if inv["status"] != "pending":
        raise HTTPException(status_code=400, detail="Invito già gestito")

    await db.crew_invitations.update_one({"_id": inv["_id"]}, {"$set": {"status": action + "ed"}})

    if action == "accept":
        await db.crews_v2.update_one({"_id": inv["crew_id"]}, {"$addToSet": {"members": current_user["_id"]}})
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"gym_id": inv.get("crew_id")}})
        # Notify inviter
        await db.notifications.insert_one({
            "user_id": inv["invited_by"],
            "type": "invitation_accepted",
            "title": "INVITO ACCETTATO",
            "icon": "checkmark-circle",
            "color": "#34C759",
            "message": f"{current_user.get('username')} ha accettato l'invito per '{inv.get('crew_name')}'",
            "read": False,
            "created_at": datetime.utcnow(),
        })

    return {"status": action + "ed", "crew": inv.get("crew_name")}


# ================================================================
# AK CREDITS ENGINE — Virtual Currency & Premium Tool Gating
# ================================================================

PREMIUM_TOOLS = {
    "ai_matchmaker": {
        "id": "ai_matchmaker",
        "name": "AI MATCHMAKER",
        "description": "Sfida globale intelligente basata sul tuo DNA",
        "detail": "L'AI analizza il tuo KORE score e ti trova avversari al limite delle tue capacità.",
        "cost_ak": 500,
        "icon": "analytics",
        "color": "#D4AF37",
        "requires_pro": False,
        "category": "competitive",
    },
    "dna_radar_pro": {
        "id": "dna_radar_pro",
        "name": "DNA RADAR PRO",
        "description": "Confronta il tuo DNA con i Top Performer mondiali",
        "detail": "Overlay del tuo profilo contro la media dei Top 10 globali in ogni attributo.",
        "cost_ak": 200,
        "icon": "radio",
        "color": "#00F2FF",
        "requires_pro": False,
        "category": "analytics",
    },
    "injury_prevention": {
        "id": "injury_prevention",
        "name": "INJURY PREVENTION AI",
        "description": "Analisi rischio infortuni in tempo reale",
        "detail": "Monitora lo squilibrio DNA e avvisa prima che diventi un infortunio reale.",
        "cost_ak": 0,
        "icon": "shield-checkmark",
        "color": "#FF453A",
        "requires_pro": True,
        "category": "health",
    },
    "ghost_mode_pro": {
        "id": "ghost_mode_pro",
        "name": "GHOST MODE PRO",
        "description": "Competi in anonimato totale nel ranking globale",
        "detail": "Il tuo nome è nascosto. Il tuo score parla da solo.",
        "cost_ak": 150,
        "icon": "eye-off",
        "color": "#AF52DE",
        "requires_pro": False,
        "category": "privacy",
    },
    "battle_analytics": {
        "id": "battle_analytics",
        "name": "BATTLE ANALYTICS",
        "description": "Storico dettagliato di ogni battle con breakdown DNA",
        "detail": "Analisi post-battle: chi ha contribuito di più, dove hai perso terreno.",
        "cost_ak": 300,
        "icon": "bar-chart",
        "color": "#FF9500",
        "requires_pro": False,
        "category": "competitive",
    },
}

AK_EARN_RULES = {
    "nexus_scan": {"amount": 10, "label": "Scan Nexus completato"},
    "pvp_win": {"amount": 50, "label": "Vittoria PvP"},
    "crew_battle_win": {"amount": 100, "label": "Vittoria Crew Battle"},
    "daily_login": {"amount": 5, "label": "Login giornaliero"},
    "first_scan": {"amount": 25, "label": "Primo Scan Nexus"},
    "practice_session": {"amount": 5, "label": "Sessione Practice completata"},
    "ranked_win": {"amount": 50, "label": "Vittoria Ranked"},
    "ranked_loss": {"amount": -20, "label": "Sconfitta Ranked"},
    "duel_timeout_penalty": {"amount": -50, "label": "Penalità timeout duello 48h"},
    "qr_scan_reward": {"amount": 5, "label": "Scansione QR Kore (+5 FLUX)"},
    "qr_validated_challenge": {"amount": 0, "label": "Sfida validata QR Kore"},
    "iap_pack_small": {"amount": 500, "label": "Acquisto Pack S"},
    "iap_pack_medium": {"amount": 1200, "label": "Acquisto Pack M"},
    "iap_pack_large": {"amount": 3000, "label": "Acquisto Pack L"},
}


async def award_ak_credits(user_id, reason: str, custom_amount: int = 0) -> int:
    """Award AK credits to a user. Returns new balance."""
    rule = AK_EARN_RULES.get(reason)
    amount = custom_amount if custom_amount else (rule["amount"] if rule else 0)
    if amount == 0:
        return 0
    label = rule["label"] if rule else reason
    now = datetime.utcnow()
    await db.users.update_one({"_id": user_id}, {"$inc": {"ak_credits": amount}})
    tx_type = "earn" if amount > 0 else "penalty"
    await db.ak_transactions.insert_one({
        "user_id": user_id,
        "amount": amount,
        "reason": reason,
        "label": label,
        "type": tx_type,
        "created_at": now,
    })
    user = await db.users.find_one({"_id": user_id})
    # Ensure balance doesn't go below 0
    if user and user.get("ak_credits", 0) < 0:
        await db.users.update_one({"_id": user_id}, {"$set": {"ak_credits": 0}})
        return 0
    return user.get("ak_credits", 0) if user else 0


async def enforce_duel_timeouts():
    """Check all active/pending duels for 48h expiration and apply -50 FLUX penalty"""
    now = datetime.utcnow()
    expired_duels = await db.pvp_challenges.find({
        "status": {"$in": ["pending", "accepted", "challenger_done"]},
        "expires_at": {"$lte": now},
    }).to_list(100)

    for duel in expired_duels:
        duel_id = duel["_id"]
        status = duel["status"]
        challenger_id = duel["challenger_id"]
        challenged_id = duel["challenged_id"]

        if status == "pending":
            # Challenged user never responded — they get penalized
            await award_ak_credits(challenged_id, "duel_timeout_penalty")
            await db.pvp_challenges.update_one({"_id": duel_id}, {"$set": {
                "status": "expired",
                "penalty_applied_to": str(challenged_id),
                "expired_at": now,
            }})
            await db.notifications.insert_one({
                "user_id": challenged_id,
                "type": "duel_timeout",
                "title": "DUELLO SCADUTO — PENALITÀ",
                "message": f"Non hai risposto alla sfida di {duel.get('challenger_username', '?')} entro 48h. -50 FLUX.",
                "icon": "time-outline", "color": "#FF3B30",
                "read": False, "created_at": now,
            })
        elif status == "accepted":
            # Both accepted but neither submitted — both get penalized
            await award_ak_credits(challenger_id, "duel_timeout_penalty")
            await award_ak_credits(challenged_id, "duel_timeout_penalty")
            await db.pvp_challenges.update_one({"_id": duel_id}, {"$set": {
                "status": "expired",
                "penalty_applied_to": "both",
                "expired_at": now,
            }})
            for uid in [challenger_id, challenged_id]:
                await db.notifications.insert_one({
                    "user_id": uid,
                    "type": "duel_timeout",
                    "title": "DUELLO SCADUTO — PENALITÀ",
                    "message": "Nessuno ha completato lo scan entro 48h. -50 FLUX per entrambi.",
                    "icon": "time-outline", "color": "#FF3B30",
                    "read": False, "created_at": now,
                })
        elif status == "challenger_done":
            # Challenger did their scan, challenged didn't — challenged gets penalty
            await award_ak_credits(challenged_id, "duel_timeout_penalty")
            # Challenger gets a win by forfeit
            await award_ak_credits(challenger_id, "pvp_win")
            await db.pvp_challenges.update_one({"_id": duel_id}, {"$set": {
                "status": "forfeit",
                "winner_id": challenger_id,
                "winner_username": duel.get("challenger_username"),
                "penalty_applied_to": str(challenged_id),
                "expired_at": now,
            }})
            await db.notifications.insert_one({
                "user_id": challenged_id,
                "type": "duel_timeout",
                "title": "DUELLO PERSO PER FORFEIT",
                "message": f"Non hai completato lo scan entro 48h. {duel.get('challenger_username', '?')} vince per forfeit. -50 FLUX.",
                "icon": "time-outline", "color": "#FF3B30",
                "read": False, "created_at": now,
            })
            await db.notifications.insert_one({
                "user_id": challenger_id,
                "type": "duel_forfeit_win",
                "title": "VITTORIA PER FORFEIT",
                "message": f"{duel.get('challenged_username', '?')} non ha completato lo scan entro 48h. Vittoria automatica! +50 FLUX.",
                "icon": "trophy", "color": "#FFD700",
                "read": False, "created_at": now,
            })

    return len(expired_duels)


@api_router.get("/ak/balance")
async def get_ak_balance(current_user: dict = Depends(get_current_user)):
    """Get AK credits balance and recent transactions"""
    txns = await db.ak_transactions.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).limit(20).to_list(20)
    return {
        "ak_credits": current_user.get("ak_credits", 0),
        "unlocked_tools": current_user.get("unlocked_tools", []),
        "transactions": [
            {
                "amount": t["amount"],
                "label": t.get("label", t.get("reason")),
                "type": t.get("type", "earn"),
                "created_at": t["created_at"].isoformat() if t.get("created_at") else None,
            }
            for t in txns
        ],
    }


@api_router.get("/ak/tools")
async def get_ak_tools(current_user: dict = Depends(get_current_user)):
    """Get all premium tools with unlock status for current user"""
    unlocked = current_user.get("unlocked_tools", [])
    ak = current_user.get("ak_credits", 0)
    # Pro check
    is_pro = current_user.get("is_pro", False) or current_user.get("pro_unlocked", False) or current_user.get("is_founder", False)
    result = []
    for tool_id, tool in PREMIUM_TOOLS.items():
        is_unlocked = tool_id in unlocked or (tool.get("requires_pro") and is_pro)
        can_afford = ak >= tool["cost_ak"] and not tool.get("requires_pro")
        result.append({
            **tool,
            "is_unlocked": is_unlocked,
            "can_afford": can_afford,
            "locked_reason": (
                "PRO/ENTERPRISE plan required" if tool.get("requires_pro") and not is_unlocked
                else f"Serve {tool['cost_ak']} AK" if not is_unlocked and not can_afford
                else None
            ),
        })
    return {
        "tools": result,
        "ak_credits": ak,
        "earn_rules": [{"reason": k, "amount": v["amount"], "label": v["label"]} for k, v in AK_EARN_RULES.items() if not k.startswith("iap")],
    }


@api_router.post("/ak/unlock-tool")
async def unlock_tool(data: dict, current_user: dict = Depends(get_current_user)):
    """Spend AK credits to unlock a premium tool"""
    tool_id = data.get("tool_id")
    if not tool_id or tool_id not in PREMIUM_TOOLS:
        raise HTTPException(status_code=400, detail="Tool non valido")
    tool = PREMIUM_TOOLS[tool_id]
    # Already unlocked?
    if tool_id in current_user.get("unlocked_tools", []):
        return {"status": "already_unlocked", "tool": tool_id, "ak_credits": current_user.get("ak_credits", 0)}
    # Pro-only tools
    is_pro = current_user.get("is_pro", False) or current_user.get("is_founder", False)
    if tool.get("requires_pro") and not is_pro:
        raise HTTPException(status_code=402, detail="Questo tool richiede un piano Pro/Enterprise")
    # AK check (pro-required tools are free)
    cost = tool["cost_ak"]
    if not tool.get("requires_pro"):
        if current_user.get("ak_credits", 0) < cost:
            raise HTTPException(status_code=402, detail=f"AK insufficienti. Servono {cost} AK.")
        await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"ak_credits": -cost}})
        await db.ak_transactions.insert_one({
            "user_id": current_user["_id"], "amount": -cost,
            "reason": f"unlock_{tool_id}", "label": f"Sbloccato: {tool['name']}",
            "type": "spend", "created_at": datetime.utcnow(),
        })
    # Unlock the tool
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$addToSet": {"unlocked_tools": tool_id}}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "unlocked",
        "tool_id": tool_id,
        "tool_name": tool["name"],
        "ak_credits": updated.get("ak_credits", 0),
        "unlocked_tools": updated.get("unlocked_tools", []),
    }


@api_router.post("/ak/earn")
async def earn_ak_credits(data: dict, current_user: dict = Depends(get_current_user)):
    """Manually earn AK credits (daily login, etc.)"""
    reason = data.get("reason", "daily_login")
    if reason not in AK_EARN_RULES:
        raise HTTPException(status_code=400, detail="Motivo non valido")
    new_balance = await award_ak_credits(current_user["_id"], reason)
    return {"status": "earned", "amount": AK_EARN_RULES[reason]["amount"], "ak_credits": new_balance}


@api_router.get("/ak/ai-prompt")
async def get_ai_tool_prompt(current_user: dict = Depends(get_current_user)):
    """AI suggests premium tools based on user's current situation"""
    unlocked = current_user.get("unlocked_tools", [])
    ak = current_user.get("ak_credits", 0)
    dna = current_user.get("dna") or {}
    dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
    dna_vals = [dna.get(k, 50) for k in dna_keys]
    max_v, min_v = max(dna_vals) if dna_vals else 50, min(dna_vals) if dna_vals else 50
    imbalance = max_v - min_v

    prompts = []

    # PvP streak check
    recent_pvp = await db.pvp_challenges.find(
        {"winner_id": current_user["_id"], "status": "completed"}
    ).sort("created_at", -1).limit(3).to_list(3)
    if len(recent_pvp) >= 3 and "ai_matchmaker" not in unlocked:
        prompts.append({
            "type": "streak",
            "icon": "flame",
            "color": "#FF9500",
            "title": "SEI IN FIAMME!",
            "message": "3 vittorie consecutive. Usa i tuoi AK per sbloccare l'AI Matchmaker e sfida il mondo.",
            "cta": "SBLOCCA AI MATCHMAKER",
            "tool_id": "ai_matchmaker",
            "cost_ak": 500,
            "can_afford": ak >= 500,
        })

    # Injury risk check
    if imbalance > 25 and "injury_prevention" not in unlocked:
        max_key = dna_keys[dna_vals.index(max_v)]
        prompts.append({
            "type": "injury_risk",
            "icon": "warning",
            "color": "#FF453A",
            "title": "RISCHIO INFORTUNIO RILEVATO",
            "message": f"Squilibrio DNA critico su {max_key.upper()}. Sblocca l'Injury Prevention Tool per i dettagli.",
            "cta": "SCOPRI IL RISCHIO",
            "tool_id": "injury_prevention",
            "cost_ak": 0,
            "can_afford": False,
            "requires_pro": True,
        })

    # Low credits
    if ak < 100:
        prompts.append({
            "type": "earn_ak",
            "icon": "flash",
            "color": "#D4AF37",
            "title": "ACCUMULA AK",
            "message": f"Hai {ak} AK. Fai uno Scan Nexus per guadagnare +10 AK e sbloccare i tool premium.",
            "cta": "FALLO ORA",
            "tool_id": None,
            "cost_ak": 0,
            "can_afford": True,
        })

    # DNA Radar Pro suggestion
    if "dna_radar_pro" not in unlocked and ak >= 200:
        prompts.append({
            "type": "analytics",
            "icon": "analytics",
            "color": "#00F2FF",
            "title": "ANALIZZA IL TUO DNA",
            "message": "Hai abbastanza AK. Confronta il tuo DNA con i Top Performer mondiali.",
            "cta": "SBLOCCA DNA RADAR PRO",
            "tool_id": "dna_radar_pro",
            "cost_ak": 200,
            "can_afford": True,
        })

    return {"prompts": prompts[:2], "ak_credits": ak}  # Max 2 prompts at a time


# =====================================================================
def pvp_challenge_to_response(ch: dict) -> dict:
    return {
        "id": str(ch["_id"]),
        "challenger_id": str(ch["challenger_id"]),
        "challenger_username": ch.get("challenger_username", "?"),
        "challenged_id": str(ch["challenged_id"]),
        "challenged_username": ch.get("challenged_username", "?"),
        "discipline": ch["discipline"],
        "discipline_label": DISCIPLINE_CONFIG.get(ch["discipline"], {}).get("label", ch["discipline"].upper()),
        "xp_stake": ch.get("xp_stake", 100),
        "status": ch.get("status"),
        "challenger_result": ch.get("challenger_result"),
        "challenged_result": ch.get("challenged_result"),
        "winner_id": str(ch["winner_id"]) if ch.get("winner_id") else None,
        "winner_username": ch.get("winner_username"),
        "created_at": ch["created_at"].isoformat() if ch.get("created_at") else None,
        "expires_at": ch["expires_at"].isoformat() if ch.get("expires_at") else None,
    }


@api_router.post("/pvp/challenge")
async def send_pvp_challenge(data: PvPChallengeRequest, current_user: dict = Depends(get_current_user)):
    """Send a PvP challenge to another athlete"""
    if data.discipline not in DISCIPLINE_CONFIG:
        raise HTTPException(status_code=400, detail=f"Disciplina non valida. Scegli: {list(DISCIPLINE_CONFIG.keys())}")
    if data.xp_stake not in [50, 100, 200, 500]:
        raise HTTPException(status_code=400, detail="FLUX stake non valido. Scegli: 50, 100, 200 o 500")

    try:
        challenged = await db.users.find_one({"_id": ObjectId(data.challenged_user_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if not challenged:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if str(challenged["_id"]) == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Non puoi sfidare te stesso")

    # Check user has enough XP to stake
    if current_user.get("xp", 0) < data.xp_stake:
        raise HTTPException(status_code=400, detail=f"XP insufficienti. Hai {current_user.get('xp', 0)} XP, ne servono {data.xp_stake}")

    # Check no active challenge between these users
    existing = await db.pvp_challenges.find_one({
        "$or": [
            {"challenger_id": current_user["_id"], "challenged_id": challenged["_id"]},
            {"challenger_id": challenged["_id"], "challenged_id": current_user["_id"]},
        ],
        "status": {"$in": ["pending", "accepted", "challenger_done"]},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Sfida già attiva con questo Kore")

    now = datetime.utcnow()
    challenge_doc = {
        "challenger_id": current_user["_id"],
        "challenger_username": current_user["username"],
        "challenged_id": challenged["_id"],
        "challenged_username": challenged["username"],
        "discipline": data.discipline,
        "xp_stake": data.xp_stake,
        "status": "pending",
        "challenger_result": None,
        "challenged_result": None,
        "winner_id": None,
        "winner_username": None,
        "created_at": now,
        "expires_at": now + timedelta(hours=48),
    }
    result = await db.pvp_challenges.insert_one(challenge_doc)

    # Notify challenged user
    disc = DISCIPLINE_CONFIG[data.discipline]
    await db.notifications.insert_one({
        "user_id": challenged["_id"],
        "type": "pvp_challenge",
        "title": "SFIDA PVP RICEVUTA",
        "message": f"{current_user['username']} ti sfida in {disc['label']} · {data.xp_stake} XP in palio",
        "icon": "flash", "color": "#FF453A",
        "read": False, "created_at": now,
        "meta": {"challenge_id": str(result.inserted_id)},
    })

    return {
        "status": "challenge_sent",
        "challenge_id": str(result.inserted_id),
        "opponent": challenged["username"],
        "discipline": data.discipline,
        "xp_stake": data.xp_stake,
    }


@api_router.get("/pvp/pending")
async def get_pvp_pending(current_user: dict = Depends(get_current_user)):
    """Get pending PvP challenges (received + sent) — also enforces 48h timeout on read"""
    # ═══ LAZY ENFORCEMENT: Check for expired duels on every read ═══
    await enforce_duel_timeouts()

    received = await db.pvp_challenges.find({
        "challenged_id": current_user["_id"],
        "status": "pending",
    }).sort("created_at", -1).to_list(10)

    sent = await db.pvp_challenges.find({
        "challenger_id": current_user["_id"],
        "status": {"$in": ["pending", "accepted", "challenger_done"]},
    }).sort("created_at", -1).to_list(10)

    active = await db.pvp_challenges.find({
        "$or": [
            {"challenger_id": current_user["_id"], "status": "accepted"},
            {"challenged_id": current_user["_id"], "status": {"$in": ["accepted", "challenger_done"]}},
        ]
    }).to_list(5)

    # Also include recently expired for visibility
    expired = await db.pvp_challenges.find({
        "$or": [
            {"challenger_id": current_user["_id"]},
            {"challenged_id": current_user["_id"]},
        ],
        "status": {"$in": ["expired", "forfeit"]},
        "expired_at": {"$gte": datetime.utcnow() - timedelta(hours=24)},
    }).sort("expired_at", -1).to_list(5)

    return {
        "received": [pvp_challenge_to_response(c) for c in received],
        "sent": [pvp_challenge_to_response(c) for c in sent],
        "active": [pvp_challenge_to_response(c) for c in active],
        "expired": [pvp_challenge_to_response(c) for c in expired],
    }


@api_router.post("/pvp/challenges/{challenge_id}/accept")
async def accept_pvp_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Accept a PvP challenge"""
    try:
        ch = await db.pvp_challenges.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not ch or ch["challenged_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if ch["status"] != "pending":
        raise HTTPException(status_code=400, detail="Sfida non più in attesa")

    await db.pvp_challenges.update_one({"_id": ch["_id"]}, {"$set": {"status": "accepted"}})

    # Notify challenger
    await db.notifications.insert_one({
        "user_id": ch["challenger_id"],
        "type": "pvp_accepted",
        "title": "SFIDA ACCETTATA",
        "message": f"{current_user['username']} ha accettato la tua sfida {DISCIPLINE_CONFIG[ch['discipline']]['label']}! Fai il tuo scan.",
        "icon": "checkmark-circle", "color": "#00F2FF",
        "read": False, "created_at": datetime.utcnow(),
        "meta": {"challenge_id": challenge_id},
    })
    return {"status": "accepted", "challenge_id": challenge_id}


@api_router.post("/pvp/challenges/{challenge_id}/decline")
async def decline_pvp_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Decline a PvP challenge"""
    try:
        ch = await db.pvp_challenges.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not ch or ch["challenged_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    if ch["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Non puoi rifiutare questa sfida")

    await db.pvp_challenges.update_one({"_id": ch["_id"]}, {"$set": {"status": "declined"}})
    return {"status": "declined"}


@api_router.get("/pvp/challenges/{challenge_id}")
async def get_pvp_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get PvP challenge details (for Ghost Session)"""
    try:
        ch = await db.pvp_challenges.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not ch:
        raise HTTPException(status_code=404, detail="Sfida non trovata")

    user_is_challenger = ch["challenger_id"] == current_user["_id"]
    user_is_challenged = ch["challenged_id"] == current_user["_id"]
    if not user_is_challenger and not user_is_challenged:
        raise HTTPException(status_code=403, detail="Non sei in questa sfida")

    resp = pvp_challenge_to_response(ch)
    disc_cfg = DISCIPLINE_CONFIG.get(ch["discipline"], {})
    resp["exercise"] = disc_cfg.get("exercise", "squat")
    resp["target_duration"] = disc_cfg.get("duration", 30)
    resp["your_role"] = "challenger" if user_is_challenger else "challenged"

    # Ghost data: show opponent result if they already submitted
    ghost = None
    if user_is_challenged and ch.get("challenger_result"):
        ghost = {
            "username": ch.get("challenger_username"),
            "reps": ch["challenger_result"].get("reps", 0),
            "quality_score": ch["challenger_result"].get("quality_score", 0),
            "duration_seconds": ch["challenger_result"].get("duration_seconds", 0),
        }
    elif user_is_challenger and ch.get("challenged_result"):
        ghost = {
            "username": ch.get("challenged_username"),
            "reps": ch["challenged_result"].get("reps", 0),
            "quality_score": ch["challenged_result"].get("quality_score", 0),
            "duration_seconds": ch["challenged_result"].get("duration_seconds", 0),
        }
    resp["ghost"] = ghost
    return resp


@api_router.post("/pvp/challenges/{challenge_id}/submit")
async def submit_pvp_result(challenge_id: str, data: PvPSubmitRequest, current_user: dict = Depends(get_current_user)):
    """Submit scan result for PvP challenge with anti-cheat validation"""
    try:
        ch = await db.pvp_challenges.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if not ch:
        raise HTTPException(status_code=404, detail="Sfida non trovata")

    user_is_challenger = ch["challenger_id"] == current_user["_id"]
    user_is_challenged = ch["challenged_id"] == current_user["_id"]
    if not user_is_challenger and not user_is_challenged:
        raise HTTPException(status_code=403, detail="Non sei in questa sfida")

    valid_statuses = ["accepted", "challenger_done"] if user_is_challenged else ["accepted"]
    if user_is_challenger and ch["status"] == "pending":
        valid_statuses = ["pending", "accepted"]
    if ch["status"] not in valid_statuses and ch["status"] not in ["pending", "accepted", "challenger_done"]:
        raise HTTPException(status_code=400, detail=f"Sfida non in stato valido: {ch['status']}")

    # Anti-cheat validation
    disc_cfg = DISCIPLINE_CONFIG.get(ch["discipline"], {})
    target_duration = disc_cfg.get("duration", 30)
    anti_cheat = validate_scan_anti_cheat(data.reps, data.quality_score, data.duration_seconds, target_duration)

    result_doc = {
        "reps": data.reps,
        "quality_score": data.quality_score,
        "duration_seconds": data.duration_seconds,
        "peak_acceleration": data.peak_acceleration,
        "anti_cheat_score": anti_cheat["score"],
        "anti_cheat_issues": anti_cheat["issues"],
        "validated": anti_cheat["valid"],
        "submitted_at": datetime.utcnow(),
    }

    if not anti_cheat["valid"]:
        return {
            "status": "rejected",
            "reason": "SCAN NON VALIDO — Anti-Cheat AI ha rilevato irregolarità",
            "anti_cheat": anti_cheat,
        }

    # Determine PvP score (reps * quality_weight)
    pvp_score = round(data.reps * (0.5 + data.quality_score / 200), 1)
    result_doc["pvp_score"] = pvp_score

    now = datetime.utcnow()
    if user_is_challenger:
        await db.pvp_challenges.update_one(
            {"_id": ch["_id"]},
            {"$set": {"challenger_result": result_doc, "status": "challenger_done"}}
        )
        return {"status": "submitted", "pvp_score": pvp_score, "anti_cheat": anti_cheat, "waiting_for": "opponent"}

    # Challenged user submitted — determine winner
    await db.pvp_challenges.update_one(
        {"_id": ch["_id"]},
        {"$set": {"challenged_result": result_doc}}
    )
    ch_refreshed = await db.pvp_challenges.find_one({"_id": ch["_id"]})
    challenger_score = ch_refreshed.get("challenger_result", {}).get("pvp_score", 0) if ch_refreshed.get("challenger_result") else 0
    challenged_score = pvp_score

    if challenger_score > challenged_score:
        winner_id = ch["challenger_id"]
        winner_username = ch.get("challenger_username")
        loser_id = ch["challenged_id"]
        winner_xp_gain = ch["xp_stake"]
        loser_xp_loss = min(ch["xp_stake"], current_user.get("xp", 0))
    elif challenged_score > challenger_score:
        winner_id = ch["challenged_id"]
        winner_username = ch.get("challenged_username")
        loser_id = ch["challenger_id"]
        winner_xp_gain = ch["xp_stake"]
        loser_xp_loss = min(ch["xp_stake"], (await db.users.find_one({"_id": ch["challenger_id"]}) or {}).get("xp", 0))
    else:
        # Tie: nobody loses XP
        await db.pvp_challenges.update_one({"_id": ch["_id"]}, {"$set": {"status": "tie"}})
        return {"status": "tie", "pvp_score": pvp_score, "opponent_score": challenger_score}

    # Apply XP transfer + mark as completed
    await db.pvp_challenges.update_one(
        {"_id": ch["_id"]},
        {"$set": {"status": "completed", "winner_id": winner_id, "winner_username": winner_username}}
    )
    await db.users.update_one({"_id": winner_id}, {"$inc": {"xp": winner_xp_gain}})
    await db.users.update_one({"_id": loser_id}, {"$inc": {"xp": -loser_xp_loss}})

    # Notify both
    is_winner = winner_id == current_user["_id"]
    await db.notifications.insert_one({
        "user_id": winner_id,
        "type": "pvp_won",
        "title": "SFIDA VINTA",
        "message": f"Hai battuto {winner_username if winner_username != winner_id else '?'} in {disc_cfg.get('label', '')}! +{winner_xp_gain} XP",
        "icon": "trophy", "color": "#D4AF37",
        "read": False, "created_at": now,
    })
    await db.notifications.insert_one({
        "user_id": loser_id,
        "type": "pvp_lost",
        "title": "SFIDA PERSA",
        "message": f"Hai perso contro {winner_username} in {disc_cfg.get('label', '')}. -{loser_xp_loss} XP. Allenati di più!",
        "icon": "alert-circle", "color": "#FF453A",
        "read": False, "created_at": now,
    })

    # Award AK Credits for PvP win
    if winner_id == current_user["_id"]:
        await award_ak_credits(winner_id, "pvp_win")

    # ── PERFORMANCE RECORD: Persist PvP Duel ──
    await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo="DUELLO",
        modalita="INDIVIDUALE",
        disciplina=ch.get("discipline", "Fitness"),
        exercise_type=ch.get("discipline", "squat"),
        kpi={
            "primary_result": {"type": "REPS", "value": data.reps, "unit": "rep"},
            "quality_score": data.quality_score,
            "explosivity_pct": data.peak_acceleration,
        },
        is_certified=False,
        validation_status="AI_VERIFIED",
        flux_earned=winner_xp_gain if is_winner else -loser_xp_loss,
        source_id=challenge_id,
        source_collection="pvp_challenges",
        extra_meta={
            "pvp_score": pvp_score,
            "opponent_score": challenger_score,
            "is_winner": is_winner,
            "duration_seconds": data.duration_seconds,
        },
    )

    return {
        "your_score": pvp_score,
        "opponent_score": challenger_score,
        "xp_change": winner_xp_gain if is_winner else -loser_xp_loss,
        "anti_cheat": anti_cheat,
    }


# =====================================================================
# LIVE WAITING ROOM — Real-time matchmaking queue
# =====================================================================

class LiveQueueRequest(BaseModel):
    exercise_type: str = "squat"
    discipline: str = "power"

@api_router.post("/live/join-queue")
async def join_live_queue(data: LiveQueueRequest, current_user: dict = Depends(get_current_user)):
    """Join the Live Arena waiting room for real-time matchmaking"""
    now = datetime.utcnow()
    user_id = current_user["_id"]

    # Remove stale entries (older than 5 min)
    await db.live_queue.delete_many({"joined_at": {"$lt": now - timedelta(minutes=5)}})

    # Check if already in queue
    existing = await db.live_queue.find_one({"user_id": user_id, "status": "waiting"})
    if existing:
        return {"status": "already_waiting", "position": 1, "queue_id": str(existing["_id"])}

    # Add to queue
    entry = {
        "user_id": user_id,
        "username": current_user.get("username", "?"),
        "exercise_type": data.exercise_type,
        "discipline": data.discipline,
        "level": current_user.get("level", 1),
        "status": "waiting",
        "joined_at": now,
    }
    result = await db.live_queue.insert_one(entry)

    # Try to match immediately
    opponent = await db.live_queue.find_one({
        "user_id": {"$ne": user_id},
        "exercise_type": data.exercise_type,
        "status": "waiting",
    })

    if opponent:
        # Match found! Create a live battle
        battle_id = str(ObjectId())
        await db.live_queue.update_many(
            {"_id": {"$in": [result.inserted_id, opponent["_id"]]}},
            {"$set": {"status": "matched", "battle_id": battle_id}}
        )

        live_battle = {
            "_id": ObjectId(battle_id),
            "type": "live_1v1",
            "player_a_id": user_id,
            "player_a_username": current_user.get("username", "?"),
            "player_b_id": opponent["user_id"],
            "player_b_username": opponent.get("username", "?"),
            "exercise_type": data.exercise_type,
            "discipline": data.discipline,
            "status": "countdown",
            "created_at": now,
            "expires_at": now + timedelta(minutes=10),
        }
        await db.live_battles.insert_one(live_battle)

        # Notify both players
        for uid in [user_id, opponent["user_id"]]:
            await db.notifications.insert_one({
                "user_id": uid,
                "type": "live_match_found",
                "title": "MATCH TROVATO — LIVE ARENA",
                "message": f"Avversario trovato! Preparati per la sfida live.",
                "icon": "radio", "color": "#FF6B00",
                "read": False, "created_at": now,
                "meta": {"battle_id": battle_id},
            })

        return {
            "status": "matched",
            "battle_id": battle_id,
            "opponent_username": opponent.get("username", "?"),
            "opponent_level": opponent.get("level", 1),
        }

    # Count queue position
    queue_count = await db.live_queue.count_documents({
        "exercise_type": data.exercise_type,
        "status": "waiting",
    })

    return {
        "status": "waiting",
        "position": queue_count,
        "queue_id": str(result.inserted_id),
    }


@api_router.get("/live/queue-status")
async def get_live_queue_status(current_user: dict = Depends(get_current_user)):
    """Check if the user has been matched in the Live Arena"""
    entry = await db.live_queue.find_one({
        "user_id": current_user["_id"],
        "status": {"$in": ["waiting", "matched"]},
    })

    if not entry:
        return {"status": "not_in_queue"}

    if entry["status"] == "matched":
        battle = await db.live_battles.find_one({"_id": ObjectId(entry.get("battle_id", ""))})
        if battle:
            opp_username = battle["player_b_username"] if battle["player_a_id"] == current_user["_id"] else battle["player_a_username"]
            return {
                "status": "matched",
                "battle_id": str(battle["_id"]),
                "opponent_username": opp_username,
            }

    # Cleanup: auto-remove stale entries
    if entry["joined_at"] < datetime.utcnow() - timedelta(minutes=5):
        await db.live_queue.delete_one({"_id": entry["_id"]})
        return {"status": "expired"}

    queue_count = await db.live_queue.count_documents({
        "exercise_type": entry["exercise_type"],
        "status": "waiting",
    })
    return {"status": "waiting", "position": queue_count, "seconds_elapsed": int((datetime.utcnow() - entry["joined_at"]).total_seconds())}


@api_router.post("/live/leave-queue")
async def leave_live_queue(current_user: dict = Depends(get_current_user)):
    """Leave the Live Arena waiting room"""
    await db.live_queue.delete_many({"user_id": current_user["_id"], "status": "waiting"})
    return {"status": "left_queue"}


# =====================================================================
# PRACTICE & RANKED SESSION MODES — FLUX Economy Integration
# =====================================================================

class SessionCompleteRequest(BaseModel):
    mode: str  # "practice" | "ranked"
    exercise_type: str = "squat"
    reps: int
    quality_score: float
    duration_seconds: int
    peak_acceleration: float = 0.0

@api_router.post("/nexus/session/complete")
async def complete_nexus_session_v2(data: SessionCompleteRequest, current_user: dict = Depends(get_current_user)):
    """Complete a NEXUS session with mode-specific FLUX rewards"""
    now = datetime.utcnow()
    user_id = current_user["_id"]

    anti_cheat = validate_scan_anti_cheat(data.reps, data.quality_score, data.duration_seconds, 60)
    if not anti_cheat["valid"]:
        return {"status": "rejected", "reason": "Anti-Cheat: scan non valido", "anti_cheat": anti_cheat}

    pvp_score = round(data.reps * (0.5 + data.quality_score / 200), 1)

    session_doc = {
        "user_id": user_id,
        "mode": data.mode,
        "exercise_type": data.exercise_type,
        "reps": data.reps,
        "quality_score": data.quality_score,
        "duration_seconds": data.duration_seconds,
        "peak_acceleration": data.peak_acceleration,
        "pvp_score": pvp_score,
        "anti_cheat_score": anti_cheat["score"],
        "created_at": now,
    }

    flux_earned = 0
    flux_reason = ""

    if data.mode == "practice":
        # Practice: flat +5 FLUX per session
        flux_earned = 5
        flux_reason = "practice_session"
        session_doc["flux_earned"] = flux_earned

    elif data.mode == "ranked":
        # Ranked: compare against user's personal best
        personal_best = await db.nexus_sessions.find_one(
            {"user_id": user_id, "exercise_type": data.exercise_type, "mode": "ranked"},
            sort=[("pvp_score", -1)]
        )
        pb_score = personal_best["pvp_score"] if personal_best else 0

        if pvp_score > pb_score:
            # New personal best = +50 FLUX
            flux_earned = 50
            flux_reason = "ranked_win"
            session_doc["is_personal_best"] = True
            session_doc["previous_best"] = pb_score
        else:
            # Below personal best = -20 FLUX
            flux_earned = -20
            flux_reason = "ranked_loss"
            session_doc["is_personal_best"] = False
        session_doc["flux_earned"] = flux_earned

    await db.nexus_sessions.insert_one(session_doc)

    # Award/deduct FLUX
    new_balance = 0
    if flux_earned != 0:
        new_balance = await award_ak_credits(user_id, flux_reason)

    # Update XP
    xp_earned = max(data.reps * 5, 10)
    await db.users.update_one({"_id": user_id}, {"$inc": {"xp": xp_earned}})

    updated_user = await db.users.find_one({"_id": user_id})

    # ── PERFORMANCE RECORD: Persist Nexus session ──
    tipo_session = "LIVE_ARENA" if data.mode == "ranked" else "ALLENAMENTO"
    await save_performance_record(
        user_id=user_id,
        username=current_user.get("username", "Kore"),
        tipo=tipo_session,
        modalita="INDIVIDUALE",
        disciplina=current_user.get("sport", "Fitness"),
        exercise_type=data.exercise_type,
        kpi={
            "primary_result": {"type": "REPS", "value": data.reps, "unit": "rep"},
            "quality_score": data.quality_score,
            "explosivity_pct": data.peak_acceleration,
        },
        is_certified=False,
        validation_status="AI_VERIFIED",
        flux_earned=flux_earned,
        source_collection="nexus_sessions",
        extra_meta={
            "mode": data.mode,
            "pvp_score": pvp_score,
            "duration_seconds": data.duration_seconds,
            "is_personal_best": session_doc.get("is_personal_best", False),
        },
    )

    return {
        "status": "completed",
        "mode": data.mode,
        "pvp_score": pvp_score,
        "flux_earned": flux_earned,
        "flux_balance": new_balance or updated_user.get("ak_credits", 0),
        "xp_earned": xp_earned,
        "is_personal_best": session_doc.get("is_personal_best", False),
        "anti_cheat": anti_cheat,
        "user": {
            "xp": updated_user.get("xp", 0),
            "level": updated_user.get("level", 1),
            "ak_credits": updated_user.get("ak_credits", 0),
        }
    }


# =====================================================================
# CHALLENGE ENGINE — Create, Complete, Verdict
# =====================================================================

@api_router.post("/challenge/create")
async def create_challenge_engine(data: ChallengeEngineCreate, current_user: dict = Depends(get_current_user)):
    """Create a tagged challenge with validation mode"""
    now = datetime.utcnow()
    user_id = current_user["_id"]

    # Validate tags
    valid_tags = {"POWER", "FLOW", "PULSE"}
    tags = [t.upper() for t in data.tags if t.upper() in valid_tags]
    if not tags:
        raise HTTPException(status_code=400, detail="Almeno un tag obbligatorio: POWER, FLOW, PULSE")

    # Validate validation mode
    valid_modes = {"AUTO_COUNT", "MANUAL_ENTRY", "SENSOR_IMPORT"}
    if data.validation_mode.upper() not in valid_modes:
        raise HTTPException(status_code=400, detail="Modalità non valida. Usa: AUTO_COUNT, MANUAL_ENTRY, SENSOR_IMPORT")

    # Determine dominant tag (first one)
    dominant_tag = tags[0]
    dominant_color = TAG_COLORS.get(dominant_tag, "#00E5FF")

    challenge_doc = {
        "user_id": user_id,
        "username": current_user.get("username", "KORE"),
        "title": data.title,
        "exercise_type": data.exercise_type,
        "tags": tags,
        "dominant_tag": dominant_tag,
        "dominant_color": dominant_color,
        "validation_mode": data.validation_mode.upper(),
        "mode": data.mode,
        "target_reps": data.target_reps,
        "target_seconds": data.target_seconds,
        "target_kg": data.target_kg,
        "status": "active",
        "created_at": now,
        "ranked_eligible": data.validation_mode.upper() == "AUTO_COUNT",
    }

    result = await db.challenges_engine.insert_one(challenge_doc)

    return {
        "challenge_id": str(result.inserted_id),
        "status": "active",
        "tags": tags,
        "dominant_tag": dominant_tag,
        "dominant_color": dominant_color,
        "validation_mode": data.validation_mode.upper(),
        "ranked_eligible": challenge_doc["ranked_eligible"],
        "flux_multiplier": VALIDATION_FLUX_MULTIPLIERS.get(data.validation_mode.upper(), 0.5),
    }


@api_router.post("/challenge/complete")
async def complete_challenge_engine(data: ChallengeEngineComplete, current_user: dict = Depends(get_current_user)):
    """Complete a challenge — Biometric Sanity Check, Verification Status, FLUX, DNA, Verdict"""
    now = datetime.utcnow()
    user_id = current_user["_id"]

    # Fetch challenge
    try:
        challenge = await db.challenges_engine.find_one({"_id": ObjectId(data.challenge_id), "user_id": user_id})
    except Exception:
        raise HTTPException(status_code=400, detail="ID sfida non valido")
    if not challenge:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if challenge.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Sfida già completata")

    val_mode = data.validation_mode.upper()
    proof_type = (data.proof_type or "NONE").upper()

    reps = data.reps or 0
    seconds = data.seconds or 0
    kg = data.kg or 0
    quality = data.quality_score or 80.0

    # ═══ BIOMETRIC SANITY CHECK ═══
    exercise_type = challenge.get("exercise_type", "squat")
    personal_bests = await get_user_personal_bests(user_id, exercise_type)
    sanity = biometric_sanity_check(exercise_type, reps, seconds, kg, personal_bests)

    # ═══ ADVANCED VALIDATION: Biometric Correlation ═══
    bpm_correlation = biometric_correlation_check(
        exercise_type, data.bpm_avg, data.bpm_peak,
        data.speed_kmh, data.intensity_category, reps, seconds
    )

    # ═══ ADVANCED VALIDATION: Audio Analytics ═══
    audio_analysis = audio_analytics_check(exercise_type, data.audio_peaks, reps)

    # Determine verification_status
    if val_mode == "AUTO_COUNT":
        verification_status = "AI_VERIFIED"
    elif val_mode == "SENSOR_IMPORT":
        verification_status = "AI_VERIFIED"
    elif val_mode == "MANUAL_ENTRY":
        if proof_type == "VIDEO_TIME_CHECK" or data.has_video_proof:
            verification_status = "PROOF_PENDING"
        elif proof_type == "GPS_IMPORT":
            verification_status = "AI_VERIFIED"
        elif proof_type == "PEER_CONFIRMATION":
            verification_status = "PROOF_PENDING"
        else:
            verification_status = "UNVERIFIED"
    else:
        verification_status = "UNVERIFIED"

    # If sanity check failed and no video proof, force UNVERIFIED
    if not sanity["passed"] and not data.has_video_proof and proof_type not in ("VIDEO_TIME_CHECK", "GPS_IMPORT"):
        verification_status = "UNVERIFIED"

    # ═══ BIOMETRIC CORRELATION OVERRIDE ═══
    if bpm_correlation["status"] == "SUSPICIOUS":
        verification_status = "SUSPICIOUS"

    # Use verification-based multiplier (overrides validation_mode multiplier)
    suspicious_multiplier = 0.25  # SUSPICIOUS gets 25% FLUX penalty
    if verification_status == "SUSPICIOUS":
        flux_multiplier = suspicious_multiplier
        ranked_eligible = False
    else:
        flux_multiplier = VERIFICATION_FLUX_MULTIPLIERS.get(verification_status, 0.5)
        ranked_eligible = verification_status == "AI_VERIFIED"

    # Base FLUX
    base_flux = max(10, reps * 2 + int(quality / 10) + int(kg / 5))
    earned_flux = int(base_flux * flux_multiplier)
    earned_flux = min(earned_flux, 200)

    # DNA Increment Prediction
    tags = challenge.get("tags", ["POWER"])
    dominant_tag = tags[0] if tags else "POWER"
    dna_stats_affected = TAG_DNA_MAP.get(dominant_tag, ["forza", "potenza"])

    user_doc = await db.users.find_one({"_id": user_id})
    current_dna = user_doc.get("dna", {})

    performance_ratio = min(1.0, (quality / 100) * (min(reps, 50) / 20))
    dna_increment = round(0.5 + performance_ratio * 2.5, 1)

    dna_predictions = {}
    for stat in dna_stats_affected:
        current_val = current_dna.get(stat, 50)
        predicted_val = min(100, round(current_val + dna_increment, 1))
        dna_predictions[stat] = {
            "current": current_val,
            "predicted": predicted_val,
            "increment": round(predicted_val - current_val, 1),
        }

    # Hero data
    hero_data = {}
    if seconds > 0:
        mins = int(seconds) // 60
        secs = int(seconds) % 60
        hero_data = {"value": f"{mins:02d}:{secs:02d}", "unit": "TEMPO", "label": "DURATA SFIDA"}
    elif reps > 0:
        hero_data = {"value": str(reps), "unit": "REP", "label": "RIPETIZIONI COMPLETATE"}
    elif kg > 0:
        hero_data = {"value": f"{kg:.1f}", "unit": "KG", "label": "PESO SOLLEVATO"}
    else:
        hero_data = {"value": str(int(quality)), "unit": "%", "label": "QUALITÀ ESECUZIONE"}

    # Award FLUX
    if earned_flux > 0:
        new_balance = await award_ak_credits(user_id, "nexus_scan", earned_flux)
    else:
        new_balance = user_doc.get("ak_credits", 0)

    # Integrity status
    integrity_ok = sanity["passed"] and verification_status in ("AI_VERIFIED", "PROOF_PENDING")
    if bpm_correlation["status"] == "BPM_CORRELATED":
        integrity_ok = True  # BPM data strengthens integrity

    # ═══ PROXIMITY WITNESS (Invisible Trust) ═══
    proximity_result = await proximity_witness_check(user_id, data.challenge_id, data.gps_lat, data.gps_lng)
    if proximity_result["witness_found"] and verification_status not in ("AI_VERIFIED",):
        verification_status = "AI_VERIFIED"
        integrity_ok = True
        flux_multiplier = 1.0
        ranked_eligible = True

    # Update challenge
    await db.challenges_engine.update_one({"_id": ObjectId(data.challenge_id)}, {"$set": {
        "status": "completed",
        "completed_at": now,
        "results": {
            "reps": reps, "seconds": seconds, "kg": kg,
            "quality_score": quality, "has_video_proof": data.has_video_proof,
        },
        "proof_type": proof_type,
        "verification_status": verification_status,
        "sanity_check": sanity,
        "integrity_ok": integrity_ok,
        "bpm_correlation": bpm_correlation,
        "audio_analysis": {"status": audio_analysis["status"], "peak_count": audio_analysis["peak_count"], "rep_match_pct": audio_analysis["rep_match_pct"]},
        "proximity_witness": proximity_result,
        "gps_lat": data.gps_lat,
        "gps_lng": data.gps_lng,
        "verdict": {
            "base_flux": base_flux, "flux_multiplier": flux_multiplier,
            "earned_flux": earned_flux, "validation_mode": val_mode,
            "ranked_eligible": ranked_eligible,
            "hero_data": hero_data, "dna_predictions": dna_predictions,
            "verification_status": verification_status,
            "integrity_ok": integrity_ok,
            "sanity_check": sanity,
            "proof_type": proof_type,
            "bpm_correlation": bpm_correlation,
            "audio_analysis": audio_analysis,
            "proximity_witness": proximity_result,
        },
    }})

    # ── PERFORMANCE RECORD: Persist full metadata ──
    ch_mode = challenge.get("mode", "personal")
    primary_type = "TEMPO" if seconds > 0 else ("REPS" if reps > 0 else "PUNTEGGIO")
    primary_value = seconds if seconds > 0 else (reps if reps > 0 else quality)
    primary_unit = "sec" if seconds > 0 else ("rep" if reps > 0 else "%")
    await save_performance_record(
        user_id=user_id,
        username=current_user.get("username", "Kore"),
        tipo="DUELLO" if ch_mode == "duel" else "ALLENAMENTO",
        modalita="INDIVIDUALE",
        disciplina=user_doc.get("sport", "Fitness") if user_doc else "Fitness",
        exercise_type=challenge.get("exercise_type", "squat"),
        kpi={
            "primary_result": {"type": primary_type, "value": primary_value, "unit": primary_unit},
            "quality_score": quality,
            "rom_pct": None,
            "explosivity_pct": None,
            "power_output": data.speed_kmh,
            "heart_rate_avg": data.bpm_avg,
            "heart_rate_peak": data.bpm_peak,
        },
        is_certified=False,
        validation_status=verification_status,
        flux_earned=earned_flux,
        source_id=data.challenge_id,
        source_collection="challenges_engine",
        extra_meta={
            "tags": tags,
            "dominant_tag": dominant_tag,
            "ranked_eligible": ranked_eligible,
            "integrity_ok": integrity_ok,
        },
    )

    return {
        "status": "completed",
        "verdict": {
            "hero_data": hero_data,
            "base_flux": base_flux,
            "flux_multiplier": flux_multiplier,
            "earned_flux": earned_flux,
            "flux_balance": new_balance,
            "validation_mode": val_mode,
            "ranked_eligible": ranked_eligible,
            "dna_predictions": dna_predictions,
            "dominant_tag": dominant_tag,
            "dominant_color": TAG_COLORS.get(dominant_tag, "#007AFF"),
            "tags": tags,
            "verification_status": verification_status,
            "integrity_ok": integrity_ok,
            "sanity_check": sanity,
            "proof_type": proof_type,
            "personal_bests": personal_bests,
            # Advanced Validation Engine
            "bpm_correlation": bpm_correlation,
            "audio_analysis": audio_analysis,
            "proximity_witness": proximity_result,
        }
    }


@api_router.get("/challenge/{challenge_id}")
async def get_challenge_engine(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get challenge details"""
    try:
        challenge = await db.challenges_engine.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID sfida non valido")
    if not challenge:
        raise HTTPException(status_code=404, detail="Sfida non trovata")

    challenge["_id"] = str(challenge["_id"])
    challenge["user_id"] = str(challenge["user_id"])
    return challenge


@api_router.get("/challenge/user/active")
async def get_user_active_challenges(current_user: dict = Depends(get_current_user)):
    """Get all active challenges for current user"""
    challenges = await db.challenges_engine.find({
        "user_id": current_user["_id"],
        "status": "active",
    }).sort("created_at", -1).to_list(10)

    for c in challenges:
        c["_id"] = str(c["_id"])
        c["user_id"] = str(c["user_id"])
    return {"challenges": challenges}


# ═══ TRUST ENGINE: Sanity Check Pre-flight & Peer Confirmation ═══

class SanityCheckRequest(BaseModel):
    exercise_type: str = "squat"
    reps: Optional[int] = 0
    seconds: Optional[float] = 0.0
    kg: Optional[float] = 0.0

@api_router.post("/challenge/sanity-check")
async def pre_flight_sanity_check(data: SanityCheckRequest, current_user: dict = Depends(get_current_user)):
    """Pre-flight biometric sanity check before submitting manual data"""
    pbs = await get_user_personal_bests(current_user["_id"], data.exercise_type)
    result = biometric_sanity_check(data.exercise_type, data.reps or 0, data.seconds or 0, data.kg or 0, pbs)
    result["personal_bests"] = pbs
    return result


class PeerConfirmRequest(BaseModel):
    challenge_id: str
    confirmed: bool = True

@api_router.post("/challenge/peer-confirm")
async def peer_confirm_challenge(data: PeerConfirmRequest, current_user: dict = Depends(get_current_user)):
    """Crew Battle: confirm or dispute an opponent's result"""
    try:
        challenge = await db.challenges_engine.find_one({"_id": ObjectId(data.challenge_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID sfida non valido")
    if not challenge:
        raise HTTPException(status_code=404, detail="Sfida non trovata")

    # Only update if PROOF_PENDING
    now = datetime.utcnow()
    if data.confirmed:
        new_status = "AI_VERIFIED"
        await db.challenges_engine.update_one(
            {"_id": ObjectId(data.challenge_id)},
            {"$set": {
                "verification_status": new_status,
                "peer_confirmed_by": str(current_user["_id"]),
                "peer_confirmed_at": now,
                "integrity_ok": True,
            }}
        )
    else:
        new_status = "UNVERIFIED"
        await db.challenges_engine.update_one(
            {"_id": ObjectId(data.challenge_id)},
            {"$set": {
                "verification_status": new_status,
                "peer_disputed_by": str(current_user["_id"]),
                "peer_disputed_at": now,
                "integrity_ok": False,
            }}
        )

    return {
        "status": "updated",
        "verification_status": new_status,
        "challenge_id": data.challenge_id,
    }


# ═══════════════════════════════════════════════════════════════════
# QR KORE CROSS-CHECK ENGINE — Social Trust & Physical Proximity
# ═══════════════════════════════════════════════════════════════════
import math

class QRGenerateRequest(BaseModel):
    challenge_id: str
    declared_reps: Optional[int] = 0
    declared_seconds: Optional[float] = 0.0
    declared_kg: Optional[float] = 0.0
    total_participants: int = 3  # including self
    challenge_type: str = "CLOSED_LIVE"  # "OPEN_LIVE" | "CLOSED_LIVE"

class QRValidateRequest(BaseModel):
    qr_token: Optional[str] = None
    pin_code: Optional[str] = None  # 6-digit fallback

class QRChallengeCreateRequest(BaseModel):
    title: str = "LIVE CHALLENGE"
    exercise_type: str = "squat"
    tags: List[str] = ["POWER"]
    challenge_type: str = "CLOSED_LIVE"  # "OPEN_LIVE" | "CLOSED_LIVE"
    total_participants: int = 3


def _calculate_qr_threshold(total_participants: int) -> int:
    """50% + 1 of other participants (excluding self)."""
    others = max(1, total_participants - 1)
    return math.floor(others * 0.5) + 1


def _generate_pin() -> str:
    """Generate a 6-digit PIN code."""
    return ''.join(random.choices(string.digits, k=6))


def _generate_qr_token(user_id: str, challenge_id: str, score: dict) -> str:
    """Generate a unique QR token encoding user/challenge/score."""
    payload = {
        "uid": user_id,
        "cid": challenge_id,
        "s": score,
        "t": datetime.utcnow().timestamp(),
        "nonce": ''.join(random.choices(string.ascii_letters + string.digits, k=8)),
    }
    raw = stdlib_json.dumps(payload, separators=(',', ':'))
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode_qr_token(token: str) -> dict:
    """Decode a QR token back to payload."""
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        return stdlib_json.loads(raw)
    except Exception:
        return {}


@api_router.post("/qr/create-challenge")
async def create_qr_challenge(data: QRChallengeCreateRequest, current_user: dict = Depends(get_current_user)):
    """Create a group challenge with QR validation requirement."""
    if not data.tags or len(data.tags) == 0:
        raise HTTPException(status_code=400, detail="Almeno un tag obbligatorio")
    if data.total_participants < 2:
        raise HTTPException(status_code=400, detail="Minimo 2 partecipanti per una sfida di gruppo")

    now = datetime.utcnow()
    user_id = current_user["_id"]
    threshold = _calculate_qr_threshold(data.total_participants)

    # Create group challenge document
    challenge_doc = {
        "creator_id": user_id,
        "title": data.title,
        "exercise_type": data.exercise_type,
        "tags": data.tags,
        "challenge_type": data.challenge_type,
        "total_participants": data.total_participants,
        "threshold": threshold,
        "participants": [{
            "user_id": user_id,
            "username": current_user.get("username", "KORE"),
            "status": "joined",
            "joined_at": now,
        }],
        "status": "waiting",  # waiting → active → completed → expired
        "created_at": now,
        "expires_at": now + timedelta(hours=2),  # 2h to start
    }
    result = await db.qr_challenges.insert_one(challenge_doc)
    challenge_id = str(result.inserted_id)

    # Generate a 6-digit join code
    join_code = _generate_pin()
    await db.qr_challenges.update_one({"_id": result.inserted_id}, {"$set": {"join_code": join_code}})

    return {
        "challenge_id": challenge_id,
        "join_code": join_code,
        "challenge_type": data.challenge_type,
        "total_participants": data.total_participants,
        "threshold": threshold,
        "status": "waiting",
    }


@api_router.post("/qr/join-challenge/{challenge_id}")
async def join_qr_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Join an existing group challenge."""
    try:
        challenge = await db.qr_challenges.find_one({"_id": ObjectId(challenge_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID sfida non valido")
    if not challenge:
        raise HTTPException(status_code=404, detail="Sfida non trovata")
    if challenge["status"] not in ("waiting", "active"):
        raise HTTPException(status_code=400, detail="Sfida non più disponibile")

    user_id = current_user["_id"]
    # Check if already joined
    existing = [p for p in challenge.get("participants", []) if p["user_id"] == user_id]
    if existing:
        return {"status": "already_joined", "challenge_id": challenge_id}

    if len(challenge.get("participants", [])) >= challenge["total_participants"]:
        raise HTTPException(status_code=400, detail="Sfida piena")

    now = datetime.utcnow()
    await db.qr_challenges.update_one(
        {"_id": ObjectId(challenge_id)},
        {"$push": {"participants": {
            "user_id": user_id,
            "username": current_user.get("username", "KORE"),
            "status": "joined",
            "joined_at": now,
        }}}
    )

    # Auto-activate if enough participants
    updated = await db.qr_challenges.find_one({"_id": ObjectId(challenge_id)})
    if len(updated.get("participants", [])) >= updated["total_participants"]:
        await db.qr_challenges.update_one(
            {"_id": ObjectId(challenge_id)},
            {"$set": {"status": "active"}}
        )

    return {
        "status": "joined",
        "challenge_id": challenge_id,
        "participants_count": len(updated.get("participants", [])),
        "total_participants": challenge["total_participants"],
    }


@api_router.post("/qr/generate")
async def generate_qr_validation(data: QRGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate QR code + PIN for post-race validation."""
    user_id = current_user["_id"]
    now = datetime.utcnow()

    # Check if already has a QR for this challenge
    existing = await db.qr_validations.find_one({
        "challenge_id": data.challenge_id,
        "user_id": user_id,
        "status": {"$in": ["provisional", "official"]},
    })
    if existing:
        return {
            "qr_token": existing["qr_token"],
            "pin_code": existing["pin_code"],
            "status": existing["status"],
            "confirmations": len(existing.get("confirmations", [])),
            "threshold": existing["threshold"],
            "validation_id": str(existing["_id"]),
            "expires_at": existing["expires_at"].isoformat() if existing.get("expires_at") else None,
        }

    score = {
        "reps": data.declared_reps or 0,
        "seconds": data.declared_seconds or 0,
        "kg": data.declared_kg or 0,
    }

    qr_token = _generate_qr_token(str(user_id), data.challenge_id, score)
    pin_code = _generate_pin()
    threshold = _calculate_qr_threshold(data.total_participants)

    validation_doc = {
        "challenge_id": data.challenge_id,
        "user_id": user_id,
        "username": current_user.get("username", "KORE"),
        "declared_score": score,
        "qr_token": qr_token,
        "pin_code": pin_code,
        "challenge_type": data.challenge_type,
        "total_participants": data.total_participants,
        "threshold": threshold,
        "confirmations": [],
        "status": "provisional",  # provisional → official OR annulled
        "flux_earned": 0,
        "flux_awarded": False,
        "created_at": now,
        "expires_at": now + timedelta(hours=1),  # 1h timeout
    }
    result = await db.qr_validations.insert_one(validation_doc)

    return {
        "validation_id": str(result.inserted_id),
        "qr_token": qr_token,
        "pin_code": pin_code,
        "status": "provisional",
        "confirmations": 0,
        "threshold": threshold,
        "total_participants": data.total_participants,
        "expires_at": validation_doc["expires_at"].isoformat(),
        "declared_score": score,
    }


@api_router.post("/qr/validate")
async def validate_qr_scan(data: QRValidateRequest, current_user: dict = Depends(get_current_user)):
    """Scan a peer's QR code or enter their PIN to confirm their result. Awards +5 FLUX."""
    scanner_id = current_user["_id"]
    now = datetime.utcnow()

    # Find the target validation by QR token or PIN
    target = None
    if data.qr_token:
        target = await db.qr_validations.find_one({"qr_token": data.qr_token, "status": "provisional"})
    if not target and data.pin_code:
        target = await db.qr_validations.find_one({"pin_code": data.pin_code, "status": "provisional"})

    if not target:
        raise HTTPException(status_code=404, detail="QR/PIN non valido o risultato già ufficiale")

    # Cannot confirm yourself
    if target["user_id"] == scanner_id:
        raise HTTPException(status_code=400, detail="Non puoi confermare te stesso, Kore!")

    # Check if already confirmed by this user
    already = [c for c in target.get("confirmations", []) if c.get("user_id") == scanner_id]
    if already:
        raise HTTPException(status_code=400, detail="Hai già confermato questo risultato")

    # Check expiry
    if target.get("expires_at") and target["expires_at"] < now:
        await db.qr_validations.update_one({"_id": target["_id"]}, {"$set": {"status": "annulled"}})
        raise HTTPException(status_code=410, detail="Tempo scaduto per la validazione")

    # Add confirmation
    confirmation = {
        "user_id": scanner_id,
        "username": current_user.get("username", "KORE"),
        "confirmed_at": now,
    }
    await db.qr_validations.update_one(
        {"_id": target["_id"]},
        {"$push": {"confirmations": confirmation}}
    )

    # Award +5 FLUX to the scanner for participating in validation
    scanner_balance = await award_ak_credits(scanner_id, "qr_scan_reward", 5)

    # Check if threshold reached
    updated = await db.qr_validations.find_one({"_id": target["_id"]})
    confirmations_count = len(updated.get("confirmations", []))
    threshold = updated["threshold"]

    new_status = "provisional"
    target_flux_awarded = False
    if confirmations_count >= threshold:
        new_status = "official"
        # Award full FLUX to the validated user
        base_flux = max(10, updated["declared_score"].get("reps", 0) * 2 + 7)
        earned = int(base_flux * 1.0)  # 100% — QR validated = full trust
        earned = min(earned, 200)
        await award_ak_credits(updated["user_id"], "qr_validated_challenge", earned)
        await db.qr_validations.update_one(
            {"_id": target["_id"]},
            {"$set": {
                "status": "official",
                "flux_earned": earned,
                "flux_awarded": True,
                "verified_at": now,
            }}
        )
        # Also update the linked challenge engine entry if exists
        try:
            await db.challenges_engine.update_one(
                {"_id": ObjectId(updated["challenge_id"])},
                {"$set": {
                    "verification_status": "AI_VERIFIED",
                    "integrity_ok": True,
                    "qr_validated": True,
                    "qr_confirmations": confirmations_count,
                }}
            )
        except Exception:
            pass
        target_flux_awarded = True
        new_status = "official"

    return {
        "status": "confirmed",
        "target_user": updated["username"],
        "target_status": new_status,
        "confirmations": confirmations_count,
        "threshold": threshold,
        "scanner_flux_reward": 5,
        "scanner_balance": scanner_balance,
        "target_official": new_status == "official",
        "target_flux_awarded": target_flux_awarded,
    }


@api_router.get("/qr/status/{challenge_id}")
async def get_qr_validation_status(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get my QR validation status for a challenge."""
    user_id = current_user["_id"]

    my_validation = await db.qr_validations.find_one({
        "challenge_id": challenge_id,
        "user_id": user_id,
    })

    if not my_validation:
        return {"status": "not_found", "message": "Nessuna validazione QR per questa sfida"}

    now = datetime.utcnow()
    # Check expiry
    if my_validation["status"] == "provisional" and my_validation.get("expires_at") and my_validation["expires_at"] < now:
        await db.qr_validations.update_one({"_id": my_validation["_id"]}, {"$set": {"status": "annulled"}})
        my_validation["status"] = "annulled"

    confirmations = my_validation.get("confirmations", [])
    threshold = my_validation.get("threshold", 2)
    expires_at = my_validation.get("expires_at")
    remaining_seconds = max(0, int((expires_at - now).total_seconds())) if expires_at and my_validation["status"] == "provisional" else 0

    return {
        "validation_id": str(my_validation["_id"]),
        "challenge_id": challenge_id,
        "status": my_validation["status"],
        "qr_token": my_validation.get("qr_token", ""),
        "pin_code": my_validation.get("pin_code", ""),
        "declared_score": my_validation.get("declared_score", {}),
        "confirmations": len(confirmations),
        "confirmations_detail": [
            {"username": c.get("username", "?"), "confirmed_at": c.get("confirmed_at", "").isoformat() if hasattr(c.get("confirmed_at", ""), "isoformat") else str(c.get("confirmed_at", ""))}
            for c in confirmations
        ],
        "threshold": threshold,
        "total_participants": my_validation.get("total_participants", 3),
        "flux_earned": my_validation.get("flux_earned", 0),
        "remaining_seconds": remaining_seconds,
        "expires_at": expires_at.isoformat() if expires_at else None,
    }


@api_router.get("/qr/participants/{challenge_id}")
async def get_qr_challenge_participants(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Get all participants' QR validation statuses for a group challenge."""
    validations = await db.qr_validations.find({"challenge_id": challenge_id}).to_list(50)
    now = datetime.utcnow()

    participants = []
    for v in validations:
        confirmations = v.get("confirmations", [])
        threshold = v.get("threshold", 2)
        status = v["status"]
        if status == "provisional" and v.get("expires_at") and v["expires_at"] < now:
            status = "annulled"

        participants.append({
            "user_id": str(v["user_id"]),
            "username": v.get("username", "KORE"),
            "declared_score": v.get("declared_score", {}),
            "status": status,
            "confirmations": len(confirmations),
            "threshold": threshold,
            "is_me": v["user_id"] == current_user["_id"],
        })

    return {"challenge_id": challenge_id, "participants": participants}


async def enforce_qr_timeouts():
    """Check all provisional QR validations for 1h expiration. Annul results and warn users."""
    now = datetime.utcnow()
    expired = await db.qr_validations.find({
        "status": "provisional",
        "expires_at": {"$lte": now},
    }).to_list(100)

    for v in expired:
        user_id = v["user_id"]
        await db.qr_validations.update_one(
            {"_id": v["_id"]},
            {"$set": {"status": "annulled", "annulled_at": now}}
        )
        # Add integrity warning
        await db.integrity_warnings.insert_one({
            "user_id": user_id,
            "challenge_id": v.get("challenge_id", ""),
            "reason": "qr_timeout",
            "message": "Kore, la tua sfida è scaduta senza conferme. Risultato annullato per proteggere l'onestà dell'Arena.",
            "created_at": now,
        })
        # Increment user integrity_warnings count
        await db.users.update_one({"_id": user_id}, {"$inc": {"integrity_warnings": 1}})
        logger.info(f"[QR-Timeout] Annulled validation for user {user_id}, challenge {v.get('challenge_id')}")

    if expired:
        logger.info(f"[QR-Timeout] Processed {len(expired)} expired QR validations")



# ═══════════════════════════════════════════════════════════════════
# PDF EXPORT ENGINE — "KORE ID" (Athlete Talent Card)
# ═══════════════════════════════════════════════════════════════════
from io import BytesIO
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import HexColor, white, black
    from reportlab.pdfgen import canvas as pdf_canvas
    from reportlab.platypus import Table, TableStyle
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logger.warning("[PDF] reportlab not available")


def _draw_radar_on_pdf(c, cx, cy, r, six_axis, color_hex="#00E5FF"):
    """Draw a hexagonal DNA radar on the PDF canvas."""
    stats = ['endurance', 'power', 'mobility', 'technique', 'recovery', 'agility']
    labels = ['RESISTENZA', 'POTENZA', 'AGILITÀ', 'TECNICA', 'RECUPERO', 'VELOCITÀ']
    n = len(stats)

    # Grid rings
    for lv in [1.0, 0.75, 0.5, 0.25]:
        points = []
        for i in range(n):
            angle = (3.14159 * 2 * i) / n - 3.14159 / 2
            px = cx + r * lv * math.cos(angle)
            py = cy + r * lv * math.sin(angle)
            points.append((px, py))
        c.setStrokeColor(HexColor("#333333"))
        c.setLineWidth(0.3)
        path = c.beginPath()
        path.moveTo(points[0][0], points[0][1])
        for p in points[1:]:
            path.lineTo(p[0], p[1])
        path.close()
        c.drawPath(path, stroke=1, fill=0)

    # Data polygon
    color = HexColor(color_hex)
    data_points = []
    for i, stat in enumerate(stats):
        angle = (3.14159 * 2 * i) / n - 3.14159 / 2
        val = min((six_axis.get(stat, 50)) / 100, 1.0)
        px = cx + r * val * math.cos(angle)
        py = cy + r * val * math.sin(angle)
        data_points.append((px, py))

    # Fill
    c.setFillColor(HexColor(color_hex + "33") if len(color_hex) <= 7 else color)
    c.setStrokeColor(color)
    c.setLineWidth(1.5)
    path = c.beginPath()
    path.moveTo(data_points[0][0], data_points[0][1])
    for p in data_points[1:]:
        path.lineTo(p[0], p[1])
    path.close()
    c.drawPath(path, stroke=1, fill=1)

    # Vertex dots
    for dp in data_points:
        c.setFillColor(color)
        c.circle(dp[0], dp[1], 2, stroke=0, fill=1)

    # Labels
    c.setFillColor(HexColor("#AAAAAA"))
    c.setFont("Helvetica-Bold", 7)
    for i, label in enumerate(labels):
        angle = (3.14159 * 2 * i) / n - 3.14159 / 2
        lx = cx + (r + 18) * math.cos(angle)
        ly = cy + (r + 18) * math.sin(angle)
        c.drawCentredString(lx, ly - 3, label)


@api_router.get("/report/athlete-pdf/{athlete_id}")
async def generate_athlete_pdf(athlete_id: str, current_user: dict = Depends(require_role("COACH", "GYM_OWNER", "ADMIN"))):
    """Generate a professional PDF 'KORE ID Certificate' for an athlete."""
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="PDF generation non disponibile")

    try:
        athlete = await db.users.find_one({"_id": ObjectId(athlete_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID Kore non valido")
    if not athlete:
        raise HTTPException(status_code=404, detail="Kore non trovato")

    dna = athlete.get("dna", {})
    six_axis = compute_six_axis(athlete)
    kore = compute_kore_score(athlete, [])
    username = athlete.get("username", "KORE")
    sport = athlete.get("sport", "—")
    level = athlete.get("level", 1)
    ak_credits = athlete.get("ak_credits", 0)
    integrity_warnings = athlete.get("integrity_warnings", 0)
    is_nexus_certified = athlete.get("is_nexus_certified", False)

    # QR validations count
    qr_official_count = await db.qr_validations.count_documents({"user_id": athlete["_id"], "status": "official"})

    # Build PDF
    buffer = BytesIO()
    w, h = A4
    c = pdf_canvas.Canvas(buffer, pagesize=A4)

    # ── PAGE BACKGROUND ──
    c.setFillColor(HexColor("#0A0A0A"))
    c.rect(0, 0, w, h, stroke=0, fill=1)

    # ── HEADER BAR ──
    c.setFillColor(HexColor("#121212"))
    c.rect(0, h - 80, w, 80, stroke=0, fill=1)
    c.setFillColor(HexColor("#00E5FF"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(30, h - 50, "ARENA KORE")
    c.setFillColor(HexColor("#888888"))
    c.setFont("Helvetica", 10)
    c.drawString(30, h - 68, "KORE ID — OFFICIAL ATHLETIC REPORT")
    c.setFillColor(HexColor("#00E5FF"))
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(w - 30, h - 50, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d')}")

    # ── ATHLETE INFO SECTION ──
    y = h - 120
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 20)
    c.drawString(30, y, username.upper())
    y -= 22
    c.setFillColor(HexColor("#888888"))
    c.setFont("Helvetica", 11)
    c.drawString(30, y, f"Sport: {sport}  ·  Level: {level}  ·  FLUX Balance: {ak_credits}")

    # ── KORE SCORE ──
    y -= 14
    c.setFillColor(HexColor("#121212"))
    c.roundRect(30, y - 55, w - 60, 50, 8, stroke=0, fill=1)
    c.setFillColor(HexColor("#00E5FF"))
    c.setFont("Helvetica-Bold", 32)
    c.drawString(50, y - 40, str(kore["score"]))
    c.setFillColor(HexColor("#AAAAAA"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(120, y - 32, "KORE SCORE")
    c.setFont("Helvetica", 10)
    c.drawString(120, y - 48, f"Grade: {kore['grade']}")

    # ── DNA RADAR ──
    y -= 85
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, y, "DNA RADAR")
    y -= 15

    radar_cx = w / 2
    radar_cy = y - 90
    _draw_radar_on_pdf(c, radar_cx, radar_cy, 75, six_axis, "#00E5FF")

    # ── DNA VALUES TABLE ──
    y = radar_cy - 110
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y, "DNA VALUES")
    y -= 15

    stats_list = ['endurance', 'power', 'mobility', 'technique', 'recovery', 'agility']
    stat_labels_it = {
        'endurance': 'RESISTENZA', 'power': 'POTENZA', 'mobility': 'AGILITÀ',
        'technique': 'TECNICA', 'recovery': 'RECUPERO', 'agility': 'VELOCITÀ',
    }

    for stat in stats_list:
        val = round(six_axis.get(stat, 50), 1)
        c.setFillColor(HexColor("#888888"))
        c.setFont("Helvetica", 10)
        c.drawString(50, y, stat_labels_it.get(stat, stat.upper()))
        # Progress bar
        bar_x = 160
        bar_w = 200
        c.setFillColor(HexColor("#1A1A1A"))
        c.rect(bar_x, y - 2, bar_w, 10, stroke=0, fill=1)
        fill_w = (val / 100) * bar_w
        c.setFillColor(HexColor("#00E5FF"))
        c.rect(bar_x, y - 2, fill_w, 10, stroke=0, fill=1)
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(bar_x + bar_w + 10, y, str(val))
        y -= 20

    # ── FLUX MONTHLY PROGRESSION ──
    y -= 15
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y, "FLUX PROGRESSION (ULTIMI 6 MESI)")
    y -= 18

    # Aggregate FLUX data from challenges completed by this athlete
    from_date = datetime.now(timezone.utc) - timedelta(days=180)
    monthly_flux = {}
    flux_cursor = db.challenges.find({
        "user_id": athlete["_id"],
        "completed_at": {"$gte": from_date},
    }).sort("completed_at", 1)
    async for ch in flux_cursor:
        m_key = ch["completed_at"].strftime("%Y-%m")
        flux_earned = ch.get("flux_earned", ch.get("xp_earned", 0))
        monthly_flux[m_key] = monthly_flux.get(m_key, 0) + flux_earned

    # If no challenge data, show current balance breakdown
    if not monthly_flux:
        # Fallback: show total balance as single entry
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        monthly_flux[current_month] = ak_credits

    months_sorted = sorted(monthly_flux.keys())[-6:]  # Last 6 months
    max_flux = max(monthly_flux.values()) if monthly_flux else 1

    for mk in months_sorted:
        flux_val = monthly_flux[mk]
        # Month label
        c.setFillColor(HexColor("#888888"))
        c.setFont("Helvetica", 9)
        c.drawString(50, y, mk)
        # Bar
        bar_x = 120
        bar_w = 200
        c.setFillColor(HexColor("#1A1A1A"))
        c.rect(bar_x, y - 2, bar_w, 10, stroke=0, fill=1)
        fill_w = (flux_val / max(max_flux, 1)) * bar_w
        c.setFillColor(HexColor("#00E5FF"))
        c.rect(bar_x, y - 2, fill_w, 10, stroke=0, fill=1)
        # Value
        c.setFillColor(HexColor("#FFFFFF"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(bar_x + bar_w + 10, y, f"{flux_val} FLUX")
        y -= 18

    # Total FLUX
    c.setFillColor(HexColor("#00E5FF"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, f"SALDO TOTALE: {ak_credits} FLUX")
    y -= 10

    # ── BADGES ──
    y -= 15
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30, y, "VALIDATION BADGES")
    y -= 22

    badges = []
    if is_nexus_certified:
        badges.append(("NÈXUS CERTIFIED", "#00E5FF"))
    if qr_official_count > 0:
        badges.append((f"QR VALIDATED ×{qr_official_count}", "#34C759"))
    if integrity_warnings == 0:
        badges.append(("INTEGRITY OK", "#34C759"))
    else:
        badges.append((f"WARNINGS: {integrity_warnings}", "#FF3B30"))

    bx = 50
    for badge_text, badge_color in badges:
        c.setStrokeColor(HexColor(badge_color))
        c.setFillColor(HexColor("#121212"))
        c.roundRect(bx, y - 2, 120, 20, 6, stroke=1, fill=1)
        c.setFillColor(HexColor(badge_color))
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(bx + 60, y + 3, badge_text)
        bx += 135

    # ── FOOTER ──
    c.setFillColor(HexColor("#333333"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(w / 2, 25, "ARENA KORE — Confidential Athletic Report · arenakore.app")

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=KORE_ID_{username}.pdf"},
    )


# ====================================
# NEXUS BIO-EVOLUTION ENGINE — SPRINT 7
# ====================================

@api_router.get("/nexus/rescan-eligibility")
async def get_rescan_eligibility(current_user: dict = Depends(get_current_user)):
    """The 48h/30d Bio-Scan Rule: Check if user can perform a bio-scan"""
    now = datetime.now(timezone.utc)
    dna = current_user.get("dna")

    # 1. No DNA at all → initial scan needed (onboarding not completed)
    if not dna:
        return {
            "can_scan": True, "scan_type": "initial", "phase": "no_scan",
            "message": "AVVIA LA TUA PRIMA BIO-SCAN",
            "previous_dna": None, "current_dna": None,
            "improvement_rates": {}, "days_remaining": None, "hours_remaining": None,
            "pro_unlocked": False, "avg_dna": 0,
        }

    avg_dna = round(sum(dna.values()) / 6, 1)
    dna_scans = current_user.get("dna_scans", [])
    baseline_scanned_at = current_user.get("baseline_scanned_at")
    validation_scanned_at = current_user.get("validation_scanned_at")

    # 2. Retroactive: old users with DNA but no scan history → set baseline
    if not dna_scans:
        created_at = current_user.get("created_at", now - timedelta(days=7))
        if hasattr(created_at, 'tzinfo') and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        baseline_scan = {"dna": dna, "scanned_at": created_at, "scan_type": "baseline"}
        dna_scans = [baseline_scan]
        baseline_scanned_at = created_at
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"dna_scans": dna_scans, "baseline_scanned_at": created_at}}
        )

    # Ensure timezone awareness
    if baseline_scanned_at and hasattr(baseline_scanned_at, 'tzinfo') and baseline_scanned_at.tzinfo is None:
        baseline_scanned_at = baseline_scanned_at.replace(tzinfo=timezone.utc)
    if validation_scanned_at and hasattr(validation_scanned_at, 'tzinfo') and validation_scanned_at.tzinfo is None:
        validation_scanned_at = validation_scanned_at.replace(tzinfo=timezone.utc)

    # 3. Compute improvement rates vs previous scan
    improvement_rates = {}
    prev_dna = dna_scans[0]["dna"] if dna_scans else None
    if len(dna_scans) >= 2:
        prev_dna = dna_scans[-2]["dna"]
    if prev_dna:
        for k in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
            pv = prev_dna.get(k, 0)
            cv = dna.get(k, 0)
            improvement_rates[k] = round(((cv - pv) / pv * 100) if pv > 0 else 0, 1)

    base_response = {
        "previous_dna": prev_dna, "current_dna": dna,
        "improvement_rates": improvement_rates,
        "pro_unlocked": current_user.get("pro_unlocked", False),
        "avg_dna": avg_dna,
    }

    # 4. No validation scan yet → check 48h rule
    if not validation_scanned_at:
        hours_since = 0
        if baseline_scanned_at:
            hours_since = (now - baseline_scanned_at).total_seconds() / 3600
        else:
            hours_since = 48  # Allow if no tracking

        hours_remaining = max(0, 48 - hours_since)
        if hours_remaining > 0:
            h, m = int(hours_remaining), int((hours_remaining % 1) * 60)
            return {**base_response, "can_scan": False, "scan_type": "validation_pending",
                    "phase": "validation_pending", "hours_remaining": round(hours_remaining, 1),
                    "days_remaining": None, "message": f"VALIDATION SCAN TRA: {h}H {m:02d}M"}

        return {**base_response, "can_scan": True, "scan_type": "validation",
                "phase": "validation_ready", "hours_remaining": None, "days_remaining": None,
                "message": "VALIDATION SCAN DISPONIBILE"}

    # 5. Has validation → check 30-day lock
    # Normalize timezones for comparison (MongoDB returns naive UTC)
    _now = now.replace(tzinfo=None) if hasattr(now, 'tzinfo') and now.tzinfo else now
    _vs = validation_scanned_at.replace(tzinfo=None) if validation_scanned_at.tzinfo else validation_scanned_at
    days_since_validation = (_now - _vs).days
    days_remaining = max(0, 30 - days_since_validation)

    if days_remaining > 0:
        return {**base_response, "can_scan": False, "scan_type": "locked",
                "phase": "locked", "days_remaining": days_remaining, "hours_remaining": None,
                "message": f"PROSSIMA EVOLUZIONE TRA: {days_remaining} GIORNI"}

    return {**base_response, "can_scan": True, "scan_type": "evolution",
            "phase": "evolution_ready", "hours_remaining": None, "days_remaining": 0,
            "message": "EVOLUTION SCAN DISPONIBILE"}


# ============================================================
# ============================================================
# EMAIL NOTIFY ENGINE
# ============================================================

@api_router.post("/notify/bioscan-confirm")
async def notify_bioscan_confirm(current_user: dict = Depends(get_current_user)):
    """Send Bio-Scan Confirmation email to the current user with their DNA summary."""
    to_email = current_user.get("email", "")
    if not to_email:
        raise HTTPException(status_code=400, detail="Email utente non disponibile")

    dna = current_user.get("dna") or {}
    founder_number = current_user.get("founder_number")
    kore_number = (
        str(founder_number).zfill(5)
        if founder_number
        else str(abs(int(str(current_user["_id"])[-5:], 16)) % 99999).zfill(5)
    )

    # Fire email asynchronously — non-blocking
    asyncio.create_task(
        email_service.send_bioscan_confirm_email(
            to_email=to_email,
            to_name=current_user.get("username", "KORE"),
            kore_number=kore_number,
            dna=dna,
        )
    )

    return {
        "status": "email_queued",
        "to": to_email,
        "kore_number": kore_number,
        "dna_keys": list(dna.keys()),
    }


# SPRINT 9 — NOTIFICATION ENGINE ENDPOINTS
# ============================================================

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    """Get user's notifications, most recent first"""
    user_id = str(current_user["_id"])
    raw = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(50)

    result = []
    for n in raw:
        meta = NOTIF_ICONS.get(n.get("type", ""), {"icon": "notifications", "color": "#FFFFFF"})
        result.append({
            "id": str(n["_id"]),
            "type": n.get("type"),
            "title": n.get("title"),
            "body": n.get("body"),
            "read": n.get("read", False),
            "icon": meta["icon"],
            "accent_color": meta["color"],
            "created_at": n.get("created_at").isoformat() if n.get("created_at") else None,
        })

    unread_count = sum(1 for n in result if not n["read"])
    return {"notifications": result, "unread_count": unread_count}


@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a single notification (or 'all') as read"""
    user_id = str(current_user["_id"])
    if notif_id == "all":
        await db.notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True}}
        )
        return {"success": True, "action": "all_marked_read"}
    try:
        oid = ObjectId(notif_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")
    result = await db.notifications.update_one(
        {"_id": oid, "user_id": user_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True, "id": notif_id}


@api_router.post("/notifications/test-trigger")
async def test_notification_trigger(current_user: dict = Depends(get_current_user)):
    """ADMIN ONLY: Force-create a test notification for the current user"""
    now = datetime.now(timezone.utc)
    await db.notifications.insert_one({
        "user_id": str(current_user["_id"]),
        "type": "hype_24h",
        "title": "DOMANI: EVOLUZIONE DNA",
        "body": "Preparati per la nuova Bio-Signature. La tua finestra evolutiva apre domani.",
        "read": False, "created_at": now,
    })
    return {"success": True, "message": "Test notification created"}


@api_router.get("/dna/history")
async def get_dna_history(current_user: dict = Depends(get_current_user)):
    """Return full DNA scan history with month-over-month improvement rates"""
    dna_scans = current_user.get("dna_scans", [])
    history = []
    for scan in dna_scans:
        scanned_at = scan.get("scanned_at")
        if scanned_at and hasattr(scanned_at, 'tzinfo') and scanned_at.tzinfo is None:
            scanned_at = scanned_at.replace(tzinfo=timezone.utc)
        history.append({
            "dna": scan.get("dna", {}),
            "scanned_at": scanned_at.isoformat() if scanned_at else None,
            "scan_type": scan.get("scan_type", "unknown"),
        })

    # Month-over-month improvements between consecutive scans
    improvements_over_time = []
    dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
    for i in range(1, len(history)):
        prev = history[i - 1]["dna"]
        curr = history[i]["dna"]
        rates = {k: round(((curr.get(k, 0) - prev.get(k, 0)) / prev.get(k, 1) * 100), 1) for k in dna_keys}
        improvements_over_time.append(rates)

    return {
        "scans": history,
        "total": len(history),
        "improvements_over_time": improvements_over_time,
    }


@api_router.post("/nexus/bioscan")
async def complete_bioscan(current_user: dict = Depends(get_current_user)):
    """Record a bio-scan snapshot, compute improvements, check PRO unlock"""
    now = datetime.now(timezone.utc)
    dna = current_user.get("dna")

    if not dna:
        raise HTTPException(status_code=400, detail="Completa l'onboarding prima della bio-scan")

    dna_scans = current_user.get("dna_scans", [])
    baseline_scanned_at = current_user.get("baseline_scanned_at")
    validation_scanned_at = current_user.get("validation_scanned_at")

    if baseline_scanned_at and hasattr(baseline_scanned_at, 'tzinfo') and baseline_scanned_at.tzinfo is None:
        baseline_scanned_at = baseline_scanned_at.replace(tzinfo=timezone.utc)
    if validation_scanned_at and hasattr(validation_scanned_at, 'tzinfo') and validation_scanned_at.tzinfo is None:
        validation_scanned_at = validation_scanned_at.replace(tzinfo=timezone.utc)

    # Determine scan type and validate eligibility
    scan_type = "baseline"
    set_fields: dict = {}

    if not dna_scans:
        # First formal scan
        scan_type = "baseline"
        set_fields["baseline_scanned_at"] = now
    elif not validation_scanned_at:
        if baseline_scanned_at:
            hours_since = (now - baseline_scanned_at).total_seconds() / 3600
            if hours_since < 48:
                h = int(48 - hours_since)
                raise HTTPException(status_code=400, detail=f"Validation scan disponibile tra {h} ore")
        scan_type = "validation"
        set_fields["validation_scanned_at"] = now
    else:
        days_since = (now - validation_scanned_at).days
        if days_since < 30:
            raise HTTPException(status_code=400, detail=f"Prossima evoluzione tra {30 - days_since} giorni")
        scan_type = "evolution"
        set_fields["baseline_scanned_at"] = now
        set_fields["validation_scanned_at"] = None

    # Save scan snapshot
    new_scan = {"dna": dict(dna), "scanned_at": now, "scan_type": scan_type}

    # Compute improvements vs previous scan
    improvement_rates: dict = {}
    prev_dna = None
    if dna_scans:
        prev_dna = dna_scans[-1]["dna"]
        for k in ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]:
            pv = prev_dna.get(k, 0)
            cv = dna.get(k, 0)
            improvement_rates[k] = round(((cv - pv) / pv * 100) if pv > 0 else 0, 1)

    # Check PRO unlock
    avg_dna = sum(dna.values()) / 6
    was_pro = current_user.get("pro_unlocked", False)
    if avg_dna > 75 and not was_pro:
        set_fields["pro_unlocked"] = True

    # Execute update
    update_op: dict = {"$push": {"dna_scans": new_scan}}
    if set_fields:
        update_op["$set"] = set_fields

    await db.users.update_one({"_id": current_user["_id"]}, update_op)
    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    pro_newly_unlocked = avg_dna > 75 and not was_pro

    return {
        "scan_type": scan_type,
        "previous_dna": prev_dna,
        "current_dna": dna,
        "improvement_rates": improvement_rates,
        "avg_dna": round(avg_dna, 1),
        "pro_unlocked": avg_dna > 75,
        "pro_newly_unlocked": pro_newly_unlocked,
        "user": user_to_response(updated_user),
    }


# ====================================
# NEXUS 5-BEAT DNA SYNC
# ====================================
@api_router.post("/nexus/5beat-dna")
async def save_five_beat_dna(body: dict, current_user: dict = Depends(get_current_user)):
    """Save 5-Beat biometric scan DNA results directly into user profile.
    Called after KORE DNA Generation completes in the onboarding scanner."""
    dna_results = body.get("dna_results", {})
    if not dna_results:
        raise HTTPException(status_code=400, detail="Nessun dato DNA dal 5-Beat scan")

    # Map Beat 5 labels to DB schema keys
    label_map = {
        "velocita": "velocita", "forza": "forza",
        "resistenza": "resistenza", "tecnica": "tecnica",
        "mentalita": "mentalita", "flessibilita": "flessibilita",
        "agilita": "agilita", "potenza": "potenza",
    }
    update_dna = {}
    for k, v in dna_results.items():
        if k in label_map and v is not None:
            try:
                update_dna[f"dna.{label_map[k]}"] = float(v)
            except (TypeError, ValueError):
                pass

    if not update_dna:
        raise HTTPException(status_code=400, detail="Dati DNA non validi")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_dna}
    )
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "5beat_dna_saved",
        "dna_updated": {k.replace("dna.", ""): v for k, v in update_dna.items()},
        "user": user_to_response(updated_user),
    }


# ====================================
# NEXUS SYNC — SESSION ENGINE
# ====================================
@api_router.post("/nexus/session/start")
async def start_nexus_session(body: dict, current_user: dict = Depends(get_current_user)):
    """Start a new Nexus Sync training session"""
    exercise_type = body.get("exercise_type", "squat")  # squat | punch
    target_reps = body.get("target_reps", 0)

    session = {
        "user_id": current_user["_id"],
        "exercise_type": exercise_type,
        "target_reps": target_reps,
        "status": "active",
        "started_at": datetime.now(timezone.utc),
        "completed_at": None,
        "reps_completed": 0,
        "quality_score": 0,
        "xp_earned": 0,
        "motion_data": {},
    }
    result = await db.nexus_sessions.insert_one(session)

    return {
        "session_id": str(result.inserted_id),
        "exercise_type": exercise_type,
        "status": "active",
    }


@api_router.post("/nexus/session/{session_id}/complete")
async def complete_nexus_session(session_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Complete a Nexus Sync session with real motion data"""
    session = await db.nexus_sessions.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")

    reps = body.get("reps_completed", 0)
    quality_score = min(body.get("quality_score", 50), 100)
    exercise_type = body.get("exercise_type", session.get("exercise_type", "squat"))
    duration_seconds = body.get("duration_seconds", 30)
    peak_acceleration = body.get("peak_acceleration", 0)
    avg_amplitude = body.get("avg_amplitude", 0)

    # REAL XP CALCULATION
    # Base XP: 5 per rep
    base_xp = reps * 5
    # Quality bonus: up to 3x multiplier for perfect form
    quality_multiplier = 1 + (quality_score / 100) * 2  # 1.0 → 3.0
    # Gold bonus for high quality (>80%)
    gold_bonus = int(reps * 2) if quality_score >= 80 else 0
    # Duration bonus
    time_bonus = min(int(duration_seconds / 10), 20)

    total_xp = int(base_xp * quality_multiplier) + gold_bonus + time_bonus

    # Update session
    await db.nexus_sessions.update_one({"_id": ObjectId(session_id)}, {"$set": {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc),
        "reps_completed": reps,
        "quality_score": quality_score,
        "xp_earned": total_xp,
        "duration_seconds": duration_seconds,
        "peak_acceleration": peak_acceleration,
        "avg_amplitude": avg_amplitude,
        "motion_data": body.get("motion_data", {}),
    }})

    # Update user XP
    user = await db.users.find_one({"_id": current_user["_id"]})
    current_xp = user.get("xp", 0) + total_xp
    new_level = current_xp // 500 + 1
    level_up = new_level > user.get("level", 1)

    # Update DNA based on exercise type
    dna = user.get("dna", {})
    if exercise_type == "squat":
        dna["forza"] = min(100, dna.get("forza", 50) + reps * 0.3)
        dna["resistenza"] = min(100, dna.get("resistenza", 50) + reps * 0.2)
        dna["potenza"] = min(100, dna.get("potenza", 50) + reps * 0.1)
    elif exercise_type == "punch":
        dna["velocita"] = min(100, dna.get("velocita", 50) + reps * 0.3)
        dna["potenza"] = min(100, dna.get("potenza", 50) + reps * 0.2)
        dna["agilita"] = min(100, dna.get("agilita", 50) + reps * 0.1)

    # Round DNA values
    dna = {k: round(v, 1) for k, v in dna.items()}

    # Check for records
    records_broken = []
    user_records = user.get("records", {})
    if reps > user_records.get(f"{exercise_type}_reps", 0):
        records_broken.append(f"{exercise_type}_reps")
        user_records[f"{exercise_type}_reps"] = reps
    if quality_score > user_records.get(f"{exercise_type}_quality", 0):
        records_broken.append(f"{exercise_type}_quality")
        user_records[f"{exercise_type}_quality"] = quality_score
    if peak_acceleration > user_records.get("peak_acceleration", 0):
        records_broken.append("peak_acceleration")
        user_records["peak_acceleration"] = peak_acceleration

    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {
        "xp": current_xp,
        "level": new_level,
        "dna": dna,
        "records": user_records,
        "last_active": datetime.now(timezone.utc),
    }})

    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    # ── PERFORMANCE RECORD: Persist legacy session ──
    await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo="ALLENAMENTO",
        modalita="INDIVIDUALE",
        disciplina=current_user.get("sport", "Fitness"),
        exercise_type=exercise_type,
        kpi={
            "primary_result": {"type": "REPS", "value": reps, "unit": "rep"},
            "quality_score": quality_score,
            "explosivity_pct": peak_acceleration,
        },
        is_certified=False,
        validation_status="AI_VERIFIED",
        flux_earned=total_xp,
        source_id=session_id,
        source_collection="nexus_sessions",
        extra_meta={"duration_seconds": duration_seconds, "records_broken": records_broken},
    )

    return {
        "session_id": session_id,
        "exercise_type": exercise_type,
        "reps_completed": reps,
        "quality_score": quality_score,
        "base_xp": base_xp,
        "quality_multiplier": round(quality_multiplier, 2),
        "gold_bonus": gold_bonus,
        "time_bonus": time_bonus,
        "xp_earned": total_xp,
        "records_broken": records_broken,
        "level_up": level_up,
        "new_level": new_level,
        "new_xp": current_xp,
        "dna": dna,
        "user": {
            "id": str(updated_user["_id"]),
            "username": updated_user["username"],
            "email": updated_user["email"],
            "xp": updated_user.get("xp", 0),
            "level": updated_user.get("level", 1),
            "sport": updated_user.get("sport"),
            "category": updated_user.get("category"),
            "dna": updated_user.get("dna"),
            "is_admin": updated_user.get("is_admin", False),
            "onboarding_completed": updated_user.get("onboarding_completed", True),
            "is_versatile": updated_user.get("is_versatile", False),
            "role": updated_user.get("role"),
        },
    }


@api_router.get("/nexus/sessions")
async def get_nexus_sessions(current_user: dict = Depends(get_current_user)):
    """Get user's Nexus Sync session history"""
    sessions = await db.nexus_sessions.find(
        {"user_id": current_user["_id"]}
    ).sort("started_at", -1).to_list(20)

    return [{
        "id": str(s["_id"]),
        "exercise_type": s.get("exercise_type"),
        "status": s.get("status"),
        "reps_completed": s.get("reps_completed", 0),
        "quality_score": s.get("quality_score", 0),
        "xp_earned": s.get("xp_earned", 0),
        "duration_seconds": s.get("duration_seconds", 0),
        "started_at": s.get("started_at", "").isoformat() if s.get("started_at") else None,
    } for s in sessions]


# ====================================
# LEADERBOARD / GLORY WALL ENGINE
# ====================================
# Simple in-memory cache with TTL
_leaderboard_cache: dict = {}
CACHE_TTL_SECONDS = 60  # 1 minute TTL


def _cache_key(type_: str, category: str, time_range: str) -> str:
    return f"lb:{type_}:{category}:{time_range}"


def _is_cache_valid(key: str) -> bool:
    if key not in _leaderboard_cache:
        return False
    cached_at = _leaderboard_cache[key].get("cached_at")
    if not cached_at:
        return False
    return (datetime.now(timezone.utc) - cached_at).total_seconds() < CACHE_TTL_SECONDS


@api_router.get("/leaderboard")
async def get_leaderboard(
    type: str = "global",
    category: Optional[str] = None,
    time_range: str = "all",
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    """
    Get leaderboard data.
    type: global | sport | crews
    category: optional category filter for sport type
    time_range: all | weekly
    """
    cache_key = _cache_key(type, category or "all", time_range)

    if _is_cache_valid(cache_key):
        return _leaderboard_cache[cache_key]["data"]

    result = []

    if type == "crews":
        # Crew leaderboard by total XP
        crews = await db.crews_v2.find().sort("xp_total", -1).to_list(limit)
        for rank, crew in enumerate(crews, 1):
            # Get members for weighted average
            members_data = []
            for mid in crew.get("members", []):
                u = await db.users.find_one({"_id": mid})
                if u:
                    members_data.append({"xp": u.get("xp", 0), "dna": u.get("dna")})

            crew_dna = calculate_crew_weighted_average(members_data)

            result.append({
                "rank": rank,
                "id": str(crew["_id"]),
                "name": crew["name"],
                "category": crew.get("category"),
                "members_count": crew.get("members_count", 0),
                "xp_total": crew.get("xp_total", 0),
                "tagline": crew.get("tagline", ""),
                "weighted_dna": crew_dna,
            })
    else:
        # User leaderboard
        query_filter: dict = {}
        if type == "sport" and category:
            query_filter["category"] = category

        if time_range == "weekly":
            one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
            # For weekly, still rank by XP but only include recently active users
            query_filter["$or"] = [
                {"created_at": {"$gte": one_week_ago}},
                {"last_active": {"$gte": one_week_ago}},
                {}  # Fallback: include all if no activity tracking yet
            ]

        users = await db.users.find(
            {"onboarding_completed": True, **{k: v for k, v in query_filter.items() if k != "$or"}},
        ).sort("xp", -1).to_list(limit)

        for rank, u in enumerate(users, 1):
            is_nexus_certified = bool(
                u.get("onboarding_completed") and
                u.get("baseline_scanned_at") and
                u.get("dna")
            )
            result.append({
                "rank": rank,
                "id": str(u["_id"]),
                "username": u["username"],
                "avatar_color": u.get("avatar_color", "#00F2FF"),
                "sport": u.get("sport"),
                "category": u.get("category"),
                "xp": u.get("xp", 0),
                "level": u.get("level", 1),
                "is_admin": u.get("is_admin", False),
                "is_founder": u.get("is_founder", False),
                "is_nexus_certified": is_nexus_certified,
            })

    # Cache the result
    _leaderboard_cache[cache_key] = {
        "data": result,
        "cached_at": datetime.now(timezone.utc),
    }

    return result


@api_router.get("/leaderboard/my-rank")
async def get_my_rank(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Get the current user's rank and info about the user above them"""
    query_filter: dict = {"onboarding_completed": True}
    if category:
        query_filter["category"] = category

    my_xp = current_user.get("xp", 0)

    # Count users with more XP = rank - 1
    users_above = await db.users.count_documents({
        **query_filter,
        "xp": {"$gt": my_xp},
    })
    my_rank = users_above + 1

    total_users = await db.users.count_documents(query_filter)

    # Find the user directly above (to show "overtake" message)
    next_user = None
    xp_gap = 0
    if users_above > 0:
        above = await db.users.find({
            **query_filter,
            "xp": {"$gt": my_xp},
        }).sort("xp", 1).to_list(1)
        if above:
            next_user = above[0]["username"]
            xp_gap = above[0].get("xp", 0) - my_xp

    return {
        "rank": my_rank,
        "total": total_users,
        "xp": my_xp,
        "next_username": next_user,
        "xp_gap": xp_gap,
        "is_top_10": my_rank <= 10,
        "category": category,
    }


def calculate_crew_weighted_average(members: list) -> dict:
    """Calculate weighted average DNA for a crew based on member XP weights"""
    if not members:
        return {"velocita": 0, "forza": 0, "resistenza": 0, "agilita": 0, "tecnica": 0, "potenza": 0}

    dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
    total_weight = 0
    weighted_sums = {k: 0.0 for k in dna_keys}

    for m in members:
        dna = m.get("dna")
        if not dna:
            continue
        # Weight = member XP (minimum 1 to avoid zero-division)
        weight = max(m.get("xp", 1), 1)
        total_weight += weight
        for k in dna_keys:
            weighted_sums[k] += dna.get(k, 50) * weight

    if total_weight == 0:
        return {k: 50 for k in dna_keys}

    return {k: round(weighted_sums[k] / total_weight, 1) for k in dna_keys}


def crew_to_response(crew: dict, current_user: dict = None) -> dict:
    is_owner = current_user and crew.get("owner_id") == current_user["_id"]
    return {
        "id": str(crew["_id"]),
        "name": crew["name"],
        "tagline": crew.get("tagline", ""),
        "category": crew.get("category"),
        "owner_id": str(crew.get("owner_id", "")),
        "members_count": crew.get("members_count", len(crew.get("members", []))),
        "xp_total": crew.get("xp_total", 0),
        "is_owner": is_owner,
        "created_at": crew.get("created_at", "").isoformat() if crew.get("created_at") else None,
    }


# ========== COACH STUDIO — TEMPLATE ENGINE ==========

class TemplateCreate(BaseModel):
    name: str
    exercise: str  # 'squat' or 'punch'
    target_time: int = 60  # seconds
    target_reps: int = 10
    xp_reward: int = 50
    difficulty: str = 'medium'  # easy, medium, hard, extreme
    description: Optional[str] = None


class TemplatePush(BaseModel):
    crew_id: str


@api_router.post("/templates")
async def create_template(body: TemplateCreate, user: dict = Depends(get_current_user)):
    """Coach creates a custom challenge template"""
    template = {
        "name": body.name,
        "exercise": body.exercise,
        "target_time": body.target_time,
        "target_reps": body.target_reps,
        "xp_reward": body.xp_reward,
        "difficulty": body.difficulty,
        "description": body.description or "",
        "coach_id": user["_id"],
        "coach_name": user.get("username", "Coach"),
        "created_at": datetime.now(timezone.utc),
        "uses_count": 0,
        "pushed_to": [],
    }
    result = await db.templates.insert_one(template)
    template["_id"] = result.inserted_id
    return template_to_response(template)


@api_router.get("/templates")
async def list_templates(user: dict = Depends(get_current_user)):
    """Get coach's private template library"""
    templates = await db.templates.find({"coach_id": user["_id"]}).sort("created_at", -1).to_list(100)
    return [template_to_response(t) for t in templates]


@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: dict = Depends(get_current_user)):
    """Delete a template from the library"""
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID template invalido")
    result = await db.templates.delete_one({"_id": oid, "coach_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template non trovato")
    return {"status": "deleted"}


@api_router.post("/templates/{template_id}/push")
async def push_template_to_crew(template_id: str, body: TemplatePush, user: dict = Depends(get_current_user)):
    """Push a challenge template to a crew — all members receive it"""
    try:
        t_oid = ObjectId(template_id)
        c_oid = ObjectId(body.crew_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalido")

    template = await db.templates.find_one({"_id": t_oid, "coach_id": user["_id"]})
    if not template:
        raise HTTPException(status_code=404, detail="Template non trovato")

    crew = await db.crews.find_one({"_id": c_oid})
    if not crew:
        raise HTTPException(status_code=404, detail="Crew non trovata")

    # Create a challenge push record
    push = {
        "template_id": t_oid,
        "template_name": template["name"],
        "exercise": template["exercise"],
        "target_time": template["target_time"],
        "target_reps": template["target_reps"],
        "xp_reward": template["xp_reward"],
        "difficulty": template["difficulty"],
        "crew_id": c_oid,
        "crew_name": crew["name"],
        "coach_id": user["_id"],
        "coach_name": user.get("username", "Coach"),
        "pushed_at": datetime.now(timezone.utc),
        "status": "active",
        "completions": [],
    }
    await db.challenge_pushes.insert_one(push)

    # Update template usage
    await db.templates.update_one(
        {"_id": t_oid},
        {"$inc": {"uses_count": 1}, "$push": {"pushed_to": str(c_oid)}}
    )

    return {
        "status": "pushed",
        "template": template["name"],
        "crew": crew["name"],
        "members_reached": crew.get("members_count", len(crew.get("members", []))),
    }


@api_router.get("/templates/pushed/{crew_id}")
async def get_crew_challenges(crew_id: str, user: dict = Depends(get_current_user)):
    """Get active challenges pushed to a crew"""
    try:
        c_oid = ObjectId(crew_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID crew invalido")

    pushes = await db.challenge_pushes.find(
        {"crew_id": c_oid, "status": "active"}
    ).sort("pushed_at", -1).to_list(50)

    return [{
        "id": str(p["_id"]),
        "template_name": p["template_name"],
        "exercise": p["exercise"],
        "target_time": p["target_time"],
        "target_reps": p["target_reps"],
        "xp_reward": p["xp_reward"],
        "difficulty": p["difficulty"],
        "coach_name": p["coach_name"],
        "crew_name": p["crew_name"],
        "pushed_at": p["pushed_at"].isoformat() if p.get("pushed_at") else None,
        "completions_count": len(p.get("completions", [])),
    } for p in pushes]


def template_to_response(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "name": t["name"],
        "exercise": t["exercise"],
        "target_time": t["target_time"],
        "target_reps": t["target_reps"],
        "xp_reward": t["xp_reward"],
        "difficulty": t["difficulty"],
        "description": t.get("description", ""),
        "coach_name": t.get("coach_name", ""),
        "uses_count": t.get("uses_count", 0),
        "created_at": t["created_at"].isoformat() if t.get("created_at") else None,
    }


@api_router.get("/my-template")
async def get_my_template(current_user: dict = Depends(get_current_user)):
    """Get the most recent active coach template for the current user (from their crew's pushes).
    Also includes user's DNA potential for Bio-Feedback calibration.
    """
    # Find user's crews
    user_crews = await db.crews_v2.find({"members": current_user["_id"]}).to_list(10)
    crew_ids = [c["_id"] for c in user_crews]

    if not crew_ids:
        # Try legacy crews collection
        user_crews_legacy = await db.crews.find({"members": current_user["_id"]}).to_list(10)
        crew_ids = [c["_id"] for c in user_crews_legacy]

    if not crew_ids:
        return {"template": None, "message": "Nessuna crew — chiedi al tuo Coach di aggiungerti"}

    # Get latest active push for user's crews
    push = await db.challenge_pushes.find_one(
        {"crew_id": {"$in": crew_ids}, "status": "active"},
        sort=[("pushed_at", -1)]
    )

    if not push:
        return {"template": None, "message": "Nessun template attivo — il Coach non ha ancora inviato sessioni"}

    # Check if user already completed this push today
    today = datetime.utcnow().date()
    already_done = any(
        c.get("user_id") == current_user["_id"] and
        c.get("completed_at") and
        c["completed_at"].date() == today
        for c in push.get("completions", [])
    )

    # Calculate DNA potential (avg of user's 6 attributes → bio-feedback baseline)
    dna = current_user.get("dna") or {}
    dna_keys = ["velocita", "forza", "resistenza", "agilita", "tecnica", "potenza"]
    dna_values = [dna.get(k, 50) for k in dna_keys]
    dna_potential = round(sum(dna_values) / len(dna_values), 1)

    # Discipline-to-DNA mapping for feedback
    exercise_dna_map = {
        "squat": ["forza", "resistenza", "potenza"],
        "punch": ["velocita", "agilita", "potenza"],
    }
    relevant_dna = exercise_dna_map.get(push.get("exercise", "squat"), dna_keys[:3])
    relevant_potential = round(
        sum(dna.get(k, 50) for k in relevant_dna) / len(relevant_dna), 1
    )

    return {
        "template": {
            "push_id": str(push["_id"]),
            "name": push["template_name"],
            "exercise": push["exercise"],
            "target_time": push["target_time"],
            "target_reps": push["target_reps"],
            "xp_reward": push["xp_reward"],
            "difficulty": push["difficulty"],
            "coach_name": push.get("coach_name", "Coach"),
            "pushed_at": push["pushed_at"].isoformat() if push.get("pushed_at") else None,
            "completions_count": len(push.get("completions", [])),
            "already_done_today": already_done,
        },
        "dna_potential": dna_potential,
        "relevant_potential": relevant_potential,
        "dna": dna,
        "message": "TEMPLATE DEL GIORNO DISPONIBILE" if not already_done else "SESSIONE GIÀ COMPLETATA OGGI",
    }



# ====================================
# GYM HUB — ENTERPRISE ENGINE
# ====================================

APP_DOMAIN = os.environ.get('APP_DOMAIN', 'https://arenakore.com')


def generate_event_code(length: int = 8) -> str:
    """Generate a unique alphanumeric event code for QR"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def generate_qr_base64(data: str, gym_name: str = "", event_title: str = "") -> str:
    """Generate a branded QR Code as base64 PNG — ARENAKORE dark theme"""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Nike-dark branded QR: Cyan (#00F2FF) on Dark (#050505)
    img = qr.make_image(
        image_factory=StyledPilImage,
        color_mask=SolidFillColorMask(
            back_color=(5, 5, 5),
            front_color=(0, 242, 255),
        ),
    )

    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


async def get_or_create_gym(owner_id, owner_username: str) -> dict:
    """Auto-provision a gym for a GYM_OWNER if none exists"""
    gym = await db.gyms.find_one({"owner_id": owner_id})
    if gym:
        return gym

    gym = {
        "owner_id": owner_id,
        "name": f"{owner_username}'s Gym",
        "address": "",
        "description": "",
        "coaches": [],
        "coaches_count": 0,
        "events_count": 0,
        "members_count": 1,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.gyms.insert_one(gym)
    gym["_id"] = result.inserted_id
    return gym


def _legacy_gym_to_response(gym: dict) -> dict:
    return {
        "id": str(gym["_id"]),
        "name": gym.get("name", ""),
        "address": gym.get("address", ""),
        "description": gym.get("description", ""),
        "coaches_count": gym.get("coaches_count", 0),
        "events_count": gym.get("events_count", 0),
        "members_count": gym.get("members_count", 1),
        "created_at": gym["created_at"].isoformat() if gym.get("created_at") else None,
    }


def gym_event_to_response(event: dict, include_qr: bool = False) -> dict:
    resp = {
        "id": str(event["_id"]),
        "gym_id": str(event.get("gym_id", "")),
        "title": event.get("title", ""),
        "description": event.get("description", ""),
        "exercise": event.get("exercise", "squat"),
        "difficulty": event.get("difficulty", "medium"),
        "event_date": event.get("event_date", ""),
        "event_time": event.get("event_time", ""),
        "max_participants": event.get("max_participants", 50),
        "participants_count": event.get("participants_count", 0),
        "event_code": event.get("event_code", ""),
        "status": event.get("status", "upcoming"),
        "gym_name": event.get("gym_name", ""),
        "coach_name": event.get("coach_name", ""),
        "xp_reward": event.get("xp_reward", 100),
        "created_at": event["created_at"].isoformat() if event.get("created_at") else None,
    }
    if include_qr:
        resp["qr_base64"] = event.get("qr_base64", "")
    return resp


# === Pydantic Models ===

class GymUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None


class GymCoachAdd(BaseModel):
    username: str


class GymEventCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    exercise: str = "squat"       # squat | punch
    difficulty: str = "medium"    # easy | medium | hard | extreme
    event_date: str               # "2026-04-15"
    event_time: str               # "18:30"
    max_participants: int = 50
    xp_reward: int = 100


# === GYM PROFILE ===

@api_router.get("/gym/me")
async def get_my_gym_legacy(current_user: dict = Depends(get_current_user)):
    """Get or auto-create the gym for current GYM_OWNER (legacy endpoint)"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))
    return _legacy_gym_to_response(gym)


@api_router.put("/gym/me")
async def update_my_gym(data: GymUpdate, current_user: dict = Depends(get_current_user)):
    """Update gym profile"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))
    update_fields = {}
    if data.name is not None:
        update_fields["name"] = data.name
    if data.address is not None:
        update_fields["address"] = data.address
    if data.description is not None:
        update_fields["description"] = data.description

    if update_fields:
        await db.gyms.update_one({"_id": gym["_id"]}, {"$set": update_fields})

    updated = await db.gyms.find_one({"_id": gym["_id"]})
    return _legacy_gym_to_response(updated)

@api_router.get("/gym/coaches")
async def list_gym_coaches(current_user: dict = Depends(get_current_user)):
    """List all coaches associated to the gym owner's gym"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))
    coach_ids = gym.get("coaches", [])

    coaches = []
    for cid in coach_ids:
        user = await db.users.find_one({"_id": cid})
        if user:
            coaches.append({
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user.get("email", ""),
                "avatar_color": user.get("avatar_color", "#00F2FF"),
                "sport": user.get("sport"),
                "xp": user.get("xp", 0),
                "level": user.get("level", 1),
                "dna": user.get("dna"),
                "templates_count": await db.templates.count_documents({"coach_id": user["_id"]}),
                "joined_at": user.get("created_at", "").isoformat() if user.get("created_at") else None,
            })

    return coaches


@api_router.post("/gym/coaches")
async def add_gym_coach(data: GymCoachAdd, current_user: dict = Depends(get_current_user)):
    """Associate a coach to the gym by username"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))

    target = await db.users.find_one({"username": data.username})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")

    if target["_id"] in gym.get("coaches", []):
        raise HTTPException(status_code=400, detail="Coach gi\u00e0 associato")

    if target["_id"] == current_user["_id"]:
        raise HTTPException(status_code=400, detail="Non puoi associare te stesso come coach")

    await db.gyms.update_one(
        {"_id": gym["_id"]},
        {"$push": {"coaches": target["_id"]}, "$inc": {"coaches_count": 1}},
    )

    return {
        "status": "associated",
        "coach": {
            "id": str(target["_id"]),
            "username": target["username"],
            "avatar_color": target.get("avatar_color", "#00F2FF"),
            "sport": target.get("sport"),
            "xp": target.get("xp", 0),
            "level": target.get("level", 1),
        },
    }


@api_router.delete("/gym/coaches/{coach_id}")
async def remove_gym_coach(coach_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a coach from the gym"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))

    try:
        cid = ObjectId(coach_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID coach invalido")

    if cid not in gym.get("coaches", []):
        raise HTTPException(status_code=404, detail="Coach non trovato nella palestra")

    await db.gyms.update_one(
        {"_id": gym["_id"]},
        {"$pull": {"coaches": cid}, "$inc": {"coaches_count": -1}},
    )

    return {"status": "removed", "coach_id": coach_id}


# === MASS EVENT GENERATOR ===

@api_router.post("/gym/events")
async def create_gym_event(data: GymEventCreate, current_user: dict = Depends(get_current_user)):
    """Create a live mass event with auto-generated QR Code"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))

    # Generate unique event code
    event_code = generate_event_code()
    # Ensure uniqueness
    while await db.gym_events.find_one({"event_code": event_code}):
        event_code = generate_event_code()

    # Build deep link URL
    join_url = f"{APP_DOMAIN}/join/{event_code}"

    # Generate QR Code as base64 PNG
    qr_payload = f"{join_url}?gym={str(gym['_id'])}&exercise={data.exercise}&difficulty={data.difficulty}"
    qr_base64 = generate_qr_base64(qr_payload, gym.get("name", ""), data.title)

    event = {
        "gym_id": gym["_id"],
        "gym_name": gym.get("name", ""),
        "owner_id": current_user["_id"],
        "coach_name": current_user.get("username", "Owner"),
        "title": data.title,
        "description": data.description or "",
        "exercise": data.exercise,
        "difficulty": data.difficulty,
        "event_date": data.event_date,
        "event_time": data.event_time,
        "max_participants": data.max_participants,
        "xp_reward": data.xp_reward,
        "event_code": event_code,
        "join_url": join_url,
        "qr_base64": qr_base64,
        "qr_payload_url": qr_payload,
        "participants": [],
        "participants_count": 0,
        "status": "upcoming",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.gym_events.insert_one(event)
    event["_id"] = result.inserted_id

    # Increment gym event count
    await db.gyms.update_one({"_id": gym["_id"]}, {"$inc": {"events_count": 1}})

    return gym_event_to_response(event, include_qr=True)


@api_router.get("/gym/events")
async def list_gym_events(current_user: dict = Depends(get_current_user)):
    """List all events for the gym owner's gym"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))

    events = await db.gym_events.find(
        {"gym_id": gym["_id"]}
    ).sort("created_at", -1).to_list(50)

    return [gym_event_to_response(e, include_qr=True) for e in events]


@api_router.get("/gym/events/{event_id}")
async def get_gym_event_detail(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get full event detail including QR and participant list"""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID evento invalido")

    event = await db.gym_events.find_one({"_id": oid})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")

    # Enrich with participant data
    participants = []
    for pid in event.get("participants", []):
        u = await db.users.find_one({"_id": pid})
        if u:
            participants.append({
                "id": str(u["_id"]),
                "username": u["username"],
                "avatar_color": u.get("avatar_color", "#00F2FF"),
                "xp": u.get("xp", 0),
                "level": u.get("level", 1),
                "sport": u.get("sport"),
            })

    resp = gym_event_to_response(event, include_qr=True)
    resp["participants"] = participants
    resp["join_url"] = event.get("join_url", "")
    return resp


@api_router.get("/gym/events/{event_id}/qr")
async def get_event_qr(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get just the QR Code for an event"""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID evento invalido")

    event = await db.gym_events.find_one({"_id": oid})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")

    return {
        "event_id": str(event["_id"]),
        "event_code": event.get("event_code", ""),
        "title": event.get("title", ""),
        "join_url": event.get("join_url", ""),
        "qr_base64": event.get("qr_base64", ""),
        "gym_name": event.get("gym_name", ""),
        "exercise": event.get("exercise", ""),
        "difficulty": event.get("difficulty", ""),
        "event_date": event.get("event_date", ""),
        "event_time": event.get("event_time", ""),
    }


# === QR-CORE DEEP LINKING ===

@api_router.get("/gym/join/{event_code}")
async def join_via_qr(event_code: str):
    """PUBLIC endpoint — No auth required. Returns event preview for QR scan landing page."""
    event = await db.gym_events.find_one({"event_code": event_code})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato o codice scaduto")

    gym = await db.gyms.find_one({"_id": event.get("gym_id")})

    return {
        "event_code": event_code,
        "event_id": str(event["_id"]),
        "title": event.get("title", ""),
        "description": event.get("description", ""),
        "exercise": event.get("exercise", "squat"),
        "difficulty": event.get("difficulty", "medium"),
        "event_date": event.get("event_date", ""),
        "event_time": event.get("event_time", ""),
        "xp_reward": event.get("xp_reward", 100),
        "max_participants": event.get("max_participants", 50),
        "participants_count": event.get("participants_count", 0),
        "status": event.get("status", "upcoming"),
        "gym": {
            "id": str(gym["_id"]) if gym else "",
            "name": gym.get("name", "") if gym else "",
        },
        "deep_link": {
            "ios": "https://apps.apple.com/app/arenakore",
            "android": "https://play.google.com/store/apps/details?id=com.arenakore.app",
            "universal": f"{APP_DOMAIN}/join/{event_code}",
        },
    }


@api_router.post("/gym/events/{event_id}/join")
async def join_gym_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Join a gym event (for registered and authenticated users)"""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID evento invalido")

    event = await db.gym_events.find_one({"_id": oid})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")

    if event.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Evento gi\u00e0 concluso")

    if current_user["_id"] in event.get("participants", []):
        raise HTTPException(status_code=400, detail="Sei gi\u00e0 iscritto a questo evento")

    if event.get("participants_count", 0) >= event.get("max_participants", 50):
        raise HTTPException(status_code=400, detail="Evento al completo")

    # Add user to event
    await db.gym_events.update_one(
        {"_id": oid},
        {"$push": {"participants": current_user["_id"]}, "$inc": {"participants_count": 1}},
    )

    # Auto-associate user to the gym (add to gym members if not already)
    gym = await db.gyms.find_one({"_id": event.get("gym_id")})
    if gym:
        gym_members = gym.get("members", [])
        if current_user["_id"] not in gym_members:
            await db.gyms.update_one(
                {"_id": gym["_id"]},
                {"$push": {"members": current_user["_id"]}, "$inc": {"members_count": 1}},
            )

    return {
        "status": "joined",
        "event_id": str(event["_id"]),
        "title": event.get("title", ""),
        "gym_name": event.get("gym_name", ""),
        "xp_reward": event.get("xp_reward", 100),
        "participants_count": event.get("participants_count", 0) + 1,
    }


@api_router.post("/gym/join/{event_code}/enroll")
async def enroll_via_event_code(event_code: str, current_user: dict = Depends(get_current_user)):
    """Enroll in an event using the QR event_code (authenticated user deep link handler)"""
    event = await db.gym_events.find_one({"event_code": event_code})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato o codice scaduto")

    if event.get("status") == "completed":
        raise HTTPException(status_code=400, detail="Evento gi\u00e0 concluso")

    if current_user["_id"] in event.get("participants", []):
        return {
            "status": "already_enrolled",
            "event_id": str(event["_id"]),
            "title": event.get("title", ""),
            "gym_name": event.get("gym_name", ""),
        }

    if event.get("participants_count", 0) >= event.get("max_participants", 50):
        raise HTTPException(status_code=400, detail="Evento al completo")

    # Enroll user
    await db.gym_events.update_one(
        {"_id": event["_id"]},
        {"$push": {"participants": current_user["_id"]}, "$inc": {"participants_count": 1}},
    )

    # Auto-associate user to the gym
    gym = await db.gyms.find_one({"_id": event.get("gym_id")})
    if gym:
        gym_members = gym.get("members", [])
        if current_user["_id"] not in gym_members:
            await db.gyms.update_one(
                {"_id": gym["_id"]},
                {"$push": {"members": current_user["_id"]}, "$inc": {"members_count": 1}},
            )

    return {
        "status": "enrolled",
        "event_id": str(event["_id"]),
        "title": event.get("title", ""),
        "gym_name": event.get("gym_name", ""),
        "xp_reward": event.get("xp_reward", 100),
        "participants_count": event.get("participants_count", 0) + 1,
    }


@api_router.put("/gym/events/{event_id}/status")
async def update_event_status(event_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Update event status (upcoming → live → completed)"""
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID evento invalido")

    event = await db.gym_events.find_one({"_id": oid})
    if not event:
        raise HTTPException(status_code=404, detail="Evento non trovato")

    if event.get("owner_id") != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Solo il proprietario pu\u00f2 modificare lo stato")

    new_status = body.get("status", "upcoming")
    if new_status not in ["upcoming", "live", "completed"]:
        raise HTTPException(status_code=400, detail="Stato non valido")

    await db.gym_events.update_one({"_id": oid}, {"$set": {"status": new_status}})

    return {"status": new_status, "event_id": event_id}


# NOTE: app.include_router is called at the BOTTOM of this file after all endpoint definitions

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================
# NOTIFICATION ENGINE — SPRINT 9
# ============================================================
scheduler = AsyncIOScheduler(timezone="UTC")

NOTIF_ICONS = {
    "hype_24h":        {"icon": "flash",       "color": "#D4AF37"},
    "evolution_ready": {"icon": "scan",         "color": "#00F2FF"},
    "pro_grace_warning": {"icon": "warning",   "color": "#FF453A"},
    "pro_revoked":     {"icon": "lock-closed",  "color": "#FF453A"},
    "bio_scan_reminder": {"icon": "time",       "color": "#888888"},
}

async def check_notification_triggers():
    """Background job: check all users for Bio-Evolution notification events every 6h"""
    now = datetime.now(timezone.utc)
    logger.info(f"[NotifEngine] Checking triggers at {now.strftime('%Y-%m-%d %H:%M UTC')}")

    try:
        async for user in db.users.find(
            {"validation_scanned_at": {"$exists": True, "$ne": None}}
        ):
            validation_at = user.get("validation_scanned_at")
            if not validation_at:
                continue
            if hasattr(validation_at, 'tzinfo') and validation_at.tzinfo is None:
                validation_at = validation_at.replace(tzinfo=timezone.utc)

            days_since = (now - validation_at).days
            user_id = str(user["_id"])

            # Skip if user already did evolution scan
            dna_scans = user.get("dna_scans", [])
            did_evolve = any(
                s.get("scan_type") == "evolution"
                and (lambda sa: sa and (sa.replace(tzinfo=timezone.utc) if sa.tzinfo is None else sa) > validation_at)(s.get("scanned_at"))
                for s in dna_scans
            )
            if did_evolve:
                continue

            async def notif_exists(ntype: str, days: int = 2) -> bool:
                return bool(await db.notifications.find_one({
                    "user_id": user_id, "type": ntype,
                    "created_at": {"$gte": now - timedelta(days=days)}
                }))

            async def create_notif(ntype: str, title: str, body: str):
                await db.notifications.insert_one({
                    "user_id": user_id, "type": ntype,
                    "title": title, "body": body,
                    "read": False, "created_at": now,
                })
                logger.info(f"[NotifEngine] '{ntype}' created for {user_id}")

            # Day 29: 24h hype
            if 29 <= days_since < 30:
                if not await notif_exists("hype_24h"):
                    await create_notif("hype_24h",
                        "DOMANI: EVOLUZIONE DNA",
                        "Preparati per la nuova Bio-Signature. La tua finestra evolutiva apre domani.")

            # Day 30: Evolution ready
            elif 30 <= days_since < 31:
                if not await notif_exists("evolution_ready"):
                    await create_notif("evolution_ready",
                        "EVOLUTION SCAN DISPONIBILE",
                        "La tua finestra evolutiva è aperta. Esegui la Bio-Scan per mantenere l'accesso PRO.")

            # Day 32: PRO grace warning
            elif 32 <= days_since < 33 and user.get("pro_unlocked"):
                if not await notif_exists("pro_grace_warning"):
                    await create_notif("pro_grace_warning",
                        "ACCESSO PRO A RISCHIO",
                        "Hai 24 ore per completare la Bio-Scan o perderai i tuoi privilegi PRO.")

            # Day 33+: Revoke PRO
            elif days_since >= 33 and user.get("pro_unlocked"):
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"pro_unlocked": False, "pro_revoked_at": now}}
                )
                if not await notif_exists("pro_revoked", days=7):
                    await create_notif("pro_revoked",
                        "BIO-FIRMA SCADUTA",
                        "Accesso PRO sospeso. Completa la Bio-Scan per ripristinare i tuoi privilegi.")

    except Exception as e:
        logger.error(f"[NotifEngine] Error: {e}")


# =====================================================================
# WALLET ENGINE — APPLE WALLET (.pkpass) + GOOGLE WALLET (JWT)
# Architecture is production-ready: replace mock certs with real ones
# =====================================================================

@api_router.get("/wallet/apple-pass")
async def generate_apple_pass(current_user: dict = Depends(get_current_user)):
    """
    Generates a structurally valid mock .pkpass for Apple Wallet.
    Returns base64-encoded ZIP.
    To activate fully: replace 'teamIdentifier' + add real PKCS7 signature
    with Pass Type ID Certificate from Apple Developer Account.
    """
    user_id = str(current_user["_id"])
    username = current_user.get("username", "ATHLETE").upper()
    sport = current_user.get("sport", "ATHLETICS").upper()
    level = current_user.get("level", 1)
    xp = current_user.get("xp", 0)
    is_founder = current_user.get("is_founder", False) or current_user.get("is_admin", False)
    founder_number = current_user.get("founder_number", None)

    try:
        kore_num = int(user_id[-5:], 16) % 99999
    except Exception:
        kore_num = 1
    kore_number = f"{founder_number:05d}" if founder_number else f"{kore_num:05d}"

    pass_dict = {
        "formatVersion": 1,
        "passTypeIdentifier": "pass.com.arenadare.athlete",
        "serialNumber": f"KORE-{kore_number}",
        "teamIdentifier": "ARENADARE1",
        "organizationName": "ARENAKORE",
        "description": "KORE ID CERTIFICATE",
        "logoText": "ARENAKORE",
        "foregroundColor": "rgb(0, 242, 255)",
        "backgroundColor": "rgb(5, 5, 5)",
        "labelColor": "rgb(212, 175, 55)",
        "generic": {
            "primaryFields": [
                {"key": "athlete", "label": "KORE", "value": username}
            ],
            "secondaryFields": [
                {"key": "sport", "label": "SPORT", "value": sport},
                {"key": "level", "label": "LIVELLO", "value": str(level)},
            ],
            "auxiliaryFields": [
                {"key": "xp", "label": "FLUX TOTALE", "value": f"{xp:,}"},
                {"key": "status", "label": "STATUS", "value": "FOUNDER" if is_founder else "KORE ATHLETE"},
            ],
            "backFields": [
                {"key": "kore_number", "label": "KORE #", "value": kore_number},
                {
                    "key": "note",
                    "label": "ATTIVAZIONE",
                    "value": "Pass generato da ARENAKORE. Per firma digitale Apple, aggiungere Pass Type ID Certificate."
                },
            ],
        },
        "barcodes": [
            {
                "message": f"arenakore://athlete/{user_id}",
                "format": "PKBarcodeFormatQR",
                "messageEncoding": "iso-8859-1",
                "altText": f"KORE #{kore_number}",
            }
        ],
    }

    pass_bytes = stdlib_json.dumps(pass_dict, indent=2).encode("utf-8")
    manifest_bytes = stdlib_json.dumps(
        {"pass.json": hashlib.sha1(pass_bytes).hexdigest()}
    ).encode("utf-8")
    # Mock signature — replace with real PKCS7 when Apple certs are available
    signature_bytes = b"MOCK_SIGNATURE_PLACEHOLDER_REPLACE_WITH_PKCS7_SIGNED_CERT"

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("pass.json", pass_bytes)
        zf.writestr("manifest.json", manifest_bytes)
        zf.writestr("signature", signature_bytes)
    zip_buffer.seek(0)
    pkpass_b64 = base64.b64encode(zip_buffer.read()).decode("utf-8")

    return {
        "status": "generated",
        "kore_number": kore_number,
        "athlete": username,
        "pass_b64": pkpass_b64,
        "filename": f"KORE_{kore_number}.pkpass",
        "content_type": "application/vnd.apple.pkpass",
        "note": "Mock — firma non certificata. Aggiungere Pass Type ID Certificate Apple per attivazione completa.",
    }


@api_router.get("/wallet/google-pass")
async def generate_google_pass(current_user: dict = Depends(get_current_user)):
    """
    Generates a mock Google Wallet JWT and save URL.
    To activate fully: replace mock SERVICE_ACCOUNT_EMAIL + sign JWT
    with Google Service Account private key from Cloud Console.
    """
    user_id = str(current_user["_id"])
    username = current_user.get("username", "ATHLETE").upper()
    sport = current_user.get("sport", "ATHLETICS").upper()
    level = current_user.get("level", 1)
    xp = current_user.get("xp", 0)
    is_founder = current_user.get("is_founder", False) or current_user.get("is_admin", False)
    founder_number = current_user.get("founder_number", None)

    try:
        kore_num = int(user_id[-5:], 16) % 99999
    except Exception:
        kore_num = 1
    kore_number = f"{founder_number:05d}" if founder_number else f"{kore_num:05d}"

    now_ts = int(datetime.now(timezone.utc).timestamp())
    # Mock issuer — replace with real Google Pay & Wallet Issuer ID
    issuer_id = "3388000000022800000"

    google_pass_payload = {
        "iss": "arenakore-mock@arenadare.iam.gserviceaccount.com",
        "aud": "google",
        "typ": "savetowallet",
        "iat": now_ts,
        "payload": {
            "genericObjects": [
                {
                    "id": f"{issuer_id}.kore_{user_id}",
                    "classId": f"{issuer_id}.kore_athlete_pass",
                    "genericType": "GENERIC_TYPE_UNSPECIFIED",
                    "hexBackgroundColor": "#050505",
                    "cardTitle": {
                        "defaultValue": {"language": "it-IT", "value": "ARENAKORE"}
                    },
                    "subheader": {
                        "defaultValue": {"language": "it-IT", "value": "KORE ID CERTIFICATE"}
                    },
                    "header": {
                        "defaultValue": {"language": "it-IT", "value": username}
                    },
                    "textModulesData": [
                        {"id": "sport", "header": "SPORT", "body": sport},
                        {"id": "level", "header": "LIVELLO", "body": str(level)},
                        {"id": "xp", "header": "FLUX TOTALE", "body": f"{xp:,}"},
                        {"id": "status", "header": "STATUS", "body": "FOUNDER" if is_founder else "KORE ATHLETE"},
                        {"id": "kore_number", "header": "KORE #", "body": kore_number},
                    ],
                    "barcode": {
                        "type": "QR_CODE",
                        "value": f"arenakore://athlete/{user_id}",
                        "alternateText": f"KORE #{kore_number}",
                    },
                    "state": "ACTIVE",
                }
            ]
        },
    }

    jwt_token = jwt.encode(google_pass_payload, SECRET_KEY, algorithm=ALGORITHM)
    wallet_url = f"https://pay.google.com/gp/v/save/{jwt_token}"

    return {
        "status": "generated",
        "kore_number": kore_number,
        "athlete": username,
        "wallet_url": wallet_url,
        "note": "Mock JWT — firmato con chiave locale. Per attivazione completa, configurare Google Pay & Wallet API Service Account.",
    }


# =====================================================================
# KORE ID — City Rank + Affiliations + Action Center
# =====================================================================

class UpdateAffiliations(BaseModel):
    school: Optional[str] = None
    university: Optional[str] = None


@api_router.get("/kore/city-rank")
async def get_city_rank(city: str = "MILANO", current_user: dict = Depends(get_current_user)):
    """
    Get user's rank within a selected city context.
    Returns global rank + city rank + dominance percentile for both.
    Currently: city rank is simulated with deterministic seeded variation.
    Production: use user.city field + geolocation-based filtering.
    """
    my_xp = current_user.get("xp", 0)
    user_id = str(current_user["_id"])

    # Global Rank (real)
    query_global = {"onboarding_completed": True}
    global_above = await db.users.count_documents({**query_global, "xp": {"$gt": my_xp}})
    global_rank = global_above + 1
    global_total = await db.users.count_documents(query_global)
    # Percentile = % of athletes you dominate. Rank 1 = 100% dominance.
    global_percentile = round(((max(global_total, 1) - global_rank) / max(global_total - 1, 1)) * 100, 1) if global_total > 1 else 100.0

    # City Rank — deterministic mock based on city name hash + user XP
    # This creates a consistent but different ranking per city
    import hashlib as _hl
    city_seed = int(_hl.md5(f"{city}:{user_id}".encode()).hexdigest()[:8], 16)
    # Simulate city population (50-500 athletes per city)
    city_population = 50 + (int(_hl.md5(city.encode()).hexdigest()[:4], 16) % 450)
    # City rank: derived from global rank + city-specific offset
    city_rank_raw = max(1, int(global_rank * (0.3 + (city_seed % 70) / 100)))
    city_rank = min(city_rank_raw, city_population)
    city_percentile = round(((city_population - city_rank) / max(city_population, 1)) * 100, 1)

    # Next user in city (mock)
    mock_names = ["ALEX_K", "MAYA_J", "TORO_94", "SASHA_V", "KIRA_M", "NERO_X", "LUNA_R", "TITAN_7"]
    next_city_user = mock_names[city_seed % len(mock_names)]
    city_xp_gap = 10 + (city_seed % 200)

    # Global next user
    global_next = None
    global_xp_gap = 0
    if global_above > 0:
        above = await db.users.find({**query_global, "xp": {"$gt": my_xp}}).sort("xp", 1).to_list(1)
        if above:
            global_next = above[0]["username"]
            global_xp_gap = above[0].get("xp", 0) - my_xp

    return {
        "global_rank": global_rank,
        "global_total": global_total,
        "global_percentile": global_percentile,
        "global_next_username": global_next,
        "global_xp_gap": global_xp_gap,
        "global_is_top_10": global_rank <= 10,
        "city": city,
        "city_rank": city_rank,
        "city_total": city_population,
        "city_percentile": city_percentile,
        "city_next_username": next_city_user,
        "city_xp_gap": city_xp_gap,
        "city_is_top_10": city_rank <= 10,
    }


@api_router.get("/kore/affiliations")
async def get_affiliations(current_user: dict = Depends(get_current_user)):
    """Get user's affiliations: school/university + crews"""
    user_id = current_user["_id"]
    school = current_user.get("school", None)
    university = current_user.get("university", None)

    # Crews the user belongs to
    crews = await db.crews_v2.find({"members": user_id}).to_list(10)
    crew_list = []
    for c in crews:
        crew_list.append({
            "id": str(c["_id"]),
            "name": c.get("name", ""),
            "tagline": c.get("tagline", ""),
            "category": c.get("category"),
            "members_count": c.get("members_count", 0),
            "xp_total": c.get("xp_total", 0),
            "is_owner": c.get("owner_id") == user_id,
        })

    return {
        "school": school,
        "university": university,
        "crews": crew_list,
        "crews_count": len(crew_list),
    }


@api_router.put("/kore/affiliations")
async def update_affiliations(data: UpdateAffiliations, current_user: dict = Depends(get_current_user)):
    """Update user's school/university"""
    update_fields = {}
    if data.school is not None:
        update_fields["school"] = data.school
    if data.university is not None:
        update_fields["university"] = data.university
    if update_fields:
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update_fields})
    return {"status": "updated", **update_fields}


@api_router.get("/kore/action-center")
async def get_action_center(current_user: dict = Depends(get_current_user)):
    """
    Action Center: HOT (created by user) + PENDING (received by user).
    HOT = active battles/challenges the user started or is participating in.
    PENDING = crew invites + challenges pushed to user's crews.
    """
    user_id = current_user["_id"]
    user_id_str = str(user_id)

    # === HOT: Active participations ===
    hot_items = []

    # User's active battle participations
    participations = await db.battle_participants.find({
        "user_id": user_id,
        "completed": False,
    }).to_list(10)

    for p in participations:
        battle = await db.battles.find_one({"_id": p.get("battle_id")})
        if battle and battle.get("status") in ("live", "upcoming"):
            hot_items.append({
                "id": str(battle["_id"]),
                "type": "battle",
                "title": battle.get("title", "CHALLENGE"),
                "sport": battle.get("sport", ""),
                "status": battle.get("status", "live"),
                "xp_reward": battle.get("xp_reward", 0),
                "participants_count": battle.get("participants_count", 0),
                "joined_at": p.get("joined_at", "").isoformat() if p.get("joined_at") else None,
            })

    # User's gym events they joined (upcoming/live)
    gym_events = await db.gym_events.find({
        "participants": user_id,
        "status": {"$in": ["upcoming", "live"]},
    }).to_list(5)

    for ev in gym_events:
        hot_items.append({
            "id": str(ev["_id"]),
            "type": "gym_event",
            "title": ev.get("title", "EVENT"),
            "sport": ev.get("exercise", "").upper(),
            "status": ev.get("status", "upcoming"),
            "xp_reward": ev.get("xp_reward", 0),
            "participants_count": ev.get("participants_count", 0),
            "gym_name": ev.get("gym_name", ""),
            "event_date": ev.get("event_date", ""),
            "event_time": ev.get("event_time", ""),
        })

    # === PENDING: Received invites + pushed challenges ===
    pending_items = []

    # Crew invites
    crew_invites = await db.crew_invites.find({
        "to_user_id": user_id,
        "status": "pending",
    }).to_list(10)

    for inv in crew_invites:
        crew = await db.crews_v2.find_one({"_id": inv.get("crew_id")})
        from_user = await db.users.find_one({"_id": inv.get("from_user_id")})
        pending_items.append({
            "id": str(inv["_id"]),
            "type": "crew_invite",
            "title": f"INVITO CREW: {crew.get('name', '???') if crew else '???'}",
            "from_username": from_user.get("username", "???") if from_user else "???",
            "crew_name": crew.get("name", "") if crew else "",
            "crew_id": str(inv.get("crew_id", "")),
            "created_at": inv.get("created_at", "").isoformat() if inv.get("created_at") else None,
        })

    # Pushed challenges to user's crews
    user_crews = await db.crews_v2.find({"members": user_id}).to_list(10)
    crew_ids = [c["_id"] for c in user_crews]
    if crew_ids:
        pushed = await db.pushed_challenges.find({
            "crew_id": {"$in": crew_ids},
            "status": "active",
        }).sort("pushed_at", -1).to_list(5)

        for pc in pushed:
            template = await db.templates.find_one({"_id": pc.get("template_id")})
            crew = next((c for c in user_crews if c["_id"] == pc.get("crew_id")), None)
            if template:
                pending_items.append({
                    "id": str(pc["_id"]),
                    "type": "crew_challenge",
                    "title": template.get("name", "CHALLENGE"),
                    "exercise": template.get("exercise", ""),
                    "xp_reward": template.get("xp_reward", 0),
                    "difficulty": template.get("difficulty", "medium"),
                    "crew_name": crew.get("name", "") if crew else "",
                    "pushed_at": pc.get("pushed_at", "").isoformat() if pc.get("pushed_at") else None,
                })

    return {
        "hot": hot_items,
        "hot_count": len(hot_items),
        "pending": pending_items,
        "pending_count": len(pending_items),
    }


# ====================================
# CITY RANKINGS — DYNAMIC KORE_SCORE
# ====================================

def _compute_kore_score(user: dict) -> float:
    """
    KORE_SCORE = (DNA average × 0.85) + XP bonus (max 15 pts)
    Range: 0 → 100. DNA drives 85%, XP drives up to 15%.
    """
    dna = user.get("dna") or {}
    if dna:
        vals = [float(v) for v in dna.values() if v is not None]
        dna_avg = sum(vals) / len(vals) if vals else 0.0
    else:
        dna_avg = 0.0
    xp = float(user.get("xp", 0) or 0)
    xp_bonus = min(15.0, (xp / 10000.0) * 15.0)
    return round(dna_avg * 0.85 + xp_bonus, 1)


@api_router.get("/rankings/city")
async def get_city_ranking(
    city: str = "CHICAGO",
    current_user: dict = Depends(get_current_user),
):
    """
    Real-time city ranking sorted by KORE_SCORE.
    KORE_SCORE = (DNA average × 0.85) + XP bonus (max 15 pts).
    Auto-updates: any DNA change via 5beat-dna or nexus session
    is reflected instantly on the next call.
    """
    city_upper = city.upper().strip()

    # Fetch all users in this city (real + seeded)
    raw = await db.users.find(
        {"city": {"$regex": f"^{city_upper}$", "$options": "i"}}
    ).to_list(500)

    my_id = str(current_user["_id"])

    scored = []
    for u in raw:
        uid = str(u["_id"])
        score = _compute_kore_score(u)
        dna = u.get("dna") or {}
        dna_vals = [float(v) for v in dna.values() if v is not None]
        dna_avg = round(sum(dna_vals) / len(dna_vals), 1) if dna_vals else 0.0

        founder_number = u.get("founder_number")
        kore_number_str = str(founder_number).zfill(5) if founder_number else str(abs(int(str(u["_id"])[-5:], 16)) % 99999).zfill(5)

        # Ghost Mode: replace username with KORE ID in public rankings
        display_name = f"KORE #{kore_number_str}" if u.get("ghost_mode") else u.get("username", "KORE")

        scored.append({
            "user_id": uid,
            "username": display_name,
            "kore_score": score,
            "dna_avg": dna_avg,
            "xp": u.get("xp", 0),
            "level": u.get("level", 1),
            "is_founder": bool(u.get("is_founder") or u.get("is_admin")),
            "is_seed": bool(u.get("is_seed", False)),
            "avatar_color": u.get("avatar_color", "#00F2FF"),
            "sport": u.get("sport", "ATHLETICS"),
            "is_me": uid == my_id,
            "ghost_mode": bool(u.get("ghost_mode", False)),
        })

    # Sort: primary KORE_SCORE desc, secondary XP desc (tie-breaker)
    scored.sort(key=lambda x: (-x["kore_score"], -x["xp"]))

    # Assign medal ranks
    top10 = [{"rank": i + 1, **a} for i, a in enumerate(scored[:10])]

    # Full rank of current user (might be outside top 10)
    my_full_rank = next((i + 1 for i, a in enumerate(scored) if a["is_me"]), None)
    my_score = next((a["kore_score"] for a in scored if a["is_me"]), None)

    return {
        "city": city_upper,
        "total_athletes": len(scored),
        "top10": top10,
        "my_rank": my_full_rank,
        "my_kore_score": my_score,
    }


@api_router.put("/profile/city")
async def update_my_city(body: dict, current_user: dict = Depends(get_current_user)):
    """Update user's city for city ranking participation."""
    city = (body.get("city") or "").upper().strip()
    if not city:
        raise HTTPException(status_code=400, detail="City richiesta")
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"city": city}})
    return {"status": "updated", "city": city}


@api_router.put("/profile/permissions")
async def update_permissions(body: dict, current_user: dict = Depends(get_current_user)):
    """Save camera and mic permission flags to user profile."""
    camera = bool(body.get("camera_enabled", True))
    mic    = bool(body.get("mic_enabled", True))
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"camera_enabled": camera, "mic_enabled": mic}},
    )
    return {"status": "saved", "camera_enabled": camera, "mic_enabled": mic}


# ====================================
# SCAN RESULT — Indestructible Save
# POST /api/scan/result
# Saves NEXUS Bio-Scan outcome: updates DNA, assigns XP, forces city for ranking.
# ====================================
@api_router.post("/scan/result")
async def save_scan_result(body: dict, current_user: dict = Depends(get_current_user)):
    """
    Save NEXUS Bio-Scan result. Called after Gold Flash completes.
    - rescan_mode=True: ACCUMULATIVE scoring (70% old DNA + 30% new scan). DNA improves progressively.
    - rescan_mode=False (default/onboarding): direct DNA mapping from scan metrics.
    - Awards XP: 150 + (kore_score * 0.5) points
    """
    kore_score  = min(100.0, max(0.0, float(body.get("kore_score", 74))))
    stability   = min(100.0, max(0.0, float(body.get("stability", 50))))
    amplitude   = min(100.0, max(0.0, float(body.get("amplitude", 50))))
    city        = (body.get("city") or "CHICAGO").upper().strip()
    latitude    = body.get("latitude")
    longitude   = body.get("longitude")
    city_name   = body.get("city_name") or city
    scan_date   = body.get("scan_date") or datetime.now(timezone.utc).isoformat()
    rescan_mode = bool(body.get("rescan_mode", False))

    def clamp(v: float) -> float:
        return round(min(100, max(0, v)))

    # DNA from raw scan metrics
    scan_dna = {
        "velocita":     clamp(stability * 0.72 + amplitude * 0.25 + random.uniform(-2, 2)),
        "forza":        clamp(amplitude * 0.90 + random.uniform(-2, 2)),
        "resistenza":   clamp(stability * 0.92 + random.uniform(-2, 2)),
        "agilita":      clamp(amplitude * 0.88 + random.uniform(-2, 2)),
        "tecnica":      clamp(kore_score * 0.90 + random.uniform(-2, 2)),
        "potenza":      clamp(amplitude * 0.85 + random.uniform(-2, 2)),
        "mentalita":    clamp(stability * 0.94 + random.uniform(-2, 2)),
        "flessibilita": clamp((stability + amplitude) / 2 * 0.82 + random.uniform(-2, 2)),
    }

    if rescan_mode and current_user.get("dna"):
        # ── ACCUMULATIVE: 70% existing DNA + 30% new scan
        # DNA only improves — can't go below existing value
        existing = current_user["dna"]
        final_dna = {}
        for k, new_v in scan_dna.items():
            old_v = float(existing.get(k) or 0)
            blended = round(old_v * 0.70 + new_v * 0.30)
            final_dna[k] = max(blended, round(old_v))  # DNA never decreases
    else:
        final_dna = scan_dna

    dna_update = {f"dna.{k}": v for k, v in final_dna.items()}

    # XP reward: less for rescan (already earned baseline)
    xp_reward = (100 + round(kore_score * 0.3)) if rescan_mode else (150 + round(kore_score * 0.5))

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {**dna_update, "city": city},
            "$inc": {"xp": xp_reward},
        }
    )

    # Record scan history
    try:
        await db.scan_results.insert_one({
            "user_id":     current_user["_id"],
            "kore_score":  kore_score,
            "stability":   stability,
            "amplitude":   amplitude,
            "city":        city,
            "city_name":   city_name,
            "latitude":    float(latitude) if latitude is not None else None,
            "longitude":   float(longitude) if longitude is not None else None,
            "scan_date":   scan_date,
            "xp_earned":   xp_reward,
            "rescan_mode": rescan_mode,
            "dna_snapshot": final_dna,
            "created_at":  datetime.now(timezone.utc),
        })
    except Exception:
        pass

    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status":      "saved",
        "kore_score":  kore_score,
        "stability":   stability,
        "amplitude":   amplitude,
        "city":       city,
        "xp_earned":  xp_reward,
        "new_xp":     updated_user.get("xp", 0),
        "user":       user_to_response(updated_user),
    }


# ====================================
# NEXUS SCANNER — Served over HTTPS via /api route
# Path: GET /api/nexus/scanner (goes through Kubernetes ingress → port 8001)
# CRITICAL: Must be /api/* to reach FastAPI, NOT /scanner (which routes to Expo port 3000)
# ====================================
@api_router.get("/nexus/scanner", response_class=HTMLResponse, include_in_schema=False)
async def nexus_scanner_page():
    """ARENAKORE Nexus Bio-Scanner — M2 Optimized. Direct getUserMedia + 256x256 OffscreenCanvas input."""
    html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>NEXUS SCANNER</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    /* Canvas fills screen — draws both video AND skeleton */
    #canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
    /* Video is hidden — used only as MediaPipe input source */
    #video  { display: none; }
    #brand  { position: fixed; top: 14px; left: 14px; z-index: 30; pointer-events: none; display: flex; }
    .arena  { color: #FFF; font-family: -apple-system, sans-serif; font-weight: 900; font-size: 16px; letter-spacing: 2px; }
    .kore   { color: #00F2FF; font-family: -apple-system, sans-serif; font-weight: 900; font-size: 16px; letter-spacing: 2px; text-shadow: 0 0 12px rgba(0,242,255,.9); }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <video id="video" autoplay playsinline muted></video>
  <div id="brand"><span class="arena">ARENA</span><span class="kore">KORE</span></div>

  <script src="/api/static/mediapipe/pose.js" crossorigin="anonymous"></script>
  <script>
    var canvas   = document.getElementById('canvas');
    var video    = document.getElementById('video');
    var ctx      = canvas.getContext('2d');

    // Resize canvas to screen
    function resize() {
      canvas.width  = window.innerWidth  || screen.width  || 390;
      canvas.height = window.innerHeight || screen.height || 844;
    }
    window.addEventListener('resize', resize);
    resize();

    // ── Post to React Native
    function post(data) {
      try {
        var msg = JSON.stringify(data);
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else window.parent.postMessage(msg, '*');
      } catch(e) {}
    }

    // ── MP → COCO 17
    var MP_TO_COCO = {0:0,2:1,5:2,7:3,8:4,11:5,12:6,13:7,14:8,15:9,16:10,23:11,24:12,25:13,26:14,27:15,28:16};
    var COCO_CONN  = [[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];

    // ── LPF smoothing
    var prevSmoothed = null;
    var ALPHA = 0.55;
    function lpf(curr, prev) {
      if (!prev || prev.length !== curr.length) return curr;
      return curr.map(function(lm, i) {
        var p = prev[i];
        if (!lm || !p) return lm;
        return { x: ALPHA*lm.x + (1-ALPHA)*p.x, y: ALPHA*lm.y + (1-ALPHA)*p.y, visibility: lm.visibility };
      });
    }

    var personFirstSeen = null;
    var prevBBoxArea = null;  // area consistency check
    var STABLE_MS = 2000;
    var lastTime  = 0;
    var sendPending = false;
    var frameSkip = 0, frameCount = 0;

    function onResults(results) {
      sendPending = false;
      var W = canvas.width, H = canvas.height;

      // ── 1. Draw mirrored video frame onto canvas
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -W, 0, W, H);
      ctx.restore();

      if (!results.poseLandmarks || !results.poseLandmarks.length) {
        personFirstSeen = null;
        prevSmoothed = null;
        // Show waiting text
        ctx.fillStyle = 'rgba(0,242,255,0.5)';
        ctx.font = '900 14px monospace';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '3px'; ctx.fillText('AWAITING ATHLETE', W/2, H/2);
        post({ type:'pose', landmarks:[], person_detected:false, visible_count:0, centered:false, fps:0 });
        return;
      }

      var mp_lm = results.poseLandmarks;
      var smoothed = lpf(mp_lm, prevSmoothed);
      prevSmoothed = smoothed;

      // ── 2. Build COCO17 in screen coords
      var coco17 = new Array(17).fill(null);
      for (var k in MP_TO_COCO) {
        var lm = smoothed[parseInt(k)];
        if (lm && (lm.visibility || 0) > 0.3) {
          // Mirror x (front camera)
          coco17[MP_TO_COCO[k]] = { x: (1 - lm.x) * W, y: lm.y * H, v: lm.visibility };
        }
      }

      // ── 3. Draw gold connections
      ctx.strokeStyle = '#D4AF37'; ctx.lineWidth = 3; ctx.globalAlpha = 0.85;
      ctx.shadowColor = '#D4AF37'; ctx.shadowBlur = 8;
      COCO_CONN.forEach(function(p) {
        var a = coco17[p[0]], b = coco17[p[1]];
        if (a && b) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      });
      ctx.shadowBlur = 0;

      // ── 4. Draw cyan keypoints
      coco17.forEach(function(pt, i) {
        if (!pt) return;
        var r = i < 5 ? 9 : 7;
        ctx.fillStyle = '#00F2FF'; ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r*2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#00F2FF';
      });
      ctx.globalAlpha = 1;

      var vc = coco17.filter(function(p){return p!==null;}).length;

      // ── AREA CONSISTENCY CHECK (Gemini v3): if bounding box jumps > 45%, it's a ghost
      if (vc >= 4) {
        var xs = coco17.filter(function(p){return p!==null;}).map(function(p){return p.x;});
        var ys = coco17.filter(function(p){return p!==null;}).map(function(p){return p.y;});
        var bboxW = Math.max.apply(null,xs) - Math.min.apply(null,xs);
        var bboxH = Math.max.apply(null,ys) - Math.min.apply(null,ys);
        var bboxArea = bboxW * bboxH;
        if (prevBBoxArea !== null && bboxArea > 100) {
          var areaChange = Math.abs(bboxArea - prevBBoxArea) / Math.max(prevBBoxArea, 1);
          if (areaChange > 0.45) {
            // GHOST JUMP: area changed > 45% in one frame — keep previous
            personFirstSeen = null;
            post({ type:'pose', landmarks:[], person_detected:false, visible_count:0, centered:false, fps:0 });
            return;
          }
        }
        if (bboxArea > 100) prevBBoxArea = bboxArea;
      }

      // Soft centrality: if nose too far from center, reset timer but still draw
      var noseX = mp_lm[0] ? mp_lm[0].x : 0.5;
      if (noseX < 0.12 || noseX > 0.88) {
        // Far-edge ghost — discard
        personFirstSeen = null;
        prevSmoothed = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        post({ type:'pose', landmarks:[], person_detected:false, visible_count:0, centered:false, fps:0 });
        return;
      }
      var centered = (noseX >= 0.28 && noseX <= 0.72);
      var now = Date.now();
      if (!personFirstSeen) personFirstSeen = now;
      var stable = (now - personFirstSeen) >= STABLE_MS && vc >= 5;

      var norm = stable ? coco17.map(function(p) {
        return p ? { x:p.x/W, y:p.y/H, v:p.v||1 } : null;
      }) : [];

      post({ type:'pose', landmarks:norm, person_detected:stable, visible_count:vc,
             centered:centered, feet_visible:!!(coco17[15]&&coco17[16]),
             feet_guidance:!!(coco17[13]&&!coco17[15]), fps:30 });
    }

    // ── Init MediaPipe
    var pose = new Pose({ locateFile: function(f){ return '/api/static/mediapipe/' + f; } });
    pose.setOptions({ modelComplexity:0, smoothLandmarks:true, enableSegmentation:false,
                      minDetectionConfidence:0.45, minTrackingConfidence:0.45 });
    pose.onResults(onResults);

    // ── Start camera (direct getUserMedia)
    function startCamera() {
      ctx.fillStyle = 'rgba(0,242,255,0.5)';
      ctx.font = '900 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('MEDIAPIPE LOADING...', canvas.width/2, canvas.height/2);

      navigator.mediaDevices.getUserMedia({ video: { facingMode:'user', width:{ideal:480}, height:{ideal:640} } })
      .then(function(stream) {
        video.srcObject = stream;
        return video.play();
      })
      .then(function() {
        post({ type:'ready' });
        // Inference loop — draws video + skeleton every frame
        var lastFrameReceived = performance.now();
        var watchdog = setInterval(function() {
          if (performance.now() - lastFrameReceived > 3000) {
            clearInterval(watchdog);
            post({ type:'error', message:'camera_hang' });
            if (video.srcObject) video.srcObject.getTracks().forEach(function(t){t.stop();});
            setTimeout(startCamera, 600);
          }
        }, 3000);
        function loop() {
          requestAnimationFrame(loop);
          var now = performance.now();
          if (now - lastTime < 40) return;
          lastTime = now;
          if (sendPending) return;
          frameCount++;
          if (frameSkip > 0 && frameCount % (frameSkip+1) !== 0) return;
          if (video.readyState < 2 || !video.videoWidth) return;
          lastFrameReceived = now;
          sendPending = true;
          pose.send({ image: video }).catch(function(){ sendPending = false; });
        }
        loop();
      })
      .catch(function(err) {
        var denied = /NotAllowed|Permission/i.test(err.name||'');
        post({ type: denied ? 'camera_denied' : 'error', message: err.message });
        ctx.fillStyle = denied ? '#FF3B30' : '#FF9500';
        ctx.font = '700 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(denied ? 'CAMERA DENIED' : 'ERROR: '+(err.name||''), canvas.width/2, canvas.height/2);
      });
    }

    setTimeout(function() { if (typeof Pose === 'undefined') post({ type:'timeout' }); }, 12000);
    window.onerror = function(msg) { post({ type:'error', message:'JS:'+msg }); return true; };

    startCamera();
  </script>
</body>
</html>"""
    return HTMLResponse(content=html, headers={"Cache-Control": "no-cache", "X-Frame-Options": "ALLOWALL"})



@api_router.put("/profile/ghost-mode")
async def toggle_ghost_mode(body: dict, current_user: dict = Depends(get_current_user)):
    """
    GHOST MODE: When enabled, user appears in rankings as 'KORE #XXXXX'
    instead of their real username. Protects identity in public leaderboards.
    """
    enabled = bool(body.get("enabled", False))
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"ghost_mode": enabled}},
    )
    return {"status": "updated", "ghost_mode": enabled}


@api_router.delete("/profile/biometric-data")
async def wipe_biometric_data(current_user: dict = Depends(get_current_user)):
    """
    BIOMETRIC WIPE: Deletes all DNA scan data and biometric signatures.
    Keeps base profile (username, email, XP, level) intact.
    This action is irreversible.
    """
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "dna": {},
            "dna_scans": [],
            "baseline_scanned_at": None,
            "validation_scanned_at": None,
            "camera_enabled": False,
            "mic_enabled": False,
        }},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "wiped",
        "message": "DATI BIOMETRICI ELIMINATI. PROFILO BASE MANTENUTO.",
        "user": user_to_response(updated),
    }


@api_router.post("/gym/hub-request")
async def submit_hub_request(body: dict):
    """
    PUBLIC: No auth required. Submit a KORE Hub partner registration request.
    Used by coaches and gyms to join the KORE HUB NETWORK.
    """
    gym_name = (body.get("gym_name") or "").strip()
    locality  = (body.get("locality") or "").strip().upper()
    email     = (body.get("email") or "").strip().lower()

    if not gym_name or not locality or not email:
        raise HTTPException(status_code=400, detail="Tutti i campi sono obbligatori")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Email non valida")

    await db.hub_requests.insert_one({
        "gym_name": gym_name,
        "locality": locality,
        "email": email,
        "status": "pending",
        "submitted_at": datetime.now(timezone.utc),
    })
    return {
        "status": "received",
        "message": "RICHIESTA INVIATA. IL TUO HUB SARÀ CERTIFICATO ENTRO 24H.",
        "gym_name": gym_name,
        "locality": locality,
    }



# ═══════════════════════════════════════════════
# SOCIAL ENGINE — Duel Search + Live Events
# ═══════════════════════════════════════════════

@api_router.get("/duel/search")
async def duel_search(
    q: str = "",
    city: str = "",
    discipline: str = "",
    status: str = "",
    current_user: dict = Depends(get_current_user),
):
    """Search for Kore opponents for 1vs1 duels."""
    query: dict = {"role": "ATHLETE"}
    # Exclude self
    query["_id"] = {"$ne": current_user["_id"]}
    if q:
        query["username"] = {"$regex": q, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    athletes = await db.users.find(query).limit(20).to_list(20)
    results = []
    for a in athletes:
        results.append({
            "id": str(a["_id"]),
            "username": a.get("username", "Kore"),
            "city": a.get("city", ""),
            "flux": a.get("flux", a.get("ak_credits", 0)),
            "level": 1 + a.get("flux", a.get("ak_credits", 0)) // 200,
            "avatar_color": a.get("avatar_color", "#00E5FF"),
        })
    return {"results": results, "total": len(results)}


@api_router.get("/live-events")
async def list_live_events(current_user: dict = Depends(get_current_user)):
    """List all upcoming/active live events."""
    events = await db.community_events.find(
        {"status": {"$in": ["scheduled", "active"]}}
    ).sort("created_at", -1).limit(30).to_list(30)
    result = []
    for ev in events:
        result.append({
            "id": str(ev["_id"]),
            "title": ev.get("title", "Live Event"),
            "exercise_type": ev.get("exercise_type", "squat"),
            "max_participants": ev.get("max_participants", 8),
            "participants": ev.get("participants", []),
            "scheduled_time": ev.get("scheduled_time", "Tra poco"),
            "creator_id": str(ev.get("creator_id", "")),
            "creator_name": ev.get("creator_name", "Organizzatore"),
            "status": ev.get("status", "scheduled"),
        })
    return {"events": result}


@api_router.post("/live-events/create")
async def create_live_event(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create a new community live event."""
    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(400, "Titolo richiesto")
    from datetime import timedelta
    scheduled_in = int(body.get("scheduled_in_minutes", 30))
    event = {
        "title": title,
        "exercise_type": body.get("exercise_type", "squat"),
        "max_participants": min(int(body.get("max_participants", 8)), 50),
        "participants": [str(current_user["_id"])],
        "creator_id": current_user["_id"],
        "creator_name": current_user.get("username", "Kore"),
        "scheduled_time": (datetime.now(timezone.utc) + timedelta(minutes=scheduled_in)).isoformat(),
        "status": "scheduled",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.community_events.insert_one(event)
    return {"id": str(res.inserted_id), "status": "created"}


@api_router.post("/live-events/{event_id}/join")
async def join_live_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Join an existing live event."""
    from bson import ObjectId
    try:
        oid = ObjectId(event_id)
    except Exception:
        raise HTTPException(400, "ID evento non valido")
    ev = await db.community_events.find_one({"_id": oid})
    if not ev:
        raise HTTPException(404, "Evento non trovato")
    participants = ev.get("participants", [])
    uid = str(current_user["_id"])
    if uid in participants:
        raise HTTPException(400, "Sei già iscritto")
    if len(participants) >= ev.get("max_participants", 8):
        raise HTTPException(400, "Evento al completo")
    await db.community_events.update_one({"_id": oid}, {"$push": {"participants": uid}})
    return {"status": "joined"}


@api_router.post("/coach/receive-bio")
async def receive_bio_signature(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Athlete sends bio-signature to coach via crew."""
    crew_id = body.get("crew_id", "")
    await db.bio_signatures.update_one(
        {"athlete_id": current_user["_id"], "crew_id": crew_id},
        {"$set": {
            "dna": current_user.get("dna", {}),
            "flux": current_user.get("flux", current_user.get("ak_credits", 0)),
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"status": "sent"}


@api_router.post("/health/force-sync")
async def force_health_sync(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Force re-sync HealthKit/Health Connect tokens and refresh data."""
    source = body.get("source", "APPLE_HEALTH")
    result = await db.health_connections.update_one(
        {"user_id": current_user["_id"], "source": source},
        {"$set": {
            "last_force_sync": datetime.now(timezone.utc),
            "token_refreshed_at": datetime.now(timezone.utc),
            "total_syncs": (await db.health_connections.find_one(
                {"user_id": current_user["_id"], "source": source}
            ) or {}).get("total_syncs", 0) + 1,
        }},
        upsert=True,
    )
    return {"status": "synced", "source": source, "timestamp": datetime.now(timezone.utc).isoformat()}


# ═══════════════════════════════════════════════════════════
#  UGC CHALLENGE ENGINE — User-Generated Challenges
# ═══════════════════════════════════════════════════════════

UGC_TEMPLATES = ["AMRAP", "EMOM", "FOR_TIME", "TABATA", "CUSTOM"]
UGC_DESTINATIONS = ["solo", "ranked", "friend", "live", "crew"]
UGC_CERTIFICATIONS = ["nexus_ai", "self", "peer", "device"]
SPORT_DISCIPLINES = ["Fitness", "Bodybuilding", "Golf", "Basket", "Tennis", "Running"]

# ── FLUX PUBLISHING FEES — Anti-spam filter ──
FLUX_PUBLISH_FEES = {
    "solo": 0,       # Free — personal challenges
    "friend": 0,     # Free — direct invite
    "ranked": 10,    # 10 FLUX — public silo publishing
    "live": 15,      # 15 FLUX — live event
    "crew": 15,      # 15 FLUX — crew challenge
}

# ── FLUX PACKAGES — Purchasable via Squad Boost ──
FLUX_PACKAGES = {
    "spark":   {"flux": 30,  "label": "Spark",   "crew_pct": 0.0,  "price_label": "Gratuito"},
    "kinetic": {"flux": 100, "label": "Kinetic", "crew_pct": 0.15, "price_label": "€4.99"},
    "power":   {"flux": 300, "label": "Power",   "crew_pct": 0.20, "price_label": "€11.99"},
    "ultra":   {"flux": 800, "label": "Ultra",   "crew_pct": 0.25, "price_label": "€29.99"},
}

class UGCCreate(BaseModel):
    title: str
    template_type: str  # AMRAP, EMOM, FOR_TIME, TABATA, CUSTOM
    discipline: str     # Fitness, Bodybuilding, Golf, Basket, Tennis, Running
    exercises: list      # [{name, target_reps, target_seconds, rest_seconds}]
    destination: str     # solo, ranked, friend, live
    certification: str   # nexus_ai, self, peer, device
    time_cap_seconds: Optional[int] = 600
    rounds: Optional[int] = None
    invited_user_ids: Optional[list] = []

@api_router.post("/ugc/create")
async def ugc_create_challenge(data: UGCCreate, current_user: dict = Depends(get_current_user)):
    """Create a User-Generated Challenge (UGC) — with FLUX publishing fee."""
    if data.template_type not in UGC_TEMPLATES:
        raise HTTPException(400, f"Template non valido. Usa: {UGC_TEMPLATES}")
    if data.destination not in UGC_DESTINATIONS:
        raise HTTPException(400, f"Destinazione non valida. Usa: {UGC_DESTINATIONS}")
    if data.certification not in UGC_CERTIFICATIONS:
        raise HTTPException(400, f"Certificazione non valida. Usa: {UGC_CERTIFICATIONS}")
    if not data.exercises or len(data.exercises) == 0:
        raise HTTPException(400, "Devi aggiungere almeno 1 esercizio.")

    # ── FLUX PUBLISHING FEE — Anti-spam ──
    fee = FLUX_PUBLISH_FEES.get(data.destination, 0)
    user_flux = current_user.get("xp", 0)  # xp = flux
    if fee > 0 and user_flux < fee:
        raise HTTPException(
            402,
            detail={
                "error": "FLUX_INSUFFICIENT",
                "message": f"Servono {fee} FLUX per pubblicare in '{data.destination}'. Hai {user_flux} FLUX.",
                "required": fee,
                "current": user_flux,
            }
        )

    # Deduct fee
    if fee > 0:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$inc": {"xp": -fee, "flux": -fee}}
        )
        # Record transaction
        await db.flux_transactions.insert_one({
            "user_id": current_user["_id"],
            "type": "publish_fee",
            "amount": -fee,
            "destination": data.destination,
            "description": f"Fee pubblicazione sfida ({data.destination})",
            "created_at": datetime.now(timezone.utc),
        })

    # ── Determine creator role for AI validation strictness ──
    user_role = current_user.get("role", "ATHLETE")
    is_master_template = user_role in ("COACH", "GYM_OWNER", "ADMIN")

    doc = {
        "creator_id": current_user["_id"],
        "creator_name": current_user.get("username", "Kore"),
        "creator_role": user_role,
        "is_master_template": is_master_template,
        "title": data.title.strip()[:60],
        "template_type": data.template_type,
        "discipline": data.discipline if data.discipline in SPORT_DISCIPLINES else "Fitness",
        "exercises": data.exercises[:10],  # max 10
        "destination": data.destination,
        "certification": data.certification,
        "time_cap_seconds": data.time_cap_seconds or 600,
        "rounds": data.rounds,
        "invited_user_ids": [str(uid) for uid in (data.invited_user_ids or [])],
        "status": "active",
        "times_completed": 0,
        "times_shared": 0,
        "flux_reward": (20 + len(data.exercises) * 8) if is_master_template else (15 + len(data.exercises) * 5),
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.ugc_challenges.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["creator_id"] = str(doc["creator_id"])

    # If destination is 'live', auto-create a live event
    if data.destination == "live":
        await db.live_events.insert_one({
            "title": f"🔥 {doc['title']}",
            "host_id": current_user["_id"],
            "host_name": current_user.get("username", "Kore"),
            "ugc_challenge_id": str(result.inserted_id),
            "participants": [str(current_user["_id"])],
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })

    return {"status": "created", "challenge": doc, "flux_fee_charged": fee, "user_flux_remaining": max(0, user_flux - fee)}


@api_router.get("/ugc/mine")
async def ugc_my_challenges(discipline: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all challenges created by the current user, optionally filtered by discipline."""
    query = {"creator_id": current_user["_id"]}
    if discipline and discipline in SPORT_DISCIPLINES:
        query["discipline"] = discipline

    challenges = await db.ugc_challenges.find(query).sort("created_at", -1).to_list(100)

    for c in challenges:
        c["_id"] = str(c["_id"])
        c["creator_id"] = str(c["creator_id"])
    return {"challenges": challenges, "total": len(challenges)}


@api_router.post("/ugc/{challenge_id}/launch")
async def ugc_launch_challenge(challenge_id: str, body: dict = Body({}), current_user: dict = Depends(get_current_user)):
    """Launch a UGC challenge: invite friend, make live, or start solo."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID sfida non valido")

    ch = await db.ugc_challenges.find_one({"_id": oid, "creator_id": current_user["_id"]})
    if not ch:
        raise HTTPException(404, "Sfida non trovata o non sei il creatore")

    action = body.get("action", "start")  # start, invite, go_live

    if action == "invite":
        target_id = body.get("target_user_id")
        if not target_id:
            raise HTTPException(400, "target_user_id richiesto per l'invito")
        await db.ugc_challenges.update_one(
            {"_id": oid},
            {"$addToSet": {"invited_user_ids": target_id}}
        )
        # Create notification
        await db.notifications.insert_one({
            "user_id": target_id,
            "type": "ugc_invite",
            "title": f"⚔️ {current_user.get('username')} ti sfida!",
            "body": f"'{ch['title']}' — Accetti la sfida?",
            "challenge_id": challenge_id,
            "read": False,
            "created_at": datetime.now(timezone.utc),
        })
        return {"status": "invited", "target": target_id}

    elif action == "go_live":
        await db.ugc_challenges.update_one({"_id": oid}, {"$set": {"destination": "live", "status": "live"}})
        await db.live_events.insert_one({
            "title": f"🔥 {ch['title']}",
            "host_id": current_user["_id"],
            "host_name": current_user.get("username", "Kore"),
            "ugc_challenge_id": challenge_id,
            "participants": [str(current_user["_id"])],
            "status": "active",
            "created_at": datetime.now(timezone.utc),
        })
        return {"status": "live", "challenge_id": challenge_id}

    else:  # start
        await db.ugc_challenges.update_one({"_id": oid}, {"$inc": {"times_completed": 1}})
        return {"status": "started", "challenge": {
            "id": challenge_id,
            "title": ch["title"],
            "template_type": ch["template_type"],
            "exercises": ch["exercises"],
            "time_cap_seconds": ch.get("time_cap_seconds", 600),
            "rounds": ch.get("rounds"),
            "certification": ch.get("certification", "self"),
        }}


@api_router.delete("/ugc/{challenge_id}")
async def ugc_delete_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a UGC challenge."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID sfida non valido")
    result = await db.ugc_challenges.delete_one({"_id": oid, "creator_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Sfida non trovata o non sei il creatore")
    return {"status": "deleted"}


@api_router.get("/ugc/{challenge_id}/public")
async def ugc_public_detail(challenge_id: str):
    """Public endpoint: get challenge details for QR scan preview. No auth required."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID sfida non valido")
    ch = await db.ugc_challenges.find_one({"_id": oid})
    if not ch:
        raise HTTPException(404, "Sfida non trovata")
    creator = await db.users.find_one({"_id": ch["creator_id"]})
    return {
        "id": str(ch["_id"]),
        "title": ch.get("title", ""),
        "template_type": ch.get("template_type", "CUSTOM"),
        "discipline": ch.get("discipline", "Fitness"),
        "exercises": ch.get("exercises", []),
        "time_cap_seconds": ch.get("time_cap_seconds", 600),
        "rounds": ch.get("rounds"),
        "destination": ch.get("destination", "solo"),
        "certification": ch.get("certification", "self"),
        "flux_reward": ch.get("flux_reward", 0),
        "times_completed": ch.get("times_completed", 0),
        "times_shared": ch.get("times_shared", 0),
        "creator_name": creator.get("username", "Kore") if creator else ch.get("creator_name", "Kore"),
        "creator_level": creator.get("level", 1) if creator else 1,
    }


@api_router.post("/ugc/{challenge_id}/import")
async def ugc_import_challenge(challenge_id: str, current_user: dict = Depends(get_current_user)):
    """Import/clone another user's challenge into the current user's collection."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID sfida non valido")
    original = await db.ugc_challenges.find_one({"_id": oid})
    if not original:
        raise HTTPException(404, "Sfida originale non trovata")
    # Check if already imported
    existing = await db.ugc_challenges.find_one({
        "creator_id": current_user["_id"],
        "imported_from": challenge_id,
    })
    if existing:
        return {"status": "already_imported", "challenge_id": str(existing["_id"])}
    # Clone
    clone = {
        "creator_id": current_user["_id"],
        "creator_name": current_user.get("username", "Kore"),
        "title": original["title"],
        "template_type": original.get("template_type", "CUSTOM"),
        "discipline": original.get("discipline", "Fitness"),
        "exercises": original.get("exercises", []),
        "time_cap_seconds": original.get("time_cap_seconds", 600),
        "rounds": original.get("rounds"),
        "destination": "solo",
        "certification": original.get("certification", "self"),
        "status": "active",
        "times_completed": 0,
        "times_shared": 0,
        "flux_reward": original.get("flux_reward", 15),
        "imported_from": challenge_id,
        "original_creator": original.get("creator_name", "Kore"),
        "invited_user_ids": [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.ugc_challenges.insert_one(clone)
    # Increment share count on original
    await db.ugc_challenges.update_one({"_id": oid}, {"$inc": {"times_shared": 1}})
    clone["_id"] = str(result.inserted_id)
    clone["creator_id"] = str(clone["creator_id"])
    return {"status": "imported", "challenge": clone}



# ═══════════════════════════════════════════════════════════
#  UGC CHALLENGE COMPLETION & NÈXUS VALIDATION
# ═══════════════════════════════════════════════════════════

class UGCCompleteBody(BaseModel):
    exercises_completed: list = []  # [{name, reps_done, quality, seconds}]
    total_reps: int = 0
    avg_quality: float = 0
    duration_seconds: int = 0
    motion_tracked: bool = False

@api_router.post("/ugc/{challenge_id}/complete")
async def ugc_complete_challenge(challenge_id: str, body: UGCCompleteBody, current_user: dict = Depends(get_current_user)):
    """Complete a UGC challenge — validate and award FLUX based on tracking quality and creator role strictness."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID sfida non valido")

    ch = await db.ugc_challenges.find_one({"_id": oid})
    if not ch:
        raise HTTPException(404, "Sfida non trovata")

    exercises = ch.get("exercises", [])
    base_flux = ch.get("flux_reward", 15)
    creator_role = ch.get("creator_role", "ATHLETE")
    is_master_template = ch.get("is_master_template", False)

    # ── VALIDATION ENGINE — ROLE-BASED STRICTNESS ──
    total_target_reps = sum(e.get("target_reps", 0) for e in exercises)
    total_done_reps = body.total_reps
    completion_ratio = min(1.0, total_done_reps / max(total_target_reps, 1))
    quality_factor = body.avg_quality / 100.0 if body.avg_quality > 0 else 0.5

    if is_master_template:
        # ── COACH (MASTER TEMPLATE): STRICT — 100% completion + quality >= 80 ──
        is_verified = (
            body.motion_tracked
            and completion_ratio >= 1.0
            and body.avg_quality >= 80
        )
        validation_mode = "STRICT"
        # Strict: verified gets premium reward, unverified gets minimal
        if is_verified:
            flux_earned = base_flux + int(base_flux * quality_factor * 0.8)
            validation_status = "COACH_VERIFIED"
        else:
            flux_earned = max(1, int(base_flux * completion_ratio * 0.25))
            validation_status = "COACH_FAILED"
    else:
        # ── ATHLETE (UGC): PERMISSIVE — 80% completion + quality >= 50 ──
        is_verified = (
            body.motion_tracked
            and completion_ratio >= 0.80
            and body.avg_quality >= 50
        )
        validation_mode = "PERMISSIVE"
        if is_verified:
            flux_earned = base_flux + int(base_flux * quality_factor * 0.5)
            validation_status = "VERIFIED"
        else:
            flux_earned = max(1, int(base_flux * completion_ratio * 0.4))
            validation_status = "UNVERIFIED"

    # Award FLUX to user
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"flux": flux_earned, "xp": flux_earned, "total_scans": 1}}
    )

    # Increment challenge completion count
    await db.ugc_challenges.update_one({"_id": oid}, {"$inc": {"times_completed": 1}})

    # Record the completion
    completion_doc = {
        "user_id": current_user["_id"],
        "challenge_id": challenge_id,
        "exercises_completed": body.exercises_completed,
        "total_reps": body.total_reps,
        "avg_quality": body.avg_quality,
        "duration_seconds": body.duration_seconds,
        "motion_tracked": body.motion_tracked,
        "is_verified": is_verified,
        "flux_earned": flux_earned,
        "completion_ratio": completion_ratio,
        "validation_mode": validation_mode,
        "creator_role": creator_role,
        "is_master_template": is_master_template,
        "discipline": ch.get("discipline", "Fitness"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.ugc_completions.insert_one(completion_doc)

    # ── PERFORMANCE RECORD: Persist full metadata for KORE tab ──
    ugc_discipline = ch.get("discipline", "Fitness")
    await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo="SFIDA_UGC",
        modalita="INDIVIDUALE",
        disciplina=ugc_discipline,
        exercise_type=exercises[0].get("name", "esercizio") if exercises else "esercizio",
        kpi={
            "primary_result": {"type": "REPS", "value": body.total_reps, "unit": "rep"},
            "quality_score": body.avg_quality,
        },
        is_certified=is_master_template,
        template_name=ch.get("title"),
        validation_status=validation_status,
        flux_earned=flux_earned,
        source_id=challenge_id,
        source_collection="ugc_challenges",
        extra_meta={
            "completion_ratio": round(completion_ratio, 2),
            "creator_role": creator_role,
            "duration_seconds": body.duration_seconds,
            "motion_tracked": body.motion_tracked,
        },
    )

    # ── DISCIPLINE SILO RANKING ──
    discipline = ch.get("discipline", "Fitness")

    # Get discipline ranking via aggregation on completions
    pipeline = [
        {"$match": {"discipline": discipline, "is_verified": True}},
        {"$group": {"_id": "$user_id", "total_flux": {"$sum": "$flux_earned"}}},
        {"$sort": {"total_flux": -1}},
    ]
    rankings = []
    async for r in db.ugc_completions.aggregate(pipeline):
        rankings.append(r)
    user_rank = 0
    total_in_silo = len(rankings)
    for idx, r in enumerate(rankings):
        if str(r["_id"]) == str(current_user["_id"]):
            user_rank = idx + 1
            break
    if user_rank == 0:
        user_rank = total_in_silo + 1
        total_in_silo += 1

    # Refresh user
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    user_response = user_to_response(updated_user) if updated_user else None

    return {
        "status": validation_status,
        "is_verified": is_verified,
        "flux_earned": flux_earned,
        "completion_ratio": round(completion_ratio, 2),
        "avg_quality": round(body.avg_quality, 1),
        "total_reps": body.total_reps,
        "duration_seconds": body.duration_seconds,
        "validation_mode": validation_mode,
        "creator_role": creator_role,
        "is_master_template": is_master_template,
        "discipline": discipline,
        "discipline_rank": user_rank,
        "discipline_total": total_in_silo,
        "user": user_response,
    }


# ═══════════════════════════════════════════════════════════
#  FLUX ECONOMY — Shop, Crew Boost, Publishing Fees
# ═══════════════════════════════════════════════════════════

FLUX_TIERS = {
    "SPARK":      {"flux": 1000,  "crew_pct": 0,    "label": "SPARK",      "price_tag": "Base"},
    "KINETIC":    {"flux": 3000,  "crew_pct": 5,    "label": "KINETIC",    "price_tag": "+5% Crew Bonus"},
    "CORE":       {"flux": 7500,  "crew_pct": 10,   "label": "CORE",       "price_tag": "+10% Crew Bonus"},
    "DOMINATION": {"flux": 20000, "crew_pct": 15,   "label": "DOMINATION", "price_tag": "+Sponsor Slot"},
}

PUBLISH_FEES = {
    "solo": 0,
    "ranked": 50,
    "friend": 25,
    "live": 100,
}

@api_router.get("/flux/tiers")
async def flux_get_tiers():
    """Return all FLUX purchase tiers."""
    return {"tiers": FLUX_TIERS, "publish_fees": PUBLISH_FEES}


@api_router.post("/flux/purchase")
async def flux_purchase(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Purchase a FLUX tier. Crew members get a squad boost."""
    tier_key = body.get("tier", "").upper()
    if tier_key not in FLUX_TIERS:
        raise HTTPException(400, f"Tier non valido. Scegli: {list(FLUX_TIERS.keys())}")

    tier = FLUX_TIERS[tier_key]
    flux_amount = tier["flux"]
    crew_pct = tier["crew_pct"]
    user_id = current_user["_id"]
    username = current_user.get("username", "Kore")

    # Credit FLUX to user
    await db.users.update_one({"_id": user_id}, {"$inc": {"flux": flux_amount}})

    # Record transaction
    await db.flux_transactions.insert_one({
        "user_id": user_id,
        "type": "purchase",
        "tier": tier_key,
        "amount": flux_amount,
        "created_at": datetime.now(timezone.utc),
    })

    # Squad Boost: credit crew members
    crew_bonus_total = 0
    if crew_pct > 0:
        crew_bonus = int(flux_amount * crew_pct / 100)
        # Find user's gym/crew mates
        user_doc = await db.users.find_one({"_id": user_id})
        gym_id = user_doc.get("gym_id")
        if gym_id:
            crew_members = await db.users.find(
                {"gym_id": gym_id, "_id": {"$ne": user_id}}
            ).to_list(100)
            if crew_members:
                per_member = max(1, crew_bonus // len(crew_members))
                member_ids = [m["_id"] for m in crew_members]
                await db.users.update_many(
                    {"_id": {"$in": member_ids}},
                    {"$inc": {"flux": per_member}}
                )
                crew_bonus_total = per_member * len(crew_members)
                # Notify crew
                for m in crew_members:
                    await db.notifications.insert_one({
                        "user_id": str(m["_id"]),
                        "type": "squad_boost",
                        "title": f"⚡ SQUAD BOOST!",
                        "body": f"{username} ha iniettato energia per la Crew! +{per_member} FLUX",
                        "read": False,
                        "created_at": datetime.now(timezone.utc),
                    })

    updated = await db.users.find_one({"_id": user_id})
    return {
        "status": "purchased",
        "tier": tier_key,
        "flux_added": flux_amount,
        "new_balance": updated.get("flux", 0),
        "crew_bonus_total": crew_bonus_total,
        "crew_pct": crew_pct,
    }


@api_router.post("/flux/check-fee")
async def flux_check_fee(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Check if user has enough FLUX for a publishing action."""
    destination = body.get("destination", "solo")
    fee = PUBLISH_FEES.get(destination, 0)
    user_flux = current_user.get("flux", 0)
    return {
        "destination": destination,
        "fee": fee,
        "user_flux": user_flux,
        "can_afford": user_flux >= fee,
    }


@api_router.post("/flux/deduct")
async def flux_deduct(body: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Deduct FLUX for publishing fees."""
    amount = body.get("amount", 0)
    reason = body.get("reason", "publish")
    if amount <= 0:
        return {"status": "ok", "deducted": 0}
    user_flux = current_user.get("flux", 0)
    if user_flux < amount:
        raise HTTPException(402, f"FLUX insufficienti. Hai {user_flux}, servono {amount}.")
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"flux": -amount}}
    )
    await db.flux_transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "deduct",
        "reason": reason,
        "amount": -amount,
        "created_at": datetime.now(timezone.utc),
    })
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {"status": "deducted", "amount": amount, "new_balance": updated.get("flux", 0)}


# Register all routes (must be AFTER all @api_router decorators)

# ═══════════════════════════════════════════════════════════
#  GOVERNANCE & REQUEST ROUTING SYSTEM
# ═══════════════════════════════════════════════════════════

class TemplateRequestBody(BaseModel):
    discipline: str
    description: str

class CategoryProposalBody(BaseModel):
    category_name: str
    motivation: str = ""

# ── Template Request (Athlete → Category Coaches) ──
@api_router.post("/requests/template")
async def create_template_request(body: TemplateRequestBody, current_user: dict = Depends(get_current_user)):
    """Athlete requests a template from coaches in a specific discipline."""
    doc = {
        "type": "template",
        "discipline": body.discipline,
        "description": body.description,
        "user_id": str(current_user["_id"]),
        "username": current_user.get("username", ""),
        "status": "open",  # open, in_progress, fulfilled, closed
        "votes": [],
        "vote_count": 0,
        "responses": [],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.requests.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"ok": True, "request": doc}

# ── Category Proposal (User/Coach → Admin) ──
@api_router.post("/requests/category")
async def create_category_proposal(body: CategoryProposalBody, current_user: dict = Depends(get_current_user)):
    """Propose a new discipline/category — routed to Admin Panopticon."""
    existing = await db.requests.find_one({
        "type": "category",
        "category_name": {"$regex": f"^{body.category_name}$", "$options": "i"},
        "status": {"$ne": "closed"},
    })
    if existing:
        raise HTTPException(409, f"La disciplina '{body.category_name}' è già stata proposta. Usa il voto +1!")

    doc = {
        "type": "category",
        "category_name": body.category_name,
        "motivation": body.motivation,
        "user_id": str(current_user["_id"]),
        "username": current_user.get("username", ""),
        "status": "pending",  # pending, approved, rejected
        "votes": [str(current_user["_id"])],  # auto-vote by proposer
        "vote_count": 1,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.requests.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"ok": True, "request": doc}

# ── List Template Requests (by discipline, sorted by votes) ──
@api_router.get("/requests/template")
async def list_template_requests(discipline: str = None, current_user: dict = Depends(get_current_user)):
    query: dict = {"type": "template", "status": {"$ne": "closed"}}
    if discipline:
        query["discipline"] = discipline
    cursor = db.requests.find(query).sort("vote_count", -1).limit(50)
    results = []
    uid = str(current_user["_id"])
    async for r in cursor:
        r["_id"] = str(r["_id"])
        r["user_voted"] = uid in r.get("votes", [])
        results.append(r)
    return results

# ── List Category Proposals (sorted by votes) ──
@api_router.get("/requests/category")
async def list_category_proposals(current_user: dict = Depends(get_current_user)):
    cursor = db.requests.find({"type": "category", "status": {"$ne": "closed"}}).sort("vote_count", -1).limit(50)
    results = []
    uid = str(current_user["_id"])
    async for r in cursor:
        r["_id"] = str(r["_id"])
        r["user_voted"] = uid in r.get("votes", [])
        results.append(r)
    return results

# ── Upvote Toggle ──
@api_router.post("/requests/{request_id}/upvote")
async def toggle_upvote(request_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(request_id)
    except Exception:
        raise HTTPException(400, "ID non valido")
    req = await db.requests.find_one({"_id": oid})
    if not req:
        raise HTTPException(404, "Richiesta non trovata")

    uid = str(current_user["_id"])
    votes = req.get("votes", [])
    if uid in votes:
        votes.remove(uid)
        action = "removed"
    else:
        votes.append(uid)
        action = "added"

    await db.requests.update_one({"_id": oid}, {"$set": {"votes": votes, "vote_count": len(votes)}})
    return {"ok": True, "action": action, "vote_count": len(votes)}

# ── Coach Market Opportunities (requests for coach's disciplines) ──
@api_router.get("/coach/market-opportunities")
async def coach_market_opportunities(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "")
    if role not in ("COACH", "GYM_OWNER", "ADMIN"):
        raise HTTPException(403, "Solo i Coach possono visualizzare le opportunità")
    coach_disciplines = current_user.get("disciplines", [])
    query: dict = {"type": "template", "status": "open"}
    if coach_disciplines and role == "COACH":
        query["discipline"] = {"$in": coach_disciplines}
    cursor = db.requests.find(query).sort("vote_count", -1).limit(30)
    results = []
    async for r in cursor:
        r["_id"] = str(r["_id"])
        results.append(r)
    return results

# ── Admin: All Governance Requests (Panopticon) ──
@api_router.get("/admin/governance")
async def admin_governance(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role", "")
    is_admin = current_user.get("is_admin") or current_user.get("is_founder")
    if role != "ADMIN" and not is_admin:
        raise HTTPException(403, "Solo Admin")
    template_reqs = []
    async for r in db.requests.find({"type": "template"}).sort("vote_count", -1).limit(50):
        r["_id"] = str(r["_id"])
        template_reqs.append(r)
    category_reqs = []
    async for r in db.requests.find({"type": "category"}).sort("vote_count", -1).limit(50):
        r["_id"] = str(r["_id"])
        category_reqs.append(r)
    return {
        "template_requests": template_reqs,
        "category_proposals": category_reqs,
        "total_template": len(template_reqs),
        "total_category": len(category_reqs),
    }


app.include_router(api_router)


# ═════════════════════════════════════════════════════════════════════
# FLUX ECONOMY — PACKAGES, SQUAD BOOST & PUBLISHING FEES
# ═════════════════════════════════════════════════════════════════════

class FluxPurchaseBody(BaseModel):
    package_id: str  # spark, kinetic, power, ultra

@api_router.get("/flux/packages")
async def get_flux_packages(current_user: dict = Depends(get_current_user)):
    """Return available FLUX packages with crew boost info."""
    user_flux = current_user.get("xp", 0)
    # Check if user is in a crew
    crew = await db.crews_v2.find_one({"members": current_user["_id"]})
    has_crew = crew is not None
    crew_name = crew["name"] if crew else None
    crew_size = len(crew.get("members", [])) - 1 if crew else 0  # minus self

    packages = []
    for pid, pkg in FLUX_PACKAGES.items():
        crew_bonus = int(pkg["flux"] * pkg["crew_pct"]) if has_crew and pkg["crew_pct"] > 0 else 0
        packages.append({
            "id": pid,
            "label": pkg["label"],
            "flux": pkg["flux"],
            "price_label": pkg["price_label"],
            "crew_boost_pct": int(pkg["crew_pct"] * 100),
            "crew_bonus_per_member": crew_bonus,
            "crew_members_count": crew_size,
            "total_crew_bonus": crew_bonus * crew_size,
            "has_crew_boost": pkg["crew_pct"] > 0,
        })

    return {
        "packages": packages,
        "user_flux": user_flux,
        "has_crew": has_crew,
        "crew_name": crew_name,
        "publish_fees": FLUX_PUBLISH_FEES,
    }


@api_router.post("/flux/purchase")
async def purchase_flux_package(body: FluxPurchaseBody, current_user: dict = Depends(get_current_user)):
    """Purchase a FLUX package. Kinetic+ distributes bonus to Crew members."""
    pkg = FLUX_PACKAGES.get(body.package_id)
    if not pkg:
        raise HTTPException(400, f"Pacchetto non valido. Opzioni: {list(FLUX_PACKAGES.keys())}")

    now = datetime.now(timezone.utc)
    flux_amount = pkg["flux"]
    crew_pct = pkg["crew_pct"]

    # Add FLUX to user
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {"xp": flux_amount, "flux": flux_amount}}
    )

    # Record transaction
    await db.flux_transactions.insert_one({
        "user_id": current_user["_id"],
        "type": "purchase",
        "package_id": body.package_id,
        "amount": flux_amount,
        "description": f"Acquisto pacchetto {pkg['label']}",
        "created_at": now,
    })

    # ── SQUAD BOOST: Distribute to Crew members ──
    crew_members_boosted = 0
    crew_bonus_per_member = 0
    crew_name = None

    if crew_pct > 0:
        crew = await db.crews_v2.find_one({"members": current_user["_id"]})
        if crew:
            crew_name = crew["name"]
            crew_bonus_per_member = int(flux_amount * crew_pct)
            members = crew.get("members", [])
            username = current_user.get("username", "Kore")

            for mid in members:
                if mid != current_user["_id"]:
                    # Add bonus FLUX to each crew member
                    await db.users.update_one(
                        {"_id": mid},
                        {"$inc": {"xp": crew_bonus_per_member, "flux": crew_bonus_per_member}}
                    )
                    crew_members_boosted += 1

                    # Record transaction for each member
                    await db.flux_transactions.insert_one({
                        "user_id": mid,
                        "type": "squad_boost",
                        "from_user": str(current_user["_id"]),
                        "from_username": username,
                        "amount": crew_bonus_per_member,
                        "description": f"Squad Boost da {username} ({pkg['label']})",
                        "created_at": now,
                    })

                    # Push notification to crew member
                    await db.notifications.insert_one({
                        "user_id": mid,
                        "type": "squad_boost",
                        "title": "⚡ SQUAD BOOST!",
                        "message": f"{username} ha iniettato energia! +{crew_bonus_per_member} FLUX bonus per te.",
                        "icon": "flash",
                        "color": "#FFD700",
                        "read": False,
                        "created_at": now,
                    })

            # Feed entry for crew
            await db.crew_feed.insert_one({
                "crew_id": crew["_id"],
                "type": "squad_boost",
                "username": username,
                "message": f"⚡ {username} ha attivato Squad Boost ({pkg['label']})! +{crew_bonus_per_member} FLUX a tutti.",
                "created_at": now,
            })

    # Refresh user
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    user_resp = user_to_response(updated_user) if updated_user else None

    return {
        "status": "purchased",
        "package": pkg["label"],
        "flux_added": flux_amount,
        "crew_boost": {
            "active": crew_pct > 0 and crew_members_boosted > 0,
            "crew_name": crew_name,
            "bonus_per_member": crew_bonus_per_member,
            "members_boosted": crew_members_boosted,
            "total_distributed": crew_bonus_per_member * crew_members_boosted,
        },
        "user": user_resp,
    }


@api_router.get("/flux/history")
async def get_flux_history(current_user: dict = Depends(get_current_user)):
    """Get user's FLUX transaction history."""
    txns = await db.flux_transactions.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).limit(50).to_list(50)

    return [{
        "id": str(t["_id"]),
        "type": t.get("type"),
        "amount": t.get("amount", 0),
        "description": t.get("description", ""),
        "from_username": t.get("from_username"),
        "created_at": t.get("created_at", "").isoformat() if t.get("created_at") else None,
    } for t in txns]


# ═════════════════════════════════════════════════════════════════════
# CREW SYNC ENGINE — REAL-TIME BATTLE PROGRESS (ENHANCED)
# ═════════════════════════════════════════════════════════════════════

@api_router.get("/battles/crew/{battle_id}/live-state")
async def get_crew_battle_live_state(battle_id: str, current_user: dict = Depends(get_current_user)):
    """Real-time battle state with per-member contributions and weighted averages."""
    try:
        battle = await db.crew_battles.find_one({"_id": ObjectId(battle_id)})
    except Exception:
        raise HTTPException(404, "Battle non trovata")
    if not battle:
        raise HTTPException(404, "Battle non trovata")

    # Get all contributions for this battle
    contribs_a = await db.battle_feed.find(
        {"battle_id": battle_id, "crew_side": "A"}
    ).sort("created_at", -1).to_list(200)
    contribs_b = await db.battle_feed.find(
        {"battle_id": battle_id, "crew_side": "B"}
    ).sort("created_at", -1).to_list(200)

    def build_member_stats(contribs):
        members = {}
        for c in contribs:
            uid = c.get("user_id")
            if uid not in members:
                members[uid] = {
                    "user_id": uid,
                    "username": c.get("username", "Kore"),
                    "total_pts": 0,
                    "scans": 0,
                    "avg_quality": 0,
                    "total_reps": 0,
                    "last_scan": None,
                }
            members[uid]["total_pts"] += c.get("contribution_pts", 0)
            members[uid]["scans"] += 1
            members[uid]["total_reps"] += c.get("reps", 0)
            members[uid]["avg_quality"] = (
                (members[uid]["avg_quality"] * (members[uid]["scans"] - 1) + c.get("quality_score", 50))
                / members[uid]["scans"]
            )
            ts = c.get("created_at")
            if ts and (members[uid]["last_scan"] is None or ts > members[uid]["last_scan"]):
                members[uid]["last_scan"] = ts
        result = list(members.values())
        for m in result:
            m["total_pts"] = round(m["total_pts"], 2)
            m["avg_quality"] = round(m["avg_quality"], 1)
            if m["last_scan"]:
                m["last_scan"] = m["last_scan"].isoformat()
        result.sort(key=lambda x: x["total_pts"], reverse=True)
        return result

    members_a = build_member_stats(contribs_a)
    members_b = build_member_stats(contribs_b)

    crew_a_score = battle.get("crew_a_kore_score", 50) + battle.get("crew_a_contribution", 0)
    crew_b_score = battle.get("crew_b_kore_score", 50) + battle.get("crew_b_contribution", 0)
    total = max(crew_a_score + crew_b_score, 1)

    # Time remaining
    ends_at = battle.get("ends_at")
    now = datetime.utcnow()
    remaining_seconds = max(0, int((ends_at - now).total_seconds())) if ends_at else 0

    # Recent feed (last 10 contributions across both crews)
    all_contribs = sorted(contribs_a + contribs_b, key=lambda c: c.get("created_at", datetime.min), reverse=True)[:10]
    feed = [{
        "username": c.get("username"),
        "crew_side": c.get("crew_side"),
        "pts": round(c.get("contribution_pts", 0), 2),
        "quality": c.get("quality_score", 0),
        "reps": c.get("reps", 0),
        "time": c.get("created_at", "").isoformat() if c.get("created_at") else None,
    } for c in all_contribs]

    return {
        "battle_id": battle_id,
        "status": battle.get("status"),
        "crew_a": {
            "id": str(battle["crew_a_id"]),
            "name": battle["crew_a_name"],
            "base_score": round(battle.get("crew_a_kore_score", 50), 1),
            "contribution": round(battle.get("crew_a_contribution", 0), 2),
            "total_score": round(crew_a_score, 1),
            "pct": round(crew_a_score / total * 100, 1),
            "active_members": len(members_a),
            "members": members_a,
        },
        "crew_b": {
            "id": str(battle["crew_b_id"]),
            "name": battle["crew_b_name"],
            "base_score": round(battle.get("crew_b_kore_score", 50), 1),
            "contribution": round(battle.get("crew_b_contribution", 0), 2),
            "total_score": round(crew_b_score, 1),
            "pct": round(crew_b_score / total * 100, 1),
            "active_members": len(members_b),
            "members": members_b,
        },
        "remaining_seconds": remaining_seconds,
        "ends_at": ends_at.isoformat() if ends_at else None,
        "live_feed": feed,
    }


# Also add crew challenge FLUX fee to /battles/crew/challenge
# (Already exists but need to add FLUX deduction)


# ═══════════════════════════════════════════════════════════
#  PERFORMANCE RECORDS — Unified Data Persistence for KORE Tab
# ═══════════════════════════════════════════════════════════

PERFORMANCE_TIPOS = {
    "ALLENAMENTO",      # Standard nexus scan / session
    "SFIDA_UGC",        # UGC Challenge
    "LIVE_ARENA",       # Live Arena matchup
    "COACH_PROGRAM",    # Coach Template / Training Session
    "CREW_BATTLE",      # Crew Battle contribution
    "DUELLO",           # PvP Duel
}

PERFORMANCE_MODALITA = {"INDIVIDUALE", "CREW"}


async def save_performance_record(
    user_id,
    username: str,
    tipo: str,
    modalita: str = "INDIVIDUALE",
    crew_id: str = None,
    disciplina: str = "Fitness",
    exercise_type: str = "squat",
    snapshots: dict = None,
    kpi: dict = None,
    is_certified: bool = False,
    template_name: str = None,
    coach_id: str = None,
    validation_status: str = "UNVERIFIED",
    flux_earned: int = 0,
    source_id: str = None,
    source_collection: str = None,
    completed_at: datetime = None,
    extra_meta: dict = None,
):
    """
    Central helper — persists a full performance record to the
    `performance_records` collection. Called from every completion endpoint.
    """
    now = completed_at or datetime.now(timezone.utc)

    # Normalize KPI block
    kpi_block = kpi or {}
    record = {
        "user_id": user_id if isinstance(user_id, ObjectId) else ObjectId(user_id),
        "username": username,
        "tipo": tipo if tipo in PERFORMANCE_TIPOS else "ALLENAMENTO",
        "modalita": modalita if modalita in PERFORMANCE_MODALITA else "INDIVIDUALE",
        "crew_id": crew_id,
        "disciplina": disciplina,
        "exercise_type": exercise_type,
        "snapshots": {
            "start": (snapshots or {}).get("start"),
            "peak": (snapshots or {}).get("peak"),
            "finish": (snapshots or {}).get("finish"),
        },
        "kpi": {
            "primary_result": kpi_block.get("primary_result", {"type": "REPS", "value": 0, "unit": "rep"}),
            "rom_pct": kpi_block.get("rom_pct"),
            "explosivity_pct": kpi_block.get("explosivity_pct"),
            "power_output": kpi_block.get("power_output"),
            "heart_rate_avg": kpi_block.get("heart_rate_avg"),
            "heart_rate_peak": kpi_block.get("heart_rate_peak"),
            "quality_score": kpi_block.get("quality_score", 0),
        },
        "is_certified": is_certified,
        "template_name": template_name,
        "coach_id": coach_id,
        "validation_status": validation_status,
        "flux_earned": flux_earned,
        "source_id": source_id,
        "source_collection": source_collection,
        "completed_at": now,
        "created_at": datetime.now(timezone.utc),
    }
    if extra_meta:
        record["meta"] = extra_meta
    # Geo-data (KORE ATLAS)
    if extra_meta and extra_meta.get("latitude") is not None:
        record["latitude"] = float(extra_meta["latitude"])
        record["longitude"] = float(extra_meta.get("longitude", 0))
        record["city_name"] = extra_meta.get("city_name", "")

    result = await db.performance_records.insert_one(record)
    return str(result.inserted_id)


class PerformanceRecordBody(BaseModel):
    """Frontend-initiated full performance record save"""
    tipo: str = "ALLENAMENTO"
    modalita: str = "INDIVIDUALE"
    crew_id: Optional[str] = None
    disciplina: str = "Fitness"
    exercise_type: str = "squat"
    snapshots: Optional[dict] = None           # {start, peak, finish}
    kpi: Optional[dict] = None                 # {primary_result, rom_pct, explosivity_pct, ...}
    is_certified: bool = False
    template_name: Optional[str] = None
    coach_id: Optional[str] = None
    validation_status: str = "UNVERIFIED"
    flux_earned: int = 0
    source_id: Optional[str] = None            # original challenge/session ID
    source_collection: Optional[str] = None    # "challenges_engine" | "nexus_sessions" | etc.
    duration_seconds: Optional[int] = None
    extra_meta: Optional[dict] = None


@api_router.post("/performance/record")
async def create_performance_record(body: PerformanceRecordBody, current_user: dict = Depends(get_current_user)):
    """
    Frontend calls this AFTER a challenge is completed, enriching
    the record with snapshots and client-side KPI data.
    """
    record_id = await save_performance_record(
        user_id=current_user["_id"],
        username=current_user.get("username", "Kore"),
        tipo=body.tipo,
        modalita=body.modalita,
        crew_id=body.crew_id,
        disciplina=body.disciplina,
        exercise_type=body.exercise_type,
        snapshots=body.snapshots,
        kpi=body.kpi,
        is_certified=body.is_certified,
        template_name=body.template_name,
        coach_id=body.coach_id,
        validation_status=body.validation_status,
        flux_earned=body.flux_earned,
        source_id=body.source_id,
        source_collection=body.source_collection,
        extra_meta={
            **(body.extra_meta or {}),
            "duration_seconds": body.duration_seconds,
        },
    )
    return {"status": "saved", "record_id": record_id}


@api_router.get("/kore/history")
async def get_kore_history(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    tipo: Optional[str] = Query(None),
    disciplina: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the full performance timeline for the KORE tab.
    Supports optional filters by tipo and disciplina.
    """
    user_id = current_user["_id"]
    match_filter: dict = {"user_id": user_id}
    if tipo and tipo in PERFORMANCE_TIPOS:
        match_filter["tipo"] = tipo
    if disciplina:
        match_filter["disciplina"] = disciplina

    cursor = db.performance_records.find(match_filter).sort("completed_at", -1).skip(offset).limit(limit)
    records = await cursor.to_list(limit)

    total = await db.performance_records.count_documents(match_filter)

    items = []
    for r in records:
        items.append({
            "id": str(r["_id"]),
            "tipo": r.get("tipo", "ALLENAMENTO"),
            "modalita": r.get("modalita", "INDIVIDUALE"),
            "crew_id": r.get("crew_id"),
            "disciplina": r.get("disciplina", "Fitness"),
            "exercise_type": r.get("exercise_type", "squat"),
            "snapshots": r.get("snapshots", {}),
            "kpi": r.get("kpi", {}),
            "is_certified": r.get("is_certified", False),
            "template_name": r.get("template_name"),
            "validation_status": r.get("validation_status", "UNVERIFIED"),
            "flux_earned": r.get("flux_earned", 0),
            "completed_at": r["completed_at"].isoformat() if r.get("completed_at") else None,
            "meta": r.get("meta", {}),
            "latitude": r.get("latitude"),
            "longitude": r.get("longitude"),
            "city_name": r.get("city_name"),
        })

    # ── Aggregate stats ──
    pipeline_stats = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_sessions": {"$sum": 1},
            "total_flux": {"$sum": "$flux_earned"},
            "avg_quality": {"$avg": "$kpi.quality_score"},
            "certified_count": {"$sum": {"$cond": ["$is_certified", 1, 0]}},
        }},
    ]
    stats_result = await db.performance_records.aggregate(pipeline_stats).to_list(1)
    stats = stats_result[0] if stats_result else {"total_sessions": 0, "total_flux": 0, "avg_quality": 0, "certified_count": 0}
    stats.pop("_id", None)
    if stats.get("avg_quality") is not None:
        stats["avg_quality"] = round(stats["avg_quality"], 1)

    # ── Per-discipline breakdown ──
    pipeline_disc = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$disciplina", "count": {"$sum": 1}, "flux": {"$sum": "$flux_earned"}}},
        {"$sort": {"count": -1}},
    ]
    disc_breakdown = []
    async for d in db.performance_records.aggregate(pipeline_disc):
        disc_breakdown.append({"disciplina": d["_id"], "count": d["count"], "flux": d["flux"]})

    return {
        "records": items,
        "total": total,
        "stats": stats,
        "discipline_breakdown": disc_breakdown,
    }


@api_router.get("/kore/stats")
async def get_kore_stats(current_user: dict = Depends(get_current_user)):
    """Quick aggregate stats for the KORE dashboard header."""
    user_id = current_user["_id"]

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_sessions": {"$sum": 1},
            "total_flux": {"$sum": "$flux_earned"},
            "avg_quality": {"$avg": "$kpi.quality_score"},
            "certified_count": {"$sum": {"$cond": ["$is_certified", 1, 0]}},
            "best_quality": {"$max": "$kpi.quality_score"},
            "total_reps": {"$sum": "$kpi.primary_result.value"},
        }},
    ]
    result = await db.performance_records.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {}
    stats.pop("_id", None)
    if stats.get("avg_quality") is not None:
        stats["avg_quality"] = round(stats["avg_quality"], 1)

    # Per-tipo breakdown
    pipeline_tipo = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$tipo", "count": {"$sum": 1}}},
    ]
    tipo_map = {}
    async for t in db.performance_records.aggregate(pipeline_tipo):
        tipo_map[t["_id"]] = t["count"]

    # Weekly trend (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    pipeline_weekly = [
        {"$match": {"user_id": user_id, "completed_at": {"$gte": week_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$completed_at"}},
            "count": {"$sum": 1},
            "flux": {"$sum": "$flux_earned"},
        }},
        {"$sort": {"_id": 1}},
    ]
    weekly = []
    async for w in db.performance_records.aggregate(pipeline_weekly):
        weekly.append({"date": w["_id"], "count": w["count"], "flux": w["flux"]})

    return {
        "stats": stats,
        "tipo_breakdown": tipo_map,
        "weekly_trend": weekly,
    }


# ────────────────────────────────────────
# KORE ATLAS — Geo-tagged performance map
# ────────────────────────────────────────
@api_router.get("/kore/atlas")
async def get_kore_atlas(current_user: dict = Depends(get_current_user)):
    """
    Returns all geo-tagged performance records for the interactive KORE ATLAS map.
    Also aggregates from scan_results for older data.
    """
    user_id = current_user["_id"]
    pins = []

    # 1. From performance_records (has lat/lng)
    cursor = db.performance_records.find(
        {"user_id": user_id, "latitude": {"$exists": True, "$ne": None}},
        {"latitude": 1, "longitude": 1, "city_name": 1, "disciplina": 1,
         "tipo": 1, "kpi": 1, "completed_at": 1, "flux_earned": 1}
    ).sort("completed_at", -1).limit(200)
    async for r in cursor:
        pins.append({
            "id": str(r["_id"]),
            "lat": r["latitude"],
            "lng": r["longitude"],
            "city": r.get("city_name", ""),
            "sport": r.get("disciplina", "Fitness"),
            "tipo": r.get("tipo", "ALLENAMENTO"),
            "quality": (r.get("kpi") or {}).get("quality_score", 0),
            "flux": r.get("flux_earned", 0),
            "date": r["completed_at"].isoformat() if r.get("completed_at") else None,
        })

    # 2. From scan_results (legacy/bio-scan data)
    cursor2 = db.scan_results.find(
        {"user_id": user_id, "latitude": {"$exists": True, "$ne": None}},
        {"latitude": 1, "longitude": 1, "city_name": 1, "city": 1,
         "kore_score": 1, "created_at": 1}
    ).sort("created_at", -1).limit(100)
    async for s in cursor2:
        pins.append({
            "id": str(s["_id"]),
            "lat": s["latitude"],
            "lng": s["longitude"],
            "city": s.get("city_name") or s.get("city", ""),
            "sport": "BioScan",
            "tipo": "NEXUS_SCAN",
            "quality": s.get("kore_score", 0),
            "flux": 0,
            "date": s["created_at"].isoformat() if s.get("created_at") else None,
        })

    # Deduplicate by id
    seen = set()
    unique_pins = []
    for p in pins:
        if p["id"] not in seen:
            seen.add(p["id"])
            unique_pins.append(p)

    return {"pins": unique_pins, "total": len(unique_pins)}



@api_router.get("/kore/personal-record")
async def get_personal_record(
    exercise_type: str = Query("squat"),
    disciplina: str = Query("Fitness"),
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the Personal Record (PR) for a given exercise/discipline.
    Used by the Detail View to show the comparative chart.
    """
    user_id = current_user["_id"]
    # PR = highest primary_result.value
    pipeline = [
        {"$match": {
            "user_id": user_id,
            "exercise_type": exercise_type,
            "disciplina": disciplina,
        }},
        {"$sort": {"kpi.primary_result.value": -1}},
        {"$limit": 1},
    ]
    pr_list = await db.performance_records.aggregate(pipeline).to_list(1)
    pr = pr_list[0] if pr_list else None

    # Best quality score
    pipeline_q = [
        {"$match": {"user_id": user_id, "exercise_type": exercise_type, "disciplina": disciplina}},
        {"$sort": {"kpi.quality_score": -1}},
        {"$limit": 1},
    ]
    best_q_list = await db.performance_records.aggregate(pipeline_q).to_list(1)
    best_q = best_q_list[0] if best_q_list else None

    # Avg stats across all records for this exercise
    pipeline_avg = [
        {"$match": {"user_id": user_id, "exercise_type": exercise_type, "disciplina": disciplina}},
        {"$group": {
            "_id": None,
            "avg_value": {"$avg": "$kpi.primary_result.value"},
            "avg_quality": {"$avg": "$kpi.quality_score"},
            "max_value": {"$max": "$kpi.primary_result.value"},
            "max_quality": {"$max": "$kpi.quality_score"},
            "total_attempts": {"$sum": 1},
            "avg_rom": {"$avg": "$kpi.rom_pct"},
            "max_rom": {"$max": "$kpi.rom_pct"},
            "avg_explosivity": {"$avg": "$kpi.explosivity_pct"},
            "max_explosivity": {"$max": "$kpi.explosivity_pct"},
        }},
    ]
    avg_list = await db.performance_records.aggregate(pipeline_avg).to_list(1)
    avg_stats = avg_list[0] if avg_list else {}
    avg_stats.pop("_id", None)

    # Round values
    for k in avg_stats:
        if isinstance(avg_stats[k], float):
            avg_stats[k] = round(avg_stats[k], 1)

    return {
        "pr": {
            "primary_result": pr["kpi"]["primary_result"] if pr else None,
            "quality_score": pr["kpi"].get("quality_score") if pr else None,
            "completed_at": pr["completed_at"].isoformat() if pr and pr.get("completed_at") else None,
        } if pr else None,
        "best_quality": {
            "quality_score": best_q["kpi"].get("quality_score") if best_q else None,
        } if best_q else None,
        "avg_stats": avg_stats,
    }


@api_router.get("/kore/record/{record_id}")
async def get_performance_record_detail(
    record_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns a single performance record by ID for the Detail View.
    """
    try:
        oid = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID non valido")
    rec = await db.performance_records.find_one({"_id": oid, "user_id": current_user["_id"]})
    if not rec:
        raise HTTPException(status_code=404, detail="Record non trovato")
    return {
        "id": str(rec["_id"]),
        "tipo": rec.get("tipo"),
        "modalita": rec.get("modalita"),
        "crew_id": rec.get("crew_id"),
        "disciplina": rec.get("disciplina"),
        "exercise_type": rec.get("exercise_type"),
        "snapshots": rec.get("snapshots", {}),
        "kpi": rec.get("kpi", {}),
        "is_certified": rec.get("is_certified", False),
        "template_name": rec.get("template_name"),
        "validation_status": rec.get("validation_status"),
        "flux_earned": rec.get("flux_earned", 0),
        "completed_at": rec["completed_at"].isoformat() if rec.get("completed_at") else None,
        "meta": rec.get("meta", {}),
    }


# ═══════════════════════════════════════════════════════════
#  SILO IDENTITY & ATHLETE PROFILING
# ═══════════════════════════════════════════════════════════

SILO_COLORS = {
    "Fitness":  "#FF3B30",
    "Golf":     "#00FF87",
    "Padel":    "#00B4D8",
    "Calcio":   "#06D6A0",
    "Tennis":   "#FFD700",
    "Basket":   "#FF9500",
    "Running":  "#A855F7",
    "Nuoto":    "#0096C7",
    "Yoga":     "#C77DFF",
    "CrossFit": "#FF6B6B",
    "Boxing":   "#E63946",
    "MMA":      "#D62828",
    "Ciclismo": "#48CAE4",
}


@api_router.get("/kore/silo-profile")
async def get_silo_profile(current_user: dict = Depends(get_current_user)):
    """
    Calculates the Silo Dominance, Dynamic Title, and Silo Radar
    based on the last 30 days of performance records.
    """
    user_id = current_user["_id"]
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # ── Per-silo aggregation (last 30 days) ──
    pipeline_silo = [
        {"$match": {"user_id": user_id, "completed_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": "$disciplina",
            "count": {"$sum": 1},
            "total_flux": {"$sum": "$flux_earned"},
            "avg_quality": {"$avg": "$kpi.quality_score"},
            "max_quality": {"$max": "$kpi.quality_score"},
            "avg_value": {"$avg": "$kpi.primary_result.value"},
            "max_value": {"$max": "$kpi.primary_result.value"},
            "certified_count": {"$sum": {"$cond": ["$is_certified", 1, 0]}},
        }},
        {"$sort": {"count": -1}},
    ]
    silo_data = await db.performance_records.aggregate(pipeline_silo).to_list(20)

    total_challenges = sum(s["count"] for s in silo_data)

    # ── Determine dominant silo ──
    dominant = silo_data[0] if silo_data else None
    dominant_silo = dominant["_id"] if dominant else "Fitness"
    dominant_count = dominant["count"] if dominant else 0
    dominant_pct = round((dominant_count / total_challenges * 100), 1) if total_challenges > 0 else 0

    # ── Dynamic Title ──
    title = "Rookie"
    title_tier = "rookie"
    if dominant_count >= 30:
        title = f"Master of {dominant_silo}"
        title_tier = "master"
    elif dominant_count >= 10:
        title = "Contender"
        title_tier = "contender"

    # Boost to Master if avg quality in dominant silo > 85
    if dominant and (dominant.get("avg_quality") or 0) >= 85 and dominant_count >= 15:
        title = f"Master of {dominant_silo}"
        title_tier = "master"

    # ── Aura color ──
    aura_color = SILO_COLORS.get(dominant_silo, "#00E5FF")

    # ── Radar data (per silo competency) ──
    radar = []
    for s in silo_data:
        silo_name = s["_id"] or "Fitness"
        quality = s.get("avg_quality") or 0
        volume = s["count"]
        vol_score = min(volume / 50 * 100, 100)
        comp_score = round(vol_score * 0.4 + quality * 0.6, 1)
        radar.append({
            "silo": silo_name,
            "color": SILO_COLORS.get(silo_name, "#00E5FF"),
            "count": volume,
            "avg_quality": round(quality, 1),
            "max_quality": round(s.get("max_quality") or 0, 1),
            "avg_value": round(s.get("avg_value") or 0, 1),
            "max_value": round(s.get("max_value") or 0, 1),
            "flux": s.get("total_flux", 0),
            "certified": s.get("certified_count", 0),
            "competency": comp_score,
        })

    # ── All-time totals for context ──
    pipeline_alltime = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "total_all": {"$sum": 1}, "total_flux_all": {"$sum": "$flux_earned"}}},
    ]
    alltime = await db.performance_records.aggregate(pipeline_alltime).to_list(1)
    alltime_data = alltime[0] if alltime else {}

    return {
        "dominant_silo": dominant_silo,
        "dominant_pct": dominant_pct,
        "dominant_count": dominant_count,
        "aura_color": aura_color,
        "title": title,
        "title_tier": title_tier,
        "total_challenges_30d": total_challenges,
        "total_challenges_all": alltime_data.get("total_all", 0),
        "total_flux_all": alltime_data.get("total_flux_all", 0),
        "radar": radar,
    }


app.include_router(api_router)


# ═══════════════════════════════════════════════════════════════════════════════
# COACH STUDIO — MOBILE-TO-WEB BRIDGE (One-Time Web Token)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/coach/web-token")
async def generate_web_token(current_user: dict = Depends(get_current_user)):
    """Generate a one-time-use web token for auto-login in Coach Studio browser."""
    role = current_user.get("role", "ATHLETE")
    if role not in ("COACH", "GYM_OWNER", "ADMIN"):
        raise HTTPException(403, "Solo Coach, Gym Owner e Admin possono accedere al Command Center")

    import secrets
    otp = secrets.token_urlsafe(48)
    user_id = str(current_user["_id"])

    # Store OTP with 15-minute expiry and single-use flag
    await db.web_tokens.insert_one({
        "token": otp,
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=15),
        "used": False
    })

    return {"token": otp, "expires_in": 900}


@app.post("/api/auth/web-token-login")
async def web_token_login(body: dict):
    """Exchange a one-time web token for a full JWT session."""
    otp = body.get("token", "")
    if not otp:
        raise HTTPException(400, "Token mancante")

    # Find and validate the OTP
    record = await db.web_tokens.find_one({"token": otp, "used": False})
    if not record:
        raise HTTPException(401, "Token non valido o già utilizzato")

    if record["expires_at"] < datetime.utcnow():
        await db.web_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})
        raise HTTPException(401, "Token scaduto")

    # Mark as used
    await db.web_tokens.update_one({"_id": record["_id"]}, {"$set": {"used": True}})

    # Get user
    user = await db.users.find_one({"_id": ObjectId(record["user_id"])})
    if not user:
        raise HTTPException(404, "Utente non trovato")

    # Generate JWT
    token_data = {
        "sub": str(user["_id"]),
        "exp": datetime.utcnow() + timedelta(hours=48)
    }
    jwt_token = jwt.encode(token_data, SECRET_KEY, algorithm="HS256")

    safe = user_to_response(user)
    return {"token": jwt_token, "user": safe}


# ═══════════════════════════════════════════════════════════════════════════════
# DEEP LINK — Generate app deep links for web-to-mobile bridge
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/deeplink/challenge/{template_id}")
async def get_challenge_deeplink(template_id: str, current_user: dict = Depends(get_current_user)):
    """Generate a deep link URL to open a challenge template in the mobile app."""
    template = await db.templates.find_one({"_id": ObjectId(template_id)})
    if not template:
        raise HTTPException(404, "Template non trovato")

    deep_link = f"arenakore://nexus?template_id={template_id}"
    web_fallback = f"/nexus-trigger?template_id={template_id}"

    return {
        "deep_link": deep_link,
        "web_fallback": web_fallback,
        "template": {
            "id": str(template["_id"]),
            "name": template.get("name", ""),
            "exercise": template.get("exercise", ""),
            "difficulty": template.get("difficulty", ""),
        }
    }


@app.on_event("shutdown")
async def shutdown_db_client():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    client.close()
