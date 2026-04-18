from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Form
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from PIL import Image
import traceback
import requests
import logging
import os
from dotenv import load_dotenv
from .credit_manager import credit_manager
from ..services.redis_service import redis_service
from ..config.workflows import get_ghibli_image_workflow, get_ghibli_video_workflow
import httpx
import asyncio
import json
from pathlib import Path
from typing import Optional

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE64_IMAGE_PREAMBLE = "data:image/png;base64,"
BASE64_VIDEO_PREAMBLE = "data:video/mp4;base64,"

# Get webhook URL from environment or construct it
WEBHOOK_BASE_URL = os.getenv('WEBHOOK_BASE_URL')
if not WEBHOOK_BASE_URL:
    # Default to localhost in development, production API URL from environment
    PRODUCTION_API_URL = os.getenv('PRODUCTION_API_URL', 'https://api.thisyearnofear.com')
    WEBHOOK_BASE_URL = (
        "http://localhost:8000"
        if os.getenv('NODE_ENV') == 'development'
        else PRODUCTION_API_URL
    )

WEBHOOK_URL = f"{WEBHOOK_BASE_URL}/api/comfyui/webhook"
logger.info(f"Configured webhook URL: {WEBHOOK_URL}")

# Environment variable validation - make optional for graceful degradation
COMFY_UI_API_KEY = os.getenv('COMFY_UI_API_KEY')
IMGBB_API_KEY = os.getenv('IMGBB_API_KEY')

# Check if ComfyUI is properly configured
COMFYUI_ENABLED = bool(COMFY_UI_API_KEY and IMGBB_API_KEY)

if not COMFYUI_ENABLED:
    logger.warning("ComfyUI not fully configured - missing API keys. ComfyUI endpoints will return errors.")
    logger.warning(f"Missing: COMFY_UI_API_KEY={'✓' if COMFY_UI_API_KEY else '✗'}, IMGBB_API_KEY={'✓' if IMGBB_API_KEY else '✗'}")

comfyui_router = APIRouter()

async def update_task_status(task_id: str, status: str, **kwargs):
    """Update task status in Redis with timestamp"""
    task_data = {
        "status": status,
        "timestamp": asyncio.get_event_loop().time(),
        **kwargs
    }
    # Store in Redis with 24 hour expiration
    redis_service.set(f"comfyui_task:{task_id}", json.dumps(task_data), ex=86400)
    logger.info(f"Task {task_id} status updated to {status} in Redis")

async def get_task_data(task_id: str) -> Optional[dict]:
    """Retrieve task data from Redis"""
    data = redis_service.get(f"comfyui_task:{task_id}")
    if data:
        try:
            return json.loads(data)
        except Exception as e:
            logger.error(f"Error parsing task data for {task_id}: {str(e)}")
            return None
    return None

