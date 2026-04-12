"""ARENAKORE — Flux Balance & Wallet Route (Build 38)
Provides the K-Flux balance breakdown + enhanced spendable wallet.
"""
from fastapi import APIRouter, Depends
from .deps import db, get_current_user, compute_level_progress

router = APIRouter(prefix="/api/flux", tags=["flux"])


@router.get("/balance")
async def get_flux_balance(current_user: dict = Depends(get_current_user)):
    """Return K-Flux balance breakdown: vital, perform, team + level info."""
    # Primary flux = ak_credits (also aliased as xp in some contexts)
    total_flux = current_user.get("ak_credits", 0) or current_user.get("xp", 0) or 0
    
    # Flux tiers
    vital = current_user.get("vital_flux", 0) or 0
    perform = current_user.get("master_flux", 0) or current_user.get("perform_flux", 0) or 0
    team = current_user.get("diamond_flux", 0) or current_user.get("team_flux", 0) or 0
    
    # If tiers are all 0 but total exists, distribute proportionally
    if vital == 0 and perform == 0 and team == 0 and total_flux > 0:
        vital = total_flux  # Default: all flux is vital
    
    level_info = compute_level_progress(total_flux)
    
    return {
        "vital": vital,
        "perform": perform,
        "team": team,
        "total": vital + perform + team,
        **level_info,
    }


@router.get("/wallet")
async def get_wallet_detail(current_user: dict = Depends(get_current_user)):
    """
    Enhanced wallet with spendable breakdown, burn history, and earning summary.
    Used when user taps on any K-Flux counter.
    """
    user_id = current_user["_id"]

    # Balances
    total_flux = current_user.get("ak_credits", 0) or current_user.get("xp", 0) or 0
    vital = current_user.get("vital_flux", 0) or 0
    perform = current_user.get("master_flux", 0) or current_user.get("perform_flux", 0) or 0
    team = current_user.get("diamond_flux", 0) or current_user.get("team_flux", 0) or 0

    if vital == 0 and perform == 0 and team == 0 and total_flux > 0:
        vital = total_flux

    level_info = compute_level_progress(total_flux)

    # Total burned from transactions
    pipeline = [
        {"$match": {"user_id": user_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "total_burned": {"$sum": "$total_burned"},
            "green_burned": {"$sum": "$breakdown.green"},
            "cyan_burned": {"$sum": "$breakdown.cyan"},
            "amber_burned": {"$sum": "$breakdown.amber"},
            "redemption_count": {"$sum": 1},
        }},
    ]
    burn_stats = {"total_burned": 0, "green_burned": 0, "cyan_burned": 0, "amber_burned": 0, "redemption_count": 0}
    async for doc in db.flux_transactions.aggregate(pipeline):
        burn_stats = {
            "total_burned": doc.get("total_burned", 0),
            "green_burned": doc.get("green_burned", 0),
            "cyan_burned": doc.get("cyan_burned", 0),
            "amber_burned": doc.get("amber_burned", 0),
            "redemption_count": doc.get("redemption_count", 0),
        }

    # Recent earnings (last 5 attendance + activities)
    recent_earnings = []
    async for log in db.attendance_logs.find({"user_id": user_id}).sort("timestamp", -1).limit(3):
        recent_earnings.append({
            "source": "check-in",
            "hub_name": log.get("hub_name", "Hub"),
            "amount": log.get("k_flux_earned", 0),
            "color": "green",
            "date": log.get("date", ""),
        })
    async for log in db.activity_log.find({"user_id": user_id}).sort("completed_at", -1).limit(3):
        recent_earnings.append({
            "source": log.get("tipo", "attività"),
            "amount": log.get("flux_earned", 0) or log.get("k_flux_earned", 0) or 0,
            "color": log.get("k_flux_color", "cyan"),
            "date": str(log.get("completed_at", ""))[:10],
        })

    return {
        "balance": {
            "green": vital,
            "cyan": perform,
            "amber": team,
            "total": vital + perform + team,
        },
        "spendable": {
            "green": vital,
            "cyan": perform,
            "amber": team,
            "total_spendable": vital + perform + team,
            "burn_priority": ["green", "cyan", "amber"],
            "burn_priority_labels": ["Naturale (Verde)", "Performance (Ciano)", "Genetico (Ambra)"],
        },
        "lifetime": {
            "total_earned": total_flux + burn_stats["total_burned"],
            "total_burned": burn_stats["total_burned"],
            "redemptions": burn_stats["redemption_count"],
        },
        "recent_earnings": sorted(recent_earnings, key=lambda x: x.get("date", ""), reverse=True)[:5],
        "level": level_info,
    }
