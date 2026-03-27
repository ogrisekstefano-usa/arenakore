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
    performance_score: Optional[float] = None  # 0-100
    duration_seconds: Optional[int] = None


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
