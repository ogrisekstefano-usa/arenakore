"""
ARENAKORE — K-FLUX MARKETPLACE & BURN ENGINE (Build 38 · Prompt 6)
═══════════════════════════════════════════════════════════════════════
Economy pillars:
  1. MARKETPLACE OFFERS — Partners/Gyms/System publish redeemable rewards
  2. BURN ENGINE — Priority deduction: Green → Cyan → Amber
  3. TRANSACTION LOG — Immutable redemption history with unique codes
  4. WALLET ENHANCED — Spendable breakdown per tier

Collections:
  - `marketplace_offers`: Partner reward catalog
  - `flux_transactions`: Burn/redemption ledger
"""
import secrets
import string
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])

# ═══════════════════════════════════════════════════════════════
# CONSTANTS & CATEGORIES
# ═══════════════════════════════════════════════════════════════
OFFER_CATEGORIES = {
    "merch":      {"label": "Merchandising",    "icon": "shirt",         "color": "#FF9500"},
    "experience": {"label": "Esperienze",       "icon": "rocket",        "color": "#BF5AF2"},
    "coaching":   {"label": "Coaching Pro",      "icon": "fitness",       "color": "#00E5FF"},
    "nutrition":  {"label": "Nutrizione",        "icon": "nutrition",     "color": "#32D74B"},
    "gear":       {"label": "Attrezzatura",      "icon": "barbell",       "color": "#FF453A"},
    "digital":    {"label": "Digitale",          "icon": "cloud-download","color": "#5AC8FA"},
    "event":      {"label": "Eventi & Gare",     "icon": "trophy",        "color": "#FFD700"},
}

SEED_OFFERS = [
    {
        "title": "Sconto 15% Merchandising KORE",
        "description": "Ottieni il 15% di sconto su tutto il merchandising ufficiale ARENAKORE. T-shirt, felpe e accessori premium.",
        "category": "merch",
        "cost_flux": 200,
        "partner_name": "ARENAKORE Official",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80",
        "max_redemptions": 100,
    },
    {
        "title": "Sessione Coach Pro 1-on-1",
        "description": "Una sessione di coaching personalizzata da 60 minuti con un Coach certificato NÈXUS del tuo Hub.",
        "category": "coaching",
        "cost_flux": 500,
        "partner_name": "KORE Coach Network",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80",
        "max_redemptions": 50,
    },
    {
        "title": "Piano Nutrizione Personalizzato",
        "description": "Accesso a un piano alimentare personalizzato di 4 settimane creato dai nostri nutrizionisti sportivi.",
        "category": "nutrition",
        "cost_flux": 350,
        "partner_name": "KORE Nutrition Lab",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80",
        "max_redemptions": 80,
    },
    {
        "title": "Fascia Elastica Pro Set",
        "description": "Set completo di 5 bande elastiche progressive per allenamento funzionale e riabilitazione.",
        "category": "gear",
        "cost_flux": 150,
        "partner_name": "ARENAKORE Gear",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&q=80",
        "max_redemptions": 200,
    },
    {
        "title": "Analisi NÈXUS Premium",
        "description": "Sblocca l'analisi biomeccanica avanzata con report PDF dettagliato e confronto DNA storico.",
        "category": "digital",
        "cost_flux": 300,
        "partner_name": "NÈXUS Lab",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80",
        "max_redemptions": 999,
    },
    {
        "title": "Pass VIP Evento KORE Games",
        "description": "Accesso VIP al prossimo evento KORE Games nella tua città. Include area riservata e gadget esclusivi.",
        "category": "event",
        "cost_flux": 750,
        "partner_name": "KORE Events",
        "partner_type": "system",
        "image_url": "https://images.unsplash.com/photo-1461896836934-bd45ba24e4cf?w=600&q=80",
        "max_redemptions": 30,
    },
]


