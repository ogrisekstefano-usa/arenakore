"""
ARENAKORE — ACTIVITY LOG ENGINE (Build 37 · Archivio Storico & NEXUS Gallery)
═══════════════════════════════════════════════════════════════════════════════
Three pillars:
  1. Activity Log Dinamico — Every session persisted with template_id, result, K-Flux, date, duration
  2. NEXUS Evidence Box — 3 screenshots from Puppet Motion Deck + NEXUS CERTIFIED overlay
  3. Telemetry Display — HR avg, time under tension, rep regularity

Collection: `activity_log` (superset of performance_records, enriched with media & telemetry)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/activity", tags=["activity-log"])


# ═══════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════

class TelemetryData(BaseModel):
    heart_rate_avg: Optional[float] = None
    heart_rate_peak: Optional[float] = None
    time_under_tension: Optional[float] = None    # seconds
    rep_regularity: Optional[float] = None         # 0-100 consistency score
    rep_cadence_std: Optional[float] = None        # standard deviation of rep timing
    calories_burned: Optional[float] = None
    peak_power: Optional[float] = None


class MediaData(BaseModel):
    screenshots: Optional[List[str]] = None        # up to 3 base64 thumbnails
    thumbnail: Optional[str] = None                # primary thumbnail (first frame)


class ActivityLogCreate(BaseModel):
    tipo: str = "ALLENAMENTO"                       # ALLENAMENTO | SFIDA | LIVE_ARENA | COACH_PROGRAM | CREW_BATTLE | DUELLO
    template_id: Optional[str] = None
    template_source: Optional[str] = None           # "system" | "coach" | "base"
    template_name: Optional[str] = None
    disciplina: str = "Fitness"
    exercise_type: str = "squat"
    result: Optional[dict] = None                   # {type: "REPS", value: 25, unit: "rep"} or {type: "TIME", value: 90, unit: "sec"}
    kpi: Optional[dict] = None
    flux_earned: int = 0
    flux_type: Optional[str] = None                 # "vital" | "perform" | "team"
    duration_seconds: Optional[int] = None
    nexus_verified: bool = False
    is_certified: bool = False
    media: Optional[MediaData] = None
    telemetry: Optional[TelemetryData] = None
    source_id: Optional[str] = None
    source_collection: Optional[str] = None
    extra_meta: Optional[dict] = None


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _flux_color(flux: int) -> str:
    """Determine K-Flux color tier based on earned amount."""
    if flux >= 200:
        return "gold"      # Ambra/Gold — exceptional
    if flux >= 100:
        return "cyan"      # Cyan — solid performance
    return "green"         # Verde — base level


def _activity_to_response(a: dict) -> dict:
    """Normalize an activity_log document for API response."""
    media = a.get("media", {})
    telemetry = a.get("telemetry", {})
    result = a.get("result") or a.get("kpi", {}).get("primary_result", {})

    return {
        "id": str(a["_id"]),
        "tipo": a.get("tipo", "ALLENAMENTO"),
        "template_id": a.get("template_id"),
        "template_source": a.get("template_source"),
        "template_name": a.get("template_name"),
        "disciplina": a.get("disciplina", "Fitness"),
        "exercise_type": a.get("exercise_type", "squat"),
        "result": result,
        "kpi": a.get("kpi", {}),
        "flux_earned": a.get("flux_earned", 0),
        "flux_type": a.get("flux_type"),
        "flux_color": _flux_color(a.get("flux_earned", 0)),
        "duration_seconds": a.get("duration_seconds"),
        "nexus_verified": a.get("nexus_verified", False),
        "is_certified": a.get("is_certified", False),
        "completed_at": a["completed_at"].isoformat() if a.get("completed_at") else None,
        # Media: NEXUS Evidence Box
        "media": {
            "screenshots": media.get("screenshots", []),
            "thumbnail": media.get("thumbnail"),
            "has_evidence": len(media.get("screenshots", [])) > 0,
        },
        # Telemetry: Bio-mathematical data
        "telemetry": {
            "heart_rate_avg": telemetry.get("heart_rate_avg"),
            "heart_rate_peak": telemetry.get("heart_rate_peak"),
            "time_under_tension": telemetry.get("time_under_tension"),
            "rep_regularity": telemetry.get("rep_regularity"),
            "rep_cadence_std": telemetry.get("rep_cadence_std"),
            "calories_burned": telemetry.get("calories_burned"),
            "peak_power": telemetry.get("peak_power"),
        },
        "extra_meta": a.get("extra_meta", {}),
    }


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.post("/log")
async def create_activity_log(body: ActivityLogCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new Activity Log entry.
    Called after any session/challenge completion.
    Stores media (screenshots) and telemetry alongside standard KPI.
    """
    now = datetime.now(timezone.utc)

    # Validate media: max 3 screenshots, each max ~200KB base64
    media_doc = {}
    if body.media:
        screenshots = body.media.screenshots or []
        if len(screenshots) > 3:
            screenshots = screenshots[:3]
        # Limit each screenshot to 300KB base64
        clean_screenshots = []
        for s in screenshots:
            if s and len(s) <= 400_000:  # ~300KB binary -> ~400KB base64
                clean_screenshots.append(s)
        media_doc["screenshots"] = clean_screenshots
        if body.media.thumbnail and len(body.media.thumbnail) <= 400_000:
            media_doc["thumbnail"] = body.media.thumbnail
        elif clean_screenshots:
            media_doc["thumbnail"] = clean_screenshots[0]

    # Telemetry document
    telemetry_doc = {}
    if body.telemetry:
        telemetry_doc = {
            "heart_rate_avg": body.telemetry.heart_rate_avg,
            "heart_rate_peak": body.telemetry.heart_rate_peak,
            "time_under_tension": body.telemetry.time_under_tension,
            "rep_regularity": body.telemetry.rep_regularity,
            "rep_cadence_std": body.telemetry.rep_cadence_std,
            "calories_burned": body.telemetry.calories_burned,
            "peak_power": body.telemetry.peak_power,
        }
        # Remove None values
        telemetry_doc = {k: v for k, v in telemetry_doc.items() if v is not None}

    doc = {
        "user_id": current_user["_id"],
        "username": current_user.get("username", "Kore"),
        "tipo": body.tipo,
        "template_id": body.template_id,
        "template_source": body.template_source,
        "template_name": body.template_name,
        "disciplina": body.disciplina,
        "exercise_type": body.exercise_type,
        "result": body.result or body.kpi.get("primary_result") if body.kpi else None,
        "kpi": body.kpi or {},
        "flux_earned": body.flux_earned,
        "flux_type": body.flux_type or "perform",
        "flux_color": _flux_color(body.flux_earned),
        "duration_seconds": body.duration_seconds,
        "nexus_verified": body.nexus_verified,
        "is_certified": body.is_certified,
        "media": media_doc,
        "telemetry": telemetry_doc,
        "source_id": body.source_id,
        "source_collection": body.source_collection,
        "extra_meta": body.extra_meta or {},
        "completed_at": now,
        "created_at": now,
    }

    result = await db.activity_log.insert_one(doc)
    doc["_id"] = result.inserted_id

    return {
        "status": "saved",
        "record_id": str(result.inserted_id),
        "activity": _activity_to_response(doc),
    }


