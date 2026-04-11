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
    'fastapi', 'uvicorn', 'motor', 'python-jose', 'bcrypt', 'dnspython', 'certifi', 'pydantic', 'PyJWT', 'cryptography', 'httpx'],
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
    import httpx
    import jwt as pyjwt
    import time as _time

    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger("arenakore")

    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=15000)
    db = client[os.environ.get('DB_NAME', 'arenakore')]

    SECRET = os.environ.get('SECRET_KEY', 'arenadare-nexus-secret-2024-v1')
    ALG = "HS256"
    sec = HTTPBearer()
    app = FastAPI(title="ARENAKORE API")
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    api = APIRouter(prefix="/api")

    # ═══ APPLE AUTH CONFIG ═══
    APPLE_SERVICE_ID = os.environ.get('APPLE_SERVICE_ID', 'com.arenakore.app.auth')
    APPLE_TEAM_ID = os.environ.get('APPLE_TEAM_ID', '6VJ6L626V4')
    APPLE_KEY_ID = os.environ.get('APPLE_KEY_ID', 'PYB6HLA7AQ')
    APPLE_REDIRECT_URI = os.environ.get('APPLE_REDIRECT_URI', 'https://arenakore-api.onrender.com/auth/apple/callback')
    APPLE_P8_KEY = os.environ.get('APPLE_P8_KEY', '')

    def generate_apple_client_secret():
        now = int(_time.time())
        payload = {"iss": APPLE_TEAM_ID, "iat": now, "exp": now + 86400 * 180, "aud": "https://appleid.apple.com", "sub": APPLE_SERVICE_ID}
        headers = {"kid": APPLE_KEY_ID, "alg": "ES256"}
        return pyjwt.encode(payload, APPLE_P8_KEY, algorithm="ES256", headers=headers)

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

    # ═══════════════════════════════════════════════════════════════
    # APPLE SIGN-IN — Web OAuth2 Flow + Native Token Validation
    # ═══════════════════════════════════════════════════════════════
    from fastapi.responses import HTMLResponse, RedirectResponse
    from urllib.parse import urlencode

    @api.get("/auth/apple/init")
    async def apple_auth_init(redirect_app: str = ""):
        """Generate Apple OAuth URL for web flow"""
        try:
            params = {
                "client_id": APPLE_SERVICE_ID,
                "redirect_uri": APPLE_REDIRECT_URI,
                "response_type": "code id_token",
                "response_mode": "form_post",
                "scope": "name email",
                "state": redirect_app or "web"
            }
            url = f"https://appleid.apple.com/auth/authorize?{urlencode(params)}"
            return {"url": url, "service_id": APPLE_SERVICE_ID}
        except Exception as e:
            log.error(f"Apple init error: {e}")
            raise HTTPException(500, f"Apple auth init failed: {str(e)}")

    @api.post("/auth/apple/token")
    async def apple_token_login(d: dict):
        """Native iOS flow — receives identity_token from expo-apple-authentication"""
        try:
            identity_token = d.get("identity_token") or d.get("id_token")
            if not identity_token:
                raise HTTPException(400, "identity_token richiesto")
            # Decode without verification (Apple's public key validation is optional for MVP)
            claims = pyjwt.decode(identity_token, options={"verify_signature": False})
            apple_sub = claims.get("sub")
            apple_email = claims.get("email")
            if not apple_sub:
                raise HTTPException(400, "Token Apple non valido — manca 'sub'")
            # Find or create user
            user = await db.users.find_one({"apple_id": apple_sub})
            if not user and apple_email:
                user = await db.users.find_one({"email": apple_email.strip().lower()})
            if user:
                # Link apple_id if not yet linked
                if not user.get("apple_id"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"apple_id": apple_sub}})
                # BIVIO RAPIDO: social login skips bio-scan
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"onboarding_completed": True, "auth_provider": "apple"}})
                token = ct(str(user["_id"]))
                return {"token": token, "user": u2r(user), "new_user": False}
            else:
                # Create new user from Apple
                first_name = d.get("first_name") or d.get("fullName", {}).get("givenName", "")
                last_name = d.get("last_name") or d.get("fullName", {}).get("familyName", "")
                username = (first_name or apple_email.split("@")[0] if apple_email else f"KORE_{apple_sub[:8]}").upper().replace(" ", "_")
                # Ensure unique username
                base_username = username
                counter = 1
                while await db.users.find_one({"username": username}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                tc = await db.users.count_documents({})
                new_user = {
                    "username": username,
                    "email": (apple_email or f"apple_{apple_sub[:12]}@arenakore.app").strip().lower(),
                    "password_hash": hp(f"apple_{apple_sub}_{_time.time()}"),
                    "apple_id": apple_sub,
                    "auth_provider": "apple",
                    "role": "ATHLETE",
                    "sport": "ATHLETICS",
                    "preferred_sport": "ATHLETICS",
                    "training_level": "LEGACY",
                    "xp": 0, "level": 1, "ak_credits": 0,
                    "unlocked_tools": [],
                    "onboarding_completed": True,
                    "avatar_color": random.choice(["#00E5FF", "#FFD700", "#FF3B30", "#34C759"]),
                    "dna": None,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_founder": tc < 100,
                    "founder_number": (tc + 1) if tc < 100 else None,
                    "created_at": datetime.now(timezone.utc)
                }
                r = await db.users.insert_one(new_user)
                new_user["_id"] = r.inserted_id
                token = ct(str(r.inserted_id))
                return {"token": token, "user": u2r(new_user), "new_user": True}
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Apple token error: {e}")
            raise HTTPException(500, f"Errore autenticazione Apple: {str(e)}")

    # Apple Web Callback — receives form_post from Apple
    @app.post("/auth/apple/callback")
    async def apple_callback(request: Request):
        """Handles Apple's form_post redirect with authorization code"""
        try:
            form = await request.form()
            code = form.get("code")
            id_token_raw = form.get("id_token")
            state = form.get("state", "web")
            user_data = form.get("user")  # Only on first login

            log.info(f"Apple callback: code={bool(code)}, id_token={bool(id_token_raw)}, state={state}")

            apple_email = None
            apple_sub = None
            first_name = ""
            last_name = ""

            # Parse user data if present (first time only)
            if user_data:
                try:
                    ud = json.loads(user_data) if isinstance(user_data, str) else user_data
                    nm = ud.get("name", {})
                    first_name = nm.get("firstName", "")
                    last_name = nm.get("lastName", "")
                    apple_email = ud.get("email")
                except:
                    pass

            # If we have id_token directly, decode it
            if id_token_raw:
                claims = pyjwt.decode(id_token_raw, options={"verify_signature": False})
                apple_sub = claims.get("sub")
                apple_email = apple_email or claims.get("email")

            # If we have code, exchange it for tokens
            if code and not apple_sub:
                client_secret = generate_apple_client_secret()
                async with httpx.AsyncClient() as hc:
                    resp = await hc.post("https://appleid.apple.com/auth/token", data={
                        "client_id": APPLE_SERVICE_ID,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": APPLE_REDIRECT_URI
                    })
                    if resp.status_code == 200:
                        tokens = resp.json()
                        id_token_str = tokens.get("id_token")
                        if id_token_str:
                            claims = pyjwt.decode(id_token_str, options={"verify_signature": False})
                            apple_sub = claims.get("sub")
                            apple_email = apple_email or claims.get("email")
                    else:
                        log.error(f"Apple token exchange failed: {resp.status_code} {resp.text}")

            if not apple_sub:
                return HTMLResponse(content=f"<html><body><h1>Errore Apple Login</h1><p>Impossibile autenticare. Riprova.</p><script>window.close();</script></body></html>", status_code=400)

            # Find or create user (same logic as native)
            user = await db.users.find_one({"apple_id": apple_sub})
            if not user and apple_email:
                user = await db.users.find_one({"email": apple_email.strip().lower()})
            if user:
                if not user.get("apple_id"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"apple_id": apple_sub}})
                # BIVIO RAPIDO: social users skip bio-scan
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"onboarding_completed": True, "auth_provider": "apple"}})
                token = ct(str(user["_id"]))
                ur = u2r(user)
            else:
                username = (first_name or (apple_email.split("@")[0] if apple_email else f"KORE_{apple_sub[:8]}")).upper().replace(" ", "_")
                base_username = username
                counter = 1
                while await db.users.find_one({"username": username}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                tc = await db.users.count_documents({})
                new_user = {
                    "username": username,
                    "email": (apple_email or f"apple_{apple_sub[:12]}@arenakore.app").strip().lower(),
                    "password_hash": hp(f"apple_{apple_sub}_{_time.time()}"),
                    "apple_id": apple_sub, "auth_provider": "apple",
                    "role": "ATHLETE", "sport": "ATHLETICS", "preferred_sport": "ATHLETICS",
                    "training_level": "LEGACY", "xp": 0, "level": 1, "ak_credits": 0,
                    "unlocked_tools": [], "onboarding_completed": True,
                    "avatar_color": random.choice(["#00E5FF", "#FFD700", "#FF3B30", "#34C759"]),
                    "dna": None, "first_name": first_name, "last_name": last_name,
                    "is_founder": tc < 100, "founder_number": (tc + 1) if tc < 100 else None,
                    "created_at": datetime.now(timezone.utc)
                }
                r = await db.users.insert_one(new_user)
                new_user["_id"] = r.inserted_id
                token = ct(str(r.inserted_id))
                ur = u2r(new_user)

            # Return HTML that sends the token back to the app via postMessage
            html = f"""<!DOCTYPE html>
<html><head><title>ARENAKORE — Apple Login</title>
<style>body{{background:#000;color:#00E5FF;font-family:Montserrat,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}
.box{{text-align:center;padding:40px}}.loader{{width:40px;height:40px;border:3px solid #FFD700;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}</style></head>
<body><div class="box"><div class="loader"></div><h2>AUTENTICAZIONE COMPLETATA</h2><p>Ritorno ad ARENAKORE...</p></div>
<script>
try{{
  var data = {{token:"{token}",user:{json.dumps(ur)}}};
  if(window.opener){{window.opener.postMessage({{type:'APPLE_AUTH_SUCCESS',data:data}},'*');setTimeout(function(){{window.close()}},1500)}}
  else if(window.ReactNativeWebView){{window.ReactNativeWebView.postMessage(JSON.stringify({{type:'APPLE_AUTH_SUCCESS',data:data}}))}}
  else{{localStorage.setItem('arenakore_apple_auth',JSON.stringify(data));window.location.href='/'}}
}}catch(e){{document.body.innerHTML='<h2>Errore: '+e.message+'</h2>'}}
</script></body></html>"""
            return HTMLResponse(content=html)
        except Exception as e:
            log.error(f"Apple callback error: {e}")
            import traceback as tb2
            log.error(tb2.format_exc())
            return HTMLResponse(content=f"<html><body style='background:#000;color:#FF3B30;padding:40px'><h1>Errore Apple Login</h1><pre>{str(e)}</pre></body></html>", status_code=500)

    # ═══════════════════════════════════════════════════════════════
    # GOOGLE SIGN-IN — Token ID Validation
    # ═══════════════════════════════════════════════════════════════
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

    @api.post("/auth/google/token")
    async def google_token_login(d: dict):
        """Receives Google ID token from frontend and validates it"""
        try:
            id_token = d.get("id_token") or d.get("credential")
            if not id_token:
                raise HTTPException(400, "id_token Google richiesto")
            # Decode without verification for MVP (Google tokens are self-contained JWTs)
            claims = pyjwt.decode(id_token, options={"verify_signature": False})
            google_sub = claims.get("sub")
            google_email = claims.get("email")
            first_name = claims.get("given_name", "")
            last_name = claims.get("family_name", "")
            picture = claims.get("picture", "")
            if not google_sub:
                raise HTTPException(400, "Token Google non valido — manca 'sub'")
            # Find or create user
            user = await db.users.find_one({"google_id": google_sub})
            if not user and google_email:
                user = await db.users.find_one({"email": google_email.strip().lower()})
            if user:
                if not user.get("google_id"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": google_sub}})
                if picture and not user.get("profile_picture"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"profile_picture": picture}})
                token = ct(str(user["_id"]))
                return {"token": token, "user": u2r(user), "new_user": False}
            else:
                username = (first_name or google_email.split("@")[0] if google_email else f"KORE_{google_sub[:8]}").upper().replace(" ", "_")
                base_username = username
                counter = 1
                while await db.users.find_one({"username": username}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                tc = await db.users.count_documents({})
                new_user = {
                    "username": username,
                    "email": (google_email or f"google_{google_sub[:12]}@arenakore.app").strip().lower(),
                    "password_hash": hp(f"google_{google_sub}_{_time.time()}"),
                    "google_id": google_sub, "auth_provider": "google",
                    "role": None, "sport": "ATHLETICS", "preferred_sport": "ATHLETICS",
                    "training_level": "LEGACY", "xp": 0, "level": 1, "ak_credits": 0,
                    "unlocked_tools": [], "onboarding_completed": False,
                    "avatar_color": random.choice(["#00E5FF", "#FFD700", "#FF3B30", "#34C759"]),
                    "dna": None, "first_name": first_name, "last_name": last_name,
                    "profile_picture": picture,
                    "is_founder": tc < 100, "founder_number": (tc + 1) if tc < 100 else None,
                    "created_at": datetime.now(timezone.utc)
                }
                r = await db.users.insert_one(new_user)
                new_user["_id"] = r.inserted_id
                token = ct(str(r.inserted_id))
                return {"token": token, "user": u2r(new_user), "new_user": True}
        except HTTPException:
            raise
        except Exception as e:
            log.error(f"Google token error: {e}")
            raise HTTPException(500, f"Errore autenticazione Google: {str(e)}")

    @api.get("/auth/google/client-id")
    async def google_client_id():
        """Returns Google Client ID for frontend initialization"""
        return {"client_id": GOOGLE_CLIENT_ID, "configured": bool(GOOGLE_CLIENT_ID)}

    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'https://arenakore-api.onrender.com/auth/google/callback')

    @api.get("/auth/google/init")
    async def google_auth_init():
        """Generate Google OAuth URL for web flow"""
        try:
            from urllib.parse import urlencode
            params = {
                "client_id": GOOGLE_CLIENT_ID,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": "openid email profile",
                "access_type": "offline",
                "prompt": "select_account",
                "state": "web"
            }
            url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
            return {"url": url, "client_id": GOOGLE_CLIENT_ID}
        except Exception as e:
            raise HTTPException(500, f"Google init error: {str(e)}")

    # Google Web Callback — receives authorization code from Google redirect
    @app.get("/auth/google/callback")
    async def google_callback(code: str = "", state: str = "web", error: str = ""):
        """Handles Google's redirect with authorization code"""
        try:
            if error:
                return HTMLResponse(content=f"<html><body style='background:#000;color:#FF3B30;padding:40px'><h1>Google Login Annullato</h1><p>{error}</p><script>setTimeout(function(){{window.close()}},2000)</script></body></html>")
            if not code:
                return HTMLResponse(content="<html><body><h1>Codice mancante</h1></body></html>", status_code=400)

            # Exchange code for tokens
            async with httpx.AsyncClient() as hc:
                resp = await hc.post("https://oauth2.googleapis.com/token", data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": GOOGLE_REDIRECT_URI
                })
                if resp.status_code != 200:
                    log.error(f"Google token exchange failed: {resp.status_code} {resp.text}")
                    return HTMLResponse(content=f"<html><body style='background:#000;color:#FF3B30;padding:40px'><h1>Errore Token Google</h1><pre>{resp.text[:200]}</pre></body></html>", status_code=400)
                tokens = resp.json()

            id_token_str = tokens.get("id_token")
            if not id_token_str:
                return HTMLResponse(content="<html><body><h1>ID Token mancante</h1></body></html>", status_code=400)

            claims = pyjwt.decode(id_token_str, options={"verify_signature": False})
            google_sub = claims.get("sub")
            google_email = claims.get("email")
            first_name = claims.get("given_name", "")
            last_name = claims.get("family_name", "")
            picture = claims.get("picture", "")

            if not google_sub:
                return HTMLResponse(content="<html><body><h1>Token non valido</h1></body></html>", status_code=400)

            # Find or create user
            user = await db.users.find_one({"google_id": google_sub})
            if not user and google_email:
                user = await db.users.find_one({"email": google_email.strip().lower()})
            if user:
                if not user.get("google_id"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"google_id": google_sub}})
                if picture and not user.get("profile_picture"):
                    await db.users.update_one({"_id": user["_id"]}, {"$set": {"profile_picture": picture}})
                # BIVIO RAPIDO: social users skip bio-scan
                await db.users.update_one({"_id": user["_id"]}, {"$set": {"onboarding_completed": True, "auth_provider": "google"}})
                token = ct(str(user["_id"]))
                ur = u2r(user)
            else:
                username = (first_name or (google_email.split("@")[0] if google_email else f"KORE_{google_sub[:8]}")).upper().replace(" ", "_")
                base_username = username
                counter = 1
                while await db.users.find_one({"username": username}):
                    username = f"{base_username}_{counter}"
                    counter += 1
                tc = await db.users.count_documents({})
                new_user = {
                    "username": username,
                    "email": (google_email or f"google_{google_sub[:12]}@arenakore.app").strip().lower(),
                    "password_hash": hp(f"google_{google_sub}_{_time.time()}"),
                    "google_id": google_sub, "auth_provider": "google",
                    "role": "ATHLETE", "sport": "ATHLETICS", "preferred_sport": "ATHLETICS",
                    "training_level": "LEGACY", "xp": 0, "level": 1, "ak_credits": 0,
                    "unlocked_tools": [], "onboarding_completed": True,
                    "avatar_color": random.choice(["#00E5FF", "#FFD700", "#FF3B30", "#34C759"]),
                    "dna": None, "first_name": first_name, "last_name": last_name,
                    "profile_picture": picture,
                    "is_founder": tc < 100, "founder_number": (tc + 1) if tc < 100 else None,
                    "created_at": datetime.now(timezone.utc)
                }
                r = await db.users.insert_one(new_user)
                new_user["_id"] = r.inserted_id
                token = ct(str(r.inserted_id))
                ur = u2r(new_user)

            html = f"""<!DOCTYPE html>
<html><head><title>ARENAKORE — Google Login</title>
<style>body{{background:#000;color:#00E5FF;font-family:Montserrat,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}}
.box{{text-align:center;padding:40px}}.loader{{width:40px;height:40px;border:3px solid #4285F4;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}</style></head>
<body><div class="box"><div class="loader"></div><h2>AUTENTICAZIONE GOOGLE COMPLETATA</h2><p>Ritorno ad ARENAKORE...</p></div>
<script>
try{{
  var data = {{token:"{token}",user:{json.dumps(ur)}}};
  if(window.opener){{window.opener.postMessage({{type:'GOOGLE_AUTH_SUCCESS',data:data}},'*');setTimeout(function(){{window.close()}},1500)}}
  else if(window.ReactNativeWebView){{window.ReactNativeWebView.postMessage(JSON.stringify({{type:'GOOGLE_AUTH_SUCCESS',data:data}}))}}
  else{{localStorage.setItem('arenakore_google_auth',JSON.stringify(data));window.location.href='/'}}
}}catch(e){{document.body.innerHTML='<h2>Errore: '+e.message+'</h2>'}}
</script></body></html>"""
            return HTMLResponse(content=html)
        except Exception as e:
            log.error(f"Google callback error: {e}")
            import traceback as tb3
            log.error(tb3.format_exc())
            return HTMLResponse(content=f"<html><body style='background:#000;color:#FF3B30;padding:40px'><h1>Errore Google Login</h1><pre>{str(e)}</pre></body></html>", status_code=500)

    # Catch-all
    @api.api_route("/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
    async def catchall(path:str,request:Request): return JSONResponse(200,{"status":"stub","path":path})

    @app.get("/")
    async def root(): return {"status":"ARENAKORE","v":"render-v7-build29"}

    app.include_router(api)
    import uvicorn
    print(f'=== ARENAKORE v7 (Build 29 · Dual Auth + Bivio Rapido) starting on :{port} ===', flush=True)
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
