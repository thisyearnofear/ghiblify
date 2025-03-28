from fastapi import APIRouter, File, UploadFile, HTTPException
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

comfyui_router = APIRouter()

async def upload_to_imgbb(image_bytes: bytes) -> str:
    """Upload image to ImgBB and return the URL"""
    logger.info("Uploading image to ImgBB...")
    
    imgbb_api_key = os.getenv('IMGBB_API_KEY')
    if not imgbb_api_key:
        raise HTTPException(status_code=500, detail="ImgBB API key not configured")
    
    # Encode image bytes to base64
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    # Prepare the request
    url = "https://api.imgbb.com/1/upload"
    payload = {
        'key': imgbb_api_key,
        'image': image_base64,
    }
    
    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        
        data = response.json()
        if data.get('success'):
            image_url = data['data']['url']
            logger.info(f"Image uploaded successfully to ImgBB: {image_url}")
            return image_url
        else:
            logger.error(f"ImgBB upload failed: {data}")
            raise HTTPException(status_code=500, detail="Failed to upload image to ImgBB")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Error uploading to ImgBB: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading to ImgBB: {str(e)}")

async def handle_comfyui(image_bytes: bytes):
    logger.info("Starting ComfyUI workflow")
    
    # First upload to ImgBB
    image_url = await upload_to_imgbb(image_bytes)
    
    # API endpoints
    create_task_endpoint = "https://api.comfyonline.app/api/run_workflow"
    query_status_endpoint = "https://api.comfyonline.app/api/query_run_workflow_status"
    
    headers = {
        "Authorization": f"Bearer {os.getenv('COMFY_UI_API_KEY')}",
        "Content-Type": "application/json"
    }
    
    # Create the task payload with the ImgBB URL
    task_payload = {
        "workflow_id": "0f9f99b9-69e7-4651-a37f-7d997b159ce6",
        "input": {
            "LoadImage_image_17": image_url,
            "CLIPTextEncode_text_7": ""
        }
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
            
            # Poll for completion
            max_attempts = 90  # 90 seconds of polling
            attempts = 0
            
            while attempts < max_attempts:
                logger.info(f"Checking status (attempt {attempts + 1}/{max_attempts})")
                try:
                    status_response = await client.post(
                        query_status_endpoint,
                        json={"task_id": task_id},
                        headers=headers
                    )
                    
                    logger.info(f"Status check response: {status_response.text}")
                    
                    if status_response.status_code != 200:
                        logger.error(f"Status check failed with status {status_response.status_code}")
                        raise HTTPException(
                            status_code=status_response.status_code,
                            detail="Failed to check task status"
                        )
                    
                    status_data = status_response.json()
                    if not status_data.get("success"):
                        error_msg = status_data.get("errorMsg", "Unknown error")
                        logger.error(f"Status check failed: {error_msg}")
                        raise HTTPException(status_code=500, detail=error_msg)
                    
                    state = status_data.get("data", {}).get("state")
                    logger.info(f"Current state: {state}")
                    
                    if state == "COMPLETED":
                        output = status_data.get("data", {}).get("output", {})
                        output_urls = output.get("output_url_list", [])
                        if not output_urls:
                            raise HTTPException(status_code=500, detail="No output URLs received")
                        
                        # Return the first output URL
                        return output_urls[0]
                    elif state == "ERROR":
                        error_msg = status_data.get("errorMsg", "Unknown error")
                        logger.error(f"Task error: {error_msg}")
                        raise HTTPException(status_code=500, detail=f"Task error: {error_msg}")
                    
                    await asyncio.sleep(1)
                    attempts += 1
                    
                except httpx.TimeoutException as e:
                    logger.error(f"Timeout while checking status: {str(e)}")
                    attempts += 1
                    await asyncio.sleep(1)
                    continue
                except Exception as e:
                    logger.error(f"Error checking status: {str(e)}")
                    raise
            
            logger.error("Task timed out")
            raise HTTPException(status_code=408, detail="Task timed out after 90 seconds")
            
        except httpx.TimeoutException as e:
            logger.error(f"Timeout while connecting to ComfyUI API: {str(e)}")
            raise HTTPException(
                status_code=504,
                detail="Timeout while connecting to ComfyUI API. Please try again."
            )
        except httpx.ConnectError as e:
            logger.error(f"Connection error to ComfyUI API: {str(e)}")
            raise HTTPException(
                status_code=503,
                detail="Could not connect to ComfyUI API. Please try again later."
            )
        except Exception as e:
            logger.error(f"Unexpected error in ComfyUI workflow: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error in ComfyUI workflow: {str(e)}"
            )

@comfyui_router.post("/")
async def process_with_comfyui(file: UploadFile = File("test")):
    try:
        # Read the uploaded file into memory
        contents = await file.read()
        image = Image.open(BytesIO(contents))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Convert to PNG bytes
        image_bytes_io = BytesIO()
        image.save(image_bytes_io, format="PNG")
        image_bytes = image_bytes_io.getvalue()

        logger.info("Processing image with ComfyUI...")
        output_url = await handle_comfyui(image_bytes)
        
        # Download the image from the URL with auth token
        headers = {
            "Authorization": f"Bearer {os.getenv('COMFY_UI_API_KEY')}"
        }
        response = requests.get(output_url, headers=headers)
        if response.status_code != 200:
            logger.error(f"Failed to download image. Status: {response.status_code}, Response: {response.text}")
            raise Exception(f"Failed to download image from ComfyUI: {response.status_code}")
            
        # Convert the downloaded image to base64
        output_image = Image.open(BytesIO(response.content))
        output_bytes_io = BytesIO()
        output_image.save(output_bytes_io, format="PNG")
        output_base64 = base64.b64encode(output_bytes_io.getvalue()).decode("utf-8")
        
        return JSONResponse(
            content={
                "message": "Photo processed successfully",
                "original": BASE64_PREAMBLE + base64.b64encode(image_bytes).decode("utf-8"),
                "result": BASE64_PREAMBLE + output_base64
            },
            status_code=200
        )
    except Exception as e:
        logger.error(f"Error details: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing photo: {str(e)}"
        ) 