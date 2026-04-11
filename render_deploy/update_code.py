"""
Script to update the CODE env var on Render with Staff Hub endpoints.
"""
import json
import urllib.request

RENDER_API_KEY = "rnd_AHNfC7CXb9g9ijCg59H4zdRGslEr"
SERVICE_ID = "srv-d7bk5q95pdvs73dodur0"

# The full updated CODE with Staff Hub endpoints
NEW_CODE = r'''
import subprocess, sys, os, json, traceback

port = int(os.environ.get("PORT", "10000"))

# Phase 1: Install deps
print("=== Installing deps ===", flush=True)
subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--no-cache-dir', '--prefer-binary',
    'fastapi', 'uvicorn', 'motor', 'python-jose', 'bcrypt', 'dnspython', 'certifi', 'pydantic'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("=== Deps OK ===", flush=True)

# Phase 2: Run server
try:
    from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi.responses import JSONResponse
    from starlette.middleware.cors import CORSMiddleware
    from motor.motor_asyncio import AsyncIOMotorClient
    import logging, random, hashlib
    from datetime import datetime, timezone, timedelta
    from jose import JWTError, jwt
    import bcrypt as _bcrypt
    from bson import ObjectId
    from pydantic import BaseModel
    from typing import Optional, List
    import certifi

    logging.basicConfig(level=logging.INFO)

    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=15000)
    db = client[os.environ.get('DB_NAME', 'arenakore')]

    SECRET = os.environ.get('SECRET_KEY', 'arenadare-nexus-secret-2024-v1')
    ALG = "HS256"
    sec = HTTPBearer()
    app = FastAPI(title="ARENAKORE API")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    api = APIRouter(prefix="/api")

    def hp(p): return _bcrypt.hashpw(p.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')
    def vp(pl, ha): return _bcrypt.checkpw(pl.encode('utf-8'), ha.encode('utf-8') if isinstance(ha, str) else ha)
    def ct(uid):
        return jwt.encode({"sub": uid, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm=ALG)

    async def gcu(c: HTTPAuthorizationCredentials = Depends(sec)):
        try:
            p = jwt.decode(c.credentials, SECRET, algorithms=[ALG])
            uid = p.get("sub")
            if not uid: raise HTTPException(401, "Token non valido")
        except JWTError:
            raise HTTPException(401, "Token non valido")
        u = await db.users.find_one({"_id": ObjectId(uid)})
        if not u: raise HTTPException(401, "Utente non trovato")
        u["id"] = str(u["_id"])
        return u

    def nr(u):
        r = u.get("role") or ""
        if u.get("is_admin") or r == "SUPER_ADMIN": return "SUPER_ADMIN"
        return r if r in ("GYM_OWNER","COACH","ATHLETE") else "ATHLETE"

    def u2r(u):
        nc = bool(u.get("onboarding_completed") and u.get("baseline_scanned_at") and u.get("dna"))
        return {"id":str(u["_id"]),"username":u["username"],"email":u["email"],"first_name":u.get("first_name",""),"last_name":u.get("last_name",""),"language":u.get("language","IT"),"role":nr(u),"gym_id":str(u["gym_id"]) if u.get("gym_id") else None,"sport":u.get("sport"),"xp":u.get("xp",0),"flux":u.get("xp",0),"level":u.get("level",1),"onboarding_completed":u.get("onboarding_completed",False),"is_nexus_certified":nc,"baseline_scanned_at":u.get("baseline_scanned_at").isoformat() if u.get("baseline_scanned_at") else None,"scout_visible":u.get("scout_visible",True),"dna":u.get("dna"),"avatar_color":u.get("avatar_color","#00E5FF"),"is_admin":u.get("is_admin",False),"is_founder":u.get("is_founder",False),"founder_number":u.get("founder_number"),"height_cm":u.get("height_cm"),"weight_kg":u.get("weight_kg"),"age":u.get("age"),"gender":u.get("gender"),"is_pro":(u.get("level",1)>=10 or u.get("xp",0)>=3000),"pro_unlocked":u.get("pro_unlocked",False),"ghost_mode":u.get("ghost_mode",False),"camera_enabled":u.get("camera_enabled",False),"mic_enabled":u.get("mic_enabled",False),"city":u.get("city"),"ak_credits":u.get("ak_credits",0),"master_flux":u.get("master_flux",0),"diamond_flux":u.get("diamond_flux",0),"unlocked_tools":u.get("unlocked_tools",[]),"total_scans":len(u.get("dna_scans",[])),"bmi":u.get("bmi"),"bio_coefficient":u.get("bio_coefficient"),"profile_picture":u.get("profile_picture"),"cover_photo":u.get("cover_photo"),"preferred_sport":u.get("preferred_sport") or u.get("sport"),"training_level":u.get("training_level","Amateur")}

    # ── RBAC Helpers ──
    def require_role(*roles):
        async def dep(cu: dict = Depends(gcu)):
            r = nr(cu)
            if r == "SUPER_ADMIN": return cu
            if r not in roles: raise HTTPException(403, f"Ruolo richiesto: {list(roles)}")
            return cu
        return dep

    async def get_user_gym(cu):
        if cu.get("gym_id"):
            return await db.gyms.find_one({"_id": cu["gym_id"]})
        return await db.gyms.find_one({"owner_id": cu["_id"]})

    async def require_gym_access(cu: dict = Depends(gcu)):
        r = nr(cu)
        if r == "SUPER_ADMIN": return cu
        if r not in ("GYM_OWNER", "COACH"): raise HTTPException(403, "Accesso solo per staff palestra")
        return cu

    # ── Pydantic Models ──
    class UL(BaseModel):
        email: str
        password: str

    class UR(BaseModel):
        username: str
        email: str
        password: str
        height_cm: Optional[float] = None
        weight_kg: Optional[float] = None
        age: Optional[int] = None
        training_level: Optional[str] = None
        gender: Optional[str] = None
        preferred_sport: Optional[str] = None

    class GymStaffAdd(BaseModel):
        email: str
        role: str = "COACH"

    @api.get("/health")
    async def health():
        try:
            await client.admin.command('ping')
            return {"status":"ok","db":"connected","v":"3-staffhub"}
        except Exception as e:
            return {"status":"degraded","db":str(e),"v":"3-staffhub"}

    @api.post("/auth/register")
    async def register(d: UR):
        if len(d.username)<3: raise HTTPException(400,"Username troppo corto")
        if len(d.password)<8: raise HTTPException(400,"Password troppo corta")
        if await db.users.find_one({"username":d.username}): raise HTTPException(400,"Username gia in uso")
        if await db.users.find_one({"email":d.email.strip().lower()}): raise HTTPException(400,"Email gia registrata")
        tc = await db.users.count_documents({})
        u = {"username":d.username.strip(),"email":d.email.strip().lower(),"password_hash":hp(d.password),"role":None,"sport":d.preferred_sport or "ATHLETICS","preferred_sport":d.preferred_sport or "ATHLETICS","training_level":d.training_level or "LEGACY","height_cm":d.height_cm,"weight_kg":d.weight_kg,"age":d.age,"gender":d.gender,"xp":0,"level":1,"ak_credits":0,"unlocked_tools":[],"onboarding_completed":False,"avatar_color":random.choice(["#00E5FF","#FFD700","#FF3B30","#34C759"]),"dna":None,"is_founder":tc<100,"founder_number":(tc+1) if tc<100 else None,"created_at":datetime.now(timezone.utc)}
        r = await db.users.insert_one(u)
        u["_id"] = r.inserted_id
        return {"token":ct(str(r.inserted_id)),"user":u2r(u)}

    @api.post("/auth/login")
    async def login(d: UL):
        u = await db.users.find_one({"email":d.email.strip().lower()})
        if not u or not vp(d.password,u["password_hash"]): raise HTTPException(401,"Credenziali non valide")
        return {"token":ct(str(u["_id"])),"user":u2r(u)}

    @api.get("/auth/me")
    async def me(cu:dict=Depends(gcu)): return u2r(cu)

    @api.get("/auth/check-username")
    async def ck(username:str): return {"available":not await db.users.find_one({"username":username})}

    @api.put("/auth/onboarding")
    async def onb(d:dict,cu:dict=Depends(gcu)):
        up={"onboarding_completed":True}
        if d.get("role"): up["role"]=d["role"]
        if d.get("sport"): up["sport"]=d["sport"]
        await db.users.update_one({"_id":cu["_id"]},{"$set":up})
        return u2r(await db.users.find_one({"_id":cu["_id"]}))

    @api.get("/sports/categories")
    async def sc(): return [{"id":"combat","name":"Combat Sports","sports":[{"id":"boxing","name":"Boxing"},{"id":"mma","name":"MMA"}]},{"id":"athletics","name":"Athletics","sports":[{"id":"sprinting","name":"Sprinting"},{"id":"marathon","name":"Marathon"}]},{"id":"team","name":"Team Sports","sports":[{"id":"football","name":"Football"},{"id":"basketball","name":"Basketball"}]},{"id":"fitness","name":"Fitness","sports":[{"id":"crossfit","name":"CrossFit"},{"id":"powerlifting","name":"Powerlifting"}]}]

    @api.get("/battles")
    async def gb(cu:dict=Depends(gcu)): return []
    @api.get("/battles/crew/live")
    async def gcl(cu:dict=Depends(gcu)): return []
    @api.get("/battles/crew/matchmake")
    async def gcm(cu:dict=Depends(gcu)):
        try:
            crews = await db.crews_v2.find({"status":"active"}).to_list(50)
            if not crews: return []
            return [{"crew_id":str(c["_id"]),"name":c.get("name",""),"members":len(c.get("members",[]))} for c in crews]
        except Exception:
            return []
    @api.post("/battles/crew/matchmake")
    async def pcm(d:dict,cu:dict=Depends(gcu)):
        try:
            return {"match":None,"message":"Nessuna crew disponibile per il matchmaking"}
        except Exception:
            return {"match":None,"message":"Errore nel matchmaking"}
    @api.get("/battles/active")
    async def gba(cu:dict=Depends(gcu)): return []
    @api.get("/battles/history")
    async def gbh(cu:dict=Depends(gcu)):
        try:
            bs = await db.battles.find({"$or":[{"challenger_id":str(cu["_id"])},{"opponent_id":str(cu["_id"])}]}).sort("created_at",-1).limit(20).to_list(20)
            for b in bs: b["_id"]=str(b["_id"])
            return bs
        except Exception:
            return []
    @api.get("/disciplines")
    async def gd(cu:dict=Depends(gcu)): return [{"id":"push_ups","name":"Push Ups","unit":"reps"},{"id":"squats","name":"Squats","unit":"reps"}]
    @api.get("/crews")
    async def gc(cu:dict=Depends(gcu)): return []
    @api.get("/crews/my-crews")
    async def gmc(cu:dict=Depends(gcu)): return []
    @api.get("/crews/invites")
    async def gi(cu:dict=Depends(gcu)): return []
    @api.get("/leaderboard")
    async def gl(type:str="xp",cu:dict=Depends(gcu)):
        us=await db.users.find().sort("xp",-1).limit(50).to_list(50)
        return [{"rank":i+1,"username":u["username"],"xp":u.get("xp",0),"level":u.get("level",1),"avatar_color":u.get("avatar_color","#00E5FF")} for i,u in enumerate(us)]
    @api.get("/leaderboard/my-rank")
    async def gmr(cu:dict=Depends(gcu)):
        h=await db.users.count_documents({"xp":{"$gt":cu.get("xp",0)}})
        return {"rank":h+1,"xp":cu.get("xp",0),"level":cu.get("level",1)}
    @api.get("/nexus/sessions")
    async def gns(cu:dict=Depends(gcu)): return []
    @api.get("/nexus/rescan-eligibility")
    async def gre(cu:dict=Depends(gcu)): return {"eligible":True}
    @api.get("/challenge/user/active")
    async def gac(cu:dict=Depends(gcu)): return []
    @api.get("/challenges/history")
    async def gch(cu:dict=Depends(gcu)): return []
    @api.get("/notifications")
    async def gn(cu:dict=Depends(gcu)):
        ns=await db.notifications.find({"user_id":str(cu["_id"])}).sort("created_at",-1).to_list(50)
        for n in ns: n["_id"]=str(n["_id"])
        return ns
    @api.get("/dna/history")
    async def gdh(cu:dict=Depends(gcu)): return cu.get("dna_scans",[])
    @api.get("/kore/history")
    async def gkh(limit:int=20,offset:int=0,cu:dict=Depends(gcu)):
        q={"user_id":str(cu["_id"])}
        rs=await db.performance_records.find(q).sort("created_at",-1).skip(offset).limit(limit).to_list(limit)
        for r in rs: r["_id"]=str(r["_id"])
        return {"records":rs,"total":await db.performance_records.count_documents(q)}
    @api.get("/kore/stats")
    async def gks(cu:dict=Depends(gcu)):
        return {"total_records":await db.performance_records.count_documents({"user_id":str(cu["_id"])}),"xp":cu.get("xp",0),"level":cu.get("level",1)}
    @api.get("/kore/silo-profile")
    async def gsp(cu:dict=Depends(gcu)): return u2r(cu)
    @api.get("/ak/balance")
    async def gab(cu:dict=Depends(gcu)): return {"ak_credits":cu.get("ak_credits",0),"master_flux":cu.get("master_flux",0)}
    @api.get("/ak/tools")
    async def gat(cu:dict=Depends(gcu)): return {"tools":[],"unlocked":cu.get("unlocked_tools",[])}

    # ═══════════════════════════════════════════════════════════════
    # GYM & STAFF HUB ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    @api.get("/gym/me")
    async def gmg(cu:dict=Depends(gcu)):
        gym = await get_user_gym(cu)
        if not gym: return None
        return {"id":str(gym["_id"]),"name":gym.get("name",""),"gym_code":gym.get("gym_code",""),"subscription_tier":gym.get("subscription_tier","free")}

    @api.get("/gym/staff")
    async def get_gym_staff(cu: dict = Depends(require_gym_access)):
        """Staff Hub - full analytics per coach for GYM_OWNER"""
        gym = await get_user_gym(cu)
        if not gym:
            return {"staff": [], "coaches_count": 0, "athletes_total": 0, "gym_name": ""}

        gym_id = gym["_id"]

        # All staff (coaches + owner)
        staff_users = await db.users.find(
            {"gym_id": gym_id, "role": {"$in": ["COACH", "GYM_OWNER"]}}
        ).to_list(100)

        # All athletes in this gym
        all_athletes = await db.users.find(
            {"gym_id": gym_id, "role": "ATHLETE"}
        ).to_list(500)
        athletes_total = len(all_athletes)

        enriched_staff = []
        for u in staff_users:
            uid = str(u["_id"])
            role = nr(u)

            # Count athletes assigned to this coach
            drafted = await db.talent_drafts.count_documents({"coach_id": uid, "status": "accepted"})
            athlete_count = drafted if role == "COACH" else athletes_total

            # Recent activity
            last_session = await db.nexus_sessions.find_one(
                {"user_id": uid}, sort=[("started_at", -1)]
            )
            last_active = last_session["started_at"] if last_session else u.get("created_at")

            # Sessions coached
            sessions_coached = await db.performance_records.count_documents({"coach_id": uid}) if role == "COACH" else 0

            enriched_staff.append({
                "id": uid,
                "username": u.get("username", ""),
                "email": u.get("email", ""),
                "first_name": u.get("first_name", ""),
                "last_name": u.get("last_name", ""),
                "role": role,
                "level": u.get("level", 1),
                "xp": u.get("xp", 0),
                "avatar_color": u.get("avatar_color", "#00E5FF"),
                "sport": u.get("sport", ""),
                "athlete_count": athlete_count,
                "sessions_coached": sessions_coached,
                "last_active": last_active.isoformat() if last_active else None,
                "joined_at": u.get("created_at").isoformat() if u.get("created_at") else None,
                "is_nexus_certified": bool(u.get("dna") and u.get("baseline_scanned_at")),
            })

        return {
            "staff": enriched_staff,
            "coaches_count": sum(1 for s in enriched_staff if s["role"] == "COACH"),
            "athletes_total": athletes_total,
            "gym_name": gym.get("name", ""),
            "gym_code": gym.get("gym_code", ""),
        }

    @api.post("/gym/staff/add")
    async def add_gym_staff(data: GymStaffAdd, cu: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
        """GYM_OWNER adds a Coach to their gym"""
        gym = await db.gyms.find_one({"owner_id": cu["_id"]})
        if not gym:
            raise HTTPException(status_code=404, detail="Palestra non trovata")
        target = await db.users.find_one({"email": data.email.lower()})
        if not target:
            raise HTTPException(status_code=404, detail=f"Utente non trovato: {data.email}")
        if str(target["_id"]) == str(cu["_id"]):
            raise HTTPException(status_code=400, detail="Non puoi aggiungere te stesso come staff")
        valid_roles = ("COACH", "GYM_OWNER", "ATHLETE")
        if data.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Ruolo non valido. Scegli: {list(valid_roles)}")
        await db.users.update_one({"_id": target["_id"]}, {"$set": {"gym_id": gym["_id"], "role": data.role}})
        await db.gyms.update_one({"_id": gym["_id"]}, {"$addToSet": {"coaches": target["_id"]}})
        await db.notifications.insert_one({
            "user_id": str(target["_id"]), "type": "gym_added",
            "title": "AGGIUNTO ALLA PALESTRA", "icon": "business", "color": "#D4AF37",
            "message": f"Sei stato aggiunto come {data.role} in {gym.get('name', 'palestra')}",
            "read": False, "created_at": datetime.now(timezone.utc)
        })
        return {"status": "added", "username": target.get("username"), "role": data.role, "gym": gym.get("name")}

    @api.delete("/gym/staff/{user_id}")
    async def remove_gym_staff(user_id: str, cu: dict = Depends(require_role("GYM_OWNER", "ADMIN"))):
        """GYM_OWNER removes a staff member"""
        gym = await db.gyms.find_one({"owner_id": cu["_id"]})
        if not gym:
            raise HTTPException(status_code=404, detail="Palestra non trovata")
        try:
            target_oid = ObjectId(user_id)
        except Exception:
            raise HTTPException(status_code=400, detail="ID non valido")
        await db.users.update_one({"_id": target_oid}, {"$unset": {"gym_id": ""}, "$set": {"role": "ATHLETE"}})
        await db.gyms.update_one({"_id": gym["_id"]}, {"$pull": {"coaches": target_oid}})
        return {"status": "removed"}

    @api.post("/gym/join")
    async def join_gym(d: dict, cu: dict = Depends(gcu)):
        gym = await db.gyms.find_one({"gym_code": d.get("gym_code","").upper()})
        if not gym: raise HTTPException(404, "Codice palestra non valido")
        if cu.get("gym_id") == gym["_id"]: raise HTTPException(400, "Sei gia parte di questa palestra")
        join_role = d.get("role", "ATHLETE")
        if join_role not in ("ATHLETE", "COACH"): join_role = "ATHLETE"
        await db.users.update_one({"_id": cu["_id"]}, {"$set": {"gym_id": gym["_id"], "role": join_role}})
        return {"status": "joined", "gym": gym.get("name")}

    # ═══════════════════════════════════════════════════════════════
    # COACH STUDIO ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    @api.get("/coach/athletes")
    async def get_coach_athletes(cu: dict = Depends(gcu)):
        role = nr(cu)
        if role == "SUPER_ADMIN":
            athletes = await db.users.find({"role": "ATHLETE"}).to_list(200)
        elif role in ("GYM_OWNER", "COACH"):
            gym = await get_user_gym(cu)
            if not gym: return []
            athletes = await db.users.find({"gym_id": gym["_id"], "role": "ATHLETE"}).to_list(200)
        else:
            return []
        return [u2r(a) for a in athletes]

    @api.get("/coach/live-events")
    async def gle(cu:dict=Depends(gcu)): return []
    @api.get("/coach/tier")
    async def gtt(cu:dict=Depends(gcu)): return {"tier":"free","features":[]}

    @api.get("/talent/discovery")
    async def talent_disc(cu: dict = Depends(gcu)):
        role = nr(cu)
        if role not in ("SUPER_ADMIN", "GYM_OWNER", "COACH"): return []
        athletes = await db.users.find({"scout_visible": True, "dna": {"$ne": None}}).to_list(100)
        return [u2r(a) for a in athletes]

    @api.get("/talent/received-drafts")
    async def grd(cu:dict=Depends(gcu)): return []

    # ═══════════════════════════════════════════════════════════════
    # PROFILE & MISC
    # ═══════════════════════════════════════════════════════════════
    @api.put("/profile/city")
    async def upc(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"city":d.get("city")}}); return {"status":"ok"}
    @api.put("/profile/permissions")
    async def upp(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"camera_enabled":True,"mic_enabled":True}}); return {"status":"ok"}
    @api.put("/profile/ghost-mode")
    async def upg(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"ghost_mode":d.get("enabled",False)}}); return {"status":"ok"}
    @api.get("/pvp/pending")
    async def gpp(cu:dict=Depends(gcu)): return []
    @api.get("/templates")
    async def gt(cu:dict=Depends(gcu)): return []
    @api.get("/my-template")
    async def gmt(cu:dict=Depends(gcu)): return None
    @api.get("/certified-templates")
    async def gct(cu:dict=Depends(gcu)): return []
    @api.get("/health/connections")
    async def ghc(cu:dict=Depends(gcu)): return []
    @api.get("/health/source-meta")
    async def gsm(): return []
    @api.get("/kore/action-center")
    async def gac2(cu:dict=Depends(gcu)): return {"missions":[],"daily_streak":0}
    @api.get("/kore/affiliations")
    async def ga(cu:dict=Depends(gcu)): return {"school":cu.get("school"),"university":cu.get("university")}
    @api.get("/users/search/{q}")
    async def su(q:str,cu:dict=Depends(gcu)):
        us=await db.users.find({"username":{"$regex":q,"$options":"i"}}).limit(20).to_list(20)
        return [{"id":str(u["_id"]),"username":u["username"],"avatar_color":u.get("avatar_color","#00E5FF")} for u in us]
    @api.post("/users/push-token")
    async def spt(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"push_token":d.get("push_token")}}); return {"status":"ok"}
    @api.post("/user/profile-picture")
    async def upp2(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"profile_picture":d.get("image_base64")}}); return {"status":"ok"}
    @api.delete("/user/profile-picture")
    async def dpp(cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$unset":{"profile_picture":""}}); return {"status":"ok"}
    @api.post("/user/cover-photo")
    async def ucp(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"cover_photo":d.get("image_base64")}}); return {"status":"ok"}
    @api.delete("/user/cover-photo")
    async def dcp(cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$unset":{"cover_photo":""}}); return {"status":"ok"}
    @api.get("/validation/breakdown")
    async def gvb(cu:dict=Depends(gcu)): return {"total":0,"validated":0,"pending":0}
    @api.put("/users/scout-visibility")
    async def usv(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"scout_visible":d.get("scout_visible",True)}}); return {"status":"ok"}
    @api.post("/auth/forgot-password")
    async def fp(d:dict):
        em=d.get("email","").strip().lower()
        u=await db.users.find_one({"email":em})
        if not u: return {"status":"sent"}
        otp=str(random.randint(100000,999999))
        await db.password_resets.delete_many({"email":em})
        await db.password_resets.insert_one({"email":em,"otp_hash":hashlib.sha256(otp.encode()).hexdigest(),"created_at":datetime.now(timezone.utc),"expires_at":datetime.now(timezone.utc)+timedelta(minutes=10),"verified":False,"used":False})
        return {"status":"sent","dev_otp":otp}
    @api.post("/auth/verify-otp")
    async def vo(d:dict):
        em=d.get("email","").strip().lower()
        r=await db.password_resets.find_one({"email":em,"used":False,"expires_at":{"$gt":datetime.now(timezone.utc)}})
        if not r: raise HTTPException(400,"OTP scaduto")
        if hashlib.sha256(d.get("otp","").strip().encode()).hexdigest()!=r["otp_hash"]: raise HTTPException(400,"OTP non valido")
        rt=jwt.encode({"sub":str(r["_id"]),"email":em,"exp":datetime.now(timezone.utc)+timedelta(minutes=15)},SECRET,algorithm=ALG)
        await db.password_resets.update_one({"_id":r["_id"]},{"$set":{"verified":True}})
        return {"status":"verified","reset_token":rt}
    @api.post("/auth/reset-password")
    async def rp(d:dict):
        if d.get("new_password")!=d.get("confirm_password"): raise HTTPException(400,"Password non corrispondono")
        try: p=jwt.decode(d["reset_token"],SECRET,algorithms=[ALG]); em=p.get("email")
        except JWTError: raise HTTPException(400,"Token scaduto")
        await db.users.update_one({"email":em},{"$set":{"password_hash":hp(d["new_password"])}})
        return {"status":"success"}
    @api.post("/scan/result")
    async def ssr(d:dict,cu:dict=Depends(gcu)):
        await db.performance_records.insert_one({"user_id":str(cu["_id"]),"kore_score":d.get("kore_score",0),"created_at":datetime.now(timezone.utc)}); return {"status":"saved"}
    @api.post("/nexus/5beat-dna")
    async def s5b(d:dict,cu:dict=Depends(gcu)):
        await db.users.update_one({"_id":cu["_id"]},{"$set":{"dna":d.get("dna_results",{}),"baseline_scanned_at":datetime.now(timezone.utc)}}); return {"status":"saved"}
    @api.post("/nexus/session/start")
    async def nss(d:dict,cu:dict=Depends(gcu)):
        r=await db.nexus_sessions.insert_one({"user_id":str(cu["_id"]),"exercise_type":d.get("exercise_type"),"started_at":datetime.now(timezone.utc)}); return {"session_id":str(r.inserted_id)}
    @api.post("/nexus/session/complete")
    async def nsc(d:dict,cu:dict=Depends(gcu)):
        xp=int(d.get("quality_score",50)*2); await db.users.update_one({"_id":cu["_id"]},{"$inc":{"xp":xp}}); return {"status":"completed","xp_earned":xp}
    @api.post("/nexus/session/{sid}/complete")
    async def nsc2(sid:str,d:dict,cu:dict=Depends(gcu)): return {"status":"completed"}
    @api.post("/nexus/bioscan")
    async def nb(cu:dict=Depends(gcu)): return {"status":"completed"}
    @api.post("/challenges/complete")
    async def cc(d:dict,cu:dict=Depends(gcu)): return {"status":"completed","xp_earned":50}
    @api.get("/wallet/apple-pass")
    async def wap(cu:dict=Depends(gcu)): return {"url":None}
    @api.get("/wallet/google-pass")
    async def wgp(cu:dict=Depends(gcu)): return {"url":None}
    @api.post("/coach/web-token")
    async def gwt(cu:dict=Depends(gcu)):
        import secrets; otp=secrets.token_urlsafe(32)
        await db.web_tokens.insert_one({"token":otp,"user_id":str(cu["_id"]),"created_at":datetime.now(timezone.utc),"expires_at":datetime.now(timezone.utc)+timedelta(minutes=5)}); return {"otp":otp}
    @api.post("/auth/web-token-login")
    async def wtl(d:dict):
        r=await db.web_tokens.find_one({"token":d.get("token"),"expires_at":{"$gt":datetime.now(timezone.utc)}})
        if not r: raise HTTPException(401,"Token scaduto")
        u=await db.users.find_one({"_id":ObjectId(r["user_id"])})
        return {"token":ct(str(u["_id"])),"user":u2r(u)}
    @api.post("/gym/hub-request")
    async def shr(d:dict):
        d["created_at"]=datetime.now(timezone.utc); d["status"]="pending"; await db.leads.insert_one(d); return {"status":"submitted"}
    @api.post("/performance/record")
    async def spr(d:dict,cu:dict=Depends(gcu)):
        d["user_id"]=str(cu["_id"]); d["created_at"]=datetime.now(timezone.utc); await db.performance_records.insert_one(d); return {"status":"saved"}

    @api.post("/debug/login")
    async def debug_login(d: dict):
        import traceback as tb
        result = {"steps": []}
        try:
            result["steps"].append("find_user")
            u = await db.users.find_one({"email": d.get("email","").strip().lower()})
            if not u:
                result["steps"].append("user_not_found")
                result["user_count"] = await db.users.count_documents({})
                return result
            result["steps"].append(f"user_found: {u.get('username','?')}")
            result["steps"].append("verify_password")
            ok = vp(d.get("password",""), u["password_hash"])
            result["steps"].append(f"pw_ok: {ok}")
            result["steps"].append("create_token")
            tok = ct(str(u["_id"]))
            result["steps"].append(f"token: {tok[:20]}...")
            result["steps"].append("u2r")
            ur = u2r(u)
            result["steps"].append("u2r_ok")
            result["user"] = ur
        except Exception as e:
            result["error"] = str(e)
            result["traceback"] = tb.format_exc()
        return result

    # Catch-all
    @api.api_route("/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
    async def catchall(path:str,request:Request): return JSONResponse(200,{"status":"stub","path":path})

    @app.get("/")
    async def root(): return {"status":"ARENAKORE","v":"render-v4-matchfix"}

    app.include_router(api)
    import uvicorn
    print(f'=== ARENAKORE v3 (Staff Hub) starting on :{port} ===', flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
except Exception as e:
    print(f"=== FATAL: {e} ===", flush=True)
    traceback.print_exc()
    from http.server import HTTPServer, BaseHTTPRequestHandler
    err = json.dumps({"error": str(e), "tb": traceback.format_exc()})
    class EH(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(500); self.send_header('Content-Type','application/json'); self.end_headers()
            self.wfile.write(err.encode())
        def do_POST(self): self.do_GET()
    HTTPServer(("0.0.0.0", port), EH).serve_forever()
'''

# Build the payload
payload = json.dumps({"value": NEW_CODE})

# Update the CODE env var via Render API
url = f"https://api.render.com/v1/services/{SERVICE_ID}/env-vars/CODE"
req = urllib.request.Request(
    url,
    data=payload.encode('utf-8'),
    headers={
        "Authorization": f"Bearer {RENDER_API_KEY}",
        "Content-Type": "application/json",
    },
    method="PUT"
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print(f"✅ ENV VAR UPDATE: {response.status}")
        print(json.dumps(result, indent=2)[:200])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"❌ HTTP Error {e.code}: {body}")
except Exception as e:
    print(f"❌ Error: {e}")
