"""
ARENAKORE — HUB MAP ENGINE (Build 37 · Mappa Geolocalizzata & Hub Sportivi)
═══════════════════════════════════════════════════════════════════════════════
Three pillars:
  1. GEOLOCALIZZAZIONE ATTIVA — Map pins for all registered Hubs (Gym, CrossFit, Boxing, etc.)
  2. SFIDE NEI DINTORNI — Active challenges at each Hub (Live, Coach Templates)
  3. INFO HUB — Hub card with Name, Photo, Rating, Resident Coaches

Collection: `hubs` (geo-indexed with MongoDB 2dsphere)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/hubs", tags=["hub-map"])


# ═══════════════════════════════════════════════════════════════
# HUB TYPE REGISTRY
# ═══════════════════════════════════════════════════════════════

HUB_TYPES = {
    "gym": {"label": "Palestra", "icon": "barbell", "color": "#00E5FF"},
    "crossfit": {"label": "CrossFit Box", "icon": "flame", "color": "#FF6B00"},
    "boxing": {"label": "Boxing Gym", "icon": "fitness", "color": "#FF453A"},
    "mma": {"label": "MMA Academy", "icon": "flash", "color": "#BF5AF2"},
    "basketball": {"label": "Campo Basket", "icon": "basketball", "color": "#FFD700"},
    "football": {"label": "Campo Calcio", "icon": "football", "color": "#32D74B"},
    "athletics": {"label": "Pista Atletica", "icon": "walk", "color": "#00E5FF"},
    "swimming": {"label": "Piscina", "icon": "water", "color": "#30D5C8"},
    "yoga": {"label": "Studio Yoga", "icon": "leaf", "color": "#A8D8EA"},
    "tennis": {"label": "Tennis Club", "icon": "tennisball", "color": "#FFD700"},
    "climbing": {"label": "Parete Arrampicata", "icon": "trending-up", "color": "#FF6B00"},
    "golf": {"label": "Golf Club", "icon": "golf", "color": "#32D74B"},
    "outdoor": {"label": "Area Outdoor", "icon": "sunny", "color": "#FFD700"},
}


# ═══════════════════════════════════════════════════════════════
# SEED DATA — Italian Hub Network
# ═══════════════════════════════════════════════════════════════

SEED_HUBS = [
    {
        "name": "KORE Fitness Hub",
        "hub_type": "gym",
        "description": "Hub principale ARENAKORE. Attrezzatura premium e coach certificati.",
        "photo_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600",
        "address": "Via Roma 42, Milano",
        "city": "Milano",
        "location": {"type": "Point", "coordinates": [9.1900, 45.4642]},
        "rating_avg": 4.8,
        "rating_count": 127,
        "specialties": ["Fitness", "CrossFit", "Powerlifting"],
        "amenities": ["Docce", "Sauna", "Parcheggio"],
        "coaches_count": 5,
        "athletes_count": 230,
    },
    {
        "name": "Arena Boxing Club",
        "hub_type": "boxing",
        "description": "La palestra di pugilato più storica di Milano. Ring regolamentare.",
        "photo_url": "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600",
        "address": "Corso Buenos Aires 15, Milano",
        "city": "Milano",
        "location": {"type": "Point", "coordinates": [9.2075, 45.4795]},
        "rating_avg": 4.6,
        "rating_count": 89,
        "specialties": ["Boxing", "Kickboxing", "Muay Thai"],
        "amenities": ["Ring", "Sacco", "Spogliatoi"],
        "coaches_count": 3,
        "athletes_count": 145,
    },
    {
        "name": "CrossFit Navigli",
        "hub_type": "crossfit",
        "description": "Box CrossFit affiliato. WODs giornalieri e classi di gruppo.",
        "photo_url": "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=600",
        "address": "Alzaia Naviglio Grande 8, Milano",
        "city": "Milano",
        "location": {"type": "Point", "coordinates": [9.1678, 45.4495]},
        "rating_avg": 4.7,
        "rating_count": 203,
        "specialties": ["CrossFit", "Olympic Lifting", "Gymnastics"],
        "amenities": ["Rig", "Rower", "Assault Bike"],
        "coaches_count": 4,
        "athletes_count": 180,
    },
    {
        "name": "MMA Roma Fight Academy",
        "hub_type": "mma",
        "description": "Accademia completa per MMA, BJJ e Grappling. Gabbia UFC-size.",
        "photo_url": "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600",
        "address": "Via Tuscolana 120, Roma",
        "city": "Roma",
        "location": {"type": "Point", "coordinates": [12.5200, 41.8750]},
        "rating_avg": 4.9,
        "rating_count": 156,
        "specialties": ["MMA", "BJJ", "Wrestling"],
        "amenities": ["Gabbia", "Tatami", "Spogliatoi"],
        "coaches_count": 6,
        "athletes_count": 210,
    },
    {
        "name": "Centro Sportivo Torino",
        "hub_type": "athletics",
        "description": "Pista di atletica 400m con settore lanci e pedane salto.",
        "photo_url": "https://images.unsplash.com/photo-1461896836934-bd45ba790f52?w=600",
        "address": "Corso Moncalieri 70, Torino",
        "city": "Torino",
        "location": {"type": "Point", "coordinates": [7.6900, 45.0500]},
        "rating_avg": 4.5,
        "rating_count": 78,
        "specialties": ["Atletica", "Sprint", "Salti"],
        "amenities": ["Pista 400m", "Campo", "Tribuna"],
        "coaches_count": 3,
        "athletes_count": 95,
    },
    {
        "name": "Basket Arena Napoli",
        "hub_type": "basketball",
        "description": "Campo da basket indoor con pavimento in parquet. Tornei settimanali.",
        "photo_url": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600",
        "address": "Via Partenope 30, Napoli",
        "city": "Napoli",
        "location": {"type": "Point", "coordinates": [14.2500, 40.8333]},
        "rating_avg": 4.4,
        "rating_count": 62,
        "specialties": ["Basketball", "3v3", "Shooting"],
        "amenities": ["Campo Indoor", "Tribuna", "Bar"],
        "coaches_count": 2,
        "athletes_count": 78,
    },
    {
        "name": "Outdoor KORE Park",
        "hub_type": "outdoor",
        "description": "Area fitness all'aperto con calisthenics park e percorso vita.",
        "photo_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
        "address": "Parco Sempione, Milano",
        "city": "Milano",
        "location": {"type": "Point", "coordinates": [9.1750, 45.4730]},
        "rating_avg": 4.3,
        "rating_count": 312,
        "specialties": ["Calisthenics", "Running", "HIIT"],
        "amenities": ["Sbarre", "Parallele", "Percorso"],
        "coaches_count": 2,
        "athletes_count": 520,
    },
    {
        "name": "KORE Swim Center",
        "hub_type": "swimming",
        "description": "Centro natatorio olimpionico con vasca 50m e vasca didattica.",
        "photo_url": "https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=600",
        "address": "Via Mecenate 78, Milano",
        "city": "Milano",
        "location": {"type": "Point", "coordinates": [9.2350, 45.4480]},
        "rating_avg": 4.6,
        "rating_count": 94,
        "specialties": ["Nuoto", "Pallanuoto", "Acquafitness"],
        "amenities": ["Vasca 50m", "Vasca Piccola", "Sauna"],
        "coaches_count": 4,
        "athletes_count": 160,
    },
]


async def seed_hubs():
    """Seed the hubs collection with demo data if empty."""
    count = await db.hubs.count_documents({})
    if count > 0:
        return

    now = datetime.now(timezone.utc)
    for hub in SEED_HUBS:
        hub["created_at"] = now
        hub["updated_at"] = now
        hub["active_challenges"] = 0
        hub["is_verified"] = True

    await db.hubs.insert_many(SEED_HUBS)

    # Create 2dsphere index for geospatial queries
    await db.hubs.create_index([("location", "2dsphere")])
    print(f"[HubEngine] Seeded {len(SEED_HUBS)} hubs with 2dsphere index")


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════

class HubRegisterRequest(BaseModel):
    name: str
    hub_type: str = "gym"
    description: Optional[str] = None
    photo_url: Optional[str] = None
    address: str = ""
    city: str = ""
    latitude: float
    longitude: float
    specialties: Optional[List[str]] = None
    amenities: Optional[List[str]] = None


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _hub_to_response(h: dict) -> dict:
    """Normalize a hub document for API response."""
    coords = h.get("location", {}).get("coordinates", [0, 0])
    hub_type = h.get("hub_type", "gym")
    type_info = HUB_TYPES.get(hub_type, HUB_TYPES["gym"])

    return {
        "id": str(h["_id"]),
        "name": h.get("name", "Hub"),
        "hub_type": hub_type,
        "type_label": type_info["label"],
        "type_icon": type_info["icon"],
        "type_color": type_info["color"],
        "description": h.get("description"),
        "photo_url": h.get("photo_url"),
        "address": h.get("address"),
        "city": h.get("city"),
        "latitude": coords[1] if len(coords) > 1 else 0,
        "longitude": coords[0] if len(coords) > 0 else 0,
        "rating_avg": h.get("rating_avg", 0),
        "rating_count": h.get("rating_count", 0),
        "specialties": h.get("specialties", []),
        "amenities": h.get("amenities", []),
        "coaches_count": h.get("coaches_count", 0),
        "athletes_count": h.get("athletes_count", 0),
        "active_challenges": h.get("active_challenges", 0),
        "is_verified": h.get("is_verified", False),
    }


# ═══════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/nearby")
async def get_nearby_hubs(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(20, description="Radius in km"),
    hub_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
):
    """
    GEOLOCALIZZAZIONE ATTIVA:
    Find all Hubs within a given radius from a lat/lng point.
    Returns pins with type, name, coordinates, and active challenge count.
    No auth required (public discovery).
    """
    # Ensure index exists
    try:
        await db.hubs.create_index([("location", "2dsphere")])
    except Exception:
        pass

    # Build geo query
    query: dict = {
        "location": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat],
                },
                "$maxDistance": radius * 1000,  # Convert km to meters
            }
        }
    }

    if hub_type:
        query["hub_type"] = hub_type

    cursor = db.hubs.find(query).limit(limit)
    hubs = await cursor.to_list(limit)

    # Enrich with active challenge counts
    items = []
    for h in hubs:
        hub_data = _hub_to_response(h)
        # Count active challenges at this hub
        gym_id = h.get("gym_id") or h["_id"]
        active_count = await db.challenges.count_documents({
            "gym_id": gym_id,
            "status": {"$in": ["OPEN", "LIVE", "ACTIVE"]},
        })
        hub_data["active_challenges"] = active_count
        items.append(hub_data)

    return {
        "hubs": items,
        "total": len(items),
        "center": {"lat": lat, "lng": lng},
        "radius_km": radius,
    }


@router.get("/all")
async def get_all_hubs(
    hub_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    limit: int = Query(100, le=200),
):
    """Get all hubs, optionally filtered by type or city. No auth required."""
    query: dict = {}
    if hub_type:
        query["hub_type"] = hub_type
    if city:
        query["city"] = {"$regex": city, "$options": "i"}

    cursor = db.hubs.find(query).sort("rating_avg", -1).limit(limit)
    hubs = await cursor.to_list(limit)

    return {
        "hubs": [_hub_to_response(h) for h in hubs],
        "total": len(hubs),
        "hub_types": HUB_TYPES,
    }


@router.get("/{hub_id}")
async def get_hub_detail(hub_id: str):
    """
    INFO HUB: Full hub profile with coaches and active challenges.
    """
    try:
        oid = ObjectId(hub_id)
    except Exception:
        raise HTTPException(400, "ID Hub non valido")

    hub = await db.hubs.find_one({"_id": oid})
    if not hub:
        raise HTTPException(404, "Hub non trovato")

    hub_data = _hub_to_response(hub)

    # Fetch resident coaches (users with role=COACH at this gym)
    gym_id = hub.get("gym_id") or hub["_id"]
    coaches_cursor = db.users.find(
        {"$or": [{"gym_id": gym_id}, {"gym_id": str(gym_id)}], "role": {"$in": ["COACH", "GYM_OWNER"]}},
        {"username": 1, "coach_data": 1, "preferred_sport": 1, "avatar_url": 1},
    ).limit(20)
    coaches = []
    async for c in coaches_cursor:
        coach_data = c.get("coach_data", {})
        coaches.append({
            "id": str(c["_id"]),
            "username": c.get("username", "Coach"),
            "specialties": coach_data.get("specialties", []),
            "rating_avg": coach_data.get("rating_avg", 0),
            "verified": coach_data.get("verified", False),
            "preferred_sport": c.get("preferred_sport", ""),
        })

    # Fetch active challenges at this hub
    challenges_cursor = db.challenges.find(
        {"gym_id": gym_id, "status": {"$in": ["OPEN", "LIVE", "ACTIVE"]}},
        {"exercise": 1, "status": 1, "tags": 1, "created_at": 1, "challenger_username": 1},
    ).sort("created_at", -1).limit(10)
    challenges = []
    async for ch in challenges_cursor:
        challenges.append({
            "id": str(ch["_id"]),
            "exercise": ch.get("exercise", ""),
            "status": ch.get("status", "OPEN"),
            "tags": ch.get("tags", []),
            "challenger": ch.get("challenger_username", ""),
        })

    # Fetch coach templates available at this hub
    templates_cursor = db.coach_templates.find(
        {"gym_id": gym_id, "is_active": True},
        {"name": 1, "exercise": 1, "difficulty": 1, "required_drops": 1},
    ).limit(10)
    templates = []
    async for t in templates_cursor:
        templates.append({
            "id": str(t["_id"]),
            "name": t.get("name", ""),
            "exercise": t.get("exercise", ""),
            "difficulty": t.get("difficulty", "medium"),
            "required_drops": t.get("required_drops", 0),
        })

    hub_data["coaches"] = coaches
    hub_data["active_challenges_list"] = challenges
    hub_data["coach_templates"] = templates
    hub_data["total_active"] = len(challenges) + len(templates)

    return hub_data


@router.get("/{hub_id}/challenges")
async def get_hub_challenges(hub_id: str, limit: int = Query(20, le=50)):
    """SFIDE NEI DINTORNI: All active challenges and templates at a specific Hub."""
    try:
        oid = ObjectId(hub_id)
    except Exception:
        raise HTTPException(400, "ID Hub non valido")

    hub = await db.hubs.find_one({"_id": oid})
    if not hub:
        raise HTTPException(404, "Hub non trovato")

    gym_id = hub.get("gym_id") or hub["_id"]

    # Active challenges
    challenges = []
    async for ch in db.challenges.find(
        {"gym_id": gym_id, "status": {"$in": ["OPEN", "LIVE", "ACTIVE"]}},
    ).sort("created_at", -1).limit(limit):
        challenges.append({
            "id": str(ch["_id"]),
            "exercise": ch.get("exercise", ""),
            "status": ch.get("status", "OPEN"),
            "tags": ch.get("tags", []),
            "challenger": ch.get("challenger_username", ""),
            "tipo": "SFIDA",
        })

    # Coach templates
    async for t in db.coach_templates.find(
        {"gym_id": gym_id, "is_active": True},
    ).limit(limit):
        challenges.append({
            "id": str(t["_id"]),
            "exercise": t.get("exercise", ""),
            "name": t.get("name", ""),
            "status": "COACH_TEMPLATE",
            "difficulty": t.get("difficulty", "medium"),
            "tipo": "TEMPLATE",
        })

    return {
        "hub_id": hub_id,
        "hub_name": hub.get("name", "Hub"),
        "challenges": challenges,
        "total": len(challenges),
    }


@router.post("/register")
async def register_hub(body: HubRegisterRequest, current_user: dict = Depends(get_current_user)):
    """Register a new Hub (for Gym Owners / Coaches)."""
    if current_user.get("role") not in ("ADMIN", "GYM_OWNER", "COACH"):
        raise HTTPException(403, "Solo Gym Owner o Coach possono registrare Hub")

    now = datetime.now(timezone.utc)
    hub_type_info = HUB_TYPES.get(body.hub_type, HUB_TYPES["gym"])

    doc = {
        "name": body.name,
        "hub_type": body.hub_type,
        "description": body.description or f"{hub_type_info['label']} registrato su ARENAKORE",
        "photo_url": body.photo_url,
        "address": body.address,
        "city": body.city,
        "location": {
            "type": "Point",
            "coordinates": [body.longitude, body.latitude],
        },
        "rating_avg": 0,
        "rating_count": 0,
        "specialties": body.specialties or [],
        "amenities": body.amenities or [],
        "coaches_count": 1,
        "athletes_count": 0,
        "active_challenges": 0,
        "is_verified": False,
        "owner_id": current_user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    result = await db.hubs.insert_one(doc)

    return {
        "status": "created",
        "hub_id": str(result.inserted_id),
        "message": f"Hub '{body.name}' registrato con successo!",
    }


@router.get("/types/list")
async def get_hub_types():
    """Get all available hub types with icons and colors."""
    return {"types": HUB_TYPES}
