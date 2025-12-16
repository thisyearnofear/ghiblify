from fastapi import APIRouter, File, UploadFile, HTTPException, Request, Form
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
from .credit_manager import credit_manager
from ..services.creations_service import record_image_generation

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
async def process_with_replicate(
    file: UploadFile = File("test"),
    address: str = None,
    creation_id: str = None,
    source_artifact_id: str = None,
    prompt_strength: float = Form(0.8),
    request: Request = None,
):
    if not address:
        raise HTTPException(status_code=400, detail="Wallet address is required")

    # Validate and spend credit using unified credit manager
    credit_manager.validate_and_spend_credit(address, "Replicate")

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

        safe_prompt_strength = max(0.0, min(float(prompt_strength or 0.8), 1.0))
        
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
                "prompt_strength": safe_prompt_strength,
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

        creation = record_image_generation(
            address=address,
            provider="replicate",
            input_url=BASE64_PREAMBLE + base64_encoded,
            output_url=result_url,
            creation_id=creation_id,
            source_artifact_id=source_artifact_id,
            params={"prompt_strength": safe_prompt_strength},
        )
        
        return JSONResponse(
            content={
                "message": "Photo processed successfully",
                "original": BASE64_PREAMBLE + base64_encoded,
                "result": result_url,
                "url": result_url,  # Add url field for consistency with ComfyUI
                "task_id": None,  # Add task_id field for consistency
                "creation_id": creation.get("id"),
            },
            status_code=200
        )
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error details: {error_str}")
        logger.error(f"Traceback: {traceback.format_exc()}")

        # Refund credit and get user-friendly error message using unified credit manager
        credit_manager.refund_credit(address, "Replicate")
        user_message = credit_manager.get_user_friendly_error_message(error_str, "Replicate")

        raise HTTPException(
            status_code=500,
            detail=user_message
        )