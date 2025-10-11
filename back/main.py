from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from os import getenv
from dotenv import load_dotenv
import os
from app.api.router import router
import logging

# Load environment variables from .env file
# Always load env from back/.env regardless of working directory
ENV_PATH = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=ENV_PATH)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI()

# CORS is handled by Nginx reverse proxy in production
# Uncomment below for local development without Nginx
# PRODUCTION_API_URL = getenv('PRODUCTION_API_URL', 'https://api.thisyearnofear.com')
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "http://localhost:4122",
#         "http://localhost:4133",
#         "https://ghiblify-it.vercel.app",
#         "https://ghiblify.vercel.app",
#         PRODUCTION_API_URL,
#         getenv("FRONTEND_URL", "")  # Environment-based frontend URL
#     ],
#     allow_origin_regex=r"https://.*\.vercel\.app$",  # Allow all Vercel subdomains
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
#     allow_headers=["*"],
#     expose_headers=["*"],
#     max_age=86400  # Cache preflight requests for 24 hours
# )

# Include our routers
app.include_router(router, prefix="/api")

# Health check endpoint for monitoring
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ghiblify-backend"}

if __name__ == "__main__":
    port = int(getenv("PORT", 8000))
    # Use reload=False in production
    reload = getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
