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

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = [
    "http://localhost:3000",     # Local development
    "http://localhost:8000",     # Local backend
    "https://ghiblify-it.vercel.app",  # Production frontend
    "https://ghiblify.onrender.com"    # Production backend
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router
app.include_router(router, prefix="/api")
