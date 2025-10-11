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
from .credit_manager import credit_manager
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

async def handle_comfyui(image_bytes: bytes, webhook_url: str = None, address: str = None):
    logger.info("Starting ComfyUI workflow")

    # Check if we should use Replicate instead
    use_replicate = os.getenv('USE_REPLICATE_FALLBACK', 'false').lower() == 'true'
    if use_replicate:
        logger.info("Using Replicate fallback for image processing")
        # Import and use Replicate handler
        from .replicate_handler import process_with_replicate

        # Create a mock UploadFile from image bytes
        from fastapi import UploadFile
        from io import BytesIO

        # Create a BytesIO object from image_bytes
        image_io = BytesIO(image_bytes)
        image_io.seek(0)  # Reset to beginning

        # Create a mock UploadFile
        class MockUploadFile:
            def __init__(self, filename, file):
                self.filename = filename
                self.file = file

            async def read(self):
                return self.file.getvalue()

            async def close(self):
                pass

        mock_file = MockUploadFile("image.png", image_io)

        # Create a mock request for Replicate handler
        class MockRequest:
            def __init__(self):
                self.headers = {"origin": "https://ghiblify-it.vercel.app"}

        mock_request = MockRequest()

        # Call Replicate handler
        replicate_result = await process_with_replicate(mock_file, address=address, request=mock_request)
        return replicate_result

    # First upload to ImgBB
    image_url = await upload_to_imgbb(image_bytes)

    # Determine webhook URL (prefer request-derived value)
    final_webhook = webhook_url or WEBHOOK_URL
    logger.info(f"Using webhook URL: {final_webhook}")

    # API endpoints
    create_task_endpoint = "https://api.comfyonline.app/api/run_workflow"
    
    headers = {
        "Authorization": f"Bearer {COMFY_UI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Create a simple workflow that uploads to cloud storage
    # Since the existing workflow doesn't include cloud upload, we'll create a basic one
    simple_workflow = {
        "nodes": [
            {
                "id": 1,
                "type": "LoadImage",
                "pos": [0, 0],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 0,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1]}],
                "properties": {"Node name for S&R": "LoadImage"},
                "widgets_values": ["input_image.png", "image"]
            },
            {
                "id": 2,
                "type": "CLIPTextEncode",
                "pos": [400, 0],
                "size": {"0": 422, "1": 164},
                "flags": {},
                "order": 1,
                "mode": 0,
                "inputs": [{"name": "clip", "type": "CLIP", "link": 2}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [3]}],
                "properties": {"Node name for S&R": "CLIPTextEncode"},
                "widgets_values": ["ghibli style, Studio Ghibli art, anime style"]
            },
            {
                "id": 3,
                "type": "DualCLIPLoader",
                "pos": [900, 0],
                "size": {"0": 315, "1": 130},
                "flags": {},
                "order": 2,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "CLIP", "type": "CLIP", "links": [2]}],
                "properties": {"Node name for S&R": "DualCLIPLoader"},
                "widgets_values": ["clip_l.safetensors", "t5xxl_fp8_e4m3fn.safetensors", "flux", "default"]
            },
            {
                "id": 4,
                "type": "UNETLoader",
                "pos": [1300, 0],
                "size": {"0": 315, "1": 82},
                "flags": {},
                "order": 3,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "MODEL", "type": "MODEL", "links": [4]}],
                "properties": {"Node name for S&R": "UNETLoader"},
                "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"]
            },
            {
                "id": 5,
                "type": "VAELoader",
                "pos": [1700, 0],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 4,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "VAE", "type": "VAE", "links": [5]}],
                "properties": {"Node name for S&R": "VAELoader"},
                "widgets_values": ["ae.safetensors"]
            },
            {
                "id": 6,
                "type": "KSampler",
                "pos": [2100, 0],
                "size": {"0": 315, "1": 262},
                "flags": {},
                "order": 5,
                "mode": 0,
                "inputs": [
                    {"name": "model", "type": "MODEL", "link": 4},
                    {"name": "positive", "type": "CONDITIONING", "link": 3},
                    {"name": "negative", "type": "CONDITIONING", "link": 6},
                    {"name": "latent_image", "type": "LATENT", "link": 7},
                    {"name": "vae", "type": "VAE", "link": 5}
                ],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [8]}],
                "properties": {"Node name for S&R": "KSampler"},
                "widgets_values": [12345, "randomize", 20, 1, "euler", "simple", 1]
            },
            {
                "id": 7,
                "type": "CLIPTextEncode",
                "pos": [2500, 0],
                "size": {"0": 422, "1": 164},
                "flags": {},
                "order": 6,
                "mode": 0,
                "inputs": [{"name": "clip", "type": "CLIP", "link": 9}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [6]}],
                "properties": {"Node name for S&R": "CLIPTextEncode"},
                "widgets_values": ["blurry, low quality, distorted"]
            },
            {
                "id": 8,
                "type": "EmptyLatentImage",
                "pos": [2900, 0],
                "size": {"0": 315, "1": 106},
                "flags": {},
                "order": 7,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [7]}],
                "properties": {"Node name for S&R": "EmptyLatentImage"},
                "widgets_values": [1024, 1024, 1]
            },
            {
                "id": 9,
                "type": "VAEDecode",
                "pos": [3300, 0],
                "size": {"0": 210, "1": 46},
                "flags": {},
                "order": 8,
                "mode": 0,
                "inputs": [
                    {"name": "samples", "type": "LATENT", "link": 8},
                    {"name": "vae", "type": "VAE", "link": 10}
                ],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [11]}],
                "properties": {"Node name for S&R": "VAEDecode"},
                "widgets_values": []
            },
            {
                "id": 10,
                "type": "SaveImage",
                "pos": [3700, 0],
                "size": {"0": 722, "1": 426},
                "flags": {},
                "order": 9,
                "mode": 0,
                "inputs": [{"name": "images", "type": "IMAGE", "link": 11}],
                "outputs": [],
                "properties": {"Node name for S&R": "SaveImage"},
                "widgets_values": ["ComfyUI"]
            }
        ],
        "links": [
            [1, 1, 0, 1, 0, "IMAGE"],
            [2, 3, 0, 2, 0, "CLIP"],
            [3, 2, 0, 6, 1, "CONDITIONING"],
            [4, 4, 0, 6, 0, "MODEL"],
            [5, 5, 0, 9, 1, "VAE"],
            [6, 7, 0, 6, 2, "CONDITIONING"],
            [7, 8, 0, 6, 3, "LATENT"],
            [8, 6, 0, 9, 0, "LATENT"],
            [9, 3, 0, 7, 0, "CLIP"],
            [10, 5, 0, 9, 1, "VAE"],
            [11, 9, 0, 10, 0, "IMAGE"]
        ],
        "groups": [],
        "config": {},
        "extra": {},
        "version": 0.4
    }

    # Create the task payload with the full workflow and webhook
    task_payload = {
        "workflow": simple_workflow,
        "input": {
            "LoadImage_1": image_url
        },
        "webhook": final_webhook
    }
    
    logger.info(f"Task payload: {task_payload}")
    logger.info(f"Headers: {headers}")
    
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
            result = BASE64_PREAMBLE + image_base64
            
            # Validate result is a string
            if not isinstance(result, str):
                raise ValueError(f"Expected string result, got {type(result)}")
            
            return result
            
    except Exception as e:
        logger.error(f"Error downloading image from {url}: {str(e)}")
        raise

