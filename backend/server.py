from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId

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


class UserLogin(BaseModel):
    email: str
    password: str


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
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": None,
        "sport": None,
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
    update_data = {
        "role": data.role or "Kore Member",
        "sport": data.sport,
        "category": data.category,
        "is_versatile": data.is_versatile or False,
        "xp": 100,
        "dna": dna,
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
            {"title": "Sprint Challenge 100m", "description": "Chi è il più veloce? Sfida aperta a tutti gli atleti della piattaforma.", "sport": "Atletica", "status": "live", "xp_reward": 150, "participants_count": 24, "created_at": datetime.now(timezone.utc)},
            {"title": "Power Lifting Battle", "description": "Massima potenza, minimo peso. Il rapporto perfetto tra forza e corpo.", "sport": "Powerlifting", "status": "live", "xp_reward": 200, "participants_count": 12, "created_at": datetime.now(timezone.utc)},
            {"title": "CrossFit WOD Arena", "description": "WOD della settimana: 21-15-9 Thruster + Pull-up. Cronometro.", "sport": "CrossFit", "status": "upcoming", "xp_reward": 100, "participants_count": 45, "created_at": datetime.now(timezone.utc)},
            {"title": "Boxe Tecnica Libera", "description": "Dimostra la tua tecnica. I Coach valutano il gesto atletico.", "sport": "Boxe", "status": "completed", "xp_reward": 120, "participants_count": 8, "created_at": datetime.now(timezone.utc)},
            {"title": "Nuoto 50m Stile Libero", "description": "La vasca è il tuo ring. Fai il tuo miglior tempo.", "sport": "Nuoto", "status": "upcoming", "xp_reward": 180, "participants_count": 30, "created_at": datetime.now(timezone.utc)},
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



app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
