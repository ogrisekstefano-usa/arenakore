"""
ARENAKORE — COACH ECONOMICS ENGINE (PROMPT 3)
════════════════════════════════════════════════════════════
1. Premium Templates — Coach marks templates as premium with K-Flux cost
2. Payout Logic — Athlete pays, Coach gets paid on challenge completion
3. Coach Dashboard — Aggregated athlete biometrics on coach templates
4. Scouting — Follow promising athletes, send team join requests
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from .deps import db, get_current_user
import logging

logger = logging.getLogger("coach_economics")

router = APIRouter(prefix="/api/v3/coach", tags=["coach-economics"])


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class PremiumTemplateRequest(BaseModel):
    is_premium: bool = True
    premium_cost: int = 50           # K-Flux cost for athletes
    premium_description: Optional[str] = None


class ScoutFollowRequest(BaseModel):
    athlete_id: str


class TeamInviteRequest(BaseModel):
    athlete_id: str
    message: Optional[str] = None
    role_in_team: Optional[str] = "athlete"


# ═══════════════════════════════════════════════════════════
# 1. PREMIUM TEMPLATES
# ═══════════════════════════════════════════════════════════

@router.put("/templates/{template_id}/premium")
async def set_template_premium(
    template_id: str,
    body: PremiumTemplateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Coach contrassegna un proprio template come Premium con costo K-Flux.
    Solo il coach proprietario può modificare.
    """
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Solo i Coach possono gestire i template premium")

    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(400, "ID template invalido")

    # Check ownership
    template = await db.coach_templates.find_one({"_id": oid})
    if not template:
        raise HTTPException(404, "Template non trovato tra i tuoi template")

    # Verify ownership (admin can override)
    if role not in ("SUPER_ADMIN", "ADMIN"):
        if str(template.get("coach_id")) != str(current_user["_id"]):
            raise HTTPException(403, "Non sei il proprietario di questo template")

    if body.premium_cost < 0:
        raise HTTPException(400, "Il costo premium non può essere negativo")
    if body.premium_cost > 5000:
        raise HTTPException(400, "Il costo massimo è 5000 K-Flux")

    updates = {
        "is_premium": body.is_premium,
        "premium_cost": body.premium_cost if body.is_premium else 0,
        "premium_description": body.premium_description or "",
        "premium_updated_at": datetime.now(timezone.utc),
    }

    await db.coach_templates.update_one({"_id": oid}, {"$set": updates})

    logger.info(f"[PREMIUM] Coach {current_user.get('username')} {'enabled' if body.is_premium else 'disabled'} premium on {template['name']} — cost: {body.premium_cost}")

    return {
        "status": "updated",
        "template_id": str(oid),
        "is_premium": body.is_premium,
        "premium_cost": body.premium_cost if body.is_premium else 0,
    }


@router.get("/templates/premium")
async def get_premium_templates(
    current_user: dict = Depends(get_current_user),
):
    """Lista dei template premium disponibili nel catalogo."""
    templates = await db.coach_templates.find(
        {"is_premium": True}
    ).sort("premium_cost", 1).to_list(100)

    results = []
    for t in templates:
        coach = await db.users.find_one(
            {"_id": t.get("coach_id")},
            {"username": 1, "avatar_color": 1}
        )
        results.append({
            "id": str(t["_id"]),
            "name": t["name"],
            "discipline": t.get("discipline", "Fitness"),
            "description": t.get("description", ""),
            "premium_cost": t.get("premium_cost", 0),
            "premium_description": t.get("premium_description", ""),
            "difficulty": t.get("difficulty", "medium"),
            "xp_reward": t.get("xp_reward", 100),
            "tags": t.get("tags", []),
            "icon": t.get("icon", "flash"),
            "color": t.get("color", "#D4AF37"),
            "coach_name": coach.get("username", "Coach") if coach else "Coach",
            "coach_avatar_color": coach.get("avatar_color", "#D4AF37") if coach else "#D4AF37",
            "uses_count": t.get("uses_count", 0),
            "total_revenue": t.get("total_revenue", 0),
        })

    return {"premium_templates": results, "total": len(results)}


