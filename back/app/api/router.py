from fastapi import APIRouter
from .replicate_handler import replicate_router
from .comfyui_handler import comfyui_router

router = APIRouter()

# Include both routers with prefixes
router.include_router(replicate_router, prefix="/replicate")
router.include_router(comfyui_router, prefix="/comfyui") 