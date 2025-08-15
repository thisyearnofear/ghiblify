from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from .router import router

# Load environment variables
load_dotenv()

# Initialize API
app = FastAPI()

UPLOAD_FOLDER = os.path.abspath("initial_photos")
app.mount("/initial_photos", StaticFiles(directory=UPLOAD_FOLDER), name="initial_photos")

# Get production API URL from environment
PRODUCTION_API_URL = os.getenv('PRODUCTION_API_URL', 'https://api.thisyearnofear.com')

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = [
    "http://localhost:3000",     # Local development
    "http://localhost:8000",     # Local backend
    "https://ghiblify-it.vercel.app",  # Production frontend
    PRODUCTION_API_URL,          # Production backend
    "*"  # Allow all origins as fallback
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex="https://.*\.vercel\.app$",  # Allow all Vercel subdomains
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400  # Cache preflight requests for 24 hours
)

# Include the router
app.include_router(router, prefix="/api")
