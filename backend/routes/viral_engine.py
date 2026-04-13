"""
ARENAKORE — VIRAL ENGINE (PROMPT 5)
════════════════════════════════════════════════════════════
1. Nexus Verified Reel — 9:16 video frames with biometric overlay
2. Premium Sharing Card — Static elegant card with QR + Kore ID
3. Deep Linking — Smart links (app installed → profile; else → store)

Requires: Pillow (via qrcode[pil]), qrcode
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
from .deps import db, get_current_user
import logging
import io
import base64
import os

logger = logging.getLogger("viral_engine")

router = APIRouter(prefix="/api/v3/viral", tags=["viral-engine"])

# App config
APP_DOMAIN = os.environ.get("APP_DOMAIN", "https://arenakore.com")
IOS_STORE = "https://apps.apple.com/app/arena-nexus/id6743285985"
ANDROID_STORE = "https://play.google.com/store/apps/details?id=com.arenakore.app"
APP_SCHEME = "arenakore://"


# ═══════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════

class ReelFrameData(BaseModel):
    """Data for generating a Nexus Verified Reel frame."""
    launch_id: str
    screenshot_base64: Optional[str] = None  # One of the 3 screenshots
    frame_index: int = 0                      # 0, 1, 2


class ShareCardRequest(BaseModel):
    """Data for generating a Premium Sharing Card."""
    launch_id: str


# ═══════════════════════════════════════════════════════════
# 1. NEXUS VERIFIED REEL — Store screenshots + generate overlay frames
# ═══════════════════════════════════════════════════════════

@router.post("/reel/store-frame")
async def store_reel_frame(
    body: ReelFrameData,
    current_user: dict = Depends(get_current_user),
):
    """
    Store a screenshot frame for the Nexus Verified Reel.
    Called 3 times during a NEXUS scan (frame_index 0, 1, 2).
    """
    try:
        launch_oid = ObjectId(body.launch_id)
    except Exception:
        raise HTTPException(400, "ID launch invalido")

    launch = await db.challenge_launches.find_one({"_id": launch_oid, "user_id": current_user["_id"]})
    if not launch:
        raise HTTPException(404, "Launch non trovato")

    if body.frame_index not in (0, 1, 2):
        raise HTTPException(400, "frame_index deve essere 0, 1 o 2")

    now = datetime.now(timezone.utc)

    # Store the frame
    await db.reel_frames.update_one(
        {"launch_id": launch_oid, "frame_index": body.frame_index},
        {"$set": {
            "launch_id": launch_oid,
            "user_id": current_user["_id"],
            "frame_index": body.frame_index,
            "screenshot_b64": body.screenshot_base64,
            "created_at": now,
        }},
        upsert=True,
    )

    # Count stored frames
    count = await db.reel_frames.count_documents({"launch_id": launch_oid})

    return {
        "status": "stored",
        "frame_index": body.frame_index,
        "total_frames": count,
        "ready_for_reel": count >= 3,
    }


@router.get("/reel/{launch_id}/generate")
async def generate_reel_frames(
    launch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate the Nexus Verified Reel frames with biometric overlays.
    Returns 3 composited frames (base64 PNG) ready for client-side video assembly.
    """
    try:
        launch_oid = ObjectId(launch_id)
    except Exception:
        raise HTTPException(400, "ID launch invalido")

    launch = await db.challenge_launches.find_one({"_id": launch_oid})
    if not launch:
        raise HTTPException(404, "Launch non trovato")

    # Get stored frames
    frames = await db.reel_frames.find(
        {"launch_id": launch_oid}
    ).sort("frame_index", 1).to_list(3)

    if len(frames) < 3:
        raise HTTPException(400, f"Solo {len(frames)}/3 frame disponibili. Completa prima la scansione.")

    # Get bio data from launch
    bio_data = launch.get("bio_data") or {}
    bpm = bio_data.get("heart_rate_bpm", "—")
    calories = bio_data.get("active_calories", "—")
    score = launch.get("score", 0)
    challenge_name = launch.get("challenge_name", "NEXUS CHALLENGE")
    username = launch.get("username", "ATHLETE")

    try:
        from PIL import Image, ImageDraw, ImageFont
        composited_frames = []

        for i, frame in enumerate(frames):
            # Create 9:16 canvas (1080x1920)
            canvas = Image.new('RGB', (1080, 1920), (0, 0, 0))
            draw = ImageDraw.Draw(canvas)

            # Load screenshot if available
            if frame.get("screenshot_b64"):
                try:
                    img_data = base64.b64decode(frame["screenshot_b64"])
                    screenshot = Image.open(io.BytesIO(img_data))
                    # Resize to fit canvas width
                    screenshot = screenshot.resize((1080, 1440), Image.LANCZOS)
                    canvas.paste(screenshot, (0, 240))
                except Exception:
                    pass

            # ── TOP BAR: NEXUS VERIFIED badge ──
            draw.rectangle([(0, 0), (1080, 120)], fill=(0, 0, 0))
            try:
                font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
                font_data = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
                font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
            except Exception:
                font_title = ImageFont.load_default()
                font_data = font_title
                font_small = font_title

            # NEXUS VERIFIED badge
            draw.text((40, 35), "NEXUS VERIFIED", fill=(0, 229, 255), font=font_title)
            draw.text((540, 45), f"@{username}", fill=(255, 255, 255), font=font_data)

            # ── BOTTOM OVERLAY: Biometric Data ──
            # Semi-transparent black bar
            overlay_y = 1680
            draw.rectangle([(0, overlay_y), (1080, 1920)], fill=(0, 0, 0))

            # Frame indicator
            frame_labels = ["INIZIO", "PICCO", "FINE"]
            draw.text((40, overlay_y + 15), f"FRAME {i+1}/3 · {frame_labels[i]}", fill=(0, 229, 255), font=font_small)

            # Biometric data
            draw.text((40, overlay_y + 60), f"♥ {bpm} BPM", fill=(255, 45, 85), font=font_data)
            draw.text((350, overlay_y + 60), f"⚡ {calories} KCAL", fill=(255, 149, 0), font=font_data)
            draw.text((650, overlay_y + 60), f"SCORE: {score}", fill=(212, 175, 55), font=font_data)

            # Challenge name
            draw.text((40, overlay_y + 110), challenge_name.upper(), fill=(255, 255, 255), font=font_title)

            # ── CYAN BORDER ──
            draw.rectangle([(0, 0), (1079, 3)], fill=(0, 229, 255))
            draw.rectangle([(0, 1917), (1079, 1919)], fill=(0, 229, 255))

            # Convert to base64
            buf = io.BytesIO()
            canvas.save(buf, format='PNG', quality=85)
            composited_frames.append(base64.b64encode(buf.getvalue()).decode())

        return {
            "status": "generated",
            "format": "9:16",
            "resolution": "1080x1920",
            "frames": composited_frames,
            "total": len(composited_frames),
            "metadata": {
                "challenge": challenge_name,
                "username": username,
                "bpm": bpm,
                "calories": calories,
                "score": score,
                "nexus_verified": True,
            },
            "deep_link": f"{APP_DOMAIN}/athlete/{username}",
        }

    except ImportError:
        raise HTTPException(500, "Pillow non disponibile per la generazione delle immagini")


