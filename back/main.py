from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from os import getenv
from app.api.router import router

# Create FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ghiblify-it.vercel.app",
        "https://ghiblify.vercel.app",
        "https://ghiblify.onrender.com",
        "*"  # Allow all origins for development
    ],
    allow_origin_regex="https://.*\.vercel\.app$",  # Allow all Vercel subdomains
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400  # Cache preflight requests for 24 hours
)

# Include our routers
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    port = int(getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
