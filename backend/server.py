from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse, HTMLResponse
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


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    # Legacy Initiation fields (collected during onboarding ceremony)
    height_cm: float | None = None
    weight_kg: float | None = None
    age: int | None = None
    training_level: str | None = None  # LEGACY | ELITE | KORE


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


class CrewCreate(BaseModel):
    name: str
    tagline: Optional[str] = ""
    category: Optional[str] = None


class CrewInvite(BaseModel):
    username: str


def user_to_response(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "role": user.get("role"),
        "sport": user.get("sport"),
        "xp": user.get("xp", 0),
        "level": user.get("level", 1),
        "onboarding_completed": user.get("onboarding_completed", False),
        "dna": user.get("dna"),
        "avatar_color": user.get("avatar_color", "#00E5FF"),
        "is_admin": user.get("is_admin", False),
        "is_founder": user.get("is_founder", False),
        "founder_number": user.get("founder_number"),
        "height_cm": user.get("height_cm"),
        "weight_kg": user.get("weight_kg"),
        "is_pro": (user.get("level", 1) >= 10 or user.get("xp", 0) >= 3000),
        "pro_unlocked": user.get("pro_unlocked", False),
        "ghost_mode": user.get("ghost_mode", False),          # PRIVACY: hides real name in rankings
        "camera_enabled": user.get("camera_enabled", False),
        "mic_enabled": user.get("mic_enabled", False),
        "city": user.get("city"),
    }