@comfyui_router.post("/webhook")
async def comfyui_webhook(request: Request):
    """Handle webhook callbacks from ComfyUI"""
    try:
        # Log raw request details
        logger.info(f"Received webhook request to {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        body = await request.body()
        logger.info(f"Raw body: {body}")
        
        data = await request.json()
        logger.info(f"Parsed webhook data: {data}")
        
        # Extract data from the nested structure
        if not data.get("success"):
            error_msg = data.get("errorMsg", "Unknown error")
            logger.error(f"Error in webhook data: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
            
        webhook_data = data.get("data", {})
        task_id = webhook_data.get("id")
        status = webhook_data.get("state")  # ComfyUI uses 'state' instead of 'status'
        output = webhook_data.get("output", {})
        
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
                
                # Validate the base64 result is a string
                if not isinstance(image_base64, str):
                    logger.error(f"Non-string base64 result for task {task_id}")
                    await update_task_status(task_id, "ERROR", error="Invalid base64 format")
                    raise HTTPException(status_code=500, detail="Invalid base64 format")
                
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
                    base64_data = await download_and_convert_to_base64(output_urls[0])
                    
                    # Validate the base64 data is a string
                    if not isinstance(base64_data, str):
                        logger.error(f"Non-string base64 data for task {task_id}")
                        await update_task_status(task_id, "ERROR", error="Invalid base64 format")
                        return JSONResponse(content={"message": "Invalid base64 format"}, status_code=500)
                    
                    await update_task_status(
                        task_id,
                        "COMPLETED",
                        result=base64_data,
                        url=output_urls[0]
                    )
                except Exception as e:
                    await update_task_status(task_id, "ERROR", error=f"Failed to download image: {str(e)}")
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
    
    logger.info(f"Checking ComfyUI status for task {task_id}")
    
    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"Making request to ComfyUI status endpoint")
            response = await client.post(status_endpoint, json=payload, headers=headers)
            logger.info(f"ComfyUI status response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"ComfyUI status data: {data}")
                if data.get("success"):
                    workflow_data = data.get("data", {})
                    state = workflow_data.get("state")
                    logger.info(f"ComfyUI task state: {state}")
                    
                    if state == "COMPLETED":
                        # Update task status with the result
                        output_urls = workflow_data.get("output", {}).get("output_url_list", [])
                        logger.info(f"ComfyUI output URLs: {output_urls}")
                        if output_urls:
                            try:
                                base64_data = await download_and_convert_to_base64(output_urls[0])
                                
                                # Validate the base64 data is a string
                                if not isinstance(base64_data, str):
                                    logger.error(f"Non-string base64 data for task {task_id}")
                                    await update_task_status(task_id, "ERROR", error="Invalid base64 format")
                                    return
                                
                                await update_task_status(
                                    task_id,
                                    "COMPLETED",
                                    result=base64_data,
                                    url=output_urls[0]
                                )
                            except Exception as e:
                                logger.error(f"Error downloading image: {str(e)}")
                                await update_task_status(task_id, "ERROR", error=f"Failed to download image: {str(e)}")
                        else:
                            # ComfyUI completed but returned no output URLs
                            logger.error(f"ComfyUI task {task_id} completed but returned no output URLs")
                            await update_task_status(
                                task_id,
                                "ERROR",
                                error="ComfyUI processing completed but no output was generated. This may be due to missing API keys or workflow configuration issues."
                            )
                    elif workflow_data.get("state") == "ERROR":
                        await update_task_status(task_id, "ERROR", error=workflow_data.get("errorMsg", "Task failed"))
    except Exception as e:
        logger.error(f"Error checking ComfyUI status: {str(e)}")

@comfyui_router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a task with progress milestones"""
    # First check ComfyUI API for updates
    await check_comfyui_status(task_id)
    
    result = task_results.get(task_id)
    logger.info(f"Task status request for {task_id}. Current status: {result}")
    if not result:
        return JSONResponse(content={
            "status": "PROCESSING",
            "milestone": 0,
            "message": "Task started"
        })
        
    # If task is completed, return both URL and base64 result
    if result["status"] == "COMPLETED":
        result_data = result.get("result")
        url_data = result.get("url")
        
        # Validate that result is a string
        if result_data and not isinstance(result_data, str):
            logger.error(f"Non-string result data for task {task_id}: {type(result_data)}")
            return JSONResponse(content={
                "status": "ERROR",
                "error": "Invalid result format - expected string URL",
                "message": "Processing failed"
            })
        
        # Validate that url is a string if present
        if url_data and not isinstance(url_data, str):
            logger.error(f"Non-string URL data for task {task_id}: {type(url_data)}")
            url_data = None
        
        return JSONResponse(content={
            "status": "COMPLETED",
            "result": result_data,  # base64 data (validated string)
            "url": url_data,        # direct URL (validated string or None)
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
async def process_with_comfyui(file: UploadFile = File("test"), address: str = None, request: Request = None):
    # Check if ComfyUI is properly configured
    if not COMFYUI_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="ComfyUI service is not configured. Missing required API keys (COMFY_UI_API_KEY, IMGBB_API_KEY)."
        )

    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    # Validate and spend credit using unified credit manager
    credit_manager.validate_and_spend_credit(address, "ComfyUI")

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

        # Build a webhook URL from the incoming request to avoid first-call base URL issues
        derived_base = None
        if request is not None:
            # Prefer the Origin header for correct public URL in edge/proxy setups
            origin = request.headers.get("origin") or request.headers.get("Origin")
            if origin and origin.startswith("http"):
                derived_base = origin.replace("http://", "https://") if origin.startswith("http://") else origin
            else:
                # Fallback to request.url to construct base
                try:
                    derived_base = str(request.url).split("/api/")[0]
                except Exception:
                    derived_base = None
        webhook_override = f"{derived_base}/api/comfyui/webhook" if derived_base else None

        logger.info("Processing image with ComfyUI...")
        output = await handle_comfyui(image_bytes, webhook_url=webhook_override, address=address)
        
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
        error_str = str(e)
        logger.error(f"Error details: {error_str}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        # Refund credit and get user-friendly error message using unified credit manager
        credit_manager.refund_credit(address, "ComfyUI")
        user_message = credit_manager.get_user_friendly_error_message(error_str, "ComfyUI")

        raise HTTPException(
            status_code=500,
            detail=user_message
        )