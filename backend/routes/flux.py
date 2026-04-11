"""ARENAKORE — Flux Balance Route
Provides the K-Flux balance breakdown endpoint.
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