# ═══════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════
class CreateOfferRequest(BaseModel):
    title: str
    description: str = ""
    category: str = "merch"
    cost_flux: int = 100
    partner_name: str = ""
    partner_type: str = "gym"  # gym | brand | system
    image_url: str = ""
    max_redemptions: int = 100
    valid_until: Optional[str] = None  # ISO date string


class UpdateOfferRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cost_flux: Optional[int] = None
    is_active: Optional[bool] = None
    max_redemptions: Optional[int] = None


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════

def _generate_redemption_code() -> str:
    """Generate a unique 8-char alphanumeric redemption code."""
    chars = string.ascii_uppercase + string.digits
    return "KORE-" + "".join(secrets.choice(chars) for _ in range(8))


def _serialize_offer(offer: dict) -> dict:
    """Serialize a marketplace offer for API response."""
    cat = offer.get("category", "merch")
    cat_info = OFFER_CATEGORIES.get(cat, OFFER_CATEGORIES["merch"])
    return {
        "id": str(offer["_id"]),
        "title": offer.get("title", ""),
        "description": offer.get("description", ""),
        "category": cat,
        "category_label": cat_info["label"],
        "category_icon": cat_info["icon"],
        "category_color": cat_info["color"],
        "cost_flux": offer.get("cost_flux", 0),
        "partner_name": offer.get("partner_name", ""),
        "partner_type": offer.get("partner_type", "system"),
        "image_url": offer.get("image_url", ""),
        "max_redemptions": offer.get("max_redemptions", 100),
        "current_redemptions": offer.get("current_redemptions", 0),
        "is_active": offer.get("is_active", True),
        "valid_until": offer.get("valid_until"),
        "created_at": offer.get("created_at", ""),
    }


async def _compute_burn_breakdown(user: dict, cost: int) -> dict | None:
    """
    Calculate how to burn K-Flux with priority: Green → Cyan → Amber.
    Returns breakdown dict or None if insufficient funds.
    """
    green = user.get("vital_flux", 0) or 0
    cyan = user.get("master_flux", 0) or user.get("perform_flux", 0) or 0
    amber = user.get("diamond_flux", 0) or user.get("team_flux", 0) or 0
    
    # If all tiers are 0, put all ak_credits in green
    total_ak = user.get("ak_credits", 0) or 0
    if green == 0 and cyan == 0 and amber == 0 and total_ak > 0:
        green = total_ak

    total_available = green + cyan + amber
    if total_available < cost:
        return None

    remaining = cost
    green_burn = min(remaining, green)
    remaining -= green_burn

    cyan_burn = min(remaining, cyan)
    remaining -= cyan_burn

    amber_burn = min(remaining, amber)
    remaining -= amber_burn

    return {
        "green_burned": green_burn,
        "cyan_burned": cyan_burn,
        "amber_burned": amber_burn,
        "total_burned": cost,
        "green_after": green - green_burn,
        "cyan_after": cyan - cyan_burn,
        "amber_after": amber - amber_burn,
    }


# ═══════════════════════════════════════════════════════════════
# SEEDER
# ═══════════════════════════════════════════════════════════════
async def seed_marketplace_offers():
    """Seed initial marketplace offers if collection is empty."""
    count = await db.marketplace_offers.count_documents({})
    if count >= len(SEED_OFFERS):
        return

    now = datetime.now(timezone.utc)
    for offer_data in SEED_OFFERS:
        exists = await db.marketplace_offers.find_one({"title": offer_data["title"]})
        if not exists:
            await db.marketplace_offers.insert_one({
                **offer_data,
                "is_active": True,
                "current_redemptions": 0,
                "created_at": now,
            })


# ═══════════════════════════════════════════════════════════════
# 1. LIST OFFERS
# ═══════════════════════════════════════════════════════════════

