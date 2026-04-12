"""
ARENAKORE — SOCIAL ENGINE (Build 37 · Reels & Badge Prestigio)
═══════════════════════════════════════════════════════════════════
Three pillars:
  1. Share Card Generator — Create shareable social cards from activity records
  2. Badge Overlay — Dynamic 'NEXUS Verified on ArenaKore' (color by K-Flux type)
  3. CTA Integration — Deep link / QR code pointing to challenge for others to try

Collection: `social_shares` (tracks shares, analytics, deep links)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
import hashlib
import os
from .deps import db, get_current_user

router = APIRouter(prefix="/api/social", tags=["social-engine"])


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _generate_share_id() -> str:
    """Generate a short, unique share ID."""
    raw = f"{datetime.now(timezone.utc).isoformat()}-{os.urandom(8).hex()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _flux_color(flux: int) -> str:
    if flux >= 200:
        return "gold"
    if flux >= 100:
        return "cyan"
    return "green"


def _flux_badge_label(flux_color: str) -> str:
    labels = {
        "gold": "ELITE PERFORMER",
        "cyan": "SOLID PERFORMER",
        "green": "ACTIVE KORE",
    }
    return labels.get(flux_color, "ACTIVE KORE")


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class ShareCardRequest(BaseModel):
    activity_id: str
    card_type: str = "social_card"     # "social_card" | "story" | "mini_reel"
    include_qr: bool = True
    include_telemetry: bool = False


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/generate-share")
async def generate_share_card(body: ShareCardRequest, current_user: dict = Depends(get_current_user)):
    """
    Generate a shareable social card from an activity record.
    Returns all data needed for the frontend to render the card + QR code.
    Creates a persistent share record with a deep link.
    """
    user_id = current_user["_id"]

    # Fetch the activity record
    activity = None
    try:
        oid = ObjectId(body.activity_id)
        activity = await db.activity_log.find_one({"_id": oid, "user_id": user_id})
    except Exception:
        pass

    # Fallback to performance_records
    if not activity:
        try:
            oid = ObjectId(body.activity_id)
            activity = await db.performance_records.find_one({"_id": oid, "user_id": user_id})
        except Exception:
            pass

    if not activity:
        raise HTTPException(404, "Attività non trovata")

    # Generate share ID
    share_id = _generate_share_id()

    # Determine badge color
    flux_earned = activity.get("flux_earned", 0)
    flux_color = _flux_color(flux_earned)

    # Build the card data
    media = activity.get("media", {})
    screenshots = media.get("screenshots", [])
    telemetry = activity.get("telemetry", {})
    kpi = activity.get("kpi", {})
    result = activity.get("result") or kpi.get("primary_result", {})

    # Deep link URL
    base_url = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://arena-scan-lab.preview.emergentagent.com")
    deep_link = f"{base_url}/share/{share_id}"
    challenge_link = f"{base_url}/challenge-preview/{body.activity_id}"

    card_data = {
        "share_id": share_id,
        "deep_link": deep_link,
        "challenge_link": challenge_link,
        "qr_url": deep_link,

        # User info
        "user": {
            "username": current_user.get("username", "KORE"),
            "level": current_user.get("level", 1),
            "preferred_sport": current_user.get("preferred_sport", "Fitness"),
            "is_nexus_certified": current_user.get("is_nexus_certified", False),
        },

        # Activity data
        "activity": {
            "id": str(activity["_id"]),
            "tipo": activity.get("tipo", "ALLENAMENTO"),
            "template_name": activity.get("template_name", "Sessione"),
            "disciplina": activity.get("disciplina", "Fitness"),
            "exercise_type": activity.get("exercise_type", ""),
            "result": result,
            "flux_earned": flux_earned,
            "flux_color": flux_color,
            "flux_badge_label": _flux_badge_label(flux_color),
            "nexus_verified": activity.get("nexus_verified", False) or activity.get("is_certified", False),
            "duration_seconds": activity.get("duration_seconds"),
            "completed_at": activity["completed_at"].isoformat() if activity.get("completed_at") else None,
        },

        # Media for reel composition
        "media": {
            "screenshots": screenshots[:3],
            "has_screenshots": len(screenshots) > 0,
            "thumbnail": media.get("thumbnail"),
        },

        # Badge configuration
        "badge": {
            "text": "NEXUS VERIFIED ON ARENAKORE" if (activity.get("nexus_verified") or activity.get("is_certified")) else "VERIFIED ON ARENAKORE",
            "color": flux_color,
            "hex": {"green": "#32D74B", "cyan": "#00E5FF", "gold": "#FFD700"}.get(flux_color, "#00E5FF"),
        },

        # Telemetry (optional)
        "telemetry": telemetry if body.include_telemetry else None,

        # KPI highlights
        "kpi_highlights": {
            "quality_score": kpi.get("quality_score"),
            "explosivity_pct": kpi.get("explosivity_pct"),
            "rom_pct": kpi.get("rom_pct"),
        },

        "card_type": body.card_type,
    }

    # Persist the share record
    share_doc = {
        "share_id": share_id,
        "user_id": user_id,
        "activity_id": activity["_id"],
        "card_type": body.card_type,
        "deep_link": deep_link,
        "flux_color": flux_color,
        "badge_text": card_data["badge"]["text"],
        "views": 0,
        "taps": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db.social_shares.insert_one(share_doc)

    return card_data


@router.get("/card/{share_id}")
async def get_share_card(share_id: str):
    """
    Public endpoint — anyone with the share link can view the card data.
    Increments the view counter for analytics.
    """
    share = await db.social_shares.find_one({"share_id": share_id})
    if not share:
        raise HTTPException(404, "Condivisione non trovata")

    # Increment views
    await db.social_shares.update_one(
        {"_id": share["_id"]},
        {"$inc": {"views": 1}}
    )

    # Fetch the activity
    activity = await db.activity_log.find_one({"_id": share["activity_id"]})
    if not activity:
        activity = await db.performance_records.find_one({"_id": share["activity_id"]})

    if not activity:
        raise HTTPException(404, "Attività non più disponibile")

    # Fetch user
    user = await db.users.find_one({"_id": activity["user_id"]})
    username = user.get("username", "KORE") if user else "KORE"
    level = user.get("level", 1) if user else 1

    flux_earned = activity.get("flux_earned", 0)
    flux_color = _flux_color(flux_earned)
    result = activity.get("result") or activity.get("kpi", {}).get("primary_result", {})

    return {
        "share_id": share_id,
        "user": {"username": username, "level": level},
        "activity": {
            "tipo": activity.get("tipo", "ALLENAMENTO"),
            "template_name": activity.get("template_name", "Sessione"),
            "disciplina": activity.get("disciplina", "Fitness"),
            "exercise_type": activity.get("exercise_type", ""),
            "result": result,
            "flux_earned": flux_earned,
            "flux_color": flux_color,
            "nexus_verified": activity.get("nexus_verified", False),
            "duration_seconds": activity.get("duration_seconds"),
        },
        "badge": {
            "text": share.get("badge_text", "VERIFIED ON ARENAKORE"),
            "color": flux_color,
            "hex": {"green": "#32D74B", "cyan": "#00E5FF", "gold": "#FFD700"}.get(flux_color, "#00E5FF"),
        },
        "views": share.get("views", 0) + 1,
        "created_at": share["created_at"].isoformat(),
    }


@router.post("/card/{share_id}/tap")
async def track_share_tap(share_id: str):
    """Track when someone taps the CTA on a shared card."""
    result = await db.social_shares.update_one(
        {"share_id": share_id},
        {"$inc": {"taps": 1}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Share non trovata")
    return {"status": "tracked"}


@router.get("/my-shares")
async def get_my_shares(
    limit: int = Query(20, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Get all social shares created by the current user with analytics."""
    user_id = current_user["_id"]
    cursor = db.social_shares.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    shares = await cursor.to_list(limit)

    items = []
    for s in shares:
        items.append({
            "share_id": s["share_id"],
            "activity_id": str(s["activity_id"]),
            "card_type": s.get("card_type", "social_card"),
            "deep_link": s.get("deep_link", ""),
            "flux_color": s.get("flux_color", "green"),
            "badge_text": s.get("badge_text", ""),
            "views": s.get("views", 0),
            "taps": s.get("taps", 0),
            "created_at": s["created_at"].isoformat(),
        })

    total_views = sum(i["views"] for i in items)
    total_taps = sum(i["taps"] for i in items)

    return {
        "shares": items,
        "total": len(items),
        "total_views": total_views,
        "total_taps": total_taps,
    }
