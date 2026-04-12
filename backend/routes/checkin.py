"""
ARENAKORE — QR KORE CHECK-IN & CONTINUITÀ ENGINE (Build 38 · Prompt 5)
═══════════════════════════════════════════════════════════════════════════
Three pillars:
  1. QR GENERATOR  — Hub owners/coaches generate a unique daily QR code
  2. SCAN & VALIDATE — Athletes scan QR, 1 check-in/day/hub, geo-optional
  3. GREEN K-FLUX — Instant reward for physical attendance + streak tracking

Collections:
  - `hub_qr_tokens`: Daily rotating tokens per hub
  - `attendance_logs`: Immutable attendance records
  - `hub_checkin_config`: Per-hub configurable reward amounts
"""
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/checkin", tags=["qr-checkin"])


# ═══════════════════════════════════════════════════════════════
# CONFIG DEFAULTS
# ═══════════════════════════════════════════════════════════════
DEFAULT_FLUX_REWARD = 50        # Green K-Flux per check-in
DEFAULT_RADIUS_METERS = 500     # Geofence radius for validation
STREAK_BONUS_THRESHOLD = 7      # Days for streak multiplier
STREAK_BONUS_MULTIPLIER = 1.5   # 1.5x K-Flux at 7-day streak


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════
class CheckinScanRequest(BaseModel):
    qr_payload: str                        # Full QR string: arenakore://checkin/{hub_id}/{token}
    latitude: Optional[float] = None       # Athlete's current lat (optional geo-verify)
    longitude: Optional[float] = None      # Athlete's current lng

class CheckinConfigRequest(BaseModel):
    flux_reward: int = DEFAULT_FLUX_REWARD
    radius_meters: int = DEFAULT_RADIUS_METERS
    geo_required: bool = False


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _generate_daily_token(hub_id: str, date_str: str) -> str:
    """Generate a deterministic-but-unpredictable daily token for a hub."""
    seed = f"KORE-CHECKIN-{hub_id}-{date_str}-{secrets.token_hex(8)}"
    return hashlib.sha256(seed.encode()).hexdigest()[:16].upper()


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lng points in meters."""
    import math
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _get_hub_config(hub_id) -> dict:
    """Get check-in config for a hub, with defaults."""
    config = await db.hub_checkin_config.find_one({"hub_id": hub_id})
    if config:
        return {
            "flux_reward": config.get("flux_reward", DEFAULT_FLUX_REWARD),
            "radius_meters": config.get("radius_meters", DEFAULT_RADIUS_METERS),
            "geo_required": config.get("geo_required", False),
        }
    return {
        "flux_reward": DEFAULT_FLUX_REWARD,
        "radius_meters": DEFAULT_RADIUS_METERS,
        "geo_required": False,
    }


async def _calculate_attendance_streak(user_id, hub_id=None) -> int:
    """Calculate consecutive days of attendance."""
    today = datetime.now(timezone.utc).date()
    streak = 0
    for i in range(365):  # Max 1 year lookback
        check_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        query = {"user_id": user_id, "date": check_date}
        if hub_id:
            query["hub_id"] = hub_id
        exists = await db.attendance_logs.find_one(query)
        if exists:
            streak += 1
        else:
            if i == 0:
                continue  # Today might not be checked in yet
            break
    return streak


# ═══════════════════════════════════════════════════════════════
# 1. QR CODE GENERATION — For Hub Admins/Coaches
# ═══════════════════════════════════════════════════════════════

@router.post("/hub/{hub_id}/generate-qr")
async def generate_hub_qr(hub_id: str, current_user: dict = Depends(get_current_user)):
    """
    Generate (or retrieve) today's unique QR token for a Hub.
    Only ADMIN, GYM_OWNER, or COACH can generate QR codes.
    Returns the QR payload string for rendering.
    """
    role = current_user.get("role", "ATHLETE")
    if role not in ("ADMIN", "SUPER_ADMIN", "GYM_OWNER", "COACH"):
        raise HTTPException(403, "Solo Admin, Gym Owner o Coach possono generare QR Check-in")

    # Validate hub exists
    try:
        hub_oid = ObjectId(hub_id)
    except Exception:
        raise HTTPException(400, "ID Hub non valido")

    hub = await db.hubs.find_one({"_id": hub_oid})
    if not hub:
        raise HTTPException(404, "Hub non trovato")

    today = _today_str()

    # Check if today's token already exists
    existing = await db.hub_qr_tokens.find_one({"hub_id": hub_id, "date": today})
    if existing:
        qr_payload = f"arenakore://checkin/{hub_id}/{existing['token']}"
        return {
            "qr_payload": qr_payload,
            "hub_id": hub_id,
            "hub_name": hub.get("name", "Hub"),
            "date": today,
            "token": existing["token"],
            "already_generated": True,
        }

    # Generate new daily token
    token = _generate_daily_token(hub_id, today)

    await db.hub_qr_tokens.insert_one({
        "hub_id": hub_id,
        "token": token,
        "date": today,
        "created_by": current_user["_id"],
        "created_at": datetime.now(timezone.utc),
    })

    qr_payload = f"arenakore://checkin/{hub_id}/{token}"

    return {
        "qr_payload": qr_payload,
        "hub_id": hub_id,
        "hub_name": hub.get("name", "Hub"),
        "date": today,
        "token": token,
        "already_generated": False,
    }


@router.get("/hub/{hub_id}/qr-status")
async def get_hub_qr_status(hub_id: str, current_user: dict = Depends(get_current_user)):
    """Check if today's QR has been generated and how many check-ins it received."""
    today = _today_str()
    existing = await db.hub_qr_tokens.find_one({"hub_id": hub_id, "date": today})

    checkin_count = await db.attendance_logs.count_documents({
        "hub_id": hub_id,
        "date": today,
    })

    config = await _get_hub_config(hub_id)

    return {
        "hub_id": hub_id,
        "date": today,
        "qr_active": bool(existing),
        "checkins_today": checkin_count,
        "flux_reward": config["flux_reward"],
        "geo_required": config["geo_required"],
    }