# ═══════════════════════════════════════════════════════════
# 2. PAYOUT LOGIC — Triggered on challenge completion
# ═══════════════════════════════════════════════════════════

async def process_premium_payout(
    user_id: ObjectId,
    template_id: ObjectId,
    template_source: str,
) -> dict:
    """
    Called internally when athlete completes a challenge from a premium template.
    Deducts K-Flux from athlete, credits Coach.
    Returns payout info or None if not premium.
    """
    if template_source != "coach":
        return None

    template = await db.coach_templates.find_one({"_id": template_id})
    if not template or not template.get("is_premium"):
        return None

    cost = template.get("premium_cost", 0)
    if cost <= 0:
        return None

    coach_id = template.get("coach_id")
    if not coach_id:
        return None

    # Check athlete has enough flux
    athlete = await db.users.find_one({"_id": user_id})
    if not athlete:
        return None

    athlete_flux = (athlete.get("ak_credits", 0) or 0)
    if athlete_flux < cost:
        # Insufficient funds — still allow challenge but no payout
        logger.warning(f"[PAYOUT] Athlete {user_id} has {athlete_flux} flux but template costs {cost}. Skipping payout.")
        return {"status": "insufficient_funds", "cost": cost, "balance": athlete_flux}

    now = datetime.now(timezone.utc)

    # Deduct from athlete (from master_flux primarily)
    await db.users.update_one(
        {"_id": user_id},
        {"$inc": {"ak_credits": -cost, "master_flux": -cost}}
    )

    # Credit coach
    await db.users.update_one(
        {"_id": coach_id},
        {"$inc": {"ak_credits": cost, "master_flux": cost}}
    )

    # Update template revenue tracker
    await db.coach_templates.update_one(
        {"_id": template_id},
        {"$inc": {"total_revenue": cost, "payout_count": 1}}
    )

    # Log the transaction
    await db.flux_transactions.insert_one({
        "type": "premium_payout",
        "from_user_id": user_id,
        "to_user_id": coach_id,
        "amount": cost,
        "template_id": template_id,
        "template_name": template.get("name", ""),
        "timestamp": now,
    })

    logger.info(f"[PAYOUT] -{cost} flux from athlete {user_id} → +{cost} to coach {coach_id} | Template: {template['name']}")

    return {
        "status": "paid",
        "cost": cost,
        "coach_id": str(coach_id),
        "template_name": template.get("name", ""),
    }


@router.get("/revenue")
async def get_coach_revenue(
    current_user: dict = Depends(get_current_user),
):
    """Dashboard revenue per il coach — quanto ha guadagnato dai template premium."""
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Solo i Coach possono vedere la revenue")

    # Get all coach templates with revenue
    templates = await db.coach_templates.find(
        {"coach_id": current_user["_id"]}
    ).to_list(100)

    total_revenue = 0
    template_stats = []
    for t in templates:
        rev = t.get("total_revenue", 0)
        total_revenue += rev
        template_stats.append({
            "id": str(t["_id"]),
            "name": t["name"],
            "is_premium": t.get("is_premium", False),
            "premium_cost": t.get("premium_cost", 0),
            "total_revenue": rev,
            "payout_count": t.get("payout_count", 0),
            "uses_count": t.get("uses_count", 0),
        })

    # Recent transactions
    transactions = await db.flux_transactions.find(
        {"to_user_id": current_user["_id"], "type": "premium_payout"}
    ).sort("timestamp", -1).to_list(20)

    recent = []
    for tx in transactions:
        ts = tx.get("timestamp")
        recent.append({
            "amount": tx.get("amount", 0),
            "template_name": tx.get("template_name", ""),
            "timestamp": ts.isoformat() if hasattr(ts, 'isoformat') else str(ts) if ts else None,
        })

    return {
        "total_revenue": total_revenue,
        "templates": template_stats,
        "recent_transactions": recent,
    }


