from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import stripe_handler, celo_handler, web3_auth, comfyui_handler
from .tasks import start_background_tasks
import os

app = FastAPI()

# Get frontend URL from environment
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
NGROK_URL = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8000')

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ghiblify-it.vercel.app",
        "https://ghiblify.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stripe_handler.stripe_router, prefix="/api/stripe", tags=["stripe"])
app.include_router(celo_handler.celo_router, prefix="/api/celo", tags=["celo"])
app.include_router(web3_auth.web3_router, prefix="/api/web3", tags=["web3"])
app.include_router(comfyui_handler.comfyui_router, prefix="/api/comfyui", tags=["comfyui"])

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup."""
    await start_background_tasks()

@app.get("/health")
async def health_check():
    return {"status": "healthy"} 