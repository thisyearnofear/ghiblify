from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from ..services.creations_service import get_creation, list_creations


creations_router = APIRouter()


@creations_router.get("/")
async def get_creations(address: str, limit: int = 20, offset: int = 0):
    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    safe_limit = max(1, min(limit, 50))
    safe_offset = max(0, offset)

    creations = list_creations(address=address, limit=safe_limit, offset=safe_offset)
    return JSONResponse(content={"creations": creations, "limit": safe_limit, "offset": safe_offset})


@creations_router.get("/{creation_id}")
async def get_creation_detail(creation_id: str, address: str):
    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    creation = get_creation(address=address, creation_id=creation_id)
    if not creation:
        raise HTTPException(status_code=404, detail="Creation not found")

    return JSONResponse(content=creation)