# ═══════════════════════════════════════════════════════════
# 3. COACH DASHBOARD — Aggregated athlete performance data
# ═══════════════════════════════════════════════════════════

@router.get("/dashboard/performance")
async def get_coach_performance_dashboard(
    current_user: dict = Depends(get_current_user),
):
    """
    Dashboard tecnica: dati aggregati delle prestazioni degli atleti
    sui template del coach (biometrics inclusi).
    """
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Accesso riservato ai Coach")

    # Get all coach template IDs
    coach_templates = await db.coach_templates.find(
        {"coach_id": current_user["_id"]},
        {"_id": 1, "name": 1}
    ).to_list(100)
    template_ids = [t["_id"] for t in coach_templates]
    template_names = {str(t["_id"]): t["name"] for t in coach_templates}

    if not template_ids:
        return {
            "total_launches": 0,
            "unique_athletes": 0,
            "templates_performance": [],
            "biometrics_aggregate": {},
            "recent_activity": [],
        }

    # Get all challenges forked from coach's templates
    challenges = await db.challenges.find(
        {"template_id": {"$in": template_ids}, "template_source": "coach"}
    ).to_list(500)
    challenge_ids = [c["_id"] for c in challenges]
    unique_athlete_ids = list(set(str(c["user_id"]) for c in challenges))

    # Get launches for those challenges
    launches = await db.challenge_launches.find(
        {"challenge_id": {"$in": challenge_ids}}
    ).sort("started_at", -1).to_list(1000)

    # Aggregate per template
    template_perf = {}
    for launch in launches:
        ch = next((c for c in challenges if c["_id"] == launch.get("challenge_id")), None)
        if not ch:
            continue
        tid = str(ch.get("template_id", ""))
        if tid not in template_perf:
            template_perf[tid] = {
                "template_id": tid,
                "template_name": template_names.get(tid, "Unknown"),
                "total_launches": 0,
                "completed": 0,
                "avg_score": 0,
                "max_score": 0,
                "total_flux_earned": 0,
                "unique_athletes": set(),
                "scores": [],
                "bio_samples": [],
            }

        template_perf[tid]["total_launches"] += 1
        template_perf[tid]["unique_athletes"].add(str(launch.get("user_id", "")))

        if launch.get("status") == "completed":
            template_perf[tid]["completed"] += 1
            score = launch.get("score", 0) or 0
            template_perf[tid]["scores"].append(score)
            if score > template_perf[tid]["max_score"]:
                template_perf[tid]["max_score"] = score
            template_perf[tid]["total_flux_earned"] += launch.get("flux_earned", 0)
            if launch.get("bio_data"):
                template_perf[tid]["bio_samples"].append(launch["bio_data"])

    # Finalize aggregations
    results = []
    all_bio_hr = []
    all_bio_cal = []
    for tid, data in template_perf.items():
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
        # Aggregate biometrics
        bio_hr_vals = [b.get("heart_rate_bpm", 0) for b in data["bio_samples"] if b.get("heart_rate_bpm")]
        bio_cal_vals = [b.get("active_calories", 0) for b in data["bio_samples"] if b.get("active_calories")]
        all_bio_hr.extend(bio_hr_vals)
        all_bio_cal.extend(bio_cal_vals)

        results.append({
            "template_id": tid,
            "template_name": data["template_name"],
            "total_launches": data["total_launches"],
            "completed": data["completed"],
            "completion_rate": round(data["completed"] / data["total_launches"] * 100, 1) if data["total_launches"] else 0,
            "avg_score": round(avg_score, 1),
            "max_score": data["max_score"],
            "total_flux_earned": data["total_flux_earned"],
            "unique_athletes": len(data["unique_athletes"]),
            "avg_heart_rate": round(sum(bio_hr_vals) / len(bio_hr_vals), 1) if bio_hr_vals else None,
            "avg_calories": round(sum(bio_cal_vals) / len(bio_cal_vals), 1) if bio_cal_vals else None,
        })

    # Global biometrics aggregate
    biometrics = {}
    if all_bio_hr:
        biometrics["avg_heart_rate"] = round(sum(all_bio_hr) / len(all_bio_hr), 1)
        biometrics["max_heart_rate"] = max(all_bio_hr)
        biometrics["min_heart_rate"] = min(all_bio_hr)
    if all_bio_cal:
        biometrics["avg_calories"] = round(sum(all_bio_cal) / len(all_bio_cal), 1)
        biometrics["total_calories_burned"] = sum(all_bio_cal)

    # Recent activity (last 10 completions)
    recent = []
    for l in launches[:10]:
        if l.get("status") == "completed":
            started = l.get("started_at")
            recent.append({
                "athlete_username": l.get("username", ""),
                "challenge_name": l.get("challenge_name", ""),
                "score": l.get("score", 0),
                "flux_earned": l.get("flux_earned", 0),
                "mode": l.get("mode", "solo"),
                "date": started.isoformat() if hasattr(started, 'isoformat') else str(started) if started else None,
            })

    return {
        "total_launches": len(launches),
        "total_completions": sum(1 for l in launches if l.get("status") == "completed"),
        "unique_athletes": len(unique_athlete_ids),
        "templates_performance": results,
        "biometrics_aggregate": biometrics,
        "recent_activity": recent,
    }


