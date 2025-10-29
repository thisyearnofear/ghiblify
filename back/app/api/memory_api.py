"""
Memory API Integration Endpoints

Provides server-side endpoints for Memory API integration,
including identity mapping and social graph analysis.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
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

@memory_api_router.get("/leaderboard")
async def get_leaderboard(range: str = "all") -> JSONResponse:
    """Get leaderboard of top social influencers"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        # This would be implemented with actual Memory API calls
        # For now, return mock data
        mock_leaderboard = [
            {
                "rank": 1,
                "username": "vitalik.eth",
                "platform": "farcaster",
                "score": 98,
                "followers": 1250000,
                "avatar": "https://avatars.githubusercontent.com/u/10904774?v=4",
                "identities": {
                    "farcaster": {"username": "vitalik.eth", "followers": 1250000},
                    "twitter": {"username": "VitalikButerin", "followers": 5000000},
                    "github": {"username": "vitalik", "followers": 15000}
                }
            },
            {
                "rank": 2,
                "username": "punk4156",
                "platform": "farcaster",
                "score": 92,
                "followers": 890000,
                "avatar": "https://pbs.twimg.com/profile_images/1693184563505532928/U27jWYFY_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "punk4156", "followers": 890000},
                    "twitter": {"username": "punk4156", "followers": 250000}
                }
            },
            {
                "rank": 3,
                "username": "greg",
                "platform": "farcaster",
                "score": 89,
                "followers": 750000,
                "avatar": "https://pbs.twimg.com/profile_images/1700712552400211968/5ZwGvFyi_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "greg", "followers": 750000},
                    "twitter": {"username": "gregisenberg", "followers": 180000}
                }
            },
            {
                "rank": 4,
                "username": "dwr.eth",
                "platform": "farcaster",
                "score": 87,
                "followers": 680000,
                "avatar": "https://pbs.twimg.com/profile_images/1718705188658143232/_-4cj5Fy_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "dwr.eth", "followers": 680000},
                    "twitter": {"username": "dwr", "followers": 420000}
                }
            },
            {
                "rank": 5,
                "username": "jessepollak",
                "platform": "farcaster",
                "score": 85,
                "followers": 620000,
                "avatar": "https://pbs.twimg.com/profile_images/1683764808732590080/1Jw9LF3P_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "jessepollak", "followers": 620000},
                    "twitter": {"username": "jessepollak", "followers": 150000}
                }
            }
        ]
        
        return JSONResponse(content={
            "leaderboard": mock_leaderboard,
            "range": range,
            "timestamp": int(time.time())
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Leaderboard retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve leaderboard: {str(e)}")

@memory_api_router.get("/suggested-follows")
async def get_suggested_follows(identifier: str, identifier_type: str = "address") -> JSONResponse:
    """Get personalized follow suggestions based on social graph analysis"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        # This would be implemented with actual Memory API calls and social graph analysis
        # For now, return mock data
        mock_suggestions = [
            {
                "id": "1",
                "username": "kevinrose",
                "platform": "farcaster",
                "score": 87,
                "mutuals": 12,
                "followers": 45000,
                "avatar": "https://pbs.twimg.com/profile_images/1712044611633324032/-YuYcPz-_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "kevinrose", "followers": 45000},
                    "twitter": {"username": "kevinrose", "followers": 350000}
                },
                "reason": "Similar interests in tech and crypto"
            },
            {
                "id": "2",
                "username": "balajis",
                "platform": "farcaster",
                "score": 82,
                "mutuals": 8,
                "followers": 38000,
                "avatar": "https://pbs.twimg.com/profile_images/1704008965161562112/-YuYK2N5h_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "balajis", "followers": 38000},
                    "twitter": {"username": "balajis", "followers": 520000}
                },
                "reason": "Shared connections in the crypto space"
            },
            {
                "id": "3",
                "username": "cdixon",
                "platform": "farcaster",
                "score": 79,
                "mutuals": 15,
                "followers": 32000,
                "avatar": "https://pbs.twimg.com/profile_images/1697886349618569216/0tXK2N5h_400x400.jpg",
                "identities": {
                    "farcaster": {"username": "cdixon", "followers": 32000},
                    "twitter": {"username": "cdixon", "followers": 280000}
                },
                "reason": "Interest in AI and startups"
            }
        ]
        
        return JSONResponse(content={
            "suggestions": mock_suggestions,
            "identifier": identifier,
            "identifier_type": identifier_type,
            "timestamp": int(time.time())
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Suggestions retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve suggestions: {str(e)}")

@memory_api_router.get("/personality-profile")
async def get_personality_profile(identifier: str, identifier_type: str = "address") -> JSONResponse:
    """Get personality profile based on social graph analysis"""
    if not is_memory_api_available():
        raise HTTPException(status_code=503, detail="Memory API not configured")
    
    try:
        # This would be implemented with actual Memory API calls and social graph analysis
        # For now, return mock data
        mock_personality_data = {
            "traits": [
                {"name": "Tech Enthusiast", "score": 92, "color": "blue"},
                {"name": "Crypto Native", "score": 88, "color": "purple"},
                {"name": "Creative", "score": 76, "color": "pink"},
                {"name": "Community Builder", "score": 85, "color": "green"},
                {"name": "Early Adopter", "score": 90, "color": "orange"},
                {"name": "Knowledge Sharer", "score": 82, "color": "teal"}
            ],
            "interests": [
                {"name": "Web3", "relevance": 95},
                {"name": "AI", "relevance": 88},
                {"name": "Startups", "relevance": 82},
                {"name": "Digital Art", "relevance": 75},
                {"name": "DeFi", "relevance": 90},
                {"name": "NFTs", "relevance": 78},
                {"name": "DAOs", "relevance": 85},
                {"name": "Gaming", "relevance": 70}
            ],
            "engagement": {
                "daily": 78,
                "weekly": 85,
                "monthly": 92
            },
            "influence": {
                "reach": 87,
                "resonance": 82,
                "authority": 79
            }
        }
        
        return JSONResponse(content={
            "personality": mock_personality_data,
            "identifier": identifier,
            "identifier_type": identifier_type,
            "timestamp": int(time.time())
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Personality profile retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve personality profile: {str(e)}")