# ═══════════════════════════════════════════════════════════════
# 2. SCAN & VALIDATE — Athlete scans QR, gets Green K-Flux
# ═══════════════════════════════════════════════════════════════

@router.post("/scan")
async def scan_checkin(body: CheckinScanRequest, current_user: dict = Depends(get_current_user)):
    """
    Athlete scans a Hub QR code. Validates token, enforces 1/day limit,
    optional geo-fence, and awards Green K-Flux.
    
    QR Format: arenakore://checkin/{hub_id}/{token}
    """
    user_id = current_user["_id"]
    today = _today_str()
    now = datetime.now(timezone.utc)

    # ── Parse QR payload ──
    payload = body.qr_payload.strip()
    if not payload.startswith("arenakore://checkin/"):
        raise HTTPException(400, "QR Code non valido. Formato atteso: arenakore://checkin/...")

    parts = payload.replace("arenakore://checkin/", "").split("/")
    if len(parts) < 2:
        raise HTTPException(400, "QR Code corrotto — mancano hub_id o token")

    hub_id = parts[0]
    scanned_token = parts[1]

    # ── Validate hub exists ──
    try:
        hub_oid = ObjectId(hub_id)
    except Exception:
        raise HTTPException(400, "Hub ID nel QR non valido")

    hub = await db.hubs.find_one({"_id": hub_oid})
    if not hub:
        raise HTTPException(404, "Hub non trovato nel sistema KORE")

    hub_name = hub.get("name", "Hub")

    # ── Validate QR token matches today's ──
    token_doc = await db.hub_qr_tokens.find_one({
        "hub_id": hub_id,
        "date": today,
        "token": scanned_token,
    })
    if not token_doc:
        raise HTTPException(403, "QR Code scaduto o non valido per oggi. Chiedi al tuo Hub di rigenerarlo.")

    # ── 1/day limit ──
    existing_checkin = await db.attendance_logs.find_one({
        "user_id": user_id,
        "hub_id": hub_id,
        "date": today,
    })
    if existing_checkin:
        return {
            "success": True,
            "already_checked_in": True,
            "hub_name": hub_name,
            "date": today,
            "message": f"Già registrato oggi presso {hub_name}!",
            "flux_earned": 0,
        }

    # ── Optional geo-verification ──
    config = await _get_hub_config(hub_id)
    if config["geo_required"] and body.latitude and body.longitude:
        hub_coords = hub.get("location", {}).get("coordinates", [])
        if len(hub_coords) >= 2:
            hub_lng, hub_lat = hub_coords[0], hub_coords[1]
            distance = _haversine_meters(body.latitude, body.longitude, hub_lat, hub_lng)
            if distance > config["radius_meters"]:
                raise HTTPException(
                    403,
                    f"Sei troppo lontano dall'Hub ({int(distance)}m). "
                    f"Avvicinati entro {config['radius_meters']}m per il check-in."
                )

    # ── Calculate streak ──
    streak = await _calculate_attendance_streak(user_id)
    # If they checked in yesterday, streak continues; otherwise resets
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_check = await db.attendance_logs.find_one({"user_id": user_id, "date": yesterday})
    if yesterday_check:
        new_streak = streak + 1
    else:
        new_streak = 1

    # ── Calculate K-Flux reward (with streak bonus) ──
    base_reward = config["flux_reward"]
    bonus_multiplier = 1.0
    if new_streak >= STREAK_BONUS_THRESHOLD:
        bonus_multiplier = STREAK_BONUS_MULTIPLIER
    flux_earned = int(base_reward * bonus_multiplier)

    # ── Insert attendance log ──
    attendance_doc = {
        "user_id": user_id,
        "hub_id": hub_id,
        "hub_name": hub_name,
        "date": today,
        "timestamp": now,
        "k_flux_earned": flux_earned,
        "k_flux_color": "green",
        "streak": new_streak,
        "bonus_multiplier": bonus_multiplier,
        "location": None,
    }
    if body.latitude and body.longitude:
        attendance_doc["location"] = {
            "type": "Point",
            "coordinates": [body.longitude, body.latitude],
        }

    await db.attendance_logs.insert_one(attendance_doc)

    # ── Award Green K-Flux to user ──
    await db.users.update_one(
        {"_id": user_id},
        {
            "$inc": {
                "ak_credits": flux_earned,
                "vital_flux": flux_earned,      # Green = Vital/Consistency flux
                "checkin_total": 1,
            },
            "$set": {
                "checkin_streak": new_streak,
                "last_checkin_date": today,
                "last_checkin_hub": hub_name,
            },
        },
    )

    # ── Also insert into legacy checkins for K-Timeline compatibility ──
    existing_legacy = await db.checkins.find_one({"user_id": user_id, "date": today})
    if not existing_legacy:
        await db.checkins.insert_one({
            "user_id": user_id,
            "date": today,
            "created_at": now,
            "source": "qr_hub",
            "hub_id": hub_id,
            "hub_name": hub_name,
        })

    # ── Update user's checkin_streak in legacy path too ──
    await db.users.update_one(
        {"_id": user_id},
        {"$set": {"checkin_streak": new_streak}},
    )

    # ── Mock push notification payload (log for now) ──
    notification_payload = {
        "user_id": str(user_id),
        "title": "✅ CHECK-IN REGISTRATO",
        "body": f"+{flux_earned} K-Flux Verdi presso {hub_name}! Streak: {new_streak} giorni 🔥",
        "data": {
            "type": "checkin_success",
            "hub_id": hub_id,
            "flux_earned": flux_earned,
            "streak": new_streak,
        },
    }
    # Store notification in DB for in-app display
    await db.notifications.insert_one({
        "user_id": user_id,
        "type": "checkin",
        "title": notification_payload["title"],
        "body": notification_payload["body"],
        "data": notification_payload["data"],
        "read": False,
        "created_at": now,
    })

    return {
        "success": True,
        "already_checked_in": False,
        "hub_id": hub_id,
        "hub_name": hub_name,
        "date": today,
        "flux_earned": flux_earned,
        "flux_color": "green",
        "streak": new_streak,
        "bonus_active": bonus_multiplier > 1.0,
        "bonus_multiplier": bonus_multiplier,
        "message": f"🏋️ Presenza registrata! +{flux_earned} K-Flux Verdi",
        "notification": notification_payload,
    }


