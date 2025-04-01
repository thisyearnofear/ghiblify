import asyncio
import logging
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = os.getenv('API_URL', 'http://localhost:8000')

async def process_celo_events():
    """Background task to process CELO payment events."""
    while True:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{API_URL}/api/celo/process-pending-events")
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"[CELO] Processed {data['processed_events']} events from block {data['from_block']} to {data['to_block']}")
                else:
                    logger.error(f"[CELO] Error processing events: {response.text}")
        except Exception as e:
            logger.error(f"[CELO] Background task error: {str(e)}")
        
        # Wait for 30 seconds before next check
        await asyncio.sleep(30)

async def start_background_tasks():
    """Start all background tasks."""
    asyncio.create_task(process_celo_events()) 