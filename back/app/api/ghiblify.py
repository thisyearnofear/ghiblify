from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
import httpx
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# API key validation
async def validate_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key != os.getenv("GHIBLIFY_API_KEY"):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )
    return x_api_key

class GhiblifyRequest(BaseModel):
    imageUrl: str

@router.post("/ghiblify")
async def ghiblify_image(
    request: GhiblifyRequest,
    api_key: str = Depends(validate_api_key)
):
    try:
        async with httpx.AsyncClient() as client:
            # Call Replicate API
            response = await client.post(
                "https://api.replicate.com/v1/predictions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Token {os.getenv('REPLICATE_API_TOKEN')}"
                },
                json={
                    "version": "328bd9692d29d6781034e3acab8cf3fcb122161e6f651be7a7dcec3c8ee9b77c",
                    "input": {
                        "image": request.imageUrl
                    }
                }
            )
            
            if response.status_code != 201:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Replicate API error: {response.text}"
                )
            
            return response.json()
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/ghiblify/{prediction_id}")
async def get_prediction_status(
    prediction_id: str,
    api_key: str = Depends(validate_api_key)
):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.replicate.com/v1/predictions/{prediction_id}",
                headers={
                    "Authorization": f"Token {os.getenv('REPLICATE_API_TOKEN')}"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Replicate API error: {response.text}"
                )
            
            return response.json()
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        ) 