# ═══════════════════════════════════════════════════════════
# 2. PREMIUM SHARING CARD — Static elegant card
# ═══════════════════════════════════════════════════════════

@router.get("/share-card/{launch_id}")
async def generate_share_card(
    launch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Genera una Premium Sharing Card per una sfida completata.
    Include: risultato, Kore ID, QR Code con Deep Link.
    Ritorna immagine PNG in base64.
    """
    try:
        launch_oid = ObjectId(launch_id)
    except Exception:
        raise HTTPException(400, "ID launch invalido")

    launch = await db.challenge_launches.find_one({"_id": launch_oid})
    if not launch:
        raise HTTPException(404, "Launch non trovato")

    username = launch.get("username", "ATHLETE")
    challenge_name = launch.get("challenge_name", "CHALLENGE")
    score = launch.get("score", 0)
    mode = launch.get("mode", "solo").upper()
    flux_earned = launch.get("flux_earned", 0)
    flux_tier = launch.get("flux_tier", "master")

    deep_link = f"{APP_DOMAIN}/athlete/{username}"

    try:
        from PIL import Image, ImageDraw, ImageFont
        import qrcode

        # Create card (1080x1080 Instagram square)
        card = Image.new('RGB', (1080, 1080), (0, 0, 0))
        draw = ImageDraw.Draw(card)

        try:
            font_huge = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
            font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            font_med = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except Exception:
            font_huge = font_big = font_med = font_small = ImageFont.load_default()

        # ── GRADIENT BACKGROUND ──
        for y in range(1080):
            r = int(0 + (15 * y / 1080))
            g = int(0 + (8 * y / 1080))
            b = int(0 + (20 * y / 1080))
            draw.line([(0, y), (1080, y)], fill=(r, g, b))

        # ── TOP: ARENA KORE branding ──
        draw.text((60, 50), "ARENA KORE", fill=(0, 229, 255), font=font_big)
        draw.text((60, 110), "PERFORMANCE CARD", fill=(100, 100, 100), font=font_small)

        # ── CYAN ACCENT LINE ──
        draw.rectangle([(60, 160), (1020, 164)], fill=(0, 229, 255))

        # ── KORE ID ──
        draw.text((60, 200), f"@{username}", fill=(255, 255, 255), font=font_big)

        # ── CHALLENGE NAME ──
        draw.text((60, 290), challenge_name.upper()[:30], fill=(0, 229, 255), font=font_med)

        # ── MODE BADGE ──
        mode_color = {"SOLO": (0, 229, 255), "PVP": (255, 45, 85), "LIVE": (212, 175, 55)}.get(mode, (0, 229, 255))
        draw.rounded_rectangle([(60, 350), (200, 395)], radius=8, fill=mode_color)
        draw.text((80, 355), mode, fill=(0, 0, 0), font=font_small)

        # ── SCORE (huge) ──
        score_text = str(int(score)) if score else "0"
        draw.text((60, 440), score_text, fill=(212, 175, 55), font=font_huge)
        draw.text((60 + len(score_text) * 45, 480), "PUNTI", fill=(150, 150, 150), font=font_med)

        # ── FLUX EARNED ──
        tier_colors = {"diamond": (212, 175, 55), "master": (0, 229, 255), "vital": (52, 199, 89)}
        draw.text((60, 570), f"+{flux_earned}", fill=tier_colors.get(flux_tier, (0, 229, 255)), font=font_big)
        draw.text((60 + len(str(flux_earned)) * 30 + 50, 590), f"K-FLUX ({flux_tier.upper()})", fill=(100, 100, 100), font=font_small)

        # ── DATE ──
        started = launch.get("started_at")
        if started:
            date_str = started.strftime("%d/%m/%Y") if hasattr(started, 'strftime') else str(started)[:10]
        else:
            date_str = datetime.now().strftime("%d/%m/%Y")
        draw.text((60, 660), date_str, fill=(80, 80, 80), font=font_small)

        # ── QR CODE ──
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(deep_link)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="white", back_color="black")
        qr_img = qr_img.resize((200, 200))
        card.paste(qr_img, (820, 770))

        # ── QR LABEL ──
        draw.text((830, 980), "SCAN TO VIEW", fill=(80, 80, 80), font=font_small)

        # ── BOTTOM BAR ──
        draw.rectangle([(0, 1050), (1080, 1080)], fill=(0, 229, 255))
        draw.text((60, 1052), "arenakore.com", fill=(0, 0, 0), font=font_small)

        # ── BORDERS ──
        draw.rectangle([(0, 0), (1079, 2)], fill=(0, 229, 255))
        draw.rectangle([(0, 0), (2, 1079)], fill=(0, 229, 255))
        draw.rectangle([(1077, 0), (1079, 1079)], fill=(0, 229, 255))

        # Convert to base64
        buf = io.BytesIO()
        card.save(buf, format='PNG', quality=90)
        card_b64 = base64.b64encode(buf.getvalue()).decode()

        return {
            "status": "generated",
            "format": "1080x1080",
            "image_base64": card_b64,
            "deep_link": deep_link,
            "metadata": {
                "username": username,
                "challenge": challenge_name,
                "score": score,
                "mode": mode,
                "flux_earned": flux_earned,
            },
        }

    except ImportError:
        raise HTTPException(500, "Pillow o qrcode non disponibile")


# ═══════════════════════════════════════════════════════════
# 3. DEEP LINKING — Smart redirect
# ═══════════════════════════════════════════════════════════

@router.get("/link/{username}", response_class=HTMLResponse)
async def deep_link_redirect(username: str, request: Request):
    """
    Smart Deep Link: se l'app è installata → apre il profilo;
    se non lo è → rimanda allo store.
    """
    app_link = f"{APP_SCHEME}profile/{username}"

    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARENA KORE — @{username}</title>
    <meta property="og:title" content="@{username} su ARENA KORE" />
    <meta property="og:description" content="Guarda il profilo di @{username} su ARENA KORE — L'app per atleti d'élite." />
    <meta property="og:type" content="profile" />
    <meta property="og:url" content="{APP_DOMAIN}/athlete/{username}" />
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: #000; color: #fff;
            font-family: 'Montserrat', -apple-system, sans-serif;
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 100vh; text-align: center;
            padding: 24px;
        }}
        .logo {{ color: #00E5FF; font-size: 28px; font-weight: 900; letter-spacing: 4px; margin-bottom: 16px; }}
        .kore-id {{ font-size: 42px; font-weight: 900; margin: 16px 0; color: #D4AF37; }}
        .subtitle {{ color: rgba(255,255,255,0.4); font-size: 14px; margin-bottom: 32px; }}
        .btn {{
            display: inline-block; padding: 16px 48px; border-radius: 12px;
            font-weight: 900; font-size: 16px; letter-spacing: 2px;
            text-decoration: none; margin: 8px;
        }}
        .btn-ios {{ background: #00E5FF; color: #000; }}
        .btn-android {{ background: #34C759; color: #000; }}
        .btn:hover {{ opacity: 0.9; }}
    </style>
    <script>
        // Try to open the app first
        window.onload = function() {{
            var appUrl = "{app_link}";
            var start = Date.now();
            window.location = appUrl;
            setTimeout(function() {{
                if (Date.now() - start < 2000) {{
                    // App didn't open, stay on page
                }}
            }}, 1500);
        }};
    </script>
</head>
<body>
    <div class="logo">ARENA KORE</div>
    <div class="kore-id">@{username}</div>
    <p class="subtitle">Scarica l'app per vedere il profilo completo</p>
    <a href="{IOS_STORE}" class="btn btn-ios">DOWNLOAD iOS</a>
    <a href="{ANDROID_STORE}" class="btn btn-android">DOWNLOAD ANDROID</a>
</body>
</html>"""

    return HTMLResponse(content=html)


# ═══════════════════════════════════════════════════════════
# SHARE URL GENERATOR — Convenience endpoint
# ═══════════════════════════════════════════════════════════

@router.get("/share-url/{launch_id}")
async def get_share_url(
    launch_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Genera l'URL di condivisione per un launch."""
    try:
        launch_oid = ObjectId(launch_id)
    except Exception:
        raise HTTPException(400, "ID launch invalido")

    launch = await db.challenge_launches.find_one({"_id": launch_oid})
    if not launch:
        raise HTTPException(404, "Launch non trovato")

    username = launch.get("username", "athlete")
    is_nexus = launch.get("template_source") == "system" and launch.get("bio_data")

    return {
        "share_url": f"{APP_DOMAIN}/athlete/{username}",
        "deep_link": f"{APP_SCHEME}profile/{username}",
        "is_nexus_verified": bool(is_nexus),
        "share_type": "reel" if is_nexus else "card",
        "share_text": f"Ho completato {launch.get('challenge_name', 'una sfida')} con {launch.get('score', 0)} punti su ARENA KORE! 🔥 {APP_DOMAIN}/athlete/{username}",
    }
