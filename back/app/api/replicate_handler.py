from fastapi import APIRouter, File, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from PIL import Image
import replicate
import traceback
import requests
import logging
import os
from dotenv import load_dotenv
import httpx
from .web3_auth import get_credits, set_credits

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure timeouts
TIMEOUT = httpx.Timeout(60.0, connect=60.0)
httpx.Client(timeout=TIMEOUT)

# Configure Replicate
replicate_token = os.getenv("REPLICATE_API_TOKEN")
if replicate_token:
    os.environ["REPLICATE_API_TOKEN"] = replicate_token
else:
    print("⚠️  REPLICATE_API_TOKEN not found - Replicate features will be disabled")
    # Set a dummy token to prevent crashes
    os.environ["REPLICATE_API_TOKEN"] = "dummy_token_for_development"

BASE64_PREAMBLE = "data:image/png;base64,"
REPLICATE_MODEL = "grabielairu/ghibli:4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253"

replicate_router = APIRouter()

@replicate_router.post("/")
async def process_with_replicate(file: UploadFile = File("test"), address: str = None, request: Request = None):
    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    # Validate user has sufficient credits
    current_credits = get_credits(address.lower())
    if current_credits < 1:
        raise HTTPException(status_code=402, detail="You need credits to create magical art ✨ Add credits to continue transforming your images!")

    try:
        # Read the uploaded file into memory
        contents = await file.read()
        image = Image.open(BytesIO(contents))

        # Convert image to base64 for API
        image_bytes_io = BytesIO()
        image.save(image_bytes_io, format=image.format)
        image_bytes = image_bytes_io.getvalue()
        base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

        logger.info("Processing image with Replicate...")
        
        # Run the model with all necessary parameters
        output = replicate.run(
            REPLICATE_MODEL,
            input={
                "prompt": "Ghibli style, family friendly, wholesome, clean, safe for work",
                "image": f"data:image/png;base64,{base64_encoded}",
                "num_outputs": 1,
                "width": 1024,
                "height": 1024,
                "num_inference_steps": 50,
                "guidance_scale": 7.5,
                "prompt_strength": 0.8,
                "refine": "expert_ensemble_refiner",
                "high_noise_frac": 0.8,
                "negative_prompt": "nsfw, nudity, adult content, inappropriate, unsafe for work, violence, gore, disturbing content"
            }
        )
        
        if not output:
            raise Exception("No output received from Replicate")
            
        # The output is a list of URLs, get the first one
        output_url = output[0]
        logger.info(f"Replicate output URL: {output_url}")
            
        # Download the generated image with authentication
        headers = {
            "Authorization": f"Token {os.getenv('REPLICATE_API_TOKEN')}"
        }
        response = requests.get(output_url, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Failed to download image from Replicate: {response.status_code}")
            
        # Convert the downloaded image to base64
        output_image = Image.open(BytesIO(response.content))
        output_bytes_io = BytesIO()
        output_image.save(output_bytes_io, format="PNG")
        output_base64 = base64.b64encode(output_bytes_io.getvalue()).decode("utf-8")
        
        # Validate the result is a proper string URL
        result_url = BASE64_PREAMBLE + output_base64
        if not isinstance(result_url, str):
            raise HTTPException(status_code=500, detail="Non-string URL returned from processing")
        
        return JSONResponse(
            content={
                "message": "Photo processed successfully",
                "original": BASE64_PREAMBLE + base64_encoded,
                "result": result_url,
                "url": result_url,  # Add url field for consistency with ComfyUI
                "task_id": None  # Add task_id field for consistency
            },
            status_code=200
        )
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error details: {error_str}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        # Refund credit since processing failed
        # Note: Frontend already deducted the credit, so we need to add it back
        try:
            current_credits = get_credits(address.lower())
            set_credits(address.lower(), current_credits + 1)
            logger.info(f"Refunded 1 credit to {address} due to processing failure. New balance: {current_credits + 1}")
        except Exception as refund_error:
            logger.error(f"Failed to refund credit to {address}: {str(refund_error)}")
            # Don't fail the main error response due to refund issues

        # Provide user-friendly error messages
        user_message = "We're experiencing high demand right now. Your credit has been refunded and you can try again in a few moments."

        # Check for specific error types to provide more targeted messages
        if "CUDA out of memory" in error_str or "out of memory" in error_str.lower():
            user_message = "Our servers are currently at capacity. Your credit has been refunded - please try again in a few minutes."
        elif "timeout" in error_str.lower() or "timed out" in error_str.lower():
            user_message = "The request took too long to process. Your credit has been refunded - please try again."
        elif "network" in error_str.lower() or "connection" in error_str.lower():
            user_message = "We're having connectivity issues. Your credit has been refunded - please try again shortly."
        elif "rate limit" in error_str.lower() or "quota" in error_str.lower():
            user_message = "We've hit our processing limit. Your credit has been refunded - please try again in a few minutes."
        elif "invalid" in error_str.lower() and "image" in error_str.lower():
            user_message = "There was an issue with your image format. Your credit has been refunded - please try uploading a different image."

        raise HTTPException(
            status_code=500,
            detail=user_message
        )