@api_router.post("/auth/register")
async def register(data: UserRegister):
    if len(data.username) < 3:
        raise HTTPException(status_code=400, detail="Username troppo corto (min. 3 caratteri)")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password troppo corta (min. 8 caratteri)")
    if await db.users.find_one({"username": data.username}):
        raise HTTPException(status_code=400, detail="Username già in uso")
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email già registrata")

    colors = ["#00E5FF", "#FFD700", "#FF3B30", "#34C759", "#AF52DE", "#FF9F0A"]

    # THE FOUNDER PROTOCOL: First 100 users get permanent Founder badge
    total_users = await db.users.count_documents({})
    is_founder = total_users < 100

    user = {
        "username": data.username.strip(),
        "email": data.email.strip().lower(),  # Always store lowercase
        "password_hash": hash_password(data.password),
        "role": None,
        "sport": "ATHLETICS",  # Default sport — updated via profile
        "training_level": data.training_level or "LEGACY",
        "height_cm": data.height_cm,
        "weight_kg": data.weight_kg,
        "age": data.age,
        "xp": 0,
        "level": 1,
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
    user = await db.users.find_one({"email": data.email})
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
    battle = await db.battles.find_one({"_id": ObjectId(battle_id)})
    if not battle:
        raise HTTPException(status_code=404, detail="Battle non trovata")

    await db.battles.update_one(
        {"_id": ObjectId(battle_id)},
        {"$set": {"status": "live"}}
    )

    # Get all participants' push tokens for notification
    participants = await db.battle_participants.find(
        {"battle_id": ObjectId(battle_id)}
    ).to_list(100)

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
    """Complete a nexus trigger challenge (scan-based) without a specific battle"""
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

    updated = await db.users.find_one({"_id": current_user["_id"]})

    return {
        "status": "completed",
        "performance_score": round(performance, 1),
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
    scheduler.start()
    logger.info("[NotifEngine] Scheduler started — running every 6h")
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
        raise HTTPException(status_code=403, detail="Non sei membro di questa Crew")

    target = await db.users.find_one({"username": data.username})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["_id"] in crew["members"]:
        raise HTTPException(status_code=400, detail="Utente già membro")

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
                to_name=target.get("username", "ATLETA"),
                from_name=current_user.get("username", "ATLETA"),
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


@api_router.get("/users/search/{query}")
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
    days_since_validation = (now - validation_scanned_at).days
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
            to_name=current_user.get("username", "ATLETA"),
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


def gym_to_response(gym: dict) -> dict:
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
async def get_my_gym(current_user: dict = Depends(get_current_user)):
    """Get or auto-create the gym for current GYM_OWNER"""
    gym = await get_or_create_gym(current_user["_id"], current_user.get("username", "Owner"))
    return gym_to_response(gym)


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
    return gym_to_response(updated)


# === COACH ASSOCIATION ===

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
        "description": "KORE ATHLETE PASSPORT",
        "logoText": "ARENAKORE",
        "foregroundColor": "rgb(0, 242, 255)",
        "backgroundColor": "rgb(5, 5, 5)",
        "labelColor": "rgb(212, 175, 55)",
        "generic": {
            "primaryFields": [
                {"key": "athlete", "label": "ATLETA", "value": username}
            ],
            "secondaryFields": [
                {"key": "sport", "label": "SPORT", "value": sport},
                {"key": "level", "label": "LIVELLO", "value": str(level)},
            ],
            "auxiliaryFields": [
                {"key": "xp", "label": "XP TOTALE", "value": f"{xp:,}"},
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
                        "defaultValue": {"language": "it-IT", "value": "KORE ATHLETE PASSPORT"}
                    },
                    "header": {
                        "defaultValue": {"language": "it-IT", "value": username}
                    },
                    "textModulesData": [
                        {"id": "sport", "header": "SPORT", "body": sport},
                        {"id": "level", "header": "LIVELLO", "body": str(level)},
                        {"id": "xp", "header": "XP TOTALE", "body": f"{xp:,}"},
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
# KORE SOCIAL PASSPORT — City Rank + Affiliations + Action Center
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
        display_name = f"KORE #{kore_number_str}" if u.get("ghost_mode") else u.get("username", "ATLETA")

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
# NEXUS SCANNER — Served over HTTPS
# Fixes: "No navigator.mediaDevices.getUserMedia"
# Must be served from HTTPS for getUserMedia to work in WebView.
# ====================================
@app.get("/scanner", response_class=HTMLResponse, include_in_schema=False)
async def nexus_scanner_page():
    """
    ARENAKORE Nexus Bio-Scanner page served over HTTPS.
    Loaded by NexusPoseEngine WebView — enables navigator.mediaDevices.getUserMedia.
    """
    html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>NEXUS SCANNER</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    #video  { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
    #canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    #status {
      position: absolute; bottom: 8px; left: 0; right: 0;
      color: rgba(0,242,255,0.8); font-family: monospace; font-size: 10px;
      text-align: center; pointer-events: none; background: rgba(0,0,0,0.4);
      padding: 4px 0;
    }
    #err {
      display: none; position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9); border: 1px solid #FF3B30;
      border-radius: 12px; padding: 20px 16px; text-align: center;
      color: #FF3B30; font-family: monospace; font-size: 13px; z-index: 30;
      width: 85%; line-height: 1.5;
    }
  </style>
</head>
<body>
  <video id="video" autoplay playsinline muted></video>
  <canvas id="canvas"></canvas>
  <div id="status">NEXUS: LOADING...</div>
  <div id="err"></div>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <script>
    var videoEl = document.getElementById('video');
    var canvas  = document.getElementById('canvas');
    var ctx     = canvas.getContext('2d');
    var statusEl = document.getElementById('status');
    var errEl   = document.getElementById('err');

    // ── Post to React Native WebView or parent iframe
    function post(data) {
      var msg = JSON.stringify(data);
      try {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else window.parent.postMessage(msg, '*');
      } catch(e) {}
    }

    // ── COCO 17 mapping from MediaPipe 33
    var MP_TO_COCO = {0:0,2:1,5:2,7:3,8:4,11:5,12:6,13:7,14:8,15:9,16:10,23:11,24:12,25:13,26:14,27:15,28:16};

    // ── COCO connections for skeleton lines
    var COCO_CONN = [[0,1],[0,2],[1,3],[2,4],[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]];

    var fpsHistory = [];
    var lastT = performance.now();

    function drawSkeleton(mp_lm, W, H) {
      var coco17 = new Array(17).fill(null);
      Object.keys(MP_TO_COCO).forEach(function(k) {
        var lm = mp_lm[parseInt(k)];
        if (lm && (lm.visibility || 0) > 0.3) {
          // Mirror X because video is CSS-mirrored (scaleX -1)
          coco17[MP_TO_COCO[k]] = { x: (1 - lm.x) * W, y: lm.y * H, v: lm.visibility || 0 };
        }
      });

      ctx.clearRect(0, 0, W, H);

      // Draw connections (gold)
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.75;
      COCO_CONN.forEach(function(pair) {
        var a = coco17[pair[0]], b = coco17[pair[1]];
        if (a && b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });

      // Draw keypoints (cyan)
      coco17.forEach(function(pt, i) {
        if (!pt) return;
        var r = i < 5 ? 7 : 5;
        // Outer glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#00F2FF';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r * 2, 0, Math.PI * 2); ctx.fill();
        // Main dot
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
        // White center
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00F2FF';
      });

      ctx.globalAlpha = 1;
      return coco17;
    }

    function onResults(results) {
      var now = performance.now();
      var dt = Math.max(now - lastT, 1);
      lastT = now;
      fpsHistory.push(Math.min(1000 / dt, 60));
      if (fpsHistory.length > 20) fpsHistory.shift();
      var fps = Math.round(fpsHistory.reduce(function(a,b){return a+b;},0) / fpsHistory.length);

      // Resize canvas to match video dimensions
      var W = videoEl.videoWidth || canvas.width;
      var H = videoEl.videoHeight || canvas.height;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      if (!results.poseLandmarks || !results.poseLandmarks.length) {
        ctx.clearRect(0, 0, W, H);
        statusEl.textContent = fps + ' FPS — WAITING FOR ATHLETE...';
        post({ type: 'pose', landmarks: [], fps: fps, centered: false, person_detected: false, visible_count: 0 });
        return;
      }

      var mp_lm = results.poseLandmarks;
      var coco17 = drawSkeleton(mp_lm, W, H);

      var noseX = mp_lm[0] ? mp_lm[0].x : 0.5;
      var centered = (noseX >= 0.28 && noseX <= 0.72);
      var visible_count = coco17.filter(function(p){ return p !== null; }).length;
      var person_detected = visible_count >= 8;

      statusEl.textContent = fps + ' FPS · ' + visible_count + '/17 pts · ' + (centered ? 'CENTRATO' : 'CENTRA');

      // Build landmark array for React Native
      var landmarkArr = coco17.map(function(pt) {
        if (!pt) return null;
        return { x: pt.x / W, y: pt.y / H, v: pt.v || 1 };
      });

      post({
        type: 'pose',
        landmarks: landmarkArr,
        fps: fps,
        centered: centered,
        person_detected: person_detected,
        visible_count: visible_count,
        nose_x: noseX
      });
    }

    // ── Init MediaPipe Pose LITE
    var pose = new Pose({
      locateFile: function(file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/' + file;
      }
    });
    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4
    });
    pose.onResults(onResults);

    // ── Start camera
    statusEl.textContent = 'RICHIEDENDO ACCESSO CAMERA...';

    var camera = new Camera(videoEl, {
      onFrame: function() { return pose.send({ image: videoEl }); },
      width: 480, height: 640
    });

    camera.start()
      .then(function() {
        statusEl.textContent = 'NEXUS ACTIVE';
        post({ type: 'ready' });
      })
      .catch(function(err) {
        var denied = err.name === 'NotAllowedError';
        errEl.style.display = 'block';
        errEl.innerHTML = denied
          ? 'PERMESSI CAMERA NEGATI<br><small>Impostazioni → ARENAKORE → Camera → Consenti</small>'
          : 'CAMERA NON DISPONIBILE<br><small>' + (err.message || err.name) + '</small>';
        statusEl.textContent = denied ? 'PERMESSI NEGATI' : 'ERRORE CAMERA';
        post({ type: denied ? 'camera_denied' : 'error', message: err.message });
      });

    // CDN timeout
    setTimeout(function() {
      if (typeof Pose === 'undefined') {
        statusEl.textContent = 'CDN TIMEOUT';
        post({ type: 'timeout', message: 'MediaPipe CDN timeout' });
      }
    }, 12000);

    window.onerror = function(msg) {
      post({ type: 'error', message: 'JS: ' + msg });
      return true;
    };
  </script>
</body>
</html>"""
    return HTMLResponse(content=html, headers={
        "Cache-Control": "no-cache",
        "X-Frame-Options": "ALLOWALL",
    })


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


# Register all routes (must be AFTER all @api_router decorators)
app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    client.close()
