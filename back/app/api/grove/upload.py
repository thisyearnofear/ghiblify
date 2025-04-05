import os
import requests
import base64
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional
import logging
from app.auth.auth_handler import get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

class ImageUploadRequest(BaseModel):
    image_data: str  # Base64 encoded image or URL
    is_base64: bool = True

class GroveUploadResponse(BaseModel):
    success: bool
    gateway_url: Optional[str] = None
    uri: Optional[str] = None
    error: Optional[str] = None

@router.post("/upload", response_model=GroveUploadResponse)
async def upload_to_grove(
    request: ImageUploadRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image to Grove storage for social sharing
    """
    try:
        # Process the image data
        if request.is_base64:
            # Handle base64 encoded image
            try:
                # Extract the actual base64 content if it includes data URL prefix
                if "base64," in request.image_data:
                    content_type = request.image_data.split(';')[0].split(':')[1]
                    base64_data = request.image_data.split('base64,')[1]
                else:
                    # Assume it's image/png if not specified
                    content_type = "image/png"
                    base64_data = request.image_data
                
                # Decode base64 to binary
                image_binary = base64.b64decode(base64_data)
            except Exception as e:
                logger.error(f"Error decoding base64 image: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")
        else:
            # Handle URL - fetch the image
            try:
                response = requests.get(request.image_data)
                response.raise_for_status()
                image_binary = response.content
                content_type = response.headers.get('Content-Type', 'image/png')
            except Exception as e:
                logger.error(f"Error fetching image from URL: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Failed to fetch image from URL: {str(e)}")
        
        # Upload to Grove using the one-step upload for immutable content
        # We're using the Celo Mainnet chain ID (42220) to match our app's blockchain
        try:
            upload_response = requests.post(
                "https://api.grove.storage/?chain_id=42220",
                data=image_binary,
                headers={"Content-Type": content_type}
            )
            
            if not upload_response.ok:
                logger.error(f"Grove upload failed: {upload_response.status_code} - {upload_response.text}")
                raise HTTPException(
                    status_code=upload_response.status_code,
                    detail=f"Grove upload failed: {upload_response.text}"
                )
            
            data = upload_response.json()
            
            return GroveUploadResponse(
                success=True,
                gateway_url=data.get("gateway_url"),
                uri=data.get("uri")
            )
            
        except Exception as e:
            logger.error(f"Error during Grove upload: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error during Grove upload: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in Grove upload: {str(e)}")
        return GroveUploadResponse(success=False, error=str(e))