@router.get("/offers")
async def list_offers(
    category: Optional[str] = Query(None),
    limit: int = Query(20, le=50),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
):
    """List active marketplace offers, optionally filtered by category."""
    query: dict = {"is_active": True}
    if category and category in OFFER_CATEGORIES:
        query["category"] = category

    cursor = db.marketplace_offers.find(query).sort("cost_flux", 1).skip(offset).limit(limit)
    offers = []
    async for offer in cursor:
        offers.append(_serialize_offer(offer))

    total = await db.marketplace_offers.count_documents(query)

    # Also return user's spendable balance for quick reference
    user = current_user
    green = user.get("vital_flux", 0) or 0
    cyan = user.get("master_flux", 0) or user.get("perform_flux", 0) or 0
    amber = user.get("diamond_flux", 0) or user.get("team_flux", 0) or 0
    total_ak = user.get("ak_credits", 0) or 0
    if green == 0 and cyan == 0 and amber == 0 and total_ak > 0:
        green = total_ak

    return {
        "offers": offers,
        "total": total,
        "categories": OFFER_CATEGORIES,
        "wallet": {
            "green": green,
            "cyan": cyan,
            "amber": amber,
            "total_spendable": green + cyan + amber,
        },
    }


@router.get("/offers/{offer_id}")
async def get_offer_detail(offer_id: str, current_user: dict = Depends(get_current_user)):
    """Get full detail of a marketplace offer."""
    try:
        oid = ObjectId(offer_id)
    except Exception:
        raise HTTPException(400, "ID offerta non valido")

    offer = await db.marketplace_offers.find_one({"_id": oid})
    if not offer:
        raise HTTPException(404, "Offerta non trovata")

    # Check if current user already redeemed this offer
    already_redeemed = await db.flux_transactions.find_one({
        "user_id": current_user["_id"],
        "offer_id": offer_id,
        "status": "completed",
    })

    serialized = _serialize_offer(offer)
    serialized["already_redeemed"] = bool(already_redeemed)

    # Burn preview
    breakdown = await _compute_burn_breakdown(current_user, offer.get("cost_flux", 0))
    serialized["can_afford"] = breakdown is not None
    if breakdown:
        serialized["burn_preview"] = breakdown

    return serialized


# ═══════════════════════════════════════════════════════════════
# 2. CREATE / UPDATE OFFERS (Admin/GymOwner)
# ═══════════════════════════════════════════════════════════════

@router.post("/offers")
async def create_offer(body: CreateOfferRequest, current_user: dict = Depends(get_current_user)):
    """Create a new marketplace offer (Admin/GymOwner/Coach only)."""
    role = current_user.get("role", "ATHLETE")
    if role not in ("ADMIN", "SUPER_ADMIN", "GYM_OWNER", "COACH"):
        raise HTTPException(403, "Solo Admin, Gym Owner o Coach possono creare offerte")

    if body.category not in OFFER_CATEGORIES:
        raise HTTPException(400, f"Categoria non valida. Opzioni: {', '.join(OFFER_CATEGORIES.keys())}")

    if body.cost_flux < 10:
        raise HTTPException(400, "Il costo minimo è 10 K-Flux")

    now = datetime.now(timezone.utc)
    doc = {
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category,
        "cost_flux": body.cost_flux,
        "partner_name": body.partner_name.strip() or current_user.get("username", "Partner"),
        "partner_type": body.partner_type,
        "partner_id": str(current_user["_id"]),
        "image_url": body.image_url,
        "max_redemptions": max(1, body.max_redemptions),
        "current_redemptions": 0,
        "is_active": True,
        "valid_until": body.valid_until,
        "created_at": now,
    }

    result = await db.marketplace_offers.insert_one(doc)
    doc["_id"] = result.inserted_id

    return {"status": "created", "offer": _serialize_offer(doc)}


