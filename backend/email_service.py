"""
ARENAKORE — EMAIL ENGINE v1.0
SiteGround SMTP via aiosmtplib (SSL port 465)
Templates: Crew Invite + Bio-Scan Confirmation
"""
import os
import logging
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib

logger = logging.getLogger(__name__)

# ── SMTP CONFIG (SiteGround)
SMTP_HOST     = "mail.arenakore.com"
SMTP_PORT     = 465
SMTP_USER     = "no-reply@arenakore.com"
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM     = "ARENAKORE <no-reply@arenakore.com>"

APP_URL = "https://kore-biometric-scan.preview.emergentagent.com"


# ===================================================================
# CORE SEND FUNCTION
# ===================================================================
async def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level send. Returns True on success, False on any error."""
    if not SMTP_PASSWORD:
        logger.warning("[EmailEngine] SMTP_PASSWORD non configurata — email non inviata a %s", to_email)
        return False
    if not to_email or "@" not in to_email:
        logger.warning("[EmailEngine] Email non valida: %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_FROM
    msg["To"]      = to_email
    msg["X-Mailer"] = "ARENAKORE-EmailEngine/1.0"
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            use_tls=True,           # SSL on port 465
            username=SMTP_USER,
            password=SMTP_PASSWORD,
            timeout=15,
        )
        logger.info("[EmailEngine] Email inviata a %s — %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("[EmailEngine] Errore invio a %s: %s", to_email, exc)
        return False


# ===================================================================
# TEMPLATE 1 — CREW INVITE (Dark / Militare / Gold CTA)
# ===================================================================
def _crew_invite_html(to_name: str, from_name: str, crew_name: str, accept_url: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>INVITO CREW — ARENAKORE</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505;">
    <tr><td align="center" style="padding:48px 20px;">

      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#080808;border-radius:16px;overflow:hidden;border:1px solid rgba(0,242,255,0.12);">

        <!-- TOP CYAN BAR -->
        <tr><td style="height:3px;background-color:#00F2FF;"></td></tr>

        <!-- HEADER -->
        <tr>
          <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.04);">
            <p style="margin:0 0 4px;color:rgba(0,242,255,0.45);font-size:9px;font-weight:900;letter-spacing:8px;text-transform:uppercase;">ARENAKORE</p>
            <h1 style="margin:0;color:#FFFFFF;font-size:36px;font-weight:900;letter-spacing:-1.5px;line-height:1.05;text-transform:uppercase;">
              PROTOCOLLO<br>
              <span style="color:#00F2FF;">CREW</span><br>
              ATTIVATO
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px 40px 28px;">

            <!-- Invitee greeting -->
            <p style="margin:0 0 28px;color:rgba(255,255,255,0.45);font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
              ATLETA <span style="color:#FFFFFF;font-weight:900;">{to_name}</span>,
            </p>

            <!-- Sender block -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;background-color:rgba(0,242,255,0.03);border:1px solid rgba(0,242,255,0.08);border-radius:10px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 6px;color:rgba(255,255,255,0.3);font-size:9px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">OPERATORE</p>
                  <p style="margin:0;color:#00F2FF;font-size:20px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">{from_name}</p>
                </td>
              </tr>
            </table>

            <!-- Crew name block -->
            <p style="margin:0 0 8px;color:rgba(255,255,255,0.3);font-size:9px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">TI HA INVITATO NELLA CREW</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:36px;background-color:rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.2);border-radius:10px;">
              <tr>
                <td style="padding:18px 24px;">
                  <p style="margin:0;color:#D4AF37;font-size:26px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">{crew_name}</p>
                </td>
              </tr>
            </table>

            <!-- CTA BUTTON -->
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background-color:#D4AF37;">
                  <a href="{accept_url}"
                     style="display:inline-block;padding:18px 48px;color:#050505;font-size:13px;font-weight:900;letter-spacing:5px;text-transform:uppercase;text-decoration:none;border-radius:10px;">
                    ACCETTA SFIDA
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:rgba(255,255,255,0.15);font-size:10px;font-weight:700;letter-spacing:1px;">
              Oppure apri ARENAKORE &rsaquo; KORE &rsaquo; ACTION CENTER &rsaquo; PENDING
            </p>
          </td>
        </tr>

        <!-- DIVIDER LINE -->
        <tr><td style="height:1px;background-color:rgba(255,255,255,0.04);"></td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 40px;">
            <p style="margin:0;color:rgba(255,255,255,0.12);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              ARENAKORE &mdash; THE CORE OF PERFORMANCE<br>
              Non rispondere a questa email &mdash; no-reply@arenakore.com
            </p>
          </td>
        </tr>

        <!-- BOTTOM GOLD BAR -->
        <tr><td style="height:2px;background-color:#D4AF37;opacity:0.4;"></td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>"""


