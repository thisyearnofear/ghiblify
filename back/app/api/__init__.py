from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv
from .ghiblify import router as ghiblify_router
from .upload import router as upload_router

# Load environment variables
load_dotenv()

# Initialize API
app = FastAPI()

UPLOAD_FOLDER = os.path.abspath("initial_photos")
app.mount("/initial_photos", StaticFiles(directory=UPLOAD_FOLDER), name="initial_photos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include the routers
app.include_router(ghiblify_router)
app.include_router(upload_router)
