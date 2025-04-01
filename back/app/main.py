from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.stripe_handler import stripe_router
from .api.web3_auth import web3_router
from .api.celo_handler import celo_router
from .tasks import start_background_tasks
import os

app = FastAPI()

# Get frontend URL from environment
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
NGROK_URL = os.getenv('WEBHOOK_BASE_URL', 'http://localhost:8000')

# CORS configuration
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
app.include_router(stripe_router, prefix="/api/stripe", tags=["stripe"])
app.include_router(web3_router, prefix="/api/web3", tags=["web3"])
app.include_router(celo_router, prefix="/api/celo", tags=["celo"])

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup."""
    await start_background_tasks()

@app.get("/health")
async def health_check():
    return {"status": "ok"} 