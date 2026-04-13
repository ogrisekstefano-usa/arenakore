"""
ARENAKORE — SOCIAL NETWORK ENGINE (PROMPT 4)
════════════════════════════════════════════════════════════
1. Kore ID — Public profile with official performances & DNA snapshot
2. Messaging Gatekeeper — Contact requests before messaging
3. Follow System — Follow athletes/coaches for record/template notifications

Collections: contacts, messages, follows
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user
import logging

logger = logging.getLogger("social_network")

router = APIRouter(prefix="/api/v3/social", tags=["social-network"])


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class ContactRequest(BaseModel):
    target_user_id: str
    message: Optional[str] = None


class ContactResponseAction(BaseModel):
    action: str  # "accept" | "decline"


class SendMessageRequest(BaseModel):
    to_user_id: str
    text: str


class FollowRequest(BaseModel):
    target_user_id: str


# ═══════════════════════════════════════════════════════════
# 1. KORE ID — Public Profile
# ═══════════════════════════════════════════════════════════

@router.get("/profile/{kore_id}")
async def get_public_profile(kore_id: str):
    """
    Profilo pubblico di un atleta tramite Kore ID (username).
    Mostra: Performance Ufficiali, DNA snapshot, stats pubbliche.
    Nessuna autenticazione richiesta.
    """
    user = await db.users.find_one(
        {"username": {"$regex": f"^{kore_id}$", "$options": "i"}},
        {
            "password_hash": 0, "password": 0, "email": 0,
        }
    )
    if not user:
        raise HTTPException(404, f"Kore ID '{kore_id}' non trovato")

    user_id = user["_id"]

    # Get official performances (completed challenge launches)
    performances = await db.challenge_launches.find(
        {"user_id": user_id, "status": "completed"}
    ).sort("score", -1).to_list(20)

    official_performances = []
    for p in performances:
        started = p.get("started_at")
        official_performances.append({
            "challenge_name": p.get("challenge_name", ""),
            "template_name": p.get("template_name", ""),
            "mode": p.get("mode", "solo"),
            "score": p.get("score", 0),
            "flux_earned": p.get("flux_earned", 0),
            "flux_tier": p.get("flux_tier", "master"),
            "date": started.isoformat() if hasattr(started, 'isoformat') else str(started) if started else None,
        })

    # DNA snapshot
    dna = user.get("dna") or {}

    # Calculate K-Rating (total flux)
    k_flux = user.get("ak_credits", 0) or user.get("xp", 0) or 0

    # Total challenges completed
    total_completed = await db.challenge_launches.count_documents(
        {"user_id": user_id, "status": "completed"}
    )

    # PvP record
    pvp_wins = await db.challenge_launches.count_documents(
        {"user_id": user_id, "mode": "pvp", "status": "completed", "winner_id": user_id}
    )
    pvp_total = await db.challenge_launches.count_documents(
        {"user_id": user_id, "mode": "pvp", "status": "completed"}
    )

    # Followers count
    followers_count = await db.follows.count_documents({"target_user_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})

    return {
        "kore_id": user.get("username", ""),
        "avatar_color": user.get("avatar_color", "#00E5FF"),
        "sport": user.get("preferred_sport") or user.get("sport"),
        "city": user.get("city"),
        "k_flux": k_flux,
        "level": user.get("level", 1),
        "is_nexus_certified": bool(user.get("baseline_scanned_at") and user.get("dna")),
        "role": user.get("role", "ATHLETE"),
        "dna": dna,
        "stats": {
            "total_challenges": total_completed,
            "pvp_wins": pvp_wins,
            "pvp_total": pvp_total,
            "pvp_ratio": round(pvp_wins / pvp_total, 2) if pvp_total > 0 else 0,
            "followers": followers_count,
            "following": following_count,
        },
        "official_performances": official_performances[:10],
        "vital_flux": user.get("vital_flux", 0),
        "master_flux": user.get("master_flux", 0),
        "diamond_flux": user.get("diamond_flux", 0),
    }


@router.get("/profile/{kore_id}/performances")
async def get_full_performance_list(
    kore_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Lista completa delle performance ufficiali di un Kore ID."""
    user = await db.users.find_one(
        {"username": {"$regex": f"^{kore_id}$", "$options": "i"}},
        {"_id": 1}
    )
    if not user:
        raise HTTPException(404, f"Kore ID '{kore_id}' non trovato")

    total = await db.challenge_launches.count_documents(
        {"user_id": user["_id"], "status": "completed"}
    )
    performances = await db.challenge_launches.find(
        {"user_id": user["_id"], "status": "completed"}
    ).sort("started_at", -1).skip(offset).to_list(limit)

    results = []
    for p in performances:
        started = p.get("started_at")
        completed = p.get("completed_at")
        results.append({
            "id": str(p["_id"]),
            "challenge_name": p.get("challenge_name", ""),
            "mode": p.get("mode", "solo"),
            "score": p.get("score", 0),
            "reps_completed": p.get("reps_completed"),
            "time_elapsed": p.get("time_elapsed"),
            "flux_earned": p.get("flux_earned", 0),
            "flux_tier": p.get("flux_tier", "master"),
            "opponent_username": p.get("opponent_username"),
            "date": started.isoformat() if hasattr(started, 'isoformat') else str(started) if started else None,
        })

    return {"performances": results, "total": total, "offset": offset, "limit": limit}


# ═══════════════════════════════════════════════════════════
# 2. MESSAGING GATEKEEPER — Contact Requests + Messages
# ═══════════════════════════════════════════════════════════

@router.post("/contacts/request")
async def send_contact_request(
    body: ContactRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Invia una Richiesta di Contatto ad un altro utente.
    Solo dopo l'accettazione sarà possibile scambiare messaggi.
    """
    try:
        target_oid = ObjectId(body.target_user_id)
    except Exception:
        raise HTTPException(400, "ID utente invalido")

    if str(target_oid) == str(current_user["_id"]):
        raise HTTPException(400, "Non puoi inviare una richiesta a te stesso")

    target = await db.users.find_one({"_id": target_oid}, {"username": 1, "avatar_color": 1})
    if not target:
        raise HTTPException(404, "Utente non trovato")

    # Check existing contact (in either direction)
    existing = await db.contacts.find_one({
        "$or": [
            {"from_user_id": current_user["_id"], "to_user_id": target_oid},
            {"from_user_id": target_oid, "to_user_id": current_user["_id"]},
        ]
    })
    if existing:
        return {
            "status": existing.get("status", "pending"),
            "message": "Richiesta già esistente" if existing["status"] == "pending" else "Siete già connessi",
        }

    now = datetime.now(timezone.utc)
    contact_doc = {
        "from_user_id": current_user["_id"],
        "from_username": current_user.get("username", ""),
        "to_user_id": target_oid,
        "to_username": target.get("username", ""),
        "message": body.message or "",
        "status": "pending",
        "created_at": now,
    }
    result = await db.contacts.insert_one(contact_doc)

    # Notify target
    await db.notifications.insert_one({
        "user_id": target_oid,
        "type": "contact_request",
        "title": "RICHIESTA DI CONTATTO",
        "message": f"{current_user.get('username', 'Un atleta')} vuole connettersi con te",
        "data": {"contact_id": str(result.inserted_id), "from_username": current_user.get("username", "")},
        "read": False,
        "created_at": now,
    })

    logger.info(f"[CONTACT] {current_user.get('username')} → request to {target.get('username')}")

    return {
        "status": "pending",
        "contact_id": str(result.inserted_id),
        "to_username": target.get("username", ""),
    }


@router.get("/contacts/requests")
async def get_pending_contact_requests(
    current_user: dict = Depends(get_current_user),
):
    """Richieste di contatto ricevute (pending)."""
    requests = await db.contacts.find(
        {"to_user_id": current_user["_id"], "status": "pending"}
    ).sort("created_at", -1).to_list(50)

    results = []
    for r in requests:
        created = r.get("created_at")
        results.append({
            "id": str(r["_id"]),
            "from_user_id": str(r["from_user_id"]),
            "from_username": r.get("from_username", ""),
            "message": r.get("message", ""),
            "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
        })

    return {"requests": results, "total": len(results)}


@router.post("/contacts/{contact_id}/respond")
async def respond_to_contact_request(
    contact_id: str,
    body: ContactResponseAction,
    current_user: dict = Depends(get_current_user),
):
    """Accetta o rifiuta una richiesta di contatto."""
    try:
        oid = ObjectId(contact_id)
    except Exception:
        raise HTTPException(400, "ID contatto invalido")

    contact = await db.contacts.find_one({"_id": oid, "to_user_id": current_user["_id"]})
    if not contact:
        raise HTTPException(404, "Richiesta non trovata")
    if contact.get("status") != "pending":
        raise HTTPException(400, f"Richiesta già {contact.get('status')}")

    now = datetime.now(timezone.utc)
    action = body.action.lower()

    if action == "decline":
        await db.contacts.update_one({"_id": oid}, {"$set": {"status": "declined", "responded_at": now}})
        return {"status": "declined"}

    elif action == "accept":
        await db.contacts.update_one({"_id": oid}, {"$set": {"status": "accepted", "accepted_at": now}})

        # Notify requester
        await db.notifications.insert_one({
            "user_id": contact["from_user_id"],
            "type": "contact_accepted",
            "title": "CONTATTO ACCETTATO! ✅",
            "message": f"{current_user.get('username', '')} ha accettato la tua richiesta",
            "data": {"username": current_user.get("username", "")},
            "read": False,
            "created_at": now,
        })

        return {
            "status": "accepted",
            "message": f"Ora puoi scambiare messaggi con {contact.get('from_username', '')}",
        }

    raise HTTPException(400, "Azione invalida. Usa: accept, decline")


@router.get("/contacts")
async def get_my_contacts(
    current_user: dict = Depends(get_current_user),
):
    """Lista dei contatti accettati (connessioni attive)."""
    contacts = await db.contacts.find({
        "$or": [
            {"from_user_id": current_user["_id"], "status": "accepted"},
            {"to_user_id": current_user["_id"], "status": "accepted"},
        ]
    }).sort("accepted_at", -1).to_list(200)

    results = []
    for c in contacts:
        # Determine the other user
        other_id = c["to_user_id"] if str(c["from_user_id"]) == str(current_user["_id"]) else c["from_user_id"]
        other_user = await db.users.find_one(
            {"_id": other_id},
            {"username": 1, "avatar_color": 1, "sport": 1, "ak_credits": 1, "xp": 1}
        )
        if not other_user:
            continue

        # Get last message
        last_msg = await db.messages.find_one(
            {"$or": [
                {"from_user_id": current_user["_id"], "to_user_id": other_id},
                {"from_user_id": other_id, "to_user_id": current_user["_id"]},
            ]},
            sort=[("created_at", -1)]
        )

        # Count unread
        unread = await db.messages.count_documents({
            "from_user_id": other_id,
            "to_user_id": current_user["_id"],
            "read": False,
        })

        accepted_at = c.get("accepted_at")
        results.append({
            "contact_id": str(c["_id"]),
            "user_id": str(other_id),
            "username": other_user.get("username", ""),
            "avatar_color": other_user.get("avatar_color", "#00E5FF"),
            "sport": other_user.get("sport"),
            "k_flux": other_user.get("ak_credits", 0) or other_user.get("xp", 0),
            "last_message": last_msg.get("text", "")[:60] if last_msg else None,
            "last_message_at": last_msg["created_at"].isoformat() if last_msg and hasattr(last_msg.get("created_at"), 'isoformat') else None,
            "unread_count": unread,
            "connected_since": accepted_at.isoformat() if hasattr(accepted_at, 'isoformat') else str(accepted_at) if accepted_at else None,
        })

    # Sort by last message (most recent first)
    results.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)

    return {"contacts": results, "total": len(results)}


# ── MESSAGING ──

@router.post("/messages/send")
async def send_message(
    body: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Invia un messaggio ad un contatto accettato.
    Richiede connessione attiva (contact status=accepted).
    """
    try:
        to_oid = ObjectId(body.to_user_id)
    except Exception:
        raise HTTPException(400, "ID destinatario invalido")

    if str(to_oid) == str(current_user["_id"]):
        raise HTTPException(400, "Non puoi inviare un messaggio a te stesso")

    if not body.text.strip():
        raise HTTPException(400, "Il messaggio non può essere vuoto")

    # Verify contact exists and is accepted
    contact = await db.contacts.find_one({
        "$or": [
            {"from_user_id": current_user["_id"], "to_user_id": to_oid, "status": "accepted"},
            {"from_user_id": to_oid, "to_user_id": current_user["_id"], "status": "accepted"},
        ]
    })
    if not contact:
        raise HTTPException(403, "Devi prima inviare una Richiesta di Contatto e attendere l'accettazione")

    now = datetime.now(timezone.utc)
    msg_doc = {
        "from_user_id": current_user["_id"],
        "from_username": current_user.get("username", ""),
        "to_user_id": to_oid,
        "text": body.text.strip()[:2000],  # Max 2000 chars
        "read": False,
        "created_at": now,
    }
    result = await db.messages.insert_one(msg_doc)

    return {
        "status": "sent",
        "message_id": str(result.inserted_id),
        "timestamp": now.isoformat(),
    }


@router.get("/messages/{user_id}")
async def get_conversation(
    user_id: str,
    limit: int = Query(50, ge=1, le=200),
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Recupera la conversazione con un utente specifico.
    Ordine cronologico inverso (più recenti prima).
    """
    try:
        other_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID utente invalido")

    query = {
        "$or": [
            {"from_user_id": current_user["_id"], "to_user_id": other_oid},
            {"from_user_id": other_oid, "to_user_id": current_user["_id"]},
        ]
    }
    if before:
        try:
            query["created_at"] = {"$lt": datetime.fromisoformat(before)}
        except Exception:
            pass

    messages = await db.messages.find(query).sort("created_at", -1).to_list(limit)

    # Mark received messages as read
    await db.messages.update_many(
        {"from_user_id": other_oid, "to_user_id": current_user["_id"], "read": False},
        {"$set": {"read": True}}
    )

    results = []
    for m in messages:
        created = m.get("created_at")
        results.append({
            "id": str(m["_id"]),
            "from_user_id": str(m["from_user_id"]),
            "from_username": m.get("from_username", ""),
            "text": m.get("text", ""),
            "read": m.get("read", False),
            "is_mine": str(m["from_user_id"]) == str(current_user["_id"]),
            "created_at": created.isoformat() if hasattr(created, 'isoformat') else str(created) if created else None,
        })

    # Return in chronological order for display
    results.reverse()

    return {"messages": results, "total": len(results)}


# ═══════════════════════════════════════════════════════════
# 3. FOLLOW SYSTEM
# ═══════════════════════════════════════════════════════════

@router.post("/follow")
async def follow_user(
    body: FollowRequest,
    current_user: dict = Depends(get_current_user),
):
    """Segui un atleta o coach per ricevere notifiche sui nuovi record."""
    try:
        target_oid = ObjectId(body.target_user_id)
    except Exception:
        raise HTTPException(400, "ID utente invalido")

    if str(target_oid) == str(current_user["_id"]):
        raise HTTPException(400, "Non puoi seguire te stesso")

    target = await db.users.find_one({"_id": target_oid}, {"username": 1})
    if not target:
        raise HTTPException(404, "Utente non trovato")

    # Check if already following
    existing = await db.follows.find_one({
        "follower_id": current_user["_id"],
        "target_user_id": target_oid,
    })
    if existing:
        return {"status": "already_following", "username": target.get("username", "")}

    now = datetime.now(timezone.utc)
    await db.follows.insert_one({
        "follower_id": current_user["_id"],
        "follower_username": current_user.get("username", ""),
        "target_user_id": target_oid,
        "target_username": target.get("username", ""),
        "created_at": now,
    })

    # Notify target
    await db.notifications.insert_one({
        "user_id": target_oid,
        "type": "new_follower",
        "title": "NUOVO FOLLOWER! 👁️",
        "message": f"{current_user.get('username', '')} ha iniziato a seguirti",
        "data": {"follower_id": str(current_user["_id"]), "follower_username": current_user.get("username", "")},
        "read": False,
        "created_at": now,
    })

    return {"status": "following", "username": target.get("username", "")}


@router.delete("/unfollow/{user_id}")
async def unfollow_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Smetti di seguire un utente."""
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID utente invalido")

    result = await db.follows.delete_one({
        "follower_id": current_user["_id"],
        "target_user_id": target_oid,
    })
    if result.deleted_count == 0:
        raise HTTPException(404, "Non stavi seguendo questo utente")

    return {"status": "unfollowed"}


@router.get("/followers")
async def get_my_followers(
    current_user: dict = Depends(get_current_user),
):
    """Lista dei miei follower."""
    followers = await db.follows.find(
        {"target_user_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(200)

    results = []
    for f in followers:
        user = await db.users.find_one(
            {"_id": f["follower_id"]},
            {"username": 1, "avatar_color": 1, "sport": 1, "ak_credits": 1}
        )
        if user:
            results.append({
                "user_id": str(f["follower_id"]),
                "username": user.get("username", ""),
                "avatar_color": user.get("avatar_color", "#00E5FF"),
                "sport": user.get("sport"),
                "k_flux": user.get("ak_credits", 0),
            })

    return {"followers": results, "total": len(results)}


@router.get("/following")
async def get_my_following(
    current_user: dict = Depends(get_current_user),
):
    """Lista degli utenti che seguo."""
    following = await db.follows.find(
        {"follower_id": current_user["_id"]}
    ).sort("created_at", -1).to_list(200)

    results = []
    for f in following:
        user = await db.users.find_one(
            {"_id": f["target_user_id"]},
            {"username": 1, "avatar_color": 1, "sport": 1, "ak_credits": 1}
        )
        if user:
            results.append({
                "user_id": str(f["target_user_id"]),
                "username": user.get("username", ""),
                "avatar_color": user.get("avatar_color", "#00E5FF"),
                "sport": user.get("sport"),
                "k_flux": user.get("ak_credits", 0),
            })

    return {"following": results, "total": len(results)}


@router.get("/follow-status/{user_id}")
async def check_follow_status(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Verifica se segui un utente e se lui ti segue."""
    try:
        target_oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(400, "ID utente invalido")

    i_follow = await db.follows.find_one({
        "follower_id": current_user["_id"],
        "target_user_id": target_oid,
    })
    they_follow = await db.follows.find_one({
        "follower_id": target_oid,
        "target_user_id": current_user["_id"],
    })

    # Contact status
    contact = await db.contacts.find_one({
        "$or": [
            {"from_user_id": current_user["_id"], "to_user_id": target_oid},
            {"from_user_id": target_oid, "to_user_id": current_user["_id"]},
        ]
    })

    return {
        "i_follow": bool(i_follow),
        "they_follow": bool(they_follow),
        "contact_status": contact.get("status") if contact else None,
        "is_connected": contact.get("status") == "accepted" if contact else False,
    }


# ═══════════════════════════════════════════════════════════
# DB INDEXES
# ═══════════════════════════════════════════════════════════

async def setup_social_indexes():
    """Create indexes for social collections."""
    # Contacts
    await db.contacts.create_index([("from_user_id", 1), ("to_user_id", 1)], unique=True)
    await db.contacts.create_index([("to_user_id", 1), ("status", 1)])

    # Messages
    await db.messages.create_index([("from_user_id", 1), ("to_user_id", 1), ("created_at", -1)])
    await db.messages.create_index([("to_user_id", 1), ("read", 1)])

    # Follows
    await db.follows.create_index([("follower_id", 1), ("target_user_id", 1)], unique=True)
    await db.follows.create_index("target_user_id")

    logger.info("[SocialNetwork] Indexes created")