async def upload_to_imgbb(image_bytes: bytes) -> str:
    """Upload image to ImgBB and return the URL, with a short retry to avoid first-call failures"""
    logger.info("Uploading image to ImgBB...")

    if not IMGBB_API_KEY:
        raise HTTPException(status_code=500, detail="ImgBB API key not configured")
    
    # Convert bytes to PIL Image and save as PNG
    image = Image.open(BytesIO(image_bytes))
    output = BytesIO()
    image.save(output, format='PNG')
    image_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
    
    # Prepare the request
    url = "https://api.imgbb.com/1/upload"
    payload = {
        'key': IMGBB_API_KEY,
        'image': image_base64,
    }
    
    # Simple retry policy: try up to 2 times on transient errors
    attempts = 0
    last_error = None
    while attempts < 2:
        attempts += 1
        try:
            # Use httpx with timeout settings
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, data=payload)
                response.raise_for_status()
                
                data = response.json()
                if data.get('success'):
                    image_url = data['data']['url']
                    logger.info(f"Image uploaded successfully to ImgBB: {image_url}")
                    return image_url
                else:
                    error_msg = data.get('error', {}).get('message', 'Unknown error')
                    logger.error(f"ImgBB upload failed: {error_msg}")
                    last_error = HTTPException(status_code=500, detail=f"Failed to upload image to ImgBB: {error_msg}")
        except (httpx.TimeoutException, httpx.ReadTimeout) as e:
            logger.error(f"Timeout uploading to ImgBB (attempt {attempts}): {str(e)}")
            last_error = HTTPException(status_code=504, detail="Timeout uploading to ImgBB. Please try again.")
        except httpx.HTTPError as e:
            logger.error(f"HTTP error uploading to ImgBB (attempt {attempts}): {str(e)}")
            last_error = HTTPException(status_code=500, detail=f"Error uploading to ImgBB: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error uploading to ImgBB (attempt {attempts}): {str(e)}")
            last_error = HTTPException(status_code=500, detail="Unexpected error during image upload")
        
        if attempts < 2:
            await asyncio.sleep(1.0)
    
    # If we reach here, all attempts failed
    raise last_error or HTTPException(status_code=500, detail="Failed to upload image to ImgBB")

