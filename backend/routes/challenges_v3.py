"""
ARENAKORE — CHALLENGE ENGINE v3 (Build 38 · PROMPT 1 + 2)
════════════════════════════════════════════════════════════
Three-tier architecture:
  TIER 1 · TEMPLATES  (Lo Spunto)  — Read-only catalog (system / base / coach)
  TIER 2 · CHALLENGES (Lo Scaffale) — Personalized instances (athlete's shelf)
  TIER 3 · LAUNCHES   (L'Azione)   — Execution records (Solo / PvP / Live)

PvP Engagement:
  - Invites via Kore ID with autocomplete
  - 24h expiration (expires_at)
  - Notification hooks (immediate + 2h warning)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from .deps import db, get_current_user, compute_level
from .coach_economics import process_premium_payout
import logging

logger = logging.getLogger("challenges_v3")

router = APIRouter(prefix="/api/v3/challenges", tags=["challenges-v3"])


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class ForkChallengeRequest(BaseModel):
    template_id: str
    source: str = "system"         # "system" | "base" | "coach"
    # Personalizable overrides
    custom_name: Optional[str] = None
    custom_reps: Optional[int] = None
    custom_time_seconds: Optional[int] = None
    custom_rest_seconds: Optional[int] = None
    custom_rounds: Optional[int] = None
    custom_difficulty: Optional[str] = None
    notes: Optional[str] = None


class EditChallengeRequest(BaseModel):
    custom_name: Optional[str] = None
    custom_reps: Optional[int] = None
    custom_time_seconds: Optional[int] = None
    custom_rest_seconds: Optional[int] = None
    custom_rounds: Optional[int] = None
    custom_difficulty: Optional[str] = None
    notes: Optional[str] = None


class LaunchRequest(BaseModel):
    mode: str                      # "solo" | "pvp" | "live"
    opponent_kore_id: Optional[str] = None   # Required for PvP
    message: Optional[str] = None            # Optional message with PvP invite


class InviteActionRequest(BaseModel):
    action: str                    # "accept" | "decline"


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════

COLLECTION_MAP = {
    "system": "system_templates",
    "base": "base_templates",
    "coach": "coach_templates",
}


async def _get_template(template_id: str, source: str) -> dict:
    """Fetch a template from the correct collection."""
    coll_name = COLLECTION_MAP.get(source)
    if not coll_name:
        raise HTTPException(400, f"Source invalida: {source}. Usa: system, base, coach")
    coll = db[coll_name]
    template = None
    try:
        template = await coll.find_one({"_id": ObjectId(template_id)})
    except Exception:
        template = await coll.find_one({"code": template_id})
    if not template:
        raise HTTPException(404, f"Template non trovato in {source}")
    return template


def _challenge_to_response(ch: dict) -> dict:
    """Serialize a challenge document for API response."""
    created = ch.get("created_at")
    updated = ch.get("updated_at")
    return {
        "id": str(ch["_id"]),
        "user_id": str(ch.get("user_id", "")),
        "template_id": str(ch.get("template_id", "")),
        "template_source": ch.get("template_source", "system"),
        "template_code": ch.get("template_code", ""),
        # Display info
        "name": ch.get("custom_name") or ch.get("original_name", "Challenge"),
        "original_name": ch.get("original_name", ""),
        "discipline": ch.get("discipline", "Fitness"),
        "exercise_type": ch.get("exercise_type", "custom"),
        "description": ch.get("description", ""),
        # Parameters (customized or original)
        "target_reps": ch.get("custom_reps") or ch.get("target_reps", 10),
        "target_time_seconds": ch.get("custom_time_seconds") or ch.get("target_time_seconds", 60),
        "rest_seconds": ch.get("custom_rest_seconds") or ch.get("rest_seconds", 0),
        "rounds": ch.get("custom_rounds") or ch.get("rounds", 1),
        "difficulty": ch.get("custom_difficulty") or ch.get("difficulty", "medium"),
        # Metadata
        "requires_nexus_bio": ch.get("requires_nexus_bio", False),
        "xp_reward": ch.get("xp_reward", 100),
        "tags": ch.get("tags", []),
        "icon": ch.get("icon", "flash"),
        "color": ch.get("color", "#00E5FF"),
        "notes": ch.get("notes", ""),
        "kpi_metrics": ch.get("kpi_metrics", []),
        # Custom flags
        "is_customized": ch.get("is_customized", False),
        # Stats
        "launches_count": ch.get("launches_count", 0),
        "best_score": ch.get("best_score"),
        "last_launched_at": ch.get("last_launched_at").isoformat() if ch.get("last_launched_at") else None,
        "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
        "updated_at": updated.isoformat() if hasattr(updated, 'isoformat') else str(updated) if updated else None,
    }


def _launch_to_response(launch: dict) -> dict:
    """Serialize a challenge launch document."""
    started = launch.get("started_at")
    completed = launch.get("completed_at")
    return {
        "id": str(launch["_id"]),
        "challenge_id": str(launch.get("challenge_id", "")),
        "user_id": str(launch.get("user_id", "")),
        "mode": launch.get("mode", "solo"),
        "status": launch.get("status", "pending"),
        # Results
        "reps_completed": launch.get("reps_completed"),
        "time_elapsed": launch.get("time_elapsed"),
        "score": launch.get("score"),
        "flux_earned": launch.get("flux_earned", 0),
        "flux_tier": launch.get("flux_tier", "master"),
        # PvP
        "opponent_id": str(launch.get("opponent_id")) if launch.get("opponent_id") else None,
        "opponent_username": launch.get("opponent_username"),
        "opponent_score": launch.get("opponent_score"),
        "winner_id": str(launch.get("winner_id")) if launch.get("winner_id") else None,
        # Timestamps
        "started_at": started.isoformat() if hasattr(started, 'isoformat') else str(started) if started else None,
        "completed_at": completed.isoformat() if hasattr(completed, 'isoformat') else str(completed) if completed else None,
        "template_name": launch.get("template_name", ""),
        "challenge_name": launch.get("challenge_name", ""),
    }


def _invite_to_response(inv: dict) -> dict:
    """Serialize a PvP invite document."""
    created = inv.get("created_at")
    expires = inv.get("expires_at")
    return {
        "id": str(inv["_id"]),
        "challenge_id": str(inv.get("challenge_id", "")),
        "challenge_name": inv.get("challenge_name", ""),
        "from_user_id": str(inv.get("from_user_id", "")),
        "from_username": inv.get("from_username", ""),
        "to_user_id": str(inv.get("to_user_id", "")),
        "to_username": inv.get("to_username", ""),
        "message": inv.get("message", ""),
        "status": inv.get("status", "pending"),
        "mode": inv.get("mode", "pvp"),
        "launch_id": str(inv.get("launch_id")) if inv.get("launch_id") else None,
        "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
        "expires_at": expires.isoformat() if hasattr(expires, 'isoformat') else str(expires) if expires else None,
    }


# ═══════════════════════════════════════════════════════════
# TIER 1 · UNIFIED TEMPLATE CATALOG (Read-Only)
# ═══════════════════════════════════════════════════════════

@router.get("/catalog")
async def get_template_catalog(
    discipline: Optional[str] = None,
    source: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Catalogo unificato di tutti i template (read-only per l'atleta).
    Filtrabile per discipline e source.
    """
    query: dict = {}
    if discipline:
        query["discipline"] = {"$regex": discipline, "$options": "i"}

    results = []

    sources_to_query = [source] if source and source in COLLECTION_MAP else ["system", "base", "coach"]

    for src in sources_to_query:
        coll = db[COLLECTION_MAP[src]]
        templates = await coll.find(query).sort("name", 1).to_list(200)
        for t in templates:
            resp = {
                "id": str(t["_id"]),
                "code": t.get("code", ""),
                "source": src,
                "name": t["name"],
                "discipline": t.get("discipline", "Fitness"),
                "exercise_type": t.get("exercise_type", "custom"),
                "description": t.get("description", ""),
                "target_reps": t.get("target_reps", 10),
                "target_time_seconds": t.get("target_time_seconds", 60),
                "rest_seconds": t.get("rest_seconds", 0),
                "rounds": t.get("rounds", 1),
                "difficulty": t.get("difficulty", "medium"),
                "requires_nexus_bio": t.get("requires_nexus_bio", False),
                "xp_reward": t.get("xp_reward", 100),
                "kpi_metrics": t.get("kpi_metrics", []),
                "tags": t.get("tags", []),
                "icon": t.get("icon", "flash"),
                "color": t.get("color", "#00E5FF"),
                "certified_by": t.get("certified_by"),
                "coach_name": t.get("coach_name"),
                "uses_count": t.get("uses_count", 0),
            }
            results.append(resp)

    return {
        "templates": results,
        "total": len(results),
        "disciplines": list(set(r["discipline"] for r in results)),
    }


