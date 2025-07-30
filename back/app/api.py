"""
Main API entry point for Render deployment.
This file imports the FastAPI app from the main module.
"""
from app.main import app

# Export the app for uvicorn
__all__ = ["app"]