# ═══════════════════════════════════════════════════════════════
# 3. ATTENDANCE HISTORY — For athletes and hub admins
# ═══════════════════════════════════════════════════════════════

@router.get("/my-attendance")
async def get_my_attendance(
    limit: int = Query(30, le=100),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
):
    """Get athlete's attendance history with hub names and flux earned."""
    user_id = current_user["_id"]

    cursor = db.attendance_logs.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).skip(offset).limit(limit)

    records = []
    async for log in cursor:
        records.append({
            "id": str(log["_id"]),
            "hub_id": log.get("hub_id", ""),
            "hub_name": log.get("hub_name", "Hub"),
            "date": log.get("date", ""),
            "timestamp": log.get("timestamp", "").isoformat() if log.get("timestamp") else None,
            "k_flux_earned": log.get("k_flux_earned", 0),
            "k_flux_color": log.get("k_flux_color", "green"),
            "streak": log.get("streak", 0),
            "bonus_active": log.get("bonus_multiplier", 1.0) > 1.0,
        })

    total = await db.attendance_logs.count_documents({"user_id": user_id})
    streak = current_user.get("checkin_streak", 0)

    return {
        "records": records,
        "total": total,
        "streak": streak,
        "limit": limit,
        "offset": offset,
    }


@router.get("/hub/{hub_id}/attendance")
async def get_hub_attendance(
    hub_id: str,
    date: Optional[str] = Query(None, description="YYYY-MM-DD filter"),
    limit: int = Query(50, le=200),
    current_user: dict = Depends(get_current_user),
):
    """Get attendance log for a specific Hub (admin/coach view)."""
    role = current_user.get("role", "ATHLETE")
    if role not in ("ADMIN", "SUPER_ADMIN", "GYM_OWNER", "COACH"):
        raise HTTPException(403, "Accesso riservato a Admin e Coach")

    query: dict = {"hub_id": hub_id}
    if date:
        query["date"] = date

    cursor = db.attendance_logs.find(query).sort("timestamp", -1).limit(limit)

    records = []
    async for log in cursor:
        # Fetch username for each attendee
        user = await db.users.find_one({"_id": log["user_id"]}, {"username": 1})
        records.append({
            "id": str(log["_id"]),
            "user_id": str(log.get("user_id", "")),
            "username": user.get("username", "Atleta") if user else "Atleta",
            "date": log.get("date", ""),
            "timestamp": log.get("timestamp", "").isoformat() if log.get("timestamp") else None,
            "k_flux_earned": log.get("k_flux_earned", 0),
            "streak": log.get("streak", 0),
        })

    total = await db.attendance_logs.count_documents(query)

    return {
        "hub_id": hub_id,
        "records": records,
        "total": total,
        "date_filter": date or "all",
    }


