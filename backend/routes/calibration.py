"""
ARENAKORE — SMART CALIBRATION ENGINE (Build 37 · Onboarding Adattivo)
═══════════════════════════════════════════════════════════════════════
Three pillars:
  1. BIVIO QUALITATIVO — Level-adaptive baseline test selection (Pro vs Rookie)
  2. PRIMO K-SCAN — Rep counting, fluidity analysis, biometric effort + 3 passport screenshots
  3. GATE 48 ORE — 48h recalibration block, user state = 'calibrating'

Collection: leverages `activity_log` for persistence + `users` for calibration state
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/calibration", tags=["calibration"])


# ═══════════════════════════════════════════════════════════════
# BASELINE TEST PROTOCOLS — LEVEL-ADAPTIVE
# ═══════════════════════════════════════════════════════════════

# Rookie: basic coordination, fundamental movement patterns
ROOKIE_PROTOCOLS = {
    "default": {
        "name": "K-SCAN BASELINE · ROOKIE",
        "description": "Test di coordinazione base per calibrare il tuo DNA atletico",
        "exercises": [
            {
                "id": "squat_basic",
                "name": "Squat a Corpo Libero",
                "description": "Esegui squat controllati con ROM completo",
                "target_reps": 10,
                "duration_seconds": 60,
                "monitoring": ["rep_count", "rom_depth", "balance"],
                "complexity": "basic",
                "icon": "body",
            },
            {
                "id": "march_in_place",
                "name": "Marcia sul Posto",
                "description": "Alza le ginocchia in modo alternato e ritmico",
                "target_reps": 20,
                "duration_seconds": 45,
                "monitoring": ["rep_count", "cadence", "symmetry"],
                "complexity": "basic",
                "icon": "walk",
            },
        ],
        "total_duration": 120,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "balance_score"],
    },
    "Atletica Leggera": {
        "name": "K-SCAN BASELINE · ROOKIE ATHLETICS",
        "description": "Test di base per corridori e saltatori",
        "exercises": [
            {
                "id": "high_knees",
                "name": "Skip Alto",
                "description": "Ginocchia alte con ritmo costante",
                "target_reps": 20,
                "duration_seconds": 45,
                "monitoring": ["rep_count", "knee_height", "cadence"],
                "complexity": "basic",
                "icon": "walk",
            },
            {
                "id": "squat_basic",
                "name": "Squat Statico",
                "description": "Mantieni la posizione di squat per analisi posturale",
                "target_reps": 5,
                "duration_seconds": 60,
                "monitoring": ["hold_time", "posture", "stability"],
                "complexity": "basic",
                "icon": "body",
            },
        ],
        "total_duration": 120,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "stability_score"],
    },
}

# Pro/Elite: complex monitored exercises demanding full biomechanical analysis
PRO_PROTOCOLS = {
    "default": {
        "name": "K-SCAN BASELINE · PRO",
        "description": "Analisi biomeccanica avanzata per atleti professionisti",
        "exercises": [
            {
                "id": "pistol_squat",
                "name": "Pistol Squat Alternato",
                "description": "Squat su gamba singola con massima profondità e controllo",
                "target_reps": 6,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "rom_depth", "balance", "explosivity", "time_under_tension"],
                "complexity": "advanced",
                "icon": "flash",
            },
            {
                "id": "burpee_complex",
                "name": "Burpee Esplosivo",
                "description": "Burpee con salto massimale e atterraggio controllato",
                "target_reps": 8,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "explosivity", "cadence", "heart_rate", "recovery_time"],
                "complexity": "advanced",
                "icon": "flame",
            },
        ],
        "total_duration": 180,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "explosivity_pct", "time_under_tension", "heart_rate_avg"],
    },
    "CrossFit": {
        "name": "K-SCAN BASELINE · PRO CROSSFIT",
        "description": "Protocollo avanzato per CrossFitter con analisi multi-plane",
        "exercises": [
            {
                "id": "thruster_air",
                "name": "Air Thruster",
                "description": "Squat + press esplosivo senza peso. Analisi catena cinetica completa",
                "target_reps": 10,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "rom_depth", "explosivity", "cadence", "overhead_stability"],
                "complexity": "advanced",
                "icon": "flash",
            },
            {
                "id": "burpee_complex",
                "name": "Burpee Box Jump",
                "description": "Burpee con salto su box immaginario. Massima esplosività",
                "target_reps": 8,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "explosivity", "landing_control", "heart_rate"],
                "complexity": "advanced",
                "icon": "flame",
            },
        ],
        "total_duration": 180,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "explosivity_pct", "time_under_tension", "heart_rate_avg"],
    },
    "Boxing": {
        "name": "K-SCAN BASELINE · PRO BOXING",
        "description": "Protocollo per pugili: ritmo, coordinazione, potenza",
        "exercises": [
            {
                "id": "shadow_combo",
                "name": "Shadow Boxing Combo",
                "description": "Jab-Cross-Hook-Uppercut con footwork. Analisi velocità e simmetria",
                "target_reps": 12,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "punch_speed", "symmetry", "footwork", "cadence"],
                "complexity": "advanced",
                "icon": "fitness",
            },
            {
                "id": "squat_jump",
                "name": "Squat Jump Esplosivo",
                "description": "Squat con salto massimale. Analisi potenza gambe",
                "target_reps": 8,
                "duration_seconds": 60,
                "monitoring": ["rep_count", "explosivity", "landing_control", "height"],
                "complexity": "advanced",
                "icon": "flash",
            },
        ],
        "total_duration": 150,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "explosivity_pct", "punch_speed", "symmetry_score"],
    },
    "MMA": {
        "name": "K-SCAN BASELINE · PRO MMA",
        "description": "Protocollo multi-disciplina per fighter completi",
        "exercises": [
            {
                "id": "shadow_combo",
                "name": "Combo Striking",
                "description": "Sequenza colpi + calci controllati",
                "target_reps": 10,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "speed", "balance", "power"],
                "complexity": "advanced",
                "icon": "fitness",
            },
            {
                "id": "sprawl_getup",
                "name": "Sprawl & Get Up",
                "description": "Sprawl difensivo + rialzata esplosiva",
                "target_reps": 8,
                "duration_seconds": 90,
                "monitoring": ["rep_count", "reaction_time", "explosivity", "recovery"],
                "complexity": "advanced",
                "icon": "flash",
            },
        ],
        "total_duration": 180,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "explosivity_pct", "reaction_time"],
    },
}

# Amateur / Semi-Pro: intermediate
AMATEUR_PROTOCOLS = {
    "default": {
        "name": "K-SCAN BASELINE · INTERMEDIATE",
        "description": "Test intermedio per atleti amatoriali con esperienza",
        "exercises": [
            {
                "id": "squat_jump",
                "name": "Squat Jump",
                "description": "Squat con salto esplosivo",
                "target_reps": 8,
                "duration_seconds": 60,
                "monitoring": ["rep_count", "explosivity", "landing_control"],
                "complexity": "intermediate",
                "icon": "flash",
            },
            {
                "id": "plank_hold",
                "name": "Plank Dinamico",
                "description": "Plank con tocco spalla alternato",
                "target_reps": 12,
                "duration_seconds": 60,
                "monitoring": ["rep_count", "stability", "core_engagement"],
                "complexity": "intermediate",
                "icon": "body",
            },
        ],
        "total_duration": 140,
        "screenshot_phases": ["start", "peak_effort", "finish"],
        "kpi_tracked": ["rep_count", "fluidity_score", "stability_score", "explosivity_pct"],
    },
}


def _get_protocol(level: str, sport: str) -> dict:
    """Select the right baseline test protocol based on level + sport."""
    level_upper = (level or "ROOKIE").upper()

    if level_upper in ("PRO", "ELITE"):
        pool = PRO_PROTOCOLS
    elif level_upper in ("AMATEUR", "SEMI_PRO", "SEMI-PRO"):
        pool = AMATEUR_PROTOCOLS
    else:
        pool = ROOKIE_PROTOCOLS

    # Try sport-specific, fallback to default
    protocol = pool.get(sport) or pool.get("default", ROOKIE_PROTOCOLS["default"])
    return protocol


# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class CalibrationCompleteRequest(BaseModel):
    exercises_completed: List[dict]  # [{exercise_id, actual_reps, duration_seconds, quality_score}]
    fluidity_score: float = 0.0     # 0-100
    biometric_effort: float = 0.0   # 0-100 (perceived exertion mapped from biometric data)
    heart_rate_avg: Optional[float] = None
    time_under_tension: Optional[float] = None
    rep_regularity: Optional[float] = None
    screenshots: Optional[List[str]] = None  # 3 base64 strings (start, peak, finish)
    telemetry: Optional[dict] = None  # Full telemetry from Puppet Motion Deck


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/protocol")
async def get_calibration_protocol(current_user: dict = Depends(get_current_user)):
    """
    BIVIO QUALITATIVO: Returns the appropriate baseline test protocol
    based on the user's declared level and preferred sport.

    Pro/Elite → Complex exercises monitored by Puppet Motion Deck
    Rookie → Basic coordination movements
    """
    level = current_user.get("training_level", "ROOKIE")
    sport = current_user.get("preferred_sport", "Fitness")
    gender = current_user.get("gender")
    age = current_user.get("age")

    # Check if user already completed calibration
    calibration_status = current_user.get("calibration_status", "pending")
    baseline_at = current_user.get("baseline_scanned_at")

    if baseline_at and calibration_status == "calibrating":
        now = datetime.now(timezone.utc)
        if baseline_at.tzinfo is None:
            baseline_at = baseline_at.replace(tzinfo=timezone.utc)
        hours_since = (now - baseline_at).total_seconds() / 3600
        hours_remaining = max(0, 48 - hours_since)

        if hours_remaining > 0:
            return {
                "status": "calibrating",
                "message": f"Calibrazione in corso. Attendi {int(hours_remaining)}h {int((hours_remaining % 1) * 60):02d}m",
                "hours_remaining": round(hours_remaining, 1),
                "protocol": None,
                "can_recalibrate": False,
            }

    protocol = _get_protocol(level, sport)

    return {
        "status": "ready",
        "message": f"Protocollo {protocol['name']} pronto",
        "protocol": {
            **protocol,
            "athlete_context": {
                "level": level,
                "sport": sport,
                "gender": gender,
                "age": age,
            },
        },
        "can_recalibrate": calibration_status != "calibrating",
    }


@router.post("/complete")
async def complete_calibration(
    body: CalibrationCompleteRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    PRIMO K-SCAN COMPLETION:
    1. Saves rep counts, fluidity, biometric effort, and 3 passport screenshots
    2. Sets baseline_scanned_at = now
    3. Sets calibration_status = 'calibrating' (triggers 48h gate)
    4. Creates activity_log entry with full data
    5. Computes initial DNA markers
    """
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)
    level = current_user.get("training_level", "ROOKIE")
    sport = current_user.get("preferred_sport", "Fitness")

    # Check 48h block
    existing_baseline = current_user.get("baseline_scanned_at")
    if existing_baseline:
        if existing_baseline.tzinfo is None:
            existing_baseline = existing_baseline.replace(tzinfo=timezone.utc)
        hours_since = (now - existing_baseline).total_seconds() / 3600
        if hours_since < 48 and current_user.get("calibration_status") == "calibrating":
            raise HTTPException(
                423,
                f"Calibrazione già in corso. Attendi ancora {int(48 - hours_since)}h per ricalibrazione."
            )

    # ── Process exercise results
    total_reps = 0
    total_quality = 0
    total_duration = 0
    exercise_results = []
    for ex in body.exercises_completed:
        reps = ex.get("actual_reps", 0)
        total_reps += reps
        total_quality += ex.get("quality_score", 50)
        total_duration += ex.get("duration_seconds", 0)
        exercise_results.append({
            "exercise_id": ex.get("exercise_id"),
            "actual_reps": reps,
            "target_reps": ex.get("target_reps", 0),
            "duration_seconds": ex.get("duration_seconds", 0),
            "quality_score": ex.get("quality_score", 50),
            "completion_pct": min(100, int(reps / max(1, ex.get("target_reps", 1)) * 100)),
        })

    avg_quality = total_quality / max(1, len(exercise_results))

    # ── Compute initial DNA markers
    dna_markers = {
        "power": min(100, body.biometric_effort * 0.6 + avg_quality * 0.4),
        "endurance": min(100, body.fluidity_score * 0.5 + (body.rep_regularity or 50) * 0.5),
        "flexibility": min(100, avg_quality * 0.7 + body.fluidity_score * 0.3),
        "speed": min(100, body.biometric_effort * 0.5 + body.fluidity_score * 0.5),
        "stability": min(100, (body.rep_regularity or 50) * 0.6 + avg_quality * 0.4),
    }

    # ── Process screenshots (3 for Athlete Passport)
    media_doc = {}
    if body.screenshots:
        clean_screenshots = [s for s in body.screenshots[:3] if s and len(s) <= 400_000]
        media_doc["screenshots"] = clean_screenshots
        if clean_screenshots:
            media_doc["thumbnail"] = clean_screenshots[0]

    # ── Telemetry
    telemetry_doc = {
        "heart_rate_avg": body.heart_rate_avg,
        "time_under_tension": body.time_under_tension,
        "rep_regularity": body.rep_regularity,
        "fluidity_score": body.fluidity_score,
        "biometric_effort": body.biometric_effort,
    }
    if body.telemetry:
        telemetry_doc.update({k: v for k, v in body.telemetry.items() if v is not None})
    telemetry_doc = {k: v for k, v in telemetry_doc.items() if v is not None}

    # ── K-Flux reward based on level
    flux_map = {"ROOKIE": 30, "AMATEUR": 50, "SEMI_PRO": 70, "PRO": 100, "ELITE": 150}
    flux_earned = flux_map.get(level.upper(), 30)

    # ── Save activity_log entry
    activity_doc = {
        "user_id": user_id,
        "username": current_user.get("username", "KORE"),
        "tipo": "CALIBRAZIONE",
        "template_id": None,
        "template_source": "system",
        "template_name": f"K-SCAN BASELINE · {level.upper()}",
        "disciplina": sport,
        "exercise_type": "calibration_baseline",
        "result": {
            "type": "COMPOSITE",
            "total_reps": total_reps,
            "avg_quality": round(avg_quality, 1),
            "fluidity": round(body.fluidity_score, 1),
            "exercises": exercise_results,
        },
        "kpi": {
            "quality_score": round(avg_quality, 1),
            "fluidity_score": round(body.fluidity_score, 1),
            "biometric_effort": round(body.biometric_effort, 1),
        },
        "flux_earned": flux_earned,
        "flux_type": "vital",
        "flux_color": "cyan" if flux_earned >= 100 else "green",
        "duration_seconds": total_duration or None,
        "nexus_verified": True,
        "is_certified": True,
        "media": media_doc,
        "telemetry": telemetry_doc,
        "dna_markers": dna_markers,
        "extra_meta": {"calibration_type": "baseline", "level": level, "sport": sport},
        "completed_at": now,
        "created_at": now,
    }
    activity_result = await db.activity_log.insert_one(activity_doc)

    # ── Update user: set calibration state + initial DNA + baseline timestamp
    update_fields = {
        "baseline_scanned_at": now,
        "calibration_status": "calibrating",
        "calibration_completed_at": now,
        "dna": dna_markers,
        "dna_source": "calibration_baseline",
        "onboarding_completed": True,
        "is_nexus_certified": True,
    }

    # Also award K-Flux
    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": update_fields,
            "$inc": {"ak_credits": flux_earned, "xp": flux_earned * 2},
        },
    )

    # Compute 48h countdown
    gate_unlock_at = now + timedelta(hours=48)

    return {
        "status": "calibrating",
        "message": "K-Scan Baseline completato! Calibrazione in corso.",
        "activity_id": str(activity_result.inserted_id),
        "calibration": {
            "started_at": now.isoformat(),
            "gate_unlock_at": gate_unlock_at.isoformat(),
            "hours_remaining": 48,
            "level": level,
            "sport": sport,
        },
        "results": {
            "total_reps": total_reps,
            "avg_quality": round(avg_quality, 1),
            "fluidity_score": round(body.fluidity_score, 1),
            "biometric_effort": round(body.biometric_effort, 1),
            "dna_markers": dna_markers,
            "flux_earned": flux_earned,
            "screenshots_saved": len(media_doc.get("screenshots", [])),
        },
    }