# ═══════════════════════════════════════════════════════════
# 4. SCOUTING — Follow & Team Invites
# ═══════════════════════════════════════════════════════════

@router.post("/scout/follow")
async def follow_athlete(
    body: ScoutFollowRequest,
    current_user: dict = Depends(get_current_user),
):
    """Coach inizia a seguire un atleta promettente."""
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Solo i Coach possono fare scouting")

    try:
        athlete_oid = ObjectId(body.athlete_id)
    except Exception:
        raise HTTPException(400, "ID atleta invalido")

    athlete = await db.users.find_one({"_id": athlete_oid})
    if not athlete:
        raise HTTPException(404, "Atleta non trovato")

    now = datetime.now(timezone.utc)

    # Check if already following
    existing = await db.scout_follows.find_one({
        "coach_id": current_user["_id"],
        "athlete_id": athlete_oid,
    })
    if existing:
        return {
            "status": "already_following",
            "athlete": athlete.get("username", ""),
        }

    await db.scout_follows.insert_one({
        "coach_id": current_user["_id"],
        "coach_username": current_user.get("username", ""),
        "athlete_id": athlete_oid,
        "athlete_username": athlete.get("username", ""),
        "followed_at": now,
    })

    logger.info(f"[SCOUT] Coach {current_user.get('username')} → Follow {athlete.get('username')}")

    return {
        "status": "following",
        "athlete_id": str(athlete_oid),
        "athlete_username": athlete.get("username", ""),
    }