# ═══════════════════════════════════════════════════════════════
# 4. ADMIN CONFIG — Configure check-in rewards per Hub
# ═══════════════════════════════════════════════════════════════

@router.put("/hub/{hub_id}/config")
async def update_checkin_config(
    hub_id: str,
    body: CheckinConfigRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update check-in configuration for a Hub (flux reward, geo settings)."""
    role = current_user.get("role", "ATHLETE")
    if role not in ("ADMIN", "SUPER_ADMIN", "GYM_OWNER"):
        raise HTTPException(403, "Solo Admin o Gym Owner possono configurare il check-in")

    await db.hub_checkin_config.update_one(
        {"hub_id": hub_id},
        {
            "$set": {
                "hub_id": hub_id,
                "flux_reward": max(10, min(500, body.flux_reward)),  # Clamp 10-500
                "radius_meters": max(50, min(5000, body.radius_meters)),  # Clamp 50-5000m
                "geo_required": body.geo_required,
                "updated_at": datetime.now(timezone.utc),
                "updated_by": current_user["_id"],
            }
        },
        upsert=True,
    )

    return {
        "status": "updated",
        "hub_id": hub_id,
        "flux_reward": body.flux_reward,
        "radius_meters": body.radius_meters,
        "geo_required": body.geo_required,
    }


@router.get("/hub/{hub_id}/config")
async def get_checkin_config(hub_id: str, current_user: dict = Depends(get_current_user)):
    """Get check-in configuration for a Hub."""
    config = await _get_hub_config(hub_id)
    return {"hub_id": hub_id, **config}


# ═══════════════════════════════════════════════════════════════
# 5. WEEK VIEW ENHANCED — Updated week data with hub attendance
# ═══════════════════════════════════════════════════════════════

@router.get("/week-enhanced")
async def get_enhanced_week(current_user: dict = Depends(get_current_user)):
    """
    Enhanced weekly check-in view that includes Hub attendance data.
    Returns 7 days with check-in status and hub name if QR check-in.
    """
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    day_names = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM']
    days = []

    for i in range(7):
        day_date = monday + timedelta(days=i)
        date_str = day_date.strftime("%Y-%m-%d")

        # Check attendance logs (QR-based)
        attendance = await db.attendance_logs.find_one({"user_id": user_id, "date": date_str})
        # Fallback to legacy checkins
        legacy = await db.checkins.find_one({"user_id": user_id, "date": date_str})

        checked_in = bool(attendance) or bool(legacy)
        hub_name = None
        is_qr = False
        flux_earned = 0

        if attendance:
            hub_name = attendance.get("hub_name")
            is_qr = True
            flux_earned = attendance.get("k_flux_earned", 0)
        elif legacy and legacy.get("source") == "qr_hub":
            hub_name = legacy.get("hub_name")
            is_qr = True

        days.append({
            "day_name": day_names[i],
            "date": date_str,
            "checked_in": checked_in,
            "is_qr_checkin": is_qr,
            "hub_name": hub_name,
            "flux_earned": flux_earned,
        })

    streak = current_user.get("checkin_streak", 0)
    total_attendance = await db.attendance_logs.count_documents({"user_id": user_id})

    return {
        "week": days,
        "streak": streak,
        "total_attendance": total_attendance,
        "last_hub": current_user.get("last_checkin_hub"),
    }