@router.get("/status")
async def get_calibration_status(current_user: dict = Depends(get_current_user)):
    """
    GATE 48 ORE: Returns the current calibration status and countdown.
    """
    now = datetime.now(timezone.utc)
    cal_status = current_user.get("calibration_status", "pending")
    baseline_at = current_user.get("baseline_scanned_at")

    if not baseline_at:
        return {
            "status": "pending",
            "message": "Nessuna calibrazione effettuata. Completa il tuo primo K-Scan.",
            "hours_remaining": None,
            "can_recalibrate": True,
            "dna": None,
        }

    if baseline_at.tzinfo is None:
        baseline_at = baseline_at.replace(tzinfo=timezone.utc)

    hours_since = (now - baseline_at).total_seconds() / 3600

    if cal_status == "calibrating" and hours_since < 48:
        hours_remaining = 48 - hours_since
        return {
            "status": "calibrating",
            "message": f"DNA in elaborazione. Gate si apre tra {int(hours_remaining)}h {int((hours_remaining % 1) * 60):02d}m",
            "hours_remaining": round(hours_remaining, 1),
            "gate_unlock_at": (baseline_at + timedelta(hours=48)).isoformat(),
            "can_recalibrate": False,
            "dna": current_user.get("dna"),
        }

    # 48h passed or already 'ready'
    if cal_status == "calibrating" and hours_since >= 48:
        # Auto-upgrade status
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"calibration_status": "ready"}},
        )
        cal_status = "ready"

    return {
        "status": cal_status,
        "message": "Calibrazione completata. Sei pronto per le sfide NÈXUS!",
        "hours_remaining": 0,
        "gate_unlock_at": None,
        "can_recalibrate": True,
        "dna": current_user.get("dna"),
        "baseline_scanned_at": baseline_at.isoformat(),
    }