@router.get("/log")
async def get_activity_log(
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    tipo: Optional[str] = Query(None),
    nexus_only: bool = Query(False),
    template_source: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Full Activity Log with pagination and filters.
    Returns records with K-Flux color coding, media presence indicators, and telemetry.
    """
    user_id = current_user["_id"]
    match_filter: dict = {"user_id": user_id}

    if tipo:
        match_filter["tipo"] = tipo
    if nexus_only:
        match_filter["nexus_verified"] = True
    if template_source:
        match_filter["template_source"] = template_source

    cursor = db.activity_log.find(match_filter).sort("completed_at", -1).skip(offset).limit(limit)
    records = await cursor.to_list(limit)
    total = await db.activity_log.count_documents(match_filter)

    # Also pull from performance_records for backward compatibility
    if total == 0 and offset == 0:
        perf_filter: dict = {"user_id": user_id}
        if tipo:
            perf_filter["tipo"] = tipo
        perf_records = await db.performance_records.find(perf_filter).sort("completed_at", -1).limit(limit).to_list(limit)
        perf_total = await db.performance_records.count_documents(perf_filter)
        items = []
        for r in perf_records:
            # Adapt performance_record to activity_log shape
            r["template_id"] = r.get("template_id")
            r["template_source"] = r.get("template_source")
            r["result"] = r.get("kpi", {}).get("primary_result", {})
            r["flux_type"] = "perform"
            r["flux_color"] = _flux_color(r.get("flux_earned", 0))
            r["nexus_verified"] = r.get("is_certified", False)
            r["media"] = r.get("media", {})
            r["telemetry"] = {
                "heart_rate_avg": r.get("kpi", {}).get("heart_rate_avg"),
                "heart_rate_peak": r.get("kpi", {}).get("heart_rate_peak"),
                "time_under_tension": r.get("meta", {}).get("time_under_tension"),
                "rep_regularity": r.get("meta", {}).get("rep_regularity"),
            }
            items.append(_activity_to_response(r))
        return {
            "records": items,
            "total": perf_total,
            "source": "performance_records_fallback",
        }

    items = [_activity_to_response(r) for r in records]

    # Aggregate stats
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_sessions": {"$sum": 1},
            "total_flux": {"$sum": "$flux_earned"},
            "nexus_verified_count": {"$sum": {"$cond": ["$nexus_verified", 1, 0]}},
            "total_duration": {"$sum": {"$ifNull": ["$duration_seconds", 0]}},
            "avg_flux": {"$avg": "$flux_earned"},
        }},
    ]
    stats_result = await db.activity_log.aggregate(pipeline).to_list(1)
    stats = stats_result[0] if stats_result else {
        "total_sessions": 0, "total_flux": 0,
        "nexus_verified_count": 0, "total_duration": 0, "avg_flux": 0
    }
    stats.pop("_id", None)
    if stats.get("avg_flux"):
        stats["avg_flux"] = round(stats["avg_flux"], 1)

    return {
        "records": items,
        "total": total,
        "stats": stats,
        "source": "activity_log",
    }


@router.get("/log/{record_id}")
async def get_activity_detail(record_id: str, current_user: dict = Depends(get_current_user)):
    """
    Full detail of a single Activity Log entry.
    Returns complete media gallery and telemetry data.
    """
    try:
        oid = ObjectId(record_id)
    except Exception:
        raise HTTPException(400, "ID non valido")

    record = await db.activity_log.find_one({"_id": oid, "user_id": current_user["_id"]})

    # Fallback to performance_records
    if not record:
        record = await db.performance_records.find_one({"_id": oid, "user_id": current_user["_id"]})
        if record:
            record["template_id"] = record.get("template_id")
            record["template_source"] = record.get("template_source")
            record["result"] = record.get("kpi", {}).get("primary_result", {})
            record["flux_type"] = "perform"
            record["flux_color"] = _flux_color(record.get("flux_earned", 0))
            record["nexus_verified"] = record.get("is_certified", False)
            record["media"] = record.get("media", {})
            record["telemetry"] = {
                "heart_rate_avg": record.get("kpi", {}).get("heart_rate_avg"),
                "time_under_tension": record.get("meta", {}).get("time_under_tension"),
                "rep_regularity": record.get("meta", {}).get("rep_regularity"),
            }

    if not record:
        raise HTTPException(404, "Record non trovato")

    return _activity_to_response(record)


@router.get("/stats")
async def get_activity_stats(current_user: dict = Depends(get_current_user)):
    """
    Activity summary stats for the archive header.
    """
    user_id = current_user["_id"]

    # Primary source: activity_log
    count = await db.activity_log.count_documents({"user_id": user_id})

    if count == 0:
        # Fallback to performance_records
        perf_pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": None,
                "total_sessions": {"$sum": 1},
                "total_flux": {"$sum": "$flux_earned"},
                "certified_count": {"$sum": {"$cond": ["$is_certified", 1, 0]}},
                "total_duration": {"$sum": {"$ifNull": [{"$arrayElemAt": [{"$objectToArray": "$meta"}, 0]}, 0]}},
            }},
        ]
        result = await db.performance_records.aggregate(perf_pipeline).to_list(1)
        stats = result[0] if result else {"total_sessions": 0, "total_flux": 0, "certified_count": 0, "total_duration": 0}
        stats.pop("_id", None)
        stats["source"] = "performance_records_fallback"
        return stats

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": None,
            "total_sessions": {"$sum": 1},
            "total_flux": {"$sum": "$flux_earned"},
            "nexus_verified_count": {"$sum": {"$cond": ["$nexus_verified", 1, 0]}},
            "total_duration": {"$sum": {"$ifNull": ["$duration_seconds", 0]}},
            "avg_flux_per_session": {"$avg": "$flux_earned"},
        }},
    ]
    result = await db.activity_log.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {}
    stats.pop("_id", None)
    if stats.get("avg_flux_per_session"):
        stats["avg_flux_per_session"] = round(stats["avg_flux_per_session"], 1)

    # Per-tipo breakdown
    tipo_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$tipo", "count": {"$sum": 1}, "flux": {"$sum": "$flux_earned"}}},
        {"$sort": {"count": -1}},
    ]
    tipo_breakdown = []
    async for t in db.activity_log.aggregate(tipo_pipeline):
        tipo_breakdown.append({"tipo": t["_id"], "count": t["count"], "flux": t["flux"]})

    # Weekly trend (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    weekly_pipeline = [
        {"$match": {"user_id": user_id, "completed_at": {"$gte": week_ago}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$completed_at"}},
            "count": {"$sum": 1},
            "flux": {"$sum": "$flux_earned"},
        }},
        {"$sort": {"_id": 1}},
    ]
    weekly = []
    async for w in db.activity_log.aggregate(weekly_pipeline):
        weekly.append({"date": w["_id"], "count": w["count"], "flux": w["flux"]})

    stats["tipo_breakdown"] = tipo_breakdown
    stats["weekly_trend"] = weekly
    stats["source"] = "activity_log"
    return stats
