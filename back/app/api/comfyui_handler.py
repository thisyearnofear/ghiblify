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
from .web3_auth import get_credits, set_credits
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

async def handle_comfyui(image_bytes: bytes, webhook_url: str = None):
    logger.info("Starting ComfyUI workflow")
    
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
    
    # Create the task payload with the ImgBB URL and webhook
    task_payload = {
        "workflow_id": "0f9f99b9-69e7-4651-a37f-7d997b159ce6",
        "input": {
            "LoadImage_image_17": image_url,
            "CLIPTextEncode_text_7": ""
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

    # Validate user has sufficient credits
    current_credits = get_credits(address.lower())
    logger.info(f"Credit check for {address}: {current_credits} credits available")
    if current_credits < 1:
        logger.warning(f"Insufficient credits for {address}: {current_credits} < 1")
        raise HTTPException(status_code=402, detail="You need credits to create magical art ✨ Add credits to continue transforming your images!")

    # Spend the credit now that we've validated it's available
    set_credits(address.lower(), current_credits - 1)
    logger.info(f"Spent 1 credit for {address}. New balance: {current_credits - 1}")

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
        output = await handle_comfyui(image_bytes, webhook_url=webhook_override)
        
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

        # Refund credit since processing failed
        # Note: We deducted the credit at the start, so we need to add it back
        try:
            current_credits = get_credits(address.lower())
            set_credits(address.lower(), current_credits + 1)
            logger.info(f"Refunded 1 credit to {address} due to processing failure. New balance: {current_credits + 1}")
        except Exception as refund_error:
            logger.error(f"Failed to refund credit to {address}: {str(refund_error)}")
            # Don't fail the main error response due to refund issues

        # Provide user-friendly error messages
        user_message = "We're experiencing technical difficulties. Your credit has been refunded and you can try again in a few moments."

        # Check for specific error types to provide more targeted messages
        if "timeout" in error_str.lower() or "timed out" in error_str.lower():
            user_message = "The request took too long to process. Your credit has been refunded - please try again."
        elif "network" in error_str.lower() or "connection" in error_str.lower():
            user_message = "We're having connectivity issues. Your credit has been refunded - please try again shortly."
        elif "imgbb" in error_str.lower():
            user_message = "There was an issue uploading your image. Your credit has been refunded - please try again."
        elif "api key" in error_str.lower() or "unauthorized" in error_str.lower():
            user_message = "Our image processing service is temporarily unavailable. Your credit has been refunded - please try again later."
        elif "invalid" in error_str.lower() and "image" in error_str.lower():
            user_message = "There was an issue with your image format. Your credit has been refunded - please try uploading a different image."
        elif "workflow" in error_str.lower():
            user_message = "Our processing pipeline is experiencing issues. Your credit has been refunded - please try again in a few minutes."

        raise HTTPException(
            status_code=500,
            detail=user_message
        )