async def handle_comfyui(image_bytes: bytes, mode: str = "image", prompt_strength: float = 0.8, webhook_url: str = None, address: str = None):
    logger.info(f"Starting ComfyUI workflow in {mode} mode")

    # Check if we should use Replicate instead (fallback only for image)
    use_replicate = os.getenv('USE_REPLICATE_FALLBACK', 'false').lower() == 'true'
    if use_replicate and mode == "image":
        logger.info("Using Replicate fallback for image processing")
        from .replicate_handler import process_with_replicate
        from fastapi import UploadFile
        from io import BytesIO

        image_io = BytesIO(image_bytes)
        image_io.seek(0)

        class MockUploadFile:
            def __init__(self, filename, file):
                self.filename = filename
                self.file = file

            async def read(self):
                return self.file.getvalue()

            async def close(self):
                pass

        mock_file = MockUploadFile("image.png", image_io)

        class MockRequest:
            def __init__(self):
                self.headers = {"origin": "https://ghiblify-it.vercel.app"}

        mock_request = MockRequest()
        replicate_result = await process_with_replicate(mock_file, address=address, prompt_strength=prompt_strength, mode=mode, request=mock_request)
        return replicate_result

    # First upload to ImgBB
    image_url = await upload_to_imgbb(image_bytes)

    # Determine webhook URL
    final_webhook = webhook_url or WEBHOOK_URL
    logger.info(f"Using webhook URL: {final_webhook}")

    # API endpoints
    create_task_endpoint = "https://api.comfyonline.app/api/run_workflow"
    
    headers = {
        "Authorization": f"Bearer {COMFY_UI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get the appropriate workflow based on mode
    if mode == "motion":
        workflow = get_ghibli_video_workflow()
    else:
        workflow = get_ghibli_image_workflow()

    # Create the task payload
    task_payload = {
        "workflow": workflow,
        "input": {
            "LoadImage_1": image_url
        },
        "webhook": final_webhook
    }
    
    # Create a client with increased timeout
    timeout_settings = httpx.Timeout(90.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout_settings) as client:
        try:
            logger.info(f"Creating {mode} workflow task...")
            task_response = await client.post(
                create_task_endpoint,
                json=task_payload,
                headers=headers
            )
            
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
            await update_task_status(task_id, "PROCESSING", mode=mode)
            
            # Return task ID immediately
            return {
                "task_id": task_id,
                "status": "PROCESSING"
            }
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            logger.error(f"Unexpected error in ComfyUI workflow: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error in ComfyUI workflow: {str(e)}"
            )

async def download_and_convert_to_base64(url: str) -> str:
    """Download result from URL and convert to base64 with correct preamble"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            
            content_type = response.headers.get("content-type", "")
            if "video" in content_type or url.lower().endswith(".mp4"):
                preamble = BASE64_VIDEO_PREAMBLE
            else:
                preamble = BASE64_IMAGE_PREAMBLE
            
            # Convert to base64
            result_base64 = base64.b64encode(response.content).decode("utf-8")
            return preamble + result_base64
            
    except Exception as e:
        logger.error(f"Error downloading result from {url}: {str(e)}")
        raise

@comfyui_router.post("/webhook")
async def comfyui_webhook(request: Request):
    """Handle webhook callbacks from ComfyUI"""
    try:
        data = await request.json()
        logger.info(f"Parsed webhook data: {data}")
        
        if not data.get("success"):
            error_msg = data.get("errorMsg", "Unknown error")
            logger.error(f"Error in webhook data: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        webhook_data = data.get("data", {})
        task_id = webhook_data.get("id")
        status = webhook_data.get("state")
        output = webhook_data.get("output", {})
        
        if not task_id:
            raise HTTPException(status_code=400, detail="No task ID in webhook data")
            
        if status == "COMPLETED":
            output_urls = output.get("output_url_list", [])
            if not output_urls:
                await update_task_status(task_id, "ERROR", error="No output URLs in webhook data")
                raise HTTPException(status_code=500, detail="No output URLs in webhook data")
                
            try:
                # Download and convert to base64
                result_base64 = await download_and_convert_to_base64(output_urls[0])
                
                # Store both the base64 and the URL
                await update_task_status(
                    task_id,
                    "COMPLETED",
                    url=output_urls[0],
                    result=result_base64
                )
            except Exception as e:
                await update_task_status(task_id, "ERROR", error=f"Failed to download result: {str(e)}")
                raise
            
        elif status == "ERROR":
            await update_task_status(task_id, "ERROR", error=data.get("errorMsg", "Task failed"))
            
        return JSONResponse(content={"message": "Webhook processed successfully"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing webhook: {str(e)}")

@comfyui_router.put("/status/{task_id}")
async def update_status(task_id: str, request: Request):
    """Manually update task status from ComfyUI API response"""
    try:
        data = await request.json()
        response_data = data.get("data", {})
        
        if response_data.get("state") == "COMPLETED":
            output_urls = response_data.get("output", {}).get("output_url_list", [])
            if output_urls:
                try:
                    result_base64 = await download_and_convert_to_base64(output_urls[0])
                    await update_task_status(
                        task_id,
                        "COMPLETED",
                        result=result_base64,
                        url=output_urls[0]
                    )
                except Exception as e:
                    await update_task_status(task_id, "ERROR", error=f"Failed to download result: {str(e)}")
                    raise
            else:
                await update_task_status(task_id, "ERROR", error="No output URLs in data")
        else:
            await update_task_status(task_id, "ERROR", error=data.get("errorMsg", "Task failed"))
            
        return JSONResponse(content={"message": "Task status updated successfully"})
        
    except Exception as e:
        logger.error(f"Error updating task status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def check_comfyui_status(task_id: str):
    """Check task status directly from ComfyUI API"""
    status_endpoint = "https://api.comfyonline.app/api/query_run_workflow_status"
    headers = {
        "Authorization": f"Bearer {COMFY_UI_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {"task_id": task_id}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(status_endpoint, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    workflow_data = data.get("data", {})
                    state = workflow_data.get("state")
                    
                    if state == "COMPLETED":
                        output_urls = workflow_data.get("output", {}).get("output_url_list", [])
                        if output_urls:
                            try:
                                result_base64 = await download_and_convert_to_base64(output_urls[0])
                                await update_task_status(
                                    task_id,
                                    "COMPLETED",
                                    result=result_base64,
                                    url=output_urls[0]
                                )
                            except Exception as e:
                                logger.error(f"Error downloading result: {str(e)}")
                                await update_task_status(task_id, "ERROR", error=f"Failed to download result: {str(e)}")
                        else:
                            await update_task_status(task_id, "ERROR", error="No output generated")
                    elif state == "ERROR":
                        await update_task_status(task_id, "ERROR", error=workflow_data.get("errorMsg", "Task failed"))
    except Exception as e:
        logger.error(f"Error checking ComfyUI status: {str(e)}")

@comfyui_router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a task with progress milestones"""
    result = await get_task_data(task_id)

    # Only check ComfyUI API for updates if task is still PROCESSING or not found
    if result is None or result.get("status") == "PROCESSING":
        await check_comfyui_status(task_id)
        result = await get_task_data(task_id)

    if not result:
        return JSONResponse(content={
            "status": "PROCESSING",
            "milestone": 0,
            "message": "Task started"
        })
        
    if result["status"] == "COMPLETED":
        return JSONResponse(content={
            "status": "COMPLETED",
            "result": result.get("result"),
            "url": result.get("url"),
            "message": "Processing complete"
        })
        
    if result["status"] == "ERROR":
        return JSONResponse(content={
            "status": "ERROR",
            "error": result.get("error", "Unknown error occurred"),
            "message": "Processing failed"
        })
        
    # Calculate milestone based on time elapsed
    elapsed = asyncio.get_event_loop().time() - result["timestamp"]
    mode = result.get("mode", "image")

    # Image takes ~60s, Motion takes ~180s
    if mode == "motion":
        max_time = 600 # 10 minutes
        if elapsed < 60:
            milestone = 20
            message = "Initializing motion processing..."
        elif elapsed < 120:
            milestone = 40
            message = "Applying Ghibli style to frames..."
        elif elapsed < 180:
            milestone = 60
            message = "Generating motion paths..."
        elif elapsed < 240:
            milestone = 80
            message = "Finalizing video export..."
        else:
            milestone = 95
            message = f"Finishing up... ({int(elapsed//60)}m elapsed)"
    else:
        max_time = 300 # 5 minutes
        if elapsed < 30:
            milestone = 25
            message = "Initializing image processing..."
        elif elapsed < 60:
            milestone = 50
            message = "Applying Ghibli style..."
        elif elapsed < 90:
            milestone = 75
            message = "Refining details..."
        else:
            milestone = 95
            message = "Finalizing image..."

    if elapsed > max_time:
        await update_task_status(task_id, "ERROR", error="Task timed out")
        return JSONResponse(content={"status": "ERROR", "error": "Task timed out"})

    return JSONResponse(content={
        "status": "PROCESSING",
        "milestone": milestone,
        "message": message
    })

@comfyui_router.post("/")
async def process_with_comfyui(
    file: UploadFile = File(...), 
    address: str = None, 
    prompt_strength: float = Form(0.8),
    mode: str = Form("image"),
    request: Request = None
):
    if not COMFYUI_ENABLED:
        raise HTTPException(status_code=503, detail="ComfyUI service not configured")

    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    # Validate and spend credit using unified credit manager
    credit_manager.validate_and_spend_credit(address, "ComfyUI")

    try:
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")

        image_bytes_io = BytesIO()
        image.save(image_bytes_io, format="PNG")
        image_bytes = image_bytes_io.getvalue()
        base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

        logger.info(f"Processing {mode} with ComfyUI...")
        output = await handle_comfyui(image_bytes, mode=mode, prompt_strength=prompt_strength, address=address)
        
        return JSONResponse(
            content={
                "message": f"{mode.capitalize()} processing started",
                "original": BASE64_IMAGE_PREAMBLE + base64_encoded,
                "task_id": output["task_id"],
                "status": output["status"],
                "mode": mode
            },
            status_code=202
        )
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        credit_manager.refund_credit(address, "ComfyUI")
        user_message = credit_manager.get_user_friendly_error_message(str(e), "ComfyUI")
        raise HTTPException(status_code=500, detail=user_message)
