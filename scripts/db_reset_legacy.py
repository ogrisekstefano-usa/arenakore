"""
ARENAKORE DATABASE RESET — LEGACY INITIATION PROTOCOL
PURGE: Remove all test users
INIT: Create KORE #00001 — STEFANO OGRISEK
"""
import asyncio
import sys
import os
sys.path.insert(0, '/app/backend')
os.chdir('/app/backend')

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def reset_and_init():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['arenakore']

    # ── PURGE ─────────────────────────────────────────────────────────
    users_count = await db.users.count_documents({})
    print(f"PURGE: Deleting {users_count} user(s)...")
    await db.users.delete_many({})
    await db.password_resets.delete_many({})
    print("✅ PURGE COMPLETE — Database is clean")

    # ── KORE #00001 — STEFANO OGRISEK ─────────────────────────────────
    # Founder role = COSMETIC ONLY (badge on card)
    # System logic (XP, Nexus, Validations) is ROLE-AGNOSTIC
    founder_password = "Founder@KORE2026!"
    founder = {
        "username": "STEFANO",
        "full_name": "STEFANO OGRISEK",
        "email": "ogrisek.stefano@gmail.com",
        "password_hash": pwd_context.hash(founder_password),
        "role": None,
        "sport": "ATHLETICS",
        "training_level": "KORE",
        "height_cm": None,
        "weight_kg": None,
        "age": None,
        "xp": 0,
        "level": 1,
        "onboarding_completed": True,
        "avatar_color": "#D4AF37",
        "dna": {
            "velocita": 85,
            "forza": 82,
            "resistenza": 88,
            "tecnica": 90,
            "mentalita": 95,
            "flessibilita": 78,
        },
        # COSMETIC ONLY — not used for any system permissions
        "is_founder": True,
        "founder_number": 1,
        # Admin access to manage the platform (separate from Founder badge)
        "is_admin": True,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.users.insert_one(founder)
    print(f"\n✅ KORE #00001 CREATED")
    print(f"   Name   : STEFANO OGRISEK")
    print(f"   Email  : ogrisek.stefano@gmail.com")
    print(f"   KORE # : 00001")
    print(f"   Pass   : {founder_password}")
    print(f"   ID     : {result.inserted_id}")
    print(f"\n⚠️  SAVE THESE CREDENTIALS — Share with user immediately")

    client.close()
    print("\n✅ DATABASE RESET & LEGACY INITIATION COMPLETE")


asyncio.run(reset_and_init())
