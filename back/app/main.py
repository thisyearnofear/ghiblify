from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router as api_router
from .tasks import start_background_tasks
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    expose_headers=["*"]
)

# Include the main API router
logger.info("Registering API router...")
app.include_router(api_router, prefix="/api")
logger.info("API router registered successfully")

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup."""
    logger.info("Starting background tasks...")
    await start_background_tasks()
    logger.info("Background tasks started successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    logger.info("Health check requested")
    return {"status": "healthy", "version": "1.0.0"} 