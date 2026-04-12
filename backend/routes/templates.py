"""
ARENAKORE — TEMPLATE ENGINE v2 (Build 36 · RE-ENGINEERING)
═══════════════════════════════════════════════════════════
Three distinct MongoDB collections:
  1. system_templates  — Immutable, multi-discipline (created by platform)
  2. coach_templates   — Pro creations by verified Coaches
  3. base_templates    — Simple social challenges for quick 1v1

EVERY template has `requires_nexus_bio: bool`.
If True, the challenge funnel blocks users without a valid (non-expired) scan.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user, compute_level

router = APIRouter(prefix="/api/templates/v2", tags=["templates-v2"])


# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class CoachTemplateCreate(BaseModel):
    name: str
    discipline: str           # "Fitness" | "Basket" | "Golf" | "Running" | "Boxe" | "MMA" | "Calisthenics"
    exercise_type: str        # "squat" | "punch" | "corda" | "push_up" | "plank" | "custom"
    description: str = ""
    target_reps: int = 10
    target_time_seconds: int = 60
    rest_seconds: int = 30
    rounds: int = 1
    difficulty: str = "medium" # "easy" | "medium" | "hard" | "extreme"
    video_url: Optional[str] = None       # Tutorial video link
    kpi_metrics: Optional[list] = None    # e.g. ["reps_per_minute", "peak_force", "consistency"]
    requires_nexus_bio: bool = False
    xp_reward: int = 100
    tags: Optional[list] = None           # ["forza", "esplosività", "upper_body"]


class BaseTemplateCreate(BaseModel):
    name: str
    discipline: str
    exercise_type: str
    description: str = ""
    target_reps: int = 10
    target_time_seconds: int = 60
    difficulty: str = "easy"
    requires_nexus_bio: bool = False
    xp_reward: int = 50


# ═══════════════════════════════════════════════════════════════
# SYSTEM TEMPLATES — Read-only, seeded on startup
# ═══════════════════════════════════════════════════════════════

SYSTEM_TEMPLATES_SEED = [
    {
        "code": "SYS_BIO_SYNC",
        "name": "BIO-SYNC PROTOCOL",
        "discipline": "Multidisciplina",
        "exercise_type": "squat",
        "description": "Protocollo biometrico di sincronizzazione DNA. Misura forza, resistenza e velocità neuromuscolare in una sessione unica di 90 secondi.",
        "target_reps": 20,
        "target_time_seconds": 90,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "hard",
        "requires_nexus_bio": True,
        "xp_reward": 300,
        "kpi_metrics": ["reps_per_minute", "peak_acceleration", "consistency_score", "fatigue_index"],
        "tags": ["biometria", "dna", "calibrazione"],
        "certified_by": "ARENAKORE Lab",
        "icon": "body",
        "color": "#00E5FF",
    },
    {
        "code": "SYS_POWER_TEST",
        "name": "POWER TEST 60",
        "discipline": "Fitness",
        "exercise_type": "squat",
        "description": "Test di potenza esplosiva: massime ripetizioni di squat in 60 secondi con form controllato.",
        "target_reps": 25,
        "target_time_seconds": 60,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "hard",
        "requires_nexus_bio": True,
        "xp_reward": 250,
        "kpi_metrics": ["reps_per_minute", "peak_force", "form_score"],
        "tags": ["forza", "esplosività", "lower_body"],
        "certified_by": "ARENAKORE Lab",
        "icon": "barbell",
        "color": "#FF3B30",
    },
    {
        "code": "SYS_AGILITY_RUSH",
        "name": "AGILITY RUSH",
        "discipline": "Fitness",
        "exercise_type": "punch",
        "description": "Test di agilità e tempo di reazione: colpi rapidi con massima precisione in 45 secondi.",
        "target_reps": 40,
        "target_time_seconds": 45,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "medium",
        "requires_nexus_bio": True,
        "xp_reward": 200,
        "kpi_metrics": ["strikes_per_minute", "reaction_time", "accuracy"],
        "tags": ["agilità", "velocità", "reazione"],
        "certified_by": "ARENAKORE Lab",
        "icon": "hand-left",
        "color": "#00E5FF",
    },
    {
        "code": "SYS_ENDURANCE_WALL",
        "name": "ENDURANCE WALL",
        "discipline": "Fitness",
        "exercise_type": "squat",
        "description": "Test di resistenza massima: mantieni il ritmo per 120 secondi. Chi molla per primo, perde.",
        "target_reps": 30,
        "target_time_seconds": 120,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "extreme",
        "requires_nexus_bio": True,
        "xp_reward": 350,
        "kpi_metrics": ["total_reps", "fatigue_curve", "stamina_index"],
        "tags": ["resistenza", "mental_toughness", "cardio"],
        "certified_by": "ARENAKORE Lab",
        "icon": "timer",
        "color": "#FFD700",
    },
    {
        "code": "SYS_CORDA_SPEED",
        "name": "SPEED ROPE CHALLENGE",
        "discipline": "Fitness",
        "exercise_type": "corda",
        "description": "Salto con la corda cronometrato: massimi salti in 60 secondi. Misura coordinazione e cardio.",
        "target_reps": 100,
        "target_time_seconds": 60,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 150,
        "kpi_metrics": ["jumps_per_minute", "misses", "rhythm_consistency"],
        "tags": ["cardio", "coordinazione", "corda"],
        "certified_by": "ARENAKORE Lab",
        "icon": "fitness",
        "color": "#32D74B",
    },
    {
        "code": "SYS_PUSH_UP_BLITZ",
        "name": "PUSH-UP BLITZ",
        "discipline": "Calisthenics",
        "exercise_type": "push_up",
        "description": "Massime flessioni in 45 secondi. Petto a terra, braccia distese. No scorciatoie.",
        "target_reps": 30,
        "target_time_seconds": 45,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 130,
        "kpi_metrics": ["reps_total", "form_score", "cadence"],
        "tags": ["upper_body", "push", "forza"],
        "certified_by": "ARENAKORE Lab",
        "icon": "body",
        "color": "#FF6B00",
    },
    {
        "code": "SYS_PLANK_HOLD",
        "name": "PLANK IRON HOLD",
        "discipline": "Calisthenics",
        "exercise_type": "plank",
        "description": "Resistenza isometrica: mantieni il plank il più a lungo possibile. La biometria monitora il cedimento.",
        "target_reps": 1,
        "target_time_seconds": 180,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "hard",
        "requires_nexus_bio": False,
        "xp_reward": 180,
        "kpi_metrics": ["hold_duration", "stability_score", "core_engagement"],
        "tags": ["core", "isometria", "mental_toughness"],
        "certified_by": "ARENAKORE Lab",
        "icon": "body",
        "color": "#BF5AF2",
    },
    {
        "code": "SYS_BASKET_FREE_THROW",
        "name": "FREE THROW PRECISION",
        "discipline": "Basket",
        "exercise_type": "custom",
        "description": "Sfida di tiri liberi: percentuale di canestro su 20 tiri. Registra manualmente o con video proof.",
        "target_reps": 20,
        "target_time_seconds": 300,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 200,
        "kpi_metrics": ["accuracy_pct", "streak_max", "total_made"],
        "tags": ["basket", "precisione", "tiro"],
        "certified_by": "ARENAKORE Lab",
        "icon": "basketball",
        "color": "#FF6B00",
    },
    {
        "code": "SYS_GOLF_PUTTING",
        "name": "PUTTING MASTER",
        "discipline": "Golf",
        "exercise_type": "custom",
        "description": "9 buche di putting da distanze variabili. Minimo colpi totali vince.",
        "target_reps": 9,
        "target_time_seconds": 600,
        "rest_seconds": 0,
        "rounds": 1,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 180,
        "kpi_metrics": ["total_strokes", "one_putt_pct", "avg_distance"],
        "tags": ["golf", "putting", "precisione"],
        "certified_by": "ARENAKORE Lab",
        "icon": "golf",
        "color": "#2ECC71",
    },
    {
        "code": "SYS_SPRINT_100",
        "name": "SPRINT 100M",
        "discipline": "Running",
        "exercise_type": "custom",
        "description": "Sprint da 100 metri cronometrato. 3 tentativi, vale il migliore.",
        "target_reps": 3,
        "target_time_seconds": 300,
        "rest_seconds": 120,
        "rounds": 3,
        "difficulty": "hard",
        "requires_nexus_bio": False,
        "xp_reward": 200,
        "kpi_metrics": ["best_time", "avg_time", "split_consistency"],
        "tags": ["running", "sprint", "velocità"],
        "certified_by": "ARENAKORE Lab",
        "icon": "walk",
        "color": "#FFD700",
    },
]

BASE_TEMPLATES_SEED = [
    {
        "code": "BASE_AEROBIC_LIGHT",
        "name": "CARDIO LEGGERO",
        "discipline": "Fitness",
        "exercise_type": "custom",
        "description": "Sessione cardio leggera: 10 minuti di attività aerobica a ritmo moderato.",
        "target_reps": 1,
        "target_time_seconds": 600,
        "difficulty": "easy",
        "requires_nexus_bio": False,
        "xp_reward": 50,
        "tags": ["cardio", "aerobico", "base"],
        "icon": "heart",
        "color": "#FF6B6B",
    },
    {
        "code": "BASE_STRETCH",
        "name": "STRETCHING DINAMICO",
        "discipline": "Fitness",
        "exercise_type": "custom",
        "description": "5 minuti di stretching dinamico pre-workout. Ideale per riscaldamento.",
        "target_reps": 1,
        "target_time_seconds": 300,
        "difficulty": "easy",
        "requires_nexus_bio": False,
        "xp_reward": 30,
        "tags": ["stretching", "mobilità", "warm_up"],
        "icon": "body",
        "color": "#00E5FF",
    },
    {
        "code": "BASE_BURPEE_QUICK",
        "name": "BURPEE QUICK 30",
        "discipline": "Fitness",
        "exercise_type": "custom",
        "description": "30 secondi di burpee: quante ripetizioni riesci a fare? Sfida 1v1 veloce.",
        "target_reps": 15,
        "target_time_seconds": 30,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 80,
        "tags": ["hiit", "full_body", "1v1"],
        "icon": "flame",
        "color": "#FF3B30",
    },
    {
        "code": "BASE_WALL_SIT",
        "name": "WALL SIT DUEL",
        "discipline": "Fitness",
        "exercise_type": "custom",
        "description": "Chi resiste di più a schiena al muro con gambe a 90°? Sfida di resistenza pura.",
        "target_reps": 1,
        "target_time_seconds": 300,
        "difficulty": "medium",
        "requires_nexus_bio": False,
        "xp_reward": 70,
        "tags": ["isometria", "gambe", "resistenza"],
        "icon": "timer",
        "color": "#FFD700",
    },
    {
        "code": "BASE_CORDA_1MIN",
        "name": "SALTO CORDA 1 MIN",
        "discipline": "Fitness",
        "exercise_type": "corda",
        "description": "1 minuto di salto con la corda. Conta i salti. Sfida amichevole.",
        "target_reps": 80,
        "target_time_seconds": 60,
        "difficulty": "easy",
        "requires_nexus_bio": False,
        "xp_reward": 60,
        "tags": ["corda", "cardio", "coordinazione"],
        "icon": "fitness",
        "color": "#32D74B",
    },
    {
        "code": "BASE_SIT_UP_BLITZ",
        "name": "SIT-UP BLITZ",
        "discipline": "Calisthenics",
        "exercise_type": "custom",
        "description": "45 secondi di addominali. Massime ripetizioni. Semplice e brutale.",
        "target_reps": 25,
        "target_time_seconds": 45,
        "difficulty": "easy",
        "requires_nexus_bio": False,
        "xp_reward": 60,
        "tags": ["core", "addominali", "1v1"],
        "icon": "body",
        "color": "#FF6B00",
    },
]


def _template_to_response(t: dict, source: str) -> dict:
    """Normalize a template document for API response."""
    return {
        "id": str(t["_id"]) if "_id" in t else t.get("code", ""),
        "code": t.get("code", ""),
        "source": source,
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
        # Coach-specific
        "video_url": t.get("video_url"),
        "certified_by": t.get("certified_by"),
        "coach_id": str(t["coach_id"]) if t.get("coach_id") else None,
        "coach_name": t.get("coach_name"),
        "created_at": t["created_at"].isoformat() if t.get("created_at") else None,
        "uses_count": t.get("uses_count", 0),
    }


# ═══════════════════════════════════════════════════════════════
# SEED — Idempotent startup seeder
# ═══════════════════════════════════════════════════════════════

async def seed_templates():
    """Seed system_templates and base_templates if empty. Idempotent."""
    now = datetime.now(timezone.utc)

    # System Templates
    existing_sys = await db.system_templates.count_documents({})
    if existing_sys == 0:
        docs = []
        for t in SYSTEM_TEMPLATES_SEED:
            docs.append({**t, "created_at": now, "source": "system", "immutable": True, "uses_count": 0})
        if docs:
            await db.system_templates.insert_many(docs)
            print(f"[SEED] Inserted {len(docs)} system_templates")

    # Base Templates
    existing_base = await db.base_templates.count_documents({})
    if existing_base == 0:
        docs = []
        for t in BASE_TEMPLATES_SEED:
            docs.append({**t, "created_at": now, "source": "base", "uses_count": 0})
        if docs:
            await db.base_templates.insert_many(docs)
            print(f"[SEED] Inserted {len(docs)} base_templates")

    # Indexes
    await db.system_templates.create_index("code", unique=True)
    await db.base_templates.create_index("code", unique=True)
    await db.coach_templates.create_index([("coach_id", 1), ("created_at", -1)])


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/system")
async def list_system_templates(current_user: dict = Depends(get_current_user)):
    """List all immutable system templates."""
    templates = await db.system_templates.find({}).sort("name", 1).to_list(100)
    return [_template_to_response(t, "system") for t in templates]


@router.get("/base")
async def list_base_templates(current_user: dict = Depends(get_current_user)):
    """List all base (simple social) templates."""
    templates = await db.base_templates.find({}).sort("name", 1).to_list(100)
    return [_template_to_response(t, "base") for t in templates]


@router.get("/coach")
async def list_coach_templates(
    coach_id: str = None,
    discipline: str = None,
    current_user: dict = Depends(get_current_user),
):
    """List coach templates. Optionally filter by coach_id or discipline."""
    query: dict = {}
    if coach_id:
        try:
            query["coach_id"] = ObjectId(coach_id)
        except Exception:
            pass
    if discipline:
        query["discipline"] = {"$regex": discipline, "$options": "i"}
    templates = await db.coach_templates.find(query).sort("created_at", -1).to_list(200)
    return [_template_to_response(t, "coach") for t in templates]


@router.get("/mine")
async def list_my_coach_templates(current_user: dict = Depends(get_current_user)):
    """List current coach's own templates."""
    templates = await db.coach_templates.find(
        {"coach_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(100)
    return [_template_to_response(t, "coach") for t in templates]


@router.post("/coach")
async def create_coach_template(
    body: CoachTemplateCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a Coach Template. Requires completed coach onboarding."""
    # Verify coach status
    coach_data = current_user.get("coach_data")
    user_role = current_user.get("role", "").upper()
    is_admin = current_user.get("is_admin", False) or current_user.get("is_founder", False)

    if not is_admin and user_role not in ("COACH", "GYM_OWNER"):
        raise HTTPException(403, "Solo Coach e Gym Owner possono creare template professionali")
    if not is_admin and (not coach_data or not coach_data.get("onboarding_completed")):
        raise HTTPException(403, "Completa il Coach Onboarding prima di creare template")

    doc = {
        "coach_id": current_user["_id"],
        "coach_name": current_user.get("username", "Coach"),
        "name": body.name.strip()[:80],
        "discipline": body.discipline,
        "exercise_type": body.exercise_type,
        "description": body.description.strip()[:500] if body.description else "",
        "target_reps": body.target_reps,
        "target_time_seconds": body.target_time_seconds,
        "rest_seconds": body.rest_seconds,
        "rounds": body.rounds,
        "difficulty": body.difficulty,
        "video_url": body.video_url,
        "kpi_metrics": body.kpi_metrics or [],
        "requires_nexus_bio": body.requires_nexus_bio,
        "xp_reward": body.xp_reward,
        "tags": body.tags or [],
        "source": "coach",
        "verified": bool(coach_data and coach_data.get("verified")),
        "created_at": datetime.now(timezone.utc),
        "uses_count": 0,
    }

    result = await db.coach_templates.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update coach's template list reference
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$addToSet": {"coach_data.templates_created": result.inserted_id}}
    )

    return _template_to_response(doc, "coach")


@router.delete("/coach/{template_id}")
async def delete_coach_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a coach template (only owner or admin)."""
    try:
        oid = ObjectId(template_id)
    except Exception:
        raise HTTPException(400, "ID invalido")

    is_admin = current_user.get("is_admin", False) or current_user.get("is_founder", False)
    query = {"_id": oid}
    if not is_admin:
        query["coach_id"] = current_user["_id"]

    result = await db.coach_templates.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(404, "Template non trovato o non sei il proprietario")
    return {"status": "deleted"}


@router.get("/all")
async def list_all_templates(
    discipline: str = None,
    requires_bio: bool = None,
    current_user: dict = Depends(get_current_user),
):
    """Unified endpoint: return all templates from all 3 sources, optionally filtered."""
    query: dict = {}
    if discipline:
        query["discipline"] = {"$regex": discipline, "$options": "i"}
    if requires_bio is not None:
        query["requires_nexus_bio"] = requires_bio

    sys_q = {**query}
    base_q = {**query}
    coach_q = {**query}

    sys_templates = await db.system_templates.find(sys_q).to_list(100)
    base_templates = await db.base_templates.find(base_q).to_list(100)
    coach_templates = await db.coach_templates.find(coach_q).sort("created_at", -1).to_list(200)

    result = {
        "system": [_template_to_response(t, "system") for t in sys_templates],
        "base": [_template_to_response(t, "base") for t in base_templates],
        "coach": [_template_to_response(t, "coach") for t in coach_templates],
        "total": len(sys_templates) + len(base_templates) + len(coach_templates),
    }
    return result


@router.get("/check-bio/{template_id}")
async def check_bio_requirement(
    template_id: str,
    source: str = "system",
    current_user: dict = Depends(get_current_user),
):
    """
    NEXUS FUNNEL GATE: Check if a user can use this template.
    If template.requires_nexus_bio == True, validate the user's scan status.
    Returns: {allowed: bool, reason, scan_status, countdown}
    """
    # Find template in the right collection
    coll_map = {"system": db.system_templates, "base": db.base_templates, "coach": db.coach_templates}
    coll = coll_map.get(source)
    if coll is None:
        raise HTTPException(400, f"Source invalida: {source}")

    template = None
    try:
        template = await coll.find_one({"_id": ObjectId(template_id)})
    except Exception:
        # Try by code for system/base
        template = await coll.find_one({"code": template_id})
    if not template:
        raise HTTPException(404, "Template non trovato")

    requires_bio = template.get("requires_nexus_bio", False)

    if not requires_bio:
        return {
            "allowed": True,
            "reason": "Questo template non richiede biometria",
            "requires_nexus_bio": False,
            "template_name": template["name"],
            "scan_status": None,
        }

    # ── Check NEXUS scan status ──
    dna = current_user.get("dna")
    if not dna:
        return {
            "allowed": False,
            "reason": "Devi completare la tua prima Bio-Scan NÈXUS",
            "requires_nexus_bio": True,
            "template_name": template["name"],
            "scan_status": "no_scan",
            "countdown": None,
        }

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    baseline_at = current_user.get("baseline_scanned_at")
    validation_at = current_user.get("validation_scanned_at")

    # Ensure timezone
    if baseline_at and baseline_at.tzinfo is None:
        baseline_at = baseline_at.replace(tzinfo=timezone.utc)
    if validation_at and validation_at.tzinfo is None:
        validation_at = validation_at.replace(tzinfo=timezone.utc)

    # No validation yet → check 48h calibration
    if not validation_at:
        if baseline_at:
            hours_since = (now - baseline_at).total_seconds() / 3600
            hours_remaining = max(0, 48 - hours_since)
            if hours_remaining > 0:
                h, m = int(hours_remaining), int((hours_remaining % 1) * 60)
                return {
                    "allowed": False,
                    "reason": f"Scan in calibrazione. Attendi {h}h {m:02d}m per la validazione",
                    "requires_nexus_bio": True,
                    "template_name": template["name"],
                    "scan_status": "calibrating",
                    "countdown": {"hours": round(hours_remaining, 1), "days": None},
                }
        # Baseline exists, 48h passed, validation available
        return {
            "allowed": True,
            "reason": "Bio-Scan calibrata. Validation scan disponibile.",
            "requires_nexus_bio": True,
            "template_name": template["name"],
            "scan_status": "validation_ready",
            "countdown": None,
        }

    # Has validation → check 30-day maintenance
    days_since = (now.replace(tzinfo=None) - validation_at.replace(tzinfo=None)).days
    if days_since > 30:
        return {
            "allowed": False,
            "reason": "Bio-Scan scaduta. Esegui una nuova Evoluzione per riattivare i template biometrici.",
            "requires_nexus_bio": True,
            "template_name": template["name"],
            "scan_status": "expired",
            "countdown": {"hours": None, "days": 0},
        }

    # Valid scan
    return {
        "allowed": True,
        "reason": f"Bio-Scan valida. Scade tra {30 - days_since} giorni.",
        "requires_nexus_bio": True,
        "template_name": template["name"],
        "scan_status": "valid",
        "countdown": {"hours": None, "days": 30 - days_since},
    }