@router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, body: UpdateOfferRequest, current_user: dict = Depends(get_current_user)):
    """Update a marketplace offer."""
    role = current_user.get("role", "ATHLETE")
    if role not in ("ADMIN", "SUPER_ADMIN", "GYM_OWNER", "COACH"):
        raise HTTPException(403, "Accesso non autorizzato")

    try:
        oid = ObjectId(offer_id)
    except Exception:
        raise HTTPException(400, "ID offerta non valido")

    updates = {}
    if body.title is not None:
        updates["title"] = body.title.strip()
    if body.description is not None:
        updates["description"] = body.description.strip()
    if body.cost_flux is not None:
        updates["cost_flux"] = max(10, body.cost_flux)
    if body.is_active is not None:
        updates["is_active"] = body.is_active
    if body.max_redemptions is not None:
        updates["max_redemptions"] = max(1, body.max_redemptions)

    if not updates:
        raise HTTPException(400, "Nessun campo da aggiornare")

    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.marketplace_offers.update_one({"_id": oid}, {"$set": updates})

    if result.matched_count == 0:
        raise HTTPException(404, "Offerta non trovata")

    return {"status": "updated", "offer_id": offer_id}


# ═══════════════════════════════════════════════════════════════
# 3. REDEEM / BURN ENGINE
# ═══════════════════════════════════════════════════════════════

@router.post("/redeem/{offer_id}")
async def redeem_offer(offer_id: str, current_user: dict = Depends(get_current_user)):
    """
    BURN ENGINE: Redeem a marketplace offer by burning K-Flux.
    Priority: Green (Vital/Natural) → Cyan (Performance) → Amber (Genetic/Team)
    """
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)

    # ── Validate offer ──
    try:
        oid = ObjectId(offer_id)
    except Exception:
        raise HTTPException(400, "ID offerta non valido")

    offer = await db.marketplace_offers.find_one({"_id": oid, "is_active": True})
    if not offer:
        raise HTTPException(404, "Offerta non trovata o non attiva")

    # Check max redemptions
    if offer.get("current_redemptions", 0) >= offer.get("max_redemptions", 100):
        raise HTTPException(410, "Offerta esaurita — tutte le unità sono state riscattate")

    # Check validity
    if offer.get("valid_until"):
        try:
            exp = datetime.fromisoformat(offer["valid_until"])
            if now > exp.replace(tzinfo=timezone.utc):
                raise HTTPException(410, "Offerta scaduta")
        except (ValueError, TypeError):
            pass

    cost = offer.get("cost_flux", 0)
    if cost <= 0:
        raise HTTPException(400, "Offerta con costo non valido")

    # ── Refresh user data for accurate balances ──
    fresh_user = await db.users.find_one({"_id": user_id})
    if not fresh_user:
        raise HTTPException(404, "Utente non trovato")

    # ── Calculate burn breakdown ──
    breakdown = await _compute_burn_breakdown(fresh_user, cost)
    if breakdown is None:
        total_available = (fresh_user.get("vital_flux", 0) or 0) + \
                          (fresh_user.get("master_flux", 0) or fresh_user.get("perform_flux", 0) or 0) + \
                          (fresh_user.get("diamond_flux", 0) or fresh_user.get("team_flux", 0) or 0)
        raise HTTPException(
            402,
            f"K-Flux insufficienti. Servono {cost}, hai {total_available}. "
            f"Continua ad allenarti per guadagnare più K-Flux!"
        )

    # ── Generate redemption code ──
    redemption_code = _generate_redemption_code()

    # ── Execute burn: deduct from user balances ──
    update_ops: dict = {"$inc": {}}

    # ak_credits (total) always decremented by full cost
    update_ops["$inc"]["ak_credits"] = -cost

    # Green (vital_flux)
    if breakdown["green_burned"] > 0:
        update_ops["$inc"]["vital_flux"] = -breakdown["green_burned"]

    # Cyan (perform_flux / master_flux)
    if breakdown["cyan_burned"] > 0:
        # Check which field is used
        if fresh_user.get("perform_flux") is not None:
            update_ops["$inc"]["perform_flux"] = -breakdown["cyan_burned"]
        else:
            update_ops["$inc"]["master_flux"] = -breakdown["cyan_burned"]

    # Amber (team_flux / diamond_flux)
    if breakdown["amber_burned"] > 0:
        if fresh_user.get("team_flux") is not None:
            update_ops["$inc"]["team_flux"] = -breakdown["amber_burned"]
        else:
            update_ops["$inc"]["diamond_flux"] = -breakdown["amber_burned"]

    await db.users.update_one({"_id": user_id}, update_ops)

    # ── Increment offer redemption count ──
    await db.marketplace_offers.update_one(
        {"_id": oid},
        {"$inc": {"current_redemptions": 1}}
    )

    # ── Log transaction ──
    tx_doc = {
        "user_id": user_id,
        "offer_id": offer_id,
        "offer_title": offer.get("title", ""),
        "offer_category": offer.get("category", ""),
        "total_burned": cost,
        "breakdown": {
            "green": breakdown["green_burned"],
            "cyan": breakdown["cyan_burned"],
            "amber": breakdown["amber_burned"],
        },
        "redemption_code": redemption_code,
        "status": "completed",
        "timestamp": now,
    }
    await db.flux_transactions.insert_one(tx_doc)

    # ── In-app notification ──
    await db.notifications.insert_one({
        "user_id": user_id,
        "type": "marketplace_redeem",
        "title": "🏆 PREMIO RISCATTATO",
        "body": f"{offer.get('title', 'Premio')} — Codice: {redemption_code}",
        "data": {
            "type": "marketplace_redeem",
            "offer_id": offer_id,
            "redemption_code": redemption_code,
            "cost": cost,
        },
        "read": False,
        "created_at": now,
    })

    return {
        "success": True,
        "redemption_code": redemption_code,
        "offer_title": offer.get("title", ""),
        "total_burned": cost,
        "breakdown": {
            "green_burned": breakdown["green_burned"],
            "cyan_burned": breakdown["cyan_burned"],
            "amber_burned": breakdown["amber_burned"],
        },
        "balance_after": {
            "green": breakdown["green_after"],
            "cyan": breakdown["cyan_after"],
            "amber": breakdown["amber_after"],
            "total": breakdown["green_after"] + breakdown["cyan_after"] + breakdown["amber_after"],
        },
        "message": f"Premio riscattato! Il tuo codice: {redemption_code}",
    }


