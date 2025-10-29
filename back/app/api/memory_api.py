"""
Memory API Integration Endpoints

Provides server-side endpoints for Memory API integration,
including identity mapping and social graph analysis.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import httpx
import os
import time

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
memory_api_router = APIRouter(prefix="/memory", tags=["memory-api"])

# Memory API configuration
MEMORY_API_BASE_URL = "https://api.memoryproto.co/v1"
MEMORY_API_KEY = os.getenv("MEMORY_API_KEY", "")

class IdentityRequest(BaseModel):
    identifier: str  # Wallet address or Farcaster username
    identifier_type: str  # "address" or "farcaster"

class UnifiedProfileRequest(BaseModel):
    address: str
    farcaster_username: Optional[str] = None

def is_memory_api_available() -> bool:
    """Check if Memory API is configured and available"""
    return bool(MEMORY_API_KEY)

async def fetch_identity_graph(identifier: str, identifier_type: str) -> Dict[str, Any]:
    """Fetch identity graph from Memory API"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        endpoint = f"identity-graph/{identifier_type}/{identifier}"
        url = f"{MEMORY_API_BASE_URL}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {MEMORY_API_KEY}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        logger.error(f"Memory API HTTP error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Memory API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Memory API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch identity graph: {str(e)}")

async def fetch_social_graph(identifier: str, identifier_type: str) -> Dict[str, Any]:
    """Fetch social graph from Memory API"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        endpoint = f"social-graph/{identifier_type}/{identifier}"
        url = f"{MEMORY_API_BASE_URL}/{endpoint}"
        
        headers = {
            "Authorization": f"Bearer {MEMORY_API_KEY}",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPError as e:
        logger.error(f"Memory API HTTP error: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Memory API request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Memory API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch social graph: {str(e)}")

@memory_api_router.get("/status")
async def get_memory_api_status() -> JSONResponse:
    """Check Memory API integration status"""
    return JSONResponse(content={
        "available": is_memory_api_available(),
        "configured": bool(MEMORY_API_KEY),
        "base_url": MEMORY_API_BASE_URL if is_memory_api_available() else None,
    })

@memory_api_router.post("/identity-graph")
async def get_identity_graph(request: IdentityRequest) -> JSONResponse:
    """Get identity graph for a wallet address or Farcaster username"""
    try:
        identity_graph = await fetch_identity_graph(
            request.identifier, 
            request.identifier_type
        )
        
        return JSONResponse(content={
            "identifier": request.identifier,
            "identifier_type": request.identifier_type,
            "identity_graph": identity_graph,
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Identity graph retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve identity graph: {str(e)}")

@memory_api_router.post("/social-graph")
async def get_social_graph(request: IdentityRequest) -> JSONResponse:
    """Get social graph for a wallet address or Farcaster username"""
    try:
        social_graph = await fetch_social_graph(
            request.identifier, 
            request.identifier_type
        )
        
        return JSONResponse(content={
            "identifier": request.identifier,
            "identifier_type": request.identifier_type,
            "social_graph": social_graph,
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Social graph retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve social graph: {str(e)}")

@memory_api_router.post("/unified-profile")
async def create_unified_profile(request: UnifiedProfileRequest) -> JSONResponse:
    """Create a unified profile combining wallet and social data"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        # Fetch wallet-based identity graph
        wallet_identity_graph = await fetch_identity_graph(
            request.address, 
            "address"
        )
        
        # Fetch Farcaster-based identity graph if username provided
        farcaster_identity_graph = None
        if request.farcaster_username:
            try:
                farcaster_identity_graph = await fetch_identity_graph(
                    request.farcaster_username, 
                    "farcaster"
                )
            except Exception as e:
                logger.warning(f"Failed to fetch Farcaster identity graph: {str(e)}")
        
        # Fetch social graph data
        try:
            social_graph = await fetch_social_graph(request.address, "address")
        except Exception as e:
            logger.warning(f"Failed to fetch social graph: {str(e)}")
            social_graph = {}
        
        unified_profile = {
            "wallet": {
                "address": request.address,
                "identities": wallet_identity_graph,
            },
            "farcaster": {
                "username": request.farcaster_username,
                "identities": farcaster_identity_graph or {},
            },
            "social": social_graph,
            "timestamp": int(time.time()),
        }
        
        return JSONResponse(content=unified_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified profile creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create unified profile: {str(e)}")

@memory_api_router.get("/wallet-address/{farcaster_username}")
async def get_wallet_address_for_farcaster_user(farcaster_username: str) -> JSONResponse:
    """Map Farcaster username to wallet address"""
    try:
        identity_graph = await fetch_identity_graph(farcaster_username, "farcaster")
        
        # Look for Ethereum address in the identity graph
        wallet_address = None
        if identity_graph:
            for platform, identity in identity_graph.items():
                if platform == "ethereum" and "id" in identity:
                    wallet_address = identity["id"]
                    break
        
        return JSONResponse(content={
            "farcaster_username": farcaster_username,
            "wallet_address": wallet_address,
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Farcaster to wallet mapping error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to map Farcaster user to wallet address: {str(e)}")