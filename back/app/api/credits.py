from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
import logging
from jose import jwt, JWTError
from datetime import datetime, timedelta
import uuid
from typing import Optional
from fastapi import status

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize router
credits_router = APIRouter()

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', str(uuid.uuid4()))
JWT_ALGORITHM = "HS256"

# In-memory credit storage (replace with database in production)
user_credits = {}

def create_session_token(credits: int) -> str:
    """Create a new session token with credits"""
    session_id = str(uuid.uuid4())
    payload = {
        "session_id": session_id,
        "credits": credits,
        "exp": datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_session_token(token: str) -> dict:
    """Verify and decode session token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token"
        )

async def get_session(request: Request) -> dict:
    """Get session from request header"""
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No session token provided")
    
    token = token.split(" ")[1]
    return verify_session_token(token)

@credits_router.post("/add/{credits}")
async def add_credits(credits: int) -> JSONResponse:
    """Add credits and create a new session"""
    token = create_session_token(credits)
    return JSONResponse(content={
        "token": token,
        "credits": credits
    })

@credits_router.get("/check")
async def check_credits(session: dict = Depends(get_session)) -> JSONResponse:
    """Check remaining credits"""
    return JSONResponse(content={
        "credits": session.get("credits", 0)
    })

@credits_router.post("/use")
async def use_credit(session: dict = Depends(get_session)) -> JSONResponse:
    """Use one credit and return updated count"""
    current_credits = session.get("credits", 0)
    
    if current_credits <= 0:
        raise HTTPException(status_code=402, detail="No credits available")
    
    # Create new token with decremented credits
    new_token = create_session_token(current_credits - 1)
    
    return JSONResponse(content={
        "token": new_token,
        "credits_remaining": current_credits - 1
    }) 