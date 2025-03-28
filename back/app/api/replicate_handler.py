from fastapi import APIRouter, File, UploadFile, HTTPException
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

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure timeouts
TIMEOUT = httpx.Timeout(60.0, connect=60.0)
httpx.Client(timeout=TIMEOUT)

# Configure Replicate
os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_TOKEN")
if not os.environ.get("REPLICATE_API_TOKEN"):
    raise Exception("REPLICATE_API_TOKEN not found in environment")

BASE64_PREAMBLE = "data:image/png;base64,"
REPLICATE_MODEL = "grabielairu/ghibli:4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253"

replicate_router = APIRouter()

@replicate_router.post("/")
async def process_with_replicate(file: UploadFile = File("test")):
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
        
        return JSONResponse(
            content={
                "message": "Photo processed successfully",
                "original": BASE64_PREAMBLE + base64_encoded,
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