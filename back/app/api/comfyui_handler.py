from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from PIL import Image
import traceback
import requests
import logging
import os
from dotenv import load_dotenv
import httpx
import asyncio
import json
from pathlib import Path

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE64_PREAMBLE = "data:image/png;base64,"

# Get webhook URL from environment or construct it
WEBHOOK_BASE_URL = os.getenv('WEBHOOK_BASE_URL')
if not WEBHOOK_BASE_URL:
    # Default to localhost in development, Render URL in production
    WEBHOOK_BASE_URL = (
        "http://localhost:8000" 
        if os.getenv('NODE_ENV') == 'development' 
        else "https://ghiblify.onrender.com"
    )

WEBHOOK_URL = f"{WEBHOOK_BASE_URL}/api/comfyui/webhook"
logger.info(f"Configured webhook URL: {WEBHOOK_URL}")

# Validate required environment variables
REQUIRED_ENV_VARS = {
    'COMFY_UI_API_KEY': 'ComfyUI API key is required',
    'IMGBB_API_KEY': 'ImgBB API key is required for image hosting'
}

missing_vars = [var for var, msg in REQUIRED_ENV_VARS.items() if not os.getenv(var)]
if missing_vars:
    error_messages = [REQUIRED_ENV_VARS[var] for var in missing_vars]
    raise ValueError(f"Missing required environment variables: {', '.join(error_messages)}")

comfyui_router = APIRouter()

# Store task results with timestamps
task_results = {}

async def update_task_status(task_id: str, status: str, **kwargs):
    """Update task status with timestamp"""
    task_results[task_id] = {
        "status": status,
        "timestamp": asyncio.get_event_loop().time(),
        **kwargs
    }
    logger.info(f"Task {task_id} status updated to {status}")

async def upload_to_imgbb(image_bytes: bytes) -> str:
    """Upload image to ImgBB and return the URL"""
    logger.info("Uploading image to ImgBB...")
    
    imgbb_api_key = os.getenv('IMGBB_API_KEY')
    if not imgbb_api_key:
        raise HTTPException(status_code=500, detail="ImgBB API key not configured")
    
    # Convert bytes to PIL Image and save as PNG
    image = Image.open(BytesIO(image_bytes))
    output = BytesIO()
    image.save(output, format='PNG')
    image_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
    
    # Prepare the request
    url = "https://api.imgbb.com/1/upload"
    payload = {
        'key': imgbb_api_key,
        'image': image_base64,
    }
    
    try:
        # Use httpx for better connection handling
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=payload)
            response.raise_for_status()
            
            data = response.json()
            if data.get('success'):
                image_url = data['data']['url']
                logger.info(f"Image uploaded successfully to ImgBB: {image_url}")
                return image_url
            else:
                logger.error(f"ImgBB upload failed: {data}")
                raise HTTPException(status_code=500, detail="Failed to upload image to ImgBB")
                
    except httpx.HTTPError as e:
        logger.error(f"Error uploading to ImgBB: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading to ImgBB: {str(e)}")

