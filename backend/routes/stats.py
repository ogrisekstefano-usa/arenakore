"""ARENAKORE — Dynamic Stats Route
Provides live platform stats for the Arena banner.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from .deps import db, get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/live")
async def get_live_stats(current_user: dict = Depends(get_current_user)):
    """Return dynamic platform stats: active users, sessions today, records beaten."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Count users who completed onboarding = "Kore Attivi"
    kore_attivi = await db.users.count_documents({"onboarding_completed": True})

    # Count performance records created today = "Sessioni Oggi"
    sessioni_oggi = await db.performance_records.count_documents({
        "created_at": {"$gte": today_start}
    })

    # Count records with records_broken > 0 in last 7 days
    week_ago = now - timedelta(days=7)
    record_battuti = await db.performance_records.count_documents({
        "created_at": {"$gte": week_ago},
        "records_broken": {"$exists": True, "$ne": []}
    })

    # Active challenges (pending or accepted)
    sfide_attive = await db.pvp_challenges.count_documents({
        "status": {"$in": ["pending", "accepted", "challenger_done"]}
    })

    return {
        "kore_attivi": kore_attivi,
        "sessioni_oggi": sessioni_oggi,
        "record_battuti": record_battuti,
        "sfide_attive": sfide_attive,
    }