# ===================================================================
# TEMPLATE 2 — BIO-SCAN CONFIRMATION (DNA Table + KORE ID)
# ===================================================================
def _bioscan_confirm_html(to_name: str, kore_number: str, dna: dict, scan_date: str) -> str:
    # Build DNA rows
    dna_label_map = {
        "velocita":    ("VEL", "VELOCITA",    "#00F2FF"),
        "forza":       ("FOR", "FORZA",        "#FFFFFF"),
        "resistenza":  ("RES", "RESISTENZA",   "#FF453A"),
        "agilita":     ("AGI", "AGILITA",      "#00F2FF"),
        "tecnica":     ("TEC", "TECNICA",      "#FFFFFF"),
        "potenza":     ("POT", "POTENZA",      "#D4AF37"),
        "mentalita":   ("MEN", "MENTALITA",    "#D4AF37"),
        "flessibilita":("FLE", "FLESSIBILITA", "#00F2FF"),
    }

    dna_rows_html = ""
    total = 0
    count = 0
    for key, (abbr, label, color) in dna_label_map.items():
        val = dna.get(key)
        if val is None:
            continue
        val_int = int(round(float(val)))
        bar_pct = min(100, val_int)
        total += val_int
        count += 1
        dna_rows_html += f"""
        <tr>
          <td style="padding:10px 0 10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="36" style="vertical-align:middle;">
                  <span style="color:{color};font-size:11px;font-weight:900;letter-spacing:1px;">{abbr}</span>
                </td>
                <td style="vertical-align:middle;padding:0 12px;">
                  <div style="height:5px;background-color:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                    <div style="height:5px;width:{bar_pct}%;background-color:{color};border-radius:3px;"></div>
                  </div>
                </td>
                <td width="36" style="vertical-align:middle;text-align:right;">
                  <span style="color:{color};font-size:14px;font-weight:900;">{val_int}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    avg_dna = round(total / count) if count > 0 else 0

    return f"""<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>BIO-SCAN CONFERMATO — ARENAKORE</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505;">
    <tr><td align="center" style="padding:48px 20px;">

      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#080808;border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.15);">

        <!-- TOP GOLD BAR -->
        <tr><td style="height:3px;background-color:#D4AF37;"></td></tr>

        <!-- HEADER -->
        <tr>
          <td style="padding:36px 40px 28px;border-bottom:1px solid rgba(255,255,255,0.04);">
            <p style="margin:0 0 4px;color:rgba(0,242,255,0.45);font-size:9px;font-weight:900;letter-spacing:8px;text-transform:uppercase;">ARENAKORE</p>
            <h1 style="margin:0 0 6px;color:#D4AF37;font-size:32px;font-weight:900;letter-spacing:-1px;line-height:1.05;text-transform:uppercase;">
              KORE DNA<br>GENERATO
            </h1>
            <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">BIO-SCAN APPROVATO — {scan_date}</p>
          </td>
        </tr>

        <!-- KORE ID BADGE -->
        <tr>
          <td style="padding:28px 40px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background-color:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.25);border-radius:12px;">
              <tr>
                <td style="padding:20px 28px;">
                  <p style="margin:0 0 4px;color:rgba(255,255,255,0.3);font-size:9px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">ATLETA IDENTIFICATO</p>
                  <p style="margin:0 0 2px;color:#FFFFFF;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">{to_name}</p>
                  <p style="margin:0;color:#D4AF37;font-size:13px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">KORE #{kore_number}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DNA TABLE -->
        <tr>
          <td style="padding:24px 40px 0;">
            <p style="margin:0 0 16px;color:rgba(255,255,255,0.3);font-size:9px;font-weight:900;letter-spacing:5px;text-transform:uppercase;">BIO-SIGNATURE DNA — 5 BEAT SCAN</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              {dna_rows_html}
            </table>
          </td>
        </tr>

        <!-- AVG DNA PILL -->
        <tr>
          <td style="padding:20px 40px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:rgba(0,242,255,0.06);border:1px solid rgba(0,242,255,0.2);border-radius:8px;padding:10px 24px;">
                  <span style="color:rgba(255,255,255,0.4);font-size:9px;font-weight:900;letter-spacing:4px;text-transform:uppercase;">DNA MEDIA &nbsp;</span>
                  <span style="color:#00F2FF;font-size:20px;font-weight:900;letter-spacing:1px;">{avg_dna}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr><td style="height:1px;background-color:rgba(255,255,255,0.04);"></td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 40px;">
            <p style="margin:0;color:rgba(255,255,255,0.12);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              ARENAKORE &mdash; THE CORE OF PERFORMANCE<br>
              Non rispondere &mdash; no-reply@arenakore.com
            </p>
          </td>
        </tr>

        <!-- BOTTOM CYAN BAR -->
        <tr><td style="height:2px;background-color:#00F2FF;opacity:0.3;"></td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>"""


# ===================================================================
# PUBLIC API
# ===================================================================
async def send_crew_invite_email(
    to_email: str,
    to_name: str,
    from_name: str,
    crew_name: str,
    invite_id: str,
) -> bool:
    """Sends a Crew Invite email. Fire-and-forget safe."""
    accept_url = f"{APP_URL}/(tabs)/kore"   # Deep links to Action Center / PENDING
    html = _crew_invite_html(
        to_name=to_name.upper(),
        from_name=from_name.upper(),
        crew_name=crew_name.upper(),
        accept_url=accept_url,
    )
    subject = f"NEXUS // {from_name.upper()} TI HA INVITATO — {crew_name.upper()}"
    return await _send(to_email, subject, html)


async def send_bioscan_confirm_email(
    to_email: str,
    to_name: str,
    kore_number: str,
    dna: dict,
) -> bool:
    """Sends a Bio-Scan Confirmation email with DNA summary."""
    from datetime import datetime, timezone
    scan_date = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    html = _bioscan_confirm_html(
        to_name=to_name.upper(),
        kore_number=kore_number,
        dna=dna,
        scan_date=scan_date,
    )
    subject = f"KORE DNA GENERATO — BIO-SCAN APPROVATO | KORE #{kore_number}"
    return await _send(to_email, subject, html)
