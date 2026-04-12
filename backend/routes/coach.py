"""
ARENAKORE — COACH ENGINE (Build 36 · EVOLUZIONE PROFILO)
═══════════════════════════════════════════════════════════
Coach is an elite entity with professional data:
  - certifications, specialties, professional_bio
  - rating_avg, templates_created
  - verified flag (admin approval)

Endpoint: POST /api/coach/onboarding
  → Receives professional form data
  → Stores in user.coach_data embedded object
  → If not completed, Coach cannot publish coach_templates
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/coach", tags=["coach"])


# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class CoachOnboardingData(BaseModel):
    professional_bio: str                           # Free text bio (max 500 chars)
    specialties: list                               # ["Weightlifting", "HIIT", "Basket Performance"]
    certifications: list                            # ["CONI Livello 2", "CrossFit L1", "NASM CPT"]
    years_experience: int = 0                       # Years of coaching experience
    coaching_tier: str = "standard"                 # "free" | "standard" | "premium" | "elite"
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None


class CoachProfileUpdate(BaseModel):
    professional_bio: Optional[str] = None
    specialties: Optional[list] = None
    certifications: Optional[list] = None
    years_experience: Optional[int] = None
    coaching_tier: Optional[str] = None
    website_url: Optional[str] = None
    instagram_handle: Optional[str] = None


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/onboarding")
async def coach_onboarding(data: CoachOnboardingData, current_user: dict = Depends(get_current_user)):
    """
    Complete Coach Professional Onboarding.
    Sets user.coach_data with all professional fields.
    Upgrades role to COACH if not already.
    """
    # Validate minimums
    if not data.professional_bio or len(data.professional_bio.strip()) < 10:
        raise HTTPException(400, "La bio professionale deve avere almeno 10 caratteri")
    if not data.specialties or len(data.specialties) == 0:
        raise HTTPException(400, "Seleziona almeno una specialità")

    now = datetime.now(timezone.utc)

    coach_data = {
        "verified": False,  # Requires admin approval
        "onboarding_completed": True,
        "onboarding_completed_at": now,
        "professional_bio": data.professional_bio.strip()[:500],
        "specialties": [s.strip() for s in data.specialties[:10]],  # Max 10
        "certifications": [c.strip() for c in data.certifications[:15]],  # Max 15
        "years_experience": min(max(data.years_experience, 0), 50),
        "coaching_tier": data.coaching_tier if data.coaching_tier in ("free", "standard", "premium", "elite") else "standard",
        "website_url": data.website_url,
        "instagram_handle": data.instagram_handle,
        "rating_avg": 0.0,
        "rating_count": 0,
        "templates_created": [],
        "athletes_coached": 0,
        "updated_at": now,
    }

    # Update user document
    update_fields = {"coach_data": coach_data}

    # Upgrade role to COACH if currently a basic member
    current_role = current_user.get("role", "Kore Member")
    if current_role in ("Kore Member", "ATHLETE", None, ""):
        update_fields["role"] = "COACH"

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_fields}
    )

    updated_user = await db.users.find_one({"_id": current_user["_id"]})

    return {
        "status": "onboarding_completed",
        "message": "Coach onboarding completato. Il tuo profilo è in attesa di verifica.",
        "coach_data": _coach_data_response(coach_data),
        "role": updated_user.get("role"),
    }


@router.put("/profile")
async def update_coach_profile(data: CoachProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update coach professional data (post-onboarding)."""
    existing = current_user.get("coach_data")
    if not existing or not existing.get("onboarding_completed"):
        raise HTTPException(403, "Completa prima il Coach Onboarding")

    update = {}
    if data.professional_bio is not None:
        update["coach_data.professional_bio"] = data.professional_bio.strip()[:500]
    if data.specialties is not None:
        update["coach_data.specialties"] = [s.strip() for s in data.specialties[:10]]
    if data.certifications is not None:
        update["coach_data.certifications"] = [c.strip() for c in data.certifications[:15]]
    if data.years_experience is not None:
        update["coach_data.years_experience"] = min(max(data.years_experience, 0), 50)
    if data.coaching_tier is not None:
        if data.coaching_tier in ("free", "standard", "premium", "elite"):
            update["coach_data.coaching_tier"] = data.coaching_tier
    if data.website_url is not None:
        update["coach_data.website_url"] = data.website_url
    if data.instagram_handle is not None:
        update["coach_data.instagram_handle"] = data.instagram_handle

    if update:
        update["coach_data.updated_at"] = datetime.now(timezone.utc)
        await db.users.update_one({"_id": current_user["_id"]}, {"$set": update})

    updated = await db.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "updated",
        "coach_data": _coach_data_response(updated.get("coach_data", {})),
    }


@router.get("/profile")
async def get_coach_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's coach data."""
    coach_data = current_user.get("coach_data")
    if not coach_data:
        return {
            "has_coach_profile": False,
            "onboarding_completed": False,
            "message": "Nessun profilo coach. Completa il Coach Onboarding.",
        }
    return {
        "has_coach_profile": True,
        "onboarding_completed": coach_data.get("onboarding_completed", False),
        "coach_data": _coach_data_response(coach_data),
    }


@router.get("/profile/{user_id}")
async def get_coach_profile_public(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get another user's public coach profile."""
    try:
        target = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(400, "ID utente invalido")
    if not target:
        raise HTTPException(404, "Utente non trovato")

    coach_data = target.get("coach_data")
    if not coach_data or not coach_data.get("onboarding_completed"):
        raise HTTPException(404, "Questo utente non ha un profilo Coach")

    return {
        "user_id": str(target["_id"]),
        "username": target.get("username"),
        "avatar_color": target.get("avatar_color", "#00E5FF"),
        "profile_picture": target.get("profile_picture"),
        "coach_data": _coach_data_response(coach_data),
        "templates_count": await db.coach_templates.count_documents({"coach_id": target["_id"]}),
    }


@router.post("/rate/{coach_id}")
async def rate_coach(coach_id: str, rating: int, current_user: dict = Depends(get_current_user)):
    """Rate a coach (1-5 stars). Updates running average."""
    if rating < 1 or rating > 5:
        raise HTTPException(400, "Rating deve essere tra 1 e 5")

    try:
        coach = await db.users.find_one({"_id": ObjectId(coach_id)})
    except Exception:
        raise HTTPException(400, "ID coach invalido")
    if not coach:
        raise HTTPException(404, "Coach non trovato")
    if str(coach["_id"]) == str(current_user["_id"]):
        raise HTTPException(400, "Non puoi valutare te stesso")

    coach_data = coach.get("coach_data", {})
    old_avg = coach_data.get("rating_avg", 0.0)
    old_count = coach_data.get("rating_count", 0)

    # Running average
    new_count = old_count + 1
    new_avg = round(((old_avg * old_count) + rating) / new_count, 2)

    await db.users.update_one(
        {"_id": coach["_id"]},
        {"$set": {"coach_data.rating_avg": new_avg, "coach_data.rating_count": new_count}}
    )

    # Store individual rating
    await db.coach_ratings.insert_one({
        "coach_id": coach["_id"],
        "rater_id": current_user["_id"],
        "rating": rating,
        "created_at": datetime.now(timezone.utc),
    })

    return {"status": "rated", "new_avg": new_avg, "total_ratings": new_count}


def _coach_data_response(cd: dict) -> dict:
    """Sanitize coach_data for API response."""
    return {
        "verified": cd.get("verified", False),
        "onboarding_completed": cd.get("onboarding_completed", False),
        "onboarding_completed_at": cd.get("onboarding_completed_at", "").isoformat() if hasattr(cd.get("onboarding_completed_at", ""), "isoformat") else None,
        "professional_bio": cd.get("professional_bio", ""),
        "specialties": cd.get("specialties", []),
        "certifications": cd.get("certifications", []),
        "years_experience": cd.get("years_experience", 0),
        "coaching_tier": cd.get("coaching_tier", "standard"),
        "website_url": cd.get("website_url"),
        "instagram_handle": cd.get("instagram_handle"),
        "rating_avg": cd.get("rating_avg", 0.0),
        "rating_count": cd.get("rating_count", 0),
        "templates_created": [str(t) for t in cd.get("templates_created", [])],
        "athletes_coached": cd.get("athletes_coached", 0),
    }
