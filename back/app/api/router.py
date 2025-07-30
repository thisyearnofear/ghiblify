from fastapi import APIRouter, Depends
from .replicate_handler import replicate_router
from .comfyui_handler import comfyui_router
from .payments import payments_router
from .stripe_handler import stripe_router
from .credits import credits_router
from .web3_auth import web3_router
from .celo_handler import celo_router
from .base_pay_handler import base_pay_router
from .health import router as health_router

router = APIRouter()

# Include the routers
router.include_router(health_router)
router.include_router(replicate_router, prefix="/replicate")
router.include_router(comfyui_router, prefix="/comfyui")
router.include_router(payments_router, prefix="/payments", tags=["payments"])
router.include_router(stripe_router, prefix="/stripe", tags=["payments"])
router.include_router(credits_router, prefix="/credits", tags=["credits"])
router.include_router(web3_router, prefix="/web3", tags=["web3"])
router.include_router(celo_router, prefix="/celo", tags=["celo"])
router.include_router(base_pay_router, prefix="/base-pay", tags=["base-pay"])