# ═══════════════════════════════════════════════════════════════
# 4. REDEMPTION HISTORY
# ═══════════════════════════════════════════════════════════════

@router.get("/my-redemptions")
async def get_my_redemptions(
    limit: int = Query(20, le=50),
    offset: int = Query(0),
    current_user: dict = Depends(get_current_user),
):
    """Get user's redemption history."""
    user_id = current_user["_id"]

    cursor = db.flux_transactions.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).skip(offset).limit(limit)

    transactions = []
    async for tx in cursor:
        cat = tx.get("offer_category", "merch")
        cat_info = OFFER_CATEGORIES.get(cat, OFFER_CATEGORIES["merch"])
        transactions.append({
            "id": str(tx["_id"]),
            "offer_id": tx.get("offer_id", ""),
            "offer_title": tx.get("offer_title", ""),
            "offer_category": cat,
            "category_icon": cat_info["icon"],
            "category_color": cat_info["color"],
            "total_burned": tx.get("total_burned", 0),
            "breakdown": tx.get("breakdown", {}),
            "redemption_code": tx.get("redemption_code", ""),
            "status": tx.get("status", "completed"),
            "timestamp": tx.get("timestamp", "").isoformat() if tx.get("timestamp") else None,
        })

    total = await db.flux_transactions.count_documents({"user_id": user_id})

    return {
        "transactions": transactions,
        "total": total,
        "total_burned_lifetime": sum(t["total_burned"] for t in transactions),
    }


# ═══════════════════════════════════════════════════════════════
# 5. CATEGORIES LIST
# ═══════════════════════════════════════════════════════════════

@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    """List all marketplace categories with icons and colors."""
    return {"categories": OFFER_CATEGORIES}