@router.delete("/scout/unfollow/{athlete_id}")
async def unfollow_athlete(
    athlete_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Coach smette di seguire un atleta."""
    try:
        athlete_oid = ObjectId(athlete_id)
    except Exception:
        raise HTTPException(400, "ID atleta invalido")

    result = await db.scout_follows.delete_one({
        "coach_id": current_user["_id"],
        "athlete_id": athlete_oid,
    })

    if result.deleted_count == 0:
        raise HTTPException(404, "Non stavi seguendo questo atleta")

    return {"status": "unfollowed"}


@router.get("/scout/following")
async def get_following_list(
    current_user: dict = Depends(get_current_user),
):
    """Lista atleti che il coach sta seguendo."""
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Accesso riservato ai Coach")

    follows = await db.scout_follows.find(
        {"coach_id": current_user["_id"]}
    ).sort("followed_at", -1).to_list(100)

    results = []
    for f in follows:
        athlete = await db.users.find_one(
            {"_id": f["athlete_id"]},
            {"username": 1, "avatar_color": 1, "ak_credits": 1, "xp": 1, "sport": 1, "dna": 1, "level": 1}
        )
        if athlete:
            followed_at = f.get("followed_at")
            results.append({
                "athlete_id": str(f["athlete_id"]),
                "username": athlete.get("username", ""),
                "avatar_color": athlete.get("avatar_color", "#00E5FF"),
                "sport": athlete.get("sport"),
                "k_flux": athlete.get("ak_credits", 0) or athlete.get("xp", 0),
                "dna_top": _get_dna_top_stat(athlete.get("dna")),
                "followed_at": followed_at.isoformat() if hasattr(followed_at, 'isoformat') else str(followed_at) if followed_at else None,
            })

    return {"following": results, "total": len(results)}


@router.post("/scout/team-invite")
async def send_team_invite(
    body: TeamInviteRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Coach invia richiesta ufficiale di entrata nel Team all'atleta.
    """
    role = current_user.get("role", "").upper()
    if role not in ("COACH", "GYM_OWNER", "SUPER_ADMIN", "ADMIN"):
        raise HTTPException(403, "Solo i Coach possono invitare nel team")

    try:
        athlete_oid = ObjectId(body.athlete_id)
    except Exception:
        raise HTTPException(400, "ID atleta invalido")

    athlete = await db.users.find_one({"_id": athlete_oid})
    if not athlete:
        raise HTTPException(404, "Atleta non trovato")

    now = datetime.now(timezone.utc)

    # Check for existing pending invite
    existing = await db.team_invites.find_one({
        "coach_id": current_user["_id"],
        "athlete_id": athlete_oid,
        "status": "pending",
    })
    if existing:
        return {"status": "already_invited", "message": "Hai già un invito attivo per questo atleta"}

    invite_doc = {
        "coach_id": current_user["_id"],
        "coach_username": current_user.get("username", ""),
        "gym_id": current_user.get("gym_id"),
        "athlete_id": athlete_oid,
        "athlete_username": athlete.get("username", ""),
        "message": body.message or f"Coach {current_user.get('username', '')} ti invita nel suo Team!",
        "role_in_team": body.role_in_team or "athlete",
        "status": "pending",
        "created_at": now,
        "expires_at": now + timedelta(days=7),
    }

    result = await db.team_invites.insert_one(invite_doc)

    # Send notification to athlete
    await db.notifications.insert_one({
        "user_id": athlete_oid,
        "type": "team_invite",
        "title": "INVITO AL TEAM! 🏟️",
        "message": f"Coach {current_user.get('username', '')} ti invita a far parte del suo Team!",
        "data": {
            "invite_id": str(result.inserted_id),
            "coach_username": current_user.get("username", ""),
        },
        "read": False,
        "created_at": now,
    })

    logger.info(f"[TEAM] Coach {current_user.get('username')} → Team invite to {athlete.get('username')}")

    return {
        "status": "invited",
        "invite_id": str(result.inserted_id),
        "athlete_username": athlete.get("username", ""),
        "expires_in_days": 7,
    }


@router.get("/scout/team-invites")
async def get_team_invites_sent(
    current_user: dict = Depends(get_current_user),
):
    """Lista inviti al team inviati dal coach."""
    invites = await db.team_invites.find(
        {"coach_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(50)

    results = []
    for inv in invites:
        created = inv.get("created_at")
        expires = inv.get("expires_at")
        results.append({
            "id": str(inv["_id"]),
            "athlete_id": str(inv.get("athlete_id", "")),
            "athlete_username": inv.get("athlete_username", ""),
            "status": inv.get("status", "pending"),
            "message": inv.get("message", ""),
            "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
            "expires_at": expires.isoformat() if hasattr(expires, 'isoformat') else str(expires) if expires else None,
        })

    return {"invites": results, "total": len(results)}


# ── Athlete responds to team invite ──

class TeamInviteResponseRequest(BaseModel):
    action: str  # "accept" | "decline"


@router.post("/team-invites/{invite_id}/respond")
async def respond_to_team_invite(
    invite_id: str,
    body: TeamInviteResponseRequest,
    current_user: dict = Depends(get_current_user),
):
    """Atleta accetta o rifiuta l'invito al team del coach."""
    try:
        oid = ObjectId(invite_id)
    except Exception:
        raise HTTPException(400, "ID invito invalido")

    invite = await db.team_invites.find_one({"_id": oid, "athlete_id": current_user["_id"]})
    if not invite:
        raise HTTPException(404, "Invito non trovato")

    if invite.get("status") != "pending":
        raise HTTPException(400, f"Invito già {invite.get('status')}")

    now = datetime.now(timezone.utc)
    expires_at = invite.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if now > expires_at:
            await db.team_invites.update_one({"_id": oid}, {"$set": {"status": "expired"}})
            raise HTTPException(410, "Questo invito è scaduto")

    action = body.action.lower()
    if action == "decline":
        await db.team_invites.update_one({"_id": oid}, {"$set": {"status": "declined", "responded_at": now}})
        await db.notifications.insert_one({
            "user_id": invite["coach_id"],
            "type": "team_invite_declined",
            "title": "Invito Rifiutato",
            "message": f"{current_user.get('username', '')} ha rifiutato l'invito al team",
            "read": False,
            "created_at": now,
        })
        return {"status": "declined"}

    elif action == "accept":
        await db.team_invites.update_one({"_id": oid}, {"$set": {"status": "accepted", "responded_at": now}})

        # Assign athlete to coach's gym if applicable
        gym_id = invite.get("gym_id")
        if gym_id:
            await db.users.update_one(
                {"_id": current_user["_id"]},
                {"$set": {"gym_id": gym_id, "team_coach_id": invite["coach_id"]}}
            )

        # Notify coach
        await db.notifications.insert_one({
            "user_id": invite["coach_id"],
            "type": "team_invite_accepted",
            "title": "NUOVO MEMBRO! 🔥",
            "message": f"{current_user.get('username', '')} è entrato nel tuo Team!",
            "data": {"athlete_id": str(current_user["_id"])},
            "read": False,
            "created_at": now,
        })

        logger.info(f"[TEAM] {current_user.get('username')} joined team of coach {invite.get('coach_username')}")

        return {
            "status": "accepted",
            "message": f"Sei entrato nel Team di Coach {invite.get('coach_username', '')}!",
        }

    raise HTTPException(400, "Azione invalida. Usa: accept, decline")


# ═══════════════════════════════════════════════════════════
# ATHLETE: My Team Invites (received)
# ═══════════════════════════════════════════════════════════

@router.get("/team-invites/received")
async def get_my_team_invites(
    current_user: dict = Depends(get_current_user),
):
    """Atleta: lista inviti al team ricevuti."""
    now = datetime.now(timezone.utc)
    invites = await db.team_invites.find({
        "athlete_id": current_user["_id"],
        "status": "pending",
    }).sort("created_at", -1).to_list(20)

    results = []
    for inv in invites:
        created = inv.get("created_at")
        expires = inv.get("expires_at")
        results.append({
            "id": str(inv["_id"]),
            "coach_username": inv.get("coach_username", ""),
            "message": inv.get("message", ""),
            "role_in_team": inv.get("role_in_team", "athlete"),
            "status": inv.get("status", "pending"),
            "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
            "expires_at": expires.isoformat() if hasattr(expires, 'isoformat') else str(expires) if expires else None,
        })

    return {"invites": results, "total": len(results)}


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════

def _get_dna_top_stat(dna: dict) -> dict:
    """Get the top DNA stat for display."""
    if not dna or not isinstance(dna, dict):
        return {"stat": "N/A", "value": 0}
    top_key = max(dna, key=dna.get)
    return {"stat": top_key, "value": dna[top_key]}
