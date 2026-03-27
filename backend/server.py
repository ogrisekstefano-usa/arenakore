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
    role: str
    sport: str


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
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "role": data.role,
            "sport": data.sport,
            "xp": 100,
            "dna": dna,
            "onboarding_completed": True,
        }}
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return user_to_response(updated)


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
