"""ARENAKORE — Shared Dependencies for Route Modules
Provides db, auth, and common utilities to all route files.
"""
import os
import math
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from jose import JWTError, jwt
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'arenakore')]

SECRET_KEY = os.environ.get('SECRET_KEY', 'arenadare-nexus-secret-2024-v1')
ALGORITHM = "HS256"

security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Decode JWT and return user dict from DB."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # Fixed: use "sub" instead of "user_id"
        if not user_id:
            raise HTTPException(status_code=401, detail="Token non valido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user


def compute_level(k_flux: int) -> int:
    """Level formula: Lvl = floor(sqrt(KFlux) / 10), minimum 1."""
    if k_flux <= 0:
        return 1
    return max(1, int(math.floor(math.sqrt(k_flux) / 10)))


def compute_level_progress(k_flux: int) -> dict:
    """Compute level, progress %, and thresholds."""
    level = compute_level(k_flux)
    # Current level threshold: (level * 10)^2
    current_threshold = (level * 10) ** 2
    next_threshold = ((level + 1) * 10) ** 2
    progress = 0.0
    if next_threshold > current_threshold:
        progress = min(1.0, max(0.0, (k_flux - current_threshold) / (next_threshold - current_threshold)))
    return {
        "level": level,
        "k_flux": k_flux,
        "progress": round(progress, 3),
        "current_threshold": current_threshold,
        "next_threshold": next_threshold,
        "flux_to_next": max(0, next_threshold - k_flux),
    }