async def handle_comfyui(image_bytes: bytes):
    logger.info("Starting ComfyUI workflow")
    
    # First upload to ImgBB
    image_url = await upload_to_imgbb(image_bytes)
    
    # API endpoints
    create_task_endpoint = "https://api.comfyonline.app/api/run_workflow"
    
    headers = {
        "Authorization": f"Bearer {os.getenv('COMFY_UI_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    # Create the task payload with the ImgBB URL and webhook
    logger.info(f"Using webhook URL: {WEBHOOK_URL}")
    task_payload = {
        "workflow_id": "0f9f99b9-69e7-4651-a37f-7d997b159ce6",
        "input": {
            "LoadImage_image_17": image_url,
            "CLIPTextEncode_text_7": ""
        },
        "webhook": WEBHOOK_URL
    }
    
    # Create a client with increased timeout
    timeout_settings = httpx.Timeout(90.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout_settings) as client:
        try:
            logger.info("Creating workflow task...")
            # Create the task
            task_response = await client.post(
                create_task_endpoint,
                json=task_payload,
                headers=headers
            )
            
            logger.info(f"Task creation response status: {task_response.status_code}")
            logger.info(f"Task creation response: {task_response.text}")
            
            if task_response.status_code != 200:
                error_msg = task_response.json().get("errorMsg", "Unknown error")
                logger.error(f"Task creation error: {error_msg}")
                raise HTTPException(
                    status_code=task_response.status_code,
                    detail=f"Failed to create workflow task: {error_msg}"
                )
            
            task_data = task_response.json()
            if not task_data.get("success"):
                error_msg = task_data.get("errorMsg", "Unknown error")
                logger.error(f"Task creation failed: {error_msg}")
                raise HTTPException(status_code=500, detail=error_msg)
            
            task_id = task_data.get("data", {}).get("task_id")
            if not task_id:
                logger.error("No task ID received")
                raise HTTPException(status_code=500, detail="No task ID received")

            logger.info(f"Received task ID: {task_id}")
            
            # Initialize task status
            await update_task_status(task_id, "PROCESSING")
            
            # Return task ID immediately
            return {
                "task_id": task_id,
                "status": "PROCESSING"
            }
            
        except Exception as e:
            logger.error(f"Unexpected error in ComfyUI workflow: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error in ComfyUI workflow: {str(e)}"
            )

async def download_and_convert_to_base64(url: str) -> str:
    """Download image from URL and convert to base64"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode("utf-8")
            return BASE64_PREAMBLE + image_base64
            
    except Exception as e:
        logger.error(f"Error downloading image from {url}: {str(e)}")
        raise

@comfyui_router.post("/webhook")
async def comfyui_webhook(request: Request):
    """Handle webhook callbacks from ComfyUI"""
    try:
        data = await request.json()
        logger.info(f"Received webhook data: {data}")
        
        task_id = data.get("id")
        status = data.get("status")
        output = data.get("output", {})
        
        if not task_id:
            raise HTTPException(status_code=400, detail="No task ID in webhook data")
            
        if status == "COMPLETED":
            output_urls = output.get("output_url_list", [])
            if not output_urls:
                await update_task_status(task_id, "ERROR", error="No output URLs in webhook data")
                raise HTTPException(status_code=500, detail="No output URLs in webhook data")
                
            try:
                # Download and convert the image to base64
                image_base64 = await download_and_convert_to_base64(output_urls[0])
                
                # Store both the base64 and the URL
                await update_task_status(
                    task_id,
                    "COMPLETED",
                    url=output_urls[0],
                    result=image_base64
                )
            except Exception as e:
                await update_task_status(task_id, "ERROR", error=f"Failed to download image: {str(e)}")
                raise
            
        elif status == "ERROR":
            await update_task_status(task_id, "ERROR", error=data.get("errorMsg", "Task failed"))
            
        return JSONResponse(content={"message": "Webhook processed successfully"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")

@comfyui_router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a task with progress milestones"""
    result = task_results.get(task_id)
    if not result:
        return JSONResponse(content={
            "status": "PROCESSING",
            "milestone": 0,
            "message": "Task started"
        })
        
    # If task is completed, return both URL and base64 result
    if result["status"] == "COMPLETED":
        return JSONResponse(content={
            "status": "COMPLETED",
            "result": result.get("result"),  # base64 data
            "url": result.get("url"),        # direct URL
            "message": "Processing complete"
        })
        
    # If task failed, return error
    if result["status"] == "ERROR":
        return JSONResponse(content={
            "status": "ERROR",
            "error": result.get("error", "Unknown error occurred"),
            "message": "Processing failed"
        })
        
    # Calculate milestone based on time elapsed (typical job takes about 60 seconds)
    elapsed = asyncio.get_event_loop().time() - result["timestamp"]
    if elapsed < 30:  # First 30 seconds
        milestone = 25
        message = "Initializing image processing..."
    elif elapsed < 60:  # 60 seconds
        milestone = 50
        message = "Applying Ghibli style transformation..."
    elif elapsed < 90:  # 90 seconds
        milestone = 75
        message = "Refining image details..."
    else:  # > 90 seconds
        milestone = 90  # Stay at 100% until complete
        message = "Finalizing image..."
    
    return JSONResponse(content={
        "status": "PROCESSING",
        "milestone": milestone,
        "message": message
    })

@comfyui_router.post("/")
async def process_with_comfyui(file: UploadFile = File("test")):
    try:
        # Read the uploaded file into memory
        contents = await file.read()
        image = Image.open(BytesIO(contents))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Convert to bytes for processing
        image_bytes_io = BytesIO()
        image.save(image_bytes_io, format="PNG")
        image_bytes = image_bytes_io.getvalue()
        base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

        logger.info("Processing image with ComfyUI...")
        output = await handle_comfyui(image_bytes)
        
        return JSONResponse(
            content={
                "message": "Photo processing started",
                "original": BASE64_PREAMBLE + base64_encoded,
                "task_id": output["task_id"],
                "status": output["status"]
            },
            status_code=202  # 202 Accepted indicates the request is being processed
        )
    except Exception as e:
        logger.error(f"Error details: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing photo: {str(e)}"
        ) 