# ═══════════════════════════════════════════════════════════
# TIER 2 · CHALLENGES (Lo Scaffale — My Challenges)
# ═══════════════════════════════════════════════════════════

@router.post("/fork")
async def fork_template_to_challenge(
    body: ForkChallengeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Fork un Template nel proprio scaffale (My Challenges).
    L'atleta può personalizzare reps, tempo, rounds, difficoltà.
    """
    template = await _get_template(body.template_id, body.source)
    now = datetime.now(timezone.utc)

    # Check if already forked
    existing = await db.challenges.find_one({
        "user_id": current_user["_id"],
        "template_id": template["_id"],
        "template_source": body.source,
    })
    if existing:
        return {
            "status": "already_exists",
            "challenge": _challenge_to_response(existing),
            "message": "Questa sfida è già nel tuo scaffale"
        }

    # Determine if customized
    is_customized = any([
        body.custom_name, body.custom_reps, body.custom_time_seconds,
        body.custom_rest_seconds, body.custom_rounds, body.custom_difficulty,
    ])

    challenge_doc = {
        "user_id": current_user["_id"],
        "username": current_user.get("username", ""),
        "template_id": template["_id"],
        "template_source": body.source,
        "template_code": template.get("code", ""),
        # Original values from template
        "original_name": template["name"],
        "discipline": template.get("discipline", "Fitness"),
        "exercise_type": template.get("exercise_type", "custom"),
        "description": template.get("description", ""),
        "target_reps": template.get("target_reps", 10),
        "target_time_seconds": template.get("target_time_seconds", 60),
        "rest_seconds": template.get("rest_seconds", 0),
        "rounds": template.get("rounds", 1),
        "difficulty": template.get("difficulty", "medium"),
        "requires_nexus_bio": template.get("requires_nexus_bio", False),
        "xp_reward": template.get("xp_reward", 100),
        "kpi_metrics": template.get("kpi_metrics", []),
        "tags": template.get("tags", []),
        "icon": template.get("icon", "flash"),
        "color": template.get("color", "#00E5FF"),
        # Custom overrides (null = use original)
        "custom_name": body.custom_name,
        "custom_reps": body.custom_reps,
        "custom_time_seconds": body.custom_time_seconds,
        "custom_rest_seconds": body.custom_rest_seconds,
        "custom_rounds": body.custom_rounds,
        "custom_difficulty": body.custom_difficulty,
        "notes": body.notes or "",
        "is_customized": is_customized,
        # Stats
        "launches_count": 0,
        "best_score": None,
        "last_launched_at": None,
        # Timestamps
        "created_at": now,
        "updated_at": now,
    }

    result = await db.challenges.insert_one(challenge_doc)
    challenge_doc["_id"] = result.inserted_id

    # Increment template uses_count
    coll = db[COLLECTION_MAP[body.source]]
    await coll.update_one({"_id": template["_id"]}, {"$inc": {"uses_count": 1}})

    logger.info(f"[FORK] User {current_user.get('username')} forked {template['name']} ({body.source})")

    return {
        "status": "created",
        "challenge": _challenge_to_response(challenge_doc),
    }


@router.get("/my")
async def get_my_challenges(
    current_user: dict = Depends(get_current_user),
):
    """Lo Scaffale dell'atleta — tutte le sfide personalizzate."""
    challenges = await db.challenges.find(
        {"user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(100)
    return {
        "challenges": [_challenge_to_response(ch) for ch in challenges],
        "total": len(challenges),
    }


@router.put("/{challenge_id}")
async def edit_challenge(
    challenge_id: str,
    body: EditChallengeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Modifica una sfida nello scaffale (solo parametri personalizzabili)."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID challenge invalido")

    challenge = await db.challenges.find_one({"_id": oid, "user_id": current_user["_id"]})
    if not challenge:
        raise HTTPException(404, "Challenge non trovata nel tuo scaffale")

    updates = {"updated_at": datetime.now(timezone.utc)}
    if body.custom_name is not None:
        updates["custom_name"] = body.custom_name
    if body.custom_reps is not None:
        updates["custom_reps"] = body.custom_reps
    if body.custom_time_seconds is not None:
        updates["custom_time_seconds"] = body.custom_time_seconds
    if body.custom_rest_seconds is not None:
        updates["custom_rest_seconds"] = body.custom_rest_seconds
    if body.custom_rounds is not None:
        updates["custom_rounds"] = body.custom_rounds
    if body.custom_difficulty is not None:
        updates["custom_difficulty"] = body.custom_difficulty
    if body.notes is not None:
        updates["notes"] = body.notes

    # Update is_customized flag
    updates["is_customized"] = True

    await db.challenges.update_one({"_id": oid}, {"$set": updates})
    updated = await db.challenges.find_one({"_id": oid})
    return _challenge_to_response(updated)


@router.delete("/{challenge_id}")
async def remove_challenge(
    challenge_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Rimuovi una sfida dallo scaffale."""
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID challenge invalido")

    result = await db.challenges.delete_one({"_id": oid, "user_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Challenge non trovata nel tuo scaffale")
    return {"status": "removed"}


# ═══════════════════════════════════════════════════════════
# TIER 3 · LAUNCH (L'Azione — Solo / PvP / Live)
# ═══════════════════════════════════════════════════════════

@router.post("/{challenge_id}/launch")
async def launch_challenge(
    challenge_id: str,
    body: LaunchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Lancia una sfida dal proprio scaffale.
    Modalità:
      - solo: allenamento/record personale
      - pvp: invita un avversario via Kore ID (crea invite con expires_at)
      - live: sessione in tempo reale
    """
    try:
        oid = ObjectId(challenge_id)
    except Exception:
        raise HTTPException(400, "ID challenge invalido")

    challenge = await db.challenges.find_one({"_id": oid, "user_id": current_user["_id"]})
    if not challenge:
        raise HTTPException(404, "Challenge non trovata nel tuo scaffale")

    mode = body.mode.lower()
    if mode not in ("solo", "pvp", "live"):
        raise HTTPException(400, "Modalità invalida. Usa: solo, pvp, live")

    now = datetime.now(timezone.utc)
    challenge_name = challenge.get("custom_name") or challenge.get("original_name", "Challenge")

    # ── SOLO LAUNCH ──
    if mode == "solo":
        launch_doc = {
            "challenge_id": oid,
            "user_id": current_user["_id"],
            "username": current_user.get("username", ""),
            "mode": "solo",
            "status": "active",
            "challenge_name": challenge_name,
            "template_name": challenge.get("original_name", ""),
            "template_source": challenge.get("template_source", "system"),
            "discipline": challenge.get("discipline", "Fitness"),
            "exercise_type": challenge.get("exercise_type", "custom"),
            "target_reps": challenge.get("custom_reps") or challenge.get("target_reps", 10),
            "target_time_seconds": challenge.get("custom_time_seconds") or challenge.get("target_time_seconds", 60),
            "reps_completed": None,
            "time_elapsed": None,
            "score": None,
            "flux_earned": 0,
            "flux_tier": "master",
            "started_at": now,
            "completed_at": None,
        }
        result = await db.challenge_launches.insert_one(launch_doc)
        launch_doc["_id"] = result.inserted_id

        # Update shelf stats
        await db.challenges.update_one(
            {"_id": oid},
            {"$inc": {"launches_count": 1}, "$set": {"last_launched_at": now}}
        )

        return {
            "status": "launched",
            "mode": "solo",
            "launch": _launch_to_response(launch_doc),
        }

    # ── PVP LAUNCH ──
    elif mode == "pvp":
        if not body.opponent_kore_id:
            raise HTTPException(400, "Per la modalità PvP, specifica opponent_kore_id (username)")

        # Find opponent by Kore ID (username)
        opponent = await db.users.find_one({
            "username": {"$regex": f"^{body.opponent_kore_id}$", "$options": "i"}
        })
        if not opponent:
            raise HTTPException(404, f"Atleta '{body.opponent_kore_id}' non trovato")
        if str(opponent["_id"]) == str(current_user["_id"]):
            raise HTTPException(400, "Non puoi sfidare te stesso")

        # Create the launch (status: waiting_opponent)
        launch_doc = {
            "challenge_id": oid,
            "user_id": current_user["_id"],
            "username": current_user.get("username", ""),
            "mode": "pvp",
            "status": "waiting_opponent",
            "challenge_name": challenge_name,
            "template_name": challenge.get("original_name", ""),
            "template_source": challenge.get("template_source", "system"),
            "discipline": challenge.get("discipline", "Fitness"),
            "exercise_type": challenge.get("exercise_type", "custom"),
            "target_reps": challenge.get("custom_reps") or challenge.get("target_reps", 10),
            "target_time_seconds": challenge.get("custom_time_seconds") or challenge.get("target_time_seconds", 60),
            "opponent_id": opponent["_id"],
            "opponent_username": opponent.get("username", ""),
            "reps_completed": None,
            "opponent_score": None,
            "score": None,
            "winner_id": None,
            "flux_earned": 0,
            "flux_tier": "master",
            "started_at": now,
            "completed_at": None,
        }
        launch_result = await db.challenge_launches.insert_one(launch_doc)
        launch_doc["_id"] = launch_result.inserted_id

        # Create PvP invite with 24h expiration
        invite_doc = {
            "challenge_id": oid,
            "launch_id": launch_result.inserted_id,
            "challenge_name": challenge_name,
            "from_user_id": current_user["_id"],
            "from_username": current_user.get("username", ""),
            "to_user_id": opponent["_id"],
            "to_username": opponent.get("username", ""),
            "message": body.message or f"{current_user.get('username', 'Un atleta')} ti sfida in {challenge_name}!",
            "mode": "pvp",
            "status": "pending",
            "created_at": now,
            "expires_at": now + timedelta(hours=24),
        }
        invite_result = await db.challenge_invites.insert_one(invite_doc)
        invite_doc["_id"] = invite_result.inserted_id

        # Create notification for opponent
        await db.notifications.insert_one({
            "user_id": opponent["_id"],
            "type": "pvp_invite",
            "title": "SFIDA PVP!",
            "message": f"{current_user.get('username', 'Un atleta')} ti sfida in {challenge_name}!",
            "data": {
                "invite_id": str(invite_result.inserted_id),
                "challenge_name": challenge_name,
                "from_username": current_user.get("username", ""),
            },
            "read": False,
            "created_at": now,
        })

        # Update shelf stats
        await db.challenges.update_one(
            {"_id": oid},
            {"$inc": {"launches_count": 1}, "$set": {"last_launched_at": now}}
        )

        logger.info(f"[PVP] {current_user.get('username')} → {opponent.get('username')} | {challenge_name}")

        return {
            "status": "invite_sent",
            "mode": "pvp",
            "launch": _launch_to_response(launch_doc),
            "invite": _invite_to_response(invite_doc),
            "message": f"Sfida inviata a {opponent.get('username')}! Scade tra 24 ore.",
        }

    # ── LIVE LAUNCH ──
    elif mode == "live":
        launch_doc = {
            "challenge_id": oid,
            "user_id": current_user["_id"],
            "username": current_user.get("username", ""),
            "mode": "live",
            "status": "active",
            "challenge_name": challenge_name,
            "template_name": challenge.get("original_name", ""),
            "template_source": challenge.get("template_source", "system"),
            "discipline": challenge.get("discipline", "Fitness"),
            "exercise_type": challenge.get("exercise_type", "custom"),
            "target_reps": challenge.get("custom_reps") or challenge.get("target_reps", 10),
            "target_time_seconds": challenge.get("custom_time_seconds") or challenge.get("target_time_seconds", 60),
            "reps_completed": None,
            "time_elapsed": None,
            "score": None,
            "flux_earned": 0,
            "flux_tier": "master",
            "started_at": now,
            "completed_at": None,
        }
        result = await db.challenge_launches.insert_one(launch_doc)
        launch_doc["_id"] = result.inserted_id

        await db.challenges.update_one(
            {"_id": oid},
            {"$inc": {"launches_count": 1}, "$set": {"last_launched_at": now}}
        )

        return {
            "status": "launched",
            "mode": "live",
            "launch": _launch_to_response(launch_doc),
        }


# ═══════════════════════════════════════════════════════════
# LAUNCH COMPLETION — Submit results
# ═══════════════════════════════════════════════════════════

class CompletelaunchRequest(BaseModel):
    reps_completed: Optional[int] = None
    time_elapsed: Optional[float] = None
    score: Optional[float] = None
    bio_data: Optional[dict] = None


@router.post("/launch/{launch_id}/complete")
async def complete_launch(
    launch_id: str,
    body: CompletelaunchRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit results for a challenge launch."""
    try:
        oid = ObjectId(launch_id)
    except Exception:
        raise HTTPException(400, "ID launch invalido")

    launch = await db.challenge_launches.find_one({"_id": oid, "user_id": current_user["_id"]})
    if not launch:
        raise HTTPException(404, "Launch non trovato")
    if launch.get("status") == "completed":
        raise HTTPException(400, "Questa sfida è già stata completata")

    now = datetime.now(timezone.utc)
    score = body.score or body.reps_completed or 0

    updates = {
        "status": "completed",
        "completed_at": now,
        "reps_completed": body.reps_completed,
        "time_elapsed": body.time_elapsed,
        "score": score,
    }

    if body.bio_data:
        updates["bio_data"] = body.bio_data

    # Calculate flux based on template source
    template_source = launch.get("template_source", "system")
    if template_source == "system" and body.bio_data:
        flux_tier = "diamond"
        flux_amount = int(score * 2)
    elif template_source == "system":
        flux_tier = "master"
        flux_amount = int(score * 1.5)
    else:
        flux_tier = "master"
        flux_amount = int(score)

    updates["flux_earned"] = flux_amount
    updates["flux_tier"] = flux_tier

    await db.challenge_launches.update_one({"_id": oid}, {"$set": updates})

    # Award flux to user
    flux_field = {
        "diamond": "diamond_flux",
        "master": "master_flux",
        "vital": "vital_flux",
    }.get(flux_tier, "master_flux")

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$inc": {flux_field: flux_amount, "ak_credits": flux_amount}}
    )

    # Update best score on challenge shelf
    challenge_id = launch.get("challenge_id")
    if challenge_id:
        challenge = await db.challenges.find_one({"_id": challenge_id})
        if challenge and (not challenge.get("best_score") or score > challenge.get("best_score", 0)):
            await db.challenges.update_one(
                {"_id": challenge_id},
                {"$set": {"best_score": score}}
            )

    # Log activity
    await db.activity_log.insert_one({
        "user_id": current_user["_id"],
        "username": current_user.get("username", ""),
        "type": "challenge_completed",
        "mode": launch.get("mode", "solo"),
        "challenge_name": launch.get("challenge_name", ""),
        "template_source": template_source,
        "score": score,
        "flux_earned": flux_amount,
        "flux_tier": flux_tier,
        "timestamp": now,
    })

    logger.info(f"[COMPLETE] {current_user.get('username')} | {launch.get('challenge_name')} | score={score} | +{flux_amount} {flux_tier}")

    # ── PREMIUM PAYOUT — If template is premium coach template, pay the coach ──
    payout_info = None
    challenge_id_for_payout = launch.get("challenge_id")
    if challenge_id_for_payout:
        challenge_for_payout = await db.challenges.find_one({"_id": challenge_id_for_payout})
        if challenge_for_payout:
            try:
                payout_info = await process_premium_payout(
                    user_id=current_user["_id"],
                    template_id=challenge_for_payout.get("template_id"),
                    template_source=challenge_for_payout.get("template_source", ""),
                )
            except Exception as e:
                logger.warning(f"[PAYOUT] Error processing payout: {e}")

    return {
        "status": "completed",
        "score": score,
        "flux_earned": flux_amount,
        "flux_tier": flux_tier,
        "premium_payout": payout_info,
    }


# ═══════════════════════════════════════════════════════════
# PVP INVITE SYSTEM (Prompt 2)
# ═══════════════════════════════════════════════════════════

@router.get("/invites/received")
async def get_received_invites(
    current_user: dict = Depends(get_current_user),
):
    """Lista inviti PvP ricevuti (pending, non scaduti)."""
    now = datetime.now(timezone.utc)
    invites = await db.challenge_invites.find({
        "to_user_id": current_user["_id"],
        "status": "pending",
        "expires_at": {"$gt": now},
    }).sort("created_at", -1).to_list(50)
    return {
        "invites": [_invite_to_response(inv) for inv in invites],
        "total": len(invites),
    }


@router.get("/invites/sent")
async def get_sent_invites(
    current_user: dict = Depends(get_current_user),
):
    """Lista inviti PvP inviati."""
    invites = await db.challenge_invites.find({
        "from_user_id": current_user["_id"],
    }).sort("created_at", -1).to_list(50)
    return {
        "invites": [_invite_to_response(inv) for inv in invites],
        "total": len(invites),
    }


@router.post("/invites/{invite_id}/respond")
async def respond_to_invite(
    invite_id: str,
    body: InviteActionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Accetta o rifiuta un invito PvP."""
    try:
        oid = ObjectId(invite_id)
    except Exception:
        raise HTTPException(400, "ID invite invalido")

    invite = await db.challenge_invites.find_one({"_id": oid, "to_user_id": current_user["_id"]})
    if not invite:
        raise HTTPException(404, "Invito non trovato")

    now = datetime.now(timezone.utc)

    # Check expiration
    expires_at = invite.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            await db.challenge_invites.update_one({"_id": oid}, {"$set": {"status": "expired"}})
            raise HTTPException(410, "Questo invito è scaduto")

    if invite.get("status") != "pending":
        raise HTTPException(400, f"Invito già {invite.get('status')}")

    action = body.action.lower()
    if action not in ("accept", "decline"):
        raise HTTPException(400, "Azione invalida. Usa: accept, decline")

    if action == "decline":
        await db.challenge_invites.update_one({"_id": oid}, {"$set": {"status": "declined", "responded_at": now}})
        # Notify sender
        await db.notifications.insert_one({
            "user_id": invite["from_user_id"],
            "type": "pvp_declined",
            "title": "Sfida Rifiutata",
            "message": f"{current_user.get('username', 'Avversario')} ha rifiutato la sfida {invite.get('challenge_name', '')}",
            "read": False,
            "created_at": now,
        })
        return {"status": "declined", "message": "Invito rifiutato"}

    # ── ACCEPT ──
    await db.challenge_invites.update_one(
        {"_id": oid},
        {"$set": {"status": "accepted", "responded_at": now}}
    )

    # Fork the challenge into opponent's shelf automatically
    launch_id = invite.get("launch_id")
    if launch_id:
        original_launch = await db.challenge_launches.find_one({"_id": launch_id})
        if original_launch:
            # Update the original launch status
            await db.challenge_launches.update_one(
                {"_id": launch_id},
                {"$set": {"status": "active"}}
            )

            # Create a matching launch for the opponent
            opponent_launch = {
                "challenge_id": original_launch.get("challenge_id"),
                "user_id": current_user["_id"],
                "username": current_user.get("username", ""),
                "mode": "pvp",
                "status": "active",
                "challenge_name": original_launch.get("challenge_name", ""),
                "template_name": original_launch.get("template_name", ""),
                "template_source": original_launch.get("template_source", "system"),
                "discipline": original_launch.get("discipline", "Fitness"),
                "exercise_type": original_launch.get("exercise_type", "custom"),
                "target_reps": original_launch.get("target_reps", 10),
                "target_time_seconds": original_launch.get("target_time_seconds", 60),
                "opponent_id": invite["from_user_id"],
                "opponent_username": invite.get("from_username", ""),
                "linked_launch_id": launch_id,
                "reps_completed": None,
                "score": None,
                "flux_earned": 0,
                "flux_tier": "master",
                "started_at": now,
                "completed_at": None,
            }
            await db.challenge_launches.insert_one(opponent_launch)

    # Notify sender
    await db.notifications.insert_one({
        "user_id": invite["from_user_id"],
        "type": "pvp_accepted",
        "title": "SFIDA ACCETTATA! 🔥",
        "message": f"{current_user.get('username', '')} ha accettato la sfida {invite.get('challenge_name', '')}!",
        "data": {"launch_id": str(launch_id) if launch_id else None},
        "read": False,
        "created_at": now,
    })

    return {
        "status": "accepted",
        "message": f"Sfida accettata! Sei pronto per {invite.get('challenge_name', 'la sfida')}.",
    }


# ═══════════════════════════════════════════════════════════
# KORE ID SEARCH — Autocomplete per inviti PvP
# ═══════════════════════════════════════════════════════════

@router.get("/users/search")
async def search_users_for_pvp(
    q: str = Query(..., min_length=2, description="Kore ID search query"),
    current_user: dict = Depends(get_current_user),
):
    """
    Ricerca atleti per Kore ID (username) con autocomplete.
    Esclude l'utente corrente. Max 10 risultati.
    """
    users = await db.users.find(
        {
            "username": {"$regex": q, "$options": "i"},
            "_id": {"$ne": current_user["_id"]},
        },
        {"username": 1, "avatar_color": 1, "level": 1, "xp": 1, "ak_credits": 1, "sport": 1}
    ).limit(10).to_list(10)

    return {
        "results": [
            {
                "id": str(u["_id"]),
                "username": u.get("username", ""),
                "avatar_color": u.get("avatar_color", "#00E5FF"),
                "level": compute_level(u.get("ak_credits", 0) or u.get("xp", 0)),
                "sport": u.get("sport"),
            }
            for u in users
        ],
        "total": len(users),
    }


# ═══════════════════════════════════════════════════════════
# EXPIRATION SCHEDULER — Expire stale invites
# ═══════════════════════════════════════════════════════════

async def expire_stale_invites():
    """
    Scheduled task: expire all pending invites past their expires_at.
    Also sends a 'warning' notification 2h before expiry (if not already sent).
    """
    now = datetime.now(timezone.utc)

    # ── Expire overdue invites ──
    expired_result = await db.challenge_invites.update_many(
        {"status": "pending", "expires_at": {"$lte": now}},
        {"$set": {"status": "expired"}}
    )
    if expired_result.modified_count > 0:
        logger.info(f"[EXPIRE] Expired {expired_result.modified_count} stale invites")

    # ── 2h Warning notifications ──
    warning_window = now + timedelta(hours=2)
    soon_expiring = await db.challenge_invites.find({
        "status": "pending",
        "expires_at": {"$lte": warning_window, "$gt": now},
        "warning_sent": {"$ne": True},
    }).to_list(50)

    for inv in soon_expiring:
        await db.notifications.insert_one({
            "user_id": inv["to_user_id"],
            "type": "pvp_expiring_soon",
            "title": "⏰ SFIDA IN SCADENZA!",
            "message": f"La sfida '{inv.get('challenge_name', '')}' da {inv.get('from_username', '')} scade tra 2 ore!",
            "data": {"invite_id": str(inv["_id"])},
            "read": False,
            "created_at": now,
        })
        await db.challenge_invites.update_one(
            {"_id": inv["_id"]},
            {"$set": {"warning_sent": True}}
        )

    if soon_expiring:
        logger.info(f"[WARN] Sent 2h warning to {len(soon_expiring)} invites")


# ═══════════════════════════════════════════════════════════
# LAUNCH HISTORY
# ═══════════════════════════════════════════════════════════

@router.get("/launches/history")
async def get_launch_history(
    mode: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """Storico dei lanci sfida dell'atleta."""
    query = {"user_id": current_user["_id"]}
    if mode:
        query["mode"] = mode
    launches = await db.challenge_launches.find(query).sort("started_at", -1).to_list(min(limit, 100))
    return {
        "launches": [_launch_to_response(l) for l in launches],
        "total": len(launches),
    }


# ═══════════════════════════════════════════════════════════
# DB INDEXES — Called at startup
# ═══════════════════════════════════════════════════════════

async def setup_challenge_indexes():
    """Create indexes for the new challenge collections."""
    # Challenges (shelf) — unique per user+template
    await db.challenges.create_index([("user_id", 1), ("template_id", 1), ("template_source", 1)], unique=True)
    await db.challenges.create_index([("user_id", 1), ("created_at", -1)])

    # Challenge launches
    await db.challenge_launches.create_index([("user_id", 1), ("started_at", -1)])
    await db.challenge_launches.create_index([("challenge_id", 1)])
    await db.challenge_launches.create_index("status")

    # Invites — with TTL-like query support
    await db.challenge_invites.create_index([("to_user_id", 1), ("status", 1)])
    await db.challenge_invites.create_index([("from_user_id", 1)])
    await db.challenge_invites.create_index("expires_at")

    logger.info("[ChallengeEngine v3] Indexes created")
