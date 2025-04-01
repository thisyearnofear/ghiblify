"""CELO payment handler and event listener."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from web3 import Web3
from web3.auto import w3
import os
from dotenv import load_dotenv
import logging
from typing import Optional, List
from .web3_auth import get_credits, set_credits, redis_client
import json
from datetime import datetime
from eth_utils import event_abi_to_log_topic

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Web3 with Celo provider
CELO_RPC_URL = os.getenv('CELO_RPC_URL')
w3 = Web3(Web3.HTTPProvider(CELO_RPC_URL))

# Create router
celo_router = APIRouter()

# Response models
class PaymentStatus(BaseModel):
    status: str
    reason: Optional[str] = None

class PurchaseHistory(BaseModel):
    purchases: List[dict]

# Contract ABI (matching the frontend)
CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "packageTier",
                "type": "string",
            }
        ],
        "name": "purchaseCredits",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "buyer",
                "type": "address",
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "packageTier",
                "type": "string",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "credits",
                "type": "uint256",
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256",
            }
        ],
        "name": "CreditsPurchased",
        "type": "event",
    },
]

# Contract address (matching the frontend)
CONTRACT_ADDRESS = Web3.to_checksum_address("0x0972CAe87506900051BC728f10338ffe35C891Ba")

# Tier mapping for contract compatibility
TIER_MAPPING = {
    "don": "unlimited"
}

# Credit packages (matching the frontend)
PACKAGES = {
    "starter": {"price": 0.5, "credits": 1},
    "pro": {"price": 4.99, "credits": 12},
    "unlimited": {"price": 9.99, "credits": 30},
}

@celo_router.get("/check-payment/{tx_hash}", response_model=PaymentStatus)
async def check_payment_status(tx_hash: str):
    """Check the status of a CELO payment transaction"""
    logger.info(f"[CELO] Checking payment status for tx: {tx_hash}")
    try:
        # Check if transaction was already processed
        processed_key = f'processed_tx:44787:{tx_hash}'
        if redis_client.get(processed_key):
            logger.info(f"[CELO] Transaction {tx_hash} already processed")
            return PaymentStatus(status="processed")

        # Get transaction receipt
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if not receipt:
            logger.info(f"[CELO] Transaction {tx_hash} pending")
            return PaymentStatus(status="pending")

        if receipt['status'] == 0:
            logger.error(f"[CELO] Transaction {tx_hash} failed")
            return PaymentStatus(status="failed")

        # Process the transaction if confirmed and not already processed
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
        
        # Get events from receipt
        purchase_events = contract.events.CreditsPurchased().process_receipt(receipt)
        
        if not purchase_events:
            logger.warning(f"[CELO] No purchase events found in tx {tx_hash}")
            return PaymentStatus(status="no_events")

        event = purchase_events[0]
        try:
            buyer = Web3.to_checksum_address(event['args']['buyer'])
            package_tier = event['args']['packageTier']
            
            # Map the package tier if needed
            mapped_tier = TIER_MAPPING.get(package_tier, package_tier)

            if mapped_tier not in PACKAGES:
                logger.error(f"[CELO] Invalid package tier: {package_tier} (mapped to: {mapped_tier})")
                return PaymentStatus(status="invalid_package")

            credits_to_add = PACKAGES[mapped_tier]['credits']

            # Use Redis transaction to ensure atomicity
            with redis_client.pipeline() as pipe:
                while True:
                    try:
                        # Watch both keys
                        credit_key = f'credits:{buyer.lower()}'
                        pipe.watch(credit_key, processed_key)

                        # Check if already processed
                        if redis_client.get(processed_key):
                            logger.info(f"[CELO] Transaction {tx_hash} already processed")
                            return PaymentStatus(status="processed")

                        # Get current credits
                        current_credits = int(pipe.get(credit_key) or 0)
                        new_credits = current_credits + credits_to_add

                        # Start transaction
                        pipe.multi()

                        # Update credits and mark as processed
                        pipe.set(credit_key, new_credits)
                        pipe.set(processed_key, '1')

                        # Store transaction in history
                        history_key = f'celo_history:{buyer.lower()}'
                        transaction_data = {
                            'tx_hash': tx_hash,
                            'package': mapped_tier,
                            'credits': credits_to_add,
                            'timestamp': datetime.now().isoformat(),
                            'price': PACKAGES[mapped_tier]['price']
                        }
                        pipe.lpush(history_key, json.dumps(transaction_data))
                        # Keep only last 50 transactions
                        pipe.ltrim(history_key, 0, 49)

                        # Execute transaction
                        pipe.execute()
                        logger.info(f"[CELO] Successfully credited {credits_to_add} to {buyer}")
                        break

                    except redis_client.WatchError:
                        logger.warning(f"[CELO] Concurrent modification detected for {buyer}, retrying...")
                        continue
                    except Exception as e:
                        logger.error(f"[CELO] Redis error: {str(e)}")
                        return PaymentStatus(status="error", reason="redis_error")

            return PaymentStatus(status="processed")

        except ValueError as ve:
            logger.error(f"[CELO] Address validation error for tx {tx_hash}: {str(ve)}")
            return PaymentStatus(status="error", reason=str(ve))

    except Exception as e:
        logger.error(f"[CELO] Error checking payment: {str(e)}")
        return PaymentStatus(status="error", reason=str(e))

@celo_router.get("/purchase-history", response_model=PurchaseHistory)
async def get_purchase_history(address: str):
    """Get the purchase history for a wallet address"""
    try:
        # Get history from Redis
        history_key = f'celo_history:{address.lower()}'
        history = redis_client.lrange(history_key, 0, -1)
        
        # Parse the history
        purchases = []
        for item in history:
            try:
                purchase = json.loads(item)
                purchases.append(purchase)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse purchase history item: {item}")
                continue
        
        return PurchaseHistory(purchases=purchases)
        
    except Exception as e:
        logger.error(f"Error fetching purchase history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@celo_router.post("/process-pending-events")
async def process_pending_events():
    """Process any pending CELO payment events"""
    try:
        # Get the last processed block
        last_block_key = 'celo_last_processed_block'
        last_processed_block = int(redis_client.get(last_block_key) or 0)

        # Get current block
        current_block = w3.eth.block_number

        # Don't process more than 1000 blocks at once
        start_block = max(last_processed_block + 1, current_block - 1000)

        # Convert contract address to checksum
        contract_address = Web3.to_checksum_address(CONTRACT_ADDRESS)
        contract = w3.eth.contract(address=contract_address, abi=CONTRACT_ABI)
        
        # Find the CreditsPurchased event ABI
        event_abi = next(abi for abi in CONTRACT_ABI if abi.get('type') == 'event' and abi.get('name') == 'CreditsPurchased')
        event_topic = event_abi_to_log_topic(event_abi)
        
        # Get all matching events
        logs = w3.eth.get_logs({
            'address': contract_address,
            'fromBlock': start_block,
            'toBlock': current_block,
            'topics': [event_topic]
        })

        processed_count = 0
        for log in logs:
            try:
                # Process the event
                event = contract.events.CreditsPurchased().process_log(log)
                tx_hash = event['transactionHash'].hex()
                
                # Check if already processed
                processed_key = f'processed_tx:44787:{tx_hash}'
                if redis_client.get(processed_key):
                    continue

                # Process the event with checksum address
                buyer = Web3.to_checksum_address(event['args']['buyer'])
                package_tier = event['args']['packageTier']
                
                # Map the package tier if needed
                mapped_tier = TIER_MAPPING.get(package_tier, package_tier)

                if mapped_tier not in PACKAGES:
                    logger.error(f"[CELO] Invalid package tier in event: {package_tier} (mapped to: {mapped_tier})")
                    continue

                credits_to_add = PACKAGES[mapped_tier]['credits']

                # Use Redis transaction to ensure atomicity
                with redis_client.pipeline() as pipe:
                    while True:
                        try:
                            credit_key = f'credits:{buyer.lower()}'
                            pipe.watch(credit_key, processed_key)

                            if redis_client.get(processed_key):
                                break

                            current_credits = int(pipe.get(credit_key) or 0)
                            new_credits = current_credits + credits_to_add

                            pipe.multi()
                            pipe.set(credit_key, new_credits)
                            pipe.set(processed_key, '1')

                            # Store in history
                            history_key = f'celo_history:{buyer.lower()}'
                            transaction_data = {
                                'tx_hash': tx_hash,
                                'package': mapped_tier,
                                'credits': credits_to_add,
                                'timestamp': datetime.now().isoformat(),
                                'price': PACKAGES[mapped_tier]['price']
                            }
                            pipe.lpush(history_key, json.dumps(transaction_data))
                            pipe.ltrim(history_key, 0, 49)

                            pipe.execute()
                            processed_count += 1
                            logger.info(f"[CELO] Processed event: credited {credits_to_add} to {buyer}")
                            break

                        except redis_client.WatchError:
                            continue
                        except Exception as e:
                            logger.error(f"[CELO] Error processing transaction {tx_hash}: {str(e)}")
                            break

            except ValueError as ve:
                logger.error(f"[CELO] Address validation error: {str(ve)}")
                continue
            except Exception as e:
                logger.error(f"[CELO] Error processing log: {str(e)}")
                continue

        # Update last processed block
        redis_client.set(last_block_key, current_block)

        return JSONResponse(content={
            "status": "success",
            "processed_events": processed_count,
            "from_block": start_block,
            "to_block": current_block
        })

    except Exception as e:
        logger.error(f"[CELO] Error processing events: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "reason": str(e)}
        )

# Export the router
__all__ = ['celo_router'] 