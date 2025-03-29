from fastapi import APIRouter, Depends
from .replicate_handler import replicate_router
from .comfyui_handler import comfyui_router
from .payments import payments_router
from .stripe_handler import stripe_router
from .credits import credits_router, get_session

router = APIRouter()

# Include the routers
router.include_router(replicate_router, prefix="/replicate", dependencies=[Depends(get_session)])
router.include_router(comfyui_router, prefix="/comfyui", dependencies=[Depends(get_session)])
router.include_router(payments_router, prefix="/payments", tags=["payments"])
router.include_router(stripe_router, prefix="/stripe", tags=["payments"])
router.include_router(credits_router, prefix="/credits", tags=["credits"]) 