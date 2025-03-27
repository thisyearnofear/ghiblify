from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import shutil
import base64
from io import BytesIO
import os
from PIL import Image
from fastapi.middleware.cors import CORSMiddleware
import replicate
from dotenv import load_dotenv
import traceback
import requests
from app.api.ghiblify import router as ghiblify_router

# Load environment variables
load_dotenv()

# Get API key
replicate_api_key = os.getenv('REPLICATE_API_TOKEN')
print(f"Replicate API Key loaded: {replicate_api_key[:8]}...")
print(f"Replicate API Key length: {len(replicate_api_key) if replicate_api_key else 0}")

# Initialize API
os.environ["REPLICATE_API_TOKEN"] = replicate_api_key
print("Replicate API token set in environment")

BASE64_PREAMBLE = "data:image/png;base64,"
REPLICATE_MODEL = "grabielairu/ghibli:4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253"

app = FastAPI()

UPLOAD_FOLDER = os.path.abspath("initial_photos")
app.mount("/initial_photos", StaticFiles(directory=UPLOAD_FOLDER), name="initial_photos")

app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"]
)

# Include the Ghiblify router
app.include_router(ghiblify_router)

def b64_to_pil(b64_str):
    return Image.open(BytesIO(base64.b64decode(b64_str.replace(BASE64_PREAMBLE, ""))))

@app.get("/")
async def home():
    return {"message": "hello!"}

@app.post("/upload_photo")
async def upload_photo(file: UploadFile = File("test")):
    try:
        # Save the uploaded file
        with open(os.path.join(UPLOAD_FOLDER, file.filename), "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        image = Image.open(filepath)

        # Convert image to base64 for Replicate API
        image_bytes_io = BytesIO()
        image.save(image_bytes_io, format=image.format)
        image_bytes = image_bytes_io.getvalue()
        base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

        print("Sending request to Replicate...")
        output = replicate.run(
            REPLICATE_MODEL,
            input={
                "prompt": "Ghibli style",
                "image": f"data:image/png;base64,{base64_encoded}",  # Add data URI prefix
                "num_outputs": 1,
                "width": 1024,
                "height": 1024,
                "num_inference_steps": 50,
                "guidance_scale": 7.5,
                "prompt_strength": 0.6,
                "refine": "expert_ensemble_refiner",
                "high_noise_frac": 0.8
            }
        )

        if not output:
            raise Exception("No output received from Replicate")

        # The output is a list of URLs, get the first one
        output_url = output[0]
        
        # Download the image from the URL
        response = requests.get(output_url)
        if response.status_code != 200:
            raise Exception(f"Failed to download image from Replicate: {response.status_code}")
            
        # Convert the downloaded image to base64
        output_image = Image.open(BytesIO(response.content))
        output_bytes_io = BytesIO()
        output_image.save(output_bytes_io, format="PNG")
        output_base64 = base64.b64encode(output_bytes_io.getvalue()).decode("utf-8")
        
        # Save the result
        output_image.save(filepath)
        
        return JSONResponse(
            content={
                "message": "Photo processed successfully",
                "result": BASE64_PREAMBLE + output_base64
            },
            status_code=200
        )
    except Exception as e:
        print(f"Error details: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            content={
                "message": f"Error processing photo: {str(e)}",
                "traceback": traceback.format_exc()
            }, 
            status_code=500
        )

@app.get("/get_photo/{photo_name}")
async def get_photo(photo_name: str):
    photo_path = os.path.join(UPLOAD_FOLDER, photo_name)
    if os.path.exists(photo_path):
        return FileResponse(photo_path)
    return JSONResponse(content={"message": "Photo not found"}, status_code=404)
