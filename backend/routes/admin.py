"""
ARENAKORE — SUPER ADMIN ROUTES MODULE
═══════════════════════════════════════════════════
Extracted from server.py monolith.

Contains:
  - Admin Dashboard (Platform KPIs)
  - Inbound CRM (Gym Lead Management)
  - CMS Content Management
  - Push Notification Engine
  - Push Token Registration

Usage (in server.py):
  from routes.admin import register_admin_routes
  register_admin_routes(api_router, db, require_super_admin, get_current_user, hash_password)
"""
from fastapi import HTTPException, Depends, Body
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import random
import string
import logging

logger = logging.getLogger(__name__)


def register_admin_routes(api_router, db, require_super_admin, get_current_user, hash_password):
    """
    Register all SUPER_ADMIN routes onto the given api_router.
    Dependencies (db, auth helpers) are passed in from the main server module.
    """

    # ═══════════════════════════════════════════════════════════════════
    # ADMIN DASHBOARD — Platform KPIs
    # ═══════════════════════════════════════════════════════════════════

    @api_router.get("/admin/dashboard")
    async def admin_dashboard(current_user: dict = Depends(require_super_admin())):
        """Global platform KPIs for SUPER_ADMIN."""
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        total_users = await db.users.count_documents({})
        total_gyms = await db.gyms.count_documents({})
        total_scans = await db.performance_records.count_documents({})
        recent_scans = await db.performance_records.count_documents({"created_at": {"$gte": thirty_days_ago}})
        total_challenges = await db.templates.count_documents({})
        total_crews = await db.crews_v2.count_documents({}) if "crews_v2" in await db.list_collection_names() else 0
        pending_leads = await db.gym_leads.count_documents({"status": "pending"})

        # Role distribution
        athletes = await db.users.count_documents({"role": {"$in": ["ATHLETE", None, ""]}})
        coaches = await db.users.count_documents({"role": "COACH"})
        gym_owners = await db.users.count_documents({"role": "GYM_OWNER"})

        # New users (30d)
        new_users_30d = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})

        # City distribution (top 5)
        city_pipeline = [
            {"$match": {"city": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_cities = await db.users.aggregate(city_pipeline).to_list(5)

        return {
            "total_users": total_users,
            "total_gyms": total_gyms,
            "total_scans": total_scans,
            "recent_scans_30d": recent_scans,
            "total_challenges": total_challenges,
            "total_crews": total_crews,
            "pending_leads": pending_leads,
            "new_users_30d": new_users_30d,
            "role_distribution": {
                "athletes": athletes,
                "coaches": coaches,
                "gym_owners": gym_owners,
            },
            "top_cities": [{"city": c["_id"], "count": c["count"]} for c in top_cities],
        }

    # ═══════════════════════════════════════════════════════════════════
    # INBOUND CRM: Gym Lead Management
    # ═══════════════════════════════════════════════════════════════════

    class GymLeadBody(BaseModel):
        gym_name: str
        city: str
        address: str = ""
        email: str
        phone: str
        referent_name: str
        structure_type: str  # "Palestra", "Club Sportivo", "College", "Personal Studio"
        message: str = ""

    @api_router.post("/leads/gym")
    async def create_gym_lead(data: GymLeadBody):
        """PUBLIC endpoint — Receive a gym activation request from the landing page."""
        existing = await db.gym_leads.find_one({"email": data.email, "status": {"$ne": "rejected"}})
        if existing:
            raise HTTPException(400, "Una richiesta con questa email è già stata inviata")

        lead = {
            "gym_name": data.gym_name,
            "city": data.city.upper(),
            "address": data.address,
            "email": data.email.lower(),
            "phone": data.phone,
            "referent_name": data.referent_name,
            "structure_type": data.structure_type,
            "message": data.message,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "processed_at": None,
            "processed_by": None,
            "notes_admin": "",
        }
        result = await db.gym_leads.insert_one(lead)
        return {"id": str(result.inserted_id), "status": "pending", "message": "Richiesta ricevuta! Ti contatteremo a breve."}

    @api_router.get("/admin/leads")
    async def get_gym_leads(
        status: str = "all",
        current_user: dict = Depends(require_super_admin())
    ):
        """Get all gym leads with optional status filter."""
        query = {}
        if status != "all":
            query["status"] = status

        leads = []
        async for lead in db.gym_leads.find(query).sort("created_at", -1).limit(100):
            lead["_id"] = str(lead["_id"])
            leads.append(lead)

        counts = {
            "pending": await db.gym_leads.count_documents({"status": "pending"}),
            "approved": await db.gym_leads.count_documents({"status": "approved"}),
            "rejected": await db.gym_leads.count_documents({"status": "rejected"}),
        }
        return {"leads": leads, "counts": counts}

    @api_router.patch("/admin/leads/{lead_id}/activate")
    async def activate_gym_lead(
        lead_id: str,
        data: dict = Body({}),
        current_user: dict = Depends(require_super_admin())
    ):
        """Approve a lead and create the gym + owner account."""
        lead = await db.gym_leads.find_one({"_id": ObjectId(lead_id)})
        if not lead:
            raise HTTPException(404, "Lead non trovato")
        if lead["status"] == "approved":
            raise HTTPException(400, "Lead già approvato")

        # Generate a gym code
        gym_code = lead["city"][:4].upper() + ''.join(random.choices(string.digits, k=3))

        # Check if a user already exists with this email
        existing_user = await db.users.find_one({"email": lead["email"]})

        subscription = data.get("subscription_tier", "pro")

        if existing_user:
            # Upgrade existing user to GYM_OWNER
            owner_id = str(existing_user["_id"])
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"role": "GYM_OWNER"}}
            )
        else:
            # Create new GYM_OWNER account
            temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
            new_user = {
                "username": lead["referent_name"].upper().replace(" ", "_"),
                "email": lead["email"],
                "password_hash": hash_password(temp_password),
                "role": "GYM_OWNER",
                "city": lead["city"],
                "xp": 0, "level": 1,
                "dna": {}, "sport": "", "category": "",
                "is_admin": False, "is_founder": False, "is_seed": False,
                "created_at": datetime.now(timezone.utc),
            }
            result = await db.users.insert_one(new_user)
            owner_id = str(result.inserted_id)

        # Create the gym
        gym = {
            "name": lead["gym_name"],
            "code": gym_code,
            "owner_id": owner_id,
            "city": lead["city"],
            "address": lead["address"],
            "phone": lead["phone"],
            "structure_type": lead["structure_type"],
            "subscription_tier": subscription,
            "max_athletes": 50 if subscription == "pro" else 200,
            "created_at": datetime.now(timezone.utc),
        }
        gym_result = await db.gyms.insert_one(gym)

        # Link owner to gym
        await db.users.update_one(
            {"_id": ObjectId(owner_id)},
            {"$set": {"gym_id": str(gym_result.inserted_id)}}
        )

        # Update lead status
        await db.gym_leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {
                "status": "approved",
                "processed_at": datetime.now(timezone.utc),
                "processed_by": str(current_user["_id"]),
                "notes_admin": data.get("notes", ""),
                "gym_id": str(gym_result.inserted_id),
            }}
        )

        return {
            "status": "approved",
            "gym_id": str(gym_result.inserted_id),
            "gym_code": gym_code,
            "owner_id": owner_id,
        }

    @api_router.patch("/admin/leads/{lead_id}/reject")
    async def reject_gym_lead(
        lead_id: str,
        data: dict = Body({}),
        current_user: dict = Depends(require_super_admin())
    ):
        """Reject a gym lead."""
        result = await db.gym_leads.update_one(
            {"_id": ObjectId(lead_id)},
            {"$set": {
                "status": "rejected",
                "processed_at": datetime.now(timezone.utc),
                "processed_by": str(current_user["_id"]),
                "notes_admin": data.get("notes", "Richiesta non approvata"),
            }}
        )
        if result.modified_count == 0:
            raise HTTPException(404, "Lead non trovato")
        return {"status": "rejected"}

    # ═══════════════════════════════════════════════════════════════════
    # CMS CONTENT MANAGEMENT
    # ═══════════════════════════════════════════════════════════════════

    class CMSContentBody(BaseModel):
        key: str
        title: str
        body: str = ""
        category: str = "announcement"
        is_active: bool = True
        target_audience: str = "all"
        priority: int = 0

    @api_router.get("/admin/cms")
    async def list_cms_content(current_user: dict = Depends(require_super_admin())):
        """List all CMS content entries."""
        items = []
        async for item in db.cms_content.find().sort("updated_at", -1):
            item["_id"] = str(item["_id"])
            items.append(item)
        return {"items": items, "total": len(items)}

    @api_router.post("/admin/cms")
    async def create_cms_content(data: CMSContentBody, current_user: dict = Depends(require_super_admin())):
        """Create a new CMS content entry."""
        existing = await db.cms_content.find_one({"key": data.key})
        if existing:
            raise HTTPException(400, f"La chiave '{data.key}' esiste già. Usa PATCH per aggiornare.")

        entry = {
            "key": data.key,
            "title": data.title,
            "body": data.body,
            "category": data.category,
            "is_active": data.is_active,
            "target_audience": data.target_audience,
            "priority": data.priority,
            "created_by": str(current_user["_id"]),
            "updated_by": str(current_user["_id"]),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.cms_content.insert_one(entry)
        entry["_id"] = str(result.inserted_id)
        return entry

    @api_router.patch("/admin/cms/{item_id}")
    async def update_cms_content(item_id: str, data: dict = Body({}), current_user: dict = Depends(require_super_admin())):
        """Update a CMS content entry."""
        update_fields = {k: v for k, v in data.items() if k in ("title", "body", "category", "is_active", "target_audience", "priority")}
        update_fields["updated_by"] = str(current_user["_id"])
        update_fields["updated_at"] = datetime.now(timezone.utc)

        result = await db.cms_content.update_one({"_id": ObjectId(item_id)}, {"$set": update_fields})
        if result.modified_count == 0:
            raise HTTPException(404, "Contenuto non trovato")
        return {"status": "updated"}

    @api_router.delete("/admin/cms/{item_id}")
    async def delete_cms_content(item_id: str, current_user: dict = Depends(require_super_admin())):
        """Delete a CMS content entry."""
        result = await db.cms_content.delete_one({"_id": ObjectId(item_id)})
        if result.deleted_count == 0:
            raise HTTPException(404, "Contenuto non trovato")
        return {"status": "deleted"}

    @api_router.get("/cms/public")
    async def get_public_cms():
        """PUBLIC — Fetch active CMS content for the app."""
        items = []
        async for item in db.cms_content.find({"is_active": True}).sort("priority", -1).limit(20):
            items.append({
                "key": item["key"],
                "title": item["title"],
                "body": item.get("body", ""),
                "category": item.get("category", "announcement"),
                "target_audience": item.get("target_audience", "all"),
            })
        return {"items": items}

    # ═══════════════════════════════════════════════════════════════════
    # PUSH NOTIFICATION ENGINE
    # ═══════════════════════════════════════════════════════════════════

    class PushCampaignBody(BaseModel):
        title: str
        body: str
        filter_city: str = ""
        filter_min_level: int = 0
        filter_max_level: int = 99
        filter_role: str = "all"
        filter_crew: str = ""
        data_payload: dict = {}

    @api_router.post("/admin/push")
    async def send_push_campaign(data: PushCampaignBody, current_user: dict = Depends(require_super_admin())):
        """Create and send a targeted push notification campaign."""
        import httpx

        # Build user filter query
        user_query: dict = {}
        if data.filter_city:
            user_query["city"] = data.filter_city.upper()
        if data.filter_min_level > 0 or data.filter_max_level < 99:
            user_query["level"] = {"$gte": data.filter_min_level, "$lte": data.filter_max_level}
        if data.filter_role != "all":
            user_query["role"] = data.filter_role

        # Get expo push tokens for matching users
        user_query["expo_push_token"] = {"$exists": True, "$ne": None, "$ne": ""}

        # If crew filter, find crew members first
        if data.filter_crew:
            crew = await db.crews_v2.find_one({"name": {"$regex": data.filter_crew, "$options": "i"}})
            if crew:
                user_query["_id"] = {"$in": [ObjectId(m) if isinstance(m, str) else m for m in crew.get("members", [])]}

        tokens = []
        async for user in db.users.find(user_query, {"expo_push_token": 1}):
            token = user.get("expo_push_token")
            if token and token.startswith("ExponentPushToken"):
                tokens.append(token)

        # Save campaign
        campaign = {
            "title": data.title,
            "body": data.body,
            "filters": {
                "city": data.filter_city,
                "min_level": data.filter_min_level,
                "max_level": data.filter_max_level,
                "role": data.filter_role,
                "crew": data.filter_crew,
            },
            "data_payload": data.data_payload,
            "target_count": len(tokens),
            "sent_count": 0,
            "failed_count": 0,
            "status": "sending",
            "created_by": str(current_user["_id"]),
            "created_at": datetime.now(timezone.utc),
        }
        camp_result = await db.push_campaigns.insert_one(campaign)
        camp_id = str(camp_result.inserted_id)

        # Send via Expo Push API
        sent = 0
        failed = 0
        if tokens:
            messages = []
            for token in tokens:
                messages.append({
                    "to": token,
                    "sound": "default",
                    "title": data.title,
                    "body": data.body,
                    "data": data.data_payload,
                })

            # Batch send (max 100 per request)
            async with httpx.AsyncClient() as client_http:
                for i in range(0, len(messages), 100):
                    batch = messages[i:i+100]
                    try:
                        resp = await client_http.post(
                            "https://exp.host/--/api/v2/push/send",
                            json=batch,
                            headers={"Content-Type": "application/json"}
                        )
                        if resp.status_code == 200:
                            sent += len(batch)
                        else:
                            failed += len(batch)
                    except Exception:
                        failed += len(batch)

        # Update campaign status
        await db.push_campaigns.update_one(
            {"_id": ObjectId(camp_id)},
            {"$set": {"status": "sent", "sent_count": sent, "failed_count": failed}}
        )

        return {
            "campaign_id": camp_id,
            "target_count": len(tokens),
            "sent_count": sent,
            "failed_count": failed,
            "status": "sent",
        }

    @api_router.get("/admin/push/history")
    async def get_push_history(current_user: dict = Depends(require_super_admin())):
        """Get push campaign history."""
        campaigns = []
        async for c in db.push_campaigns.find().sort("created_at", -1).limit(50):
            c["_id"] = str(c["_id"])
            campaigns.append(c)
        return {"campaigns": campaigns}

    # ═══════════════════════════════════════════════════════════════════
    # PUSH TOKEN REGISTRATION (Mobile App)
    # ═══════════════════════════════════════════════════════════════════

    @api_router.post("/push/register-token")
    async def register_push_token(data: dict = Body({}), current_user: dict = Depends(get_current_user)):
        """Store the Expo Push Token for the current user."""
        token = data.get("token", "")
        if not token:
            raise HTTPException(400, "Token mancante")
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"expo_push_token": token}}
        )
        return {"status": "registered"}

    logger.info("[AdminRoutes] Registered SUPER_ADMIN routes (Dashboard, Leads, CMS, Push)")
