from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from .web3_auth import get_credits, set_credits

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

stripe_router = APIRouter()

@stripe_router.post("/create-portal-session")
async def create_portal_session(request: Request):
    """Create a Stripe Customer Portal session"""
    try:
        address = request.headers.get('X-Web3-Address')
        if not address:
            raise HTTPException(status_code=401, detail="Web3 address required")

        # Get customer ID from address
        customer_id = get_customer_id_from_address(address)
        if not customer_id:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url='https://ghiblify-it.vercel.app/account',
        )

        return JSONResponse(content={"url": session.url})

    except Exception as e:
        logger.error(f"Error creating portal session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.get("/purchase-history")
async def get_purchase_history(request: Request):
    """Get purchase history for a customer"""
    try:
        address = request.headers.get('X-Web3-Address')
        if not address:
            raise HTTPException(status_code=401, detail="Web3 address required")

        # Get customer ID from address
        customer_id = get_customer_id_from_address(address)
        if not customer_id:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Get payment intents for customer
        payment_intents = stripe.PaymentIntent.list(
            customer=customer_id,
            limit=10  # Limit to last 10 purchases
        )

        purchases = [{
            'id': intent.id,
            'amount': intent.amount,
            'created': intent.created,
            'package': intent.metadata.get('tier', 'Unknown').capitalize(),
            'credits': intent.metadata.get('credits', '0')
        } for intent in payment_intents.data if intent.status == 'succeeded']

        return JSONResponse(content={"purchases": purchases})

    except Exception as e:
        logger.error(f"Error fetching purchase history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_customer_id_from_address(address: str) -> Optional[str]:
    """Get Stripe customer ID from web3 address"""
    try:
        # Get customer ID from Redis using web3 address as key
        customer_id = redis_client.get(f'stripe_customer:{address.lower()}')
        return customer_id
    except:
        return None

def set_customer_id_for_address(address: str, customer_id: str):
    """Store Stripe customer ID for web3 address"""
    redis_client.set(f'stripe_customer:{address.lower()}', customer_id)


@stripe_router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        # Get the webhook signature
        signature = request.headers.get('stripe-signature')
        if not signature:
            raise HTTPException(status_code=400, detail="No signature provided")
            
        # Get the raw request body
        body = await request.body()
        
        try:
            # Verify the event
            event = stripe.Webhook.construct_event(
                body,
                signature,
                STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=401, detail="Invalid signature")
            
        # Handle the event
        if event.type == 'checkout.session.completed':
            session = event.data.object
            metadata = session.get('metadata', {})
            
            # Extract tier and credits information
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            
            if tier and credits:
                # Get the wallet address from metadata
                wallet_address = metadata.get('wallet_address')
                if wallet_address:
                    # Add credits to the wallet address
                    current_credits = get_credits(wallet_address)
                    set_credits(wallet_address, current_credits + int(credits))
                    
                    logger.info(f"Payment completed for tier {tier} - granted {credits} credits to {wallet_address}")
                
        elif event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            metadata = payment_intent.get('metadata', {})
            
            # Extract tier and credits information
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            token = metadata.get('session_token')
            
            if tier and credits:
                # Get the wallet address from metadata
                wallet_address = metadata.get('wallet_address')
                if wallet_address:
                    # Add credits to the wallet address if not already added
                    current_credits = get_credits(wallet_address)
                    set_credits(wallet_address, current_credits + int(credits))
                    logger.info(f"Payment succeeded for tier {tier} - granted {credits} credits to {wallet_address}")
                
        elif event.type == 'payment_intent.payment_failed':
            payment_intent = event.data.object
            error_message = payment_intent.get('last_payment_error', {}).get('message')
            logger.error(f"Payment failed: {error_message}")
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.get("/session/{session_id}")
async def get_session_token(session_id: str):
    """Get the session token for a completed payment"""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        payment_intent = stripe.PaymentIntent.retrieve(session.payment_intent)
        token = payment_intent.metadata.get('session_token')
        
        if not token:
            raise HTTPException(status_code=404, detail="Session token not found")
            
        return JSONResponse(content={
            "token": token
        })
        
    except Exception as e:
        logger.error(f"Error retrieving session token: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.post("/create-checkout-session/{tier}")
async def create_checkout_session(tier: str, request: Request):
    """Create a Stripe checkout session"""
    from .stripe_config import STRIPE_PRICE_IDS, PRICE_CREDITS
    
    # Get request body
    body = await request.json()
    wallet_address = body.get('wallet_address')
    
    if not wallet_address:
        raise HTTPException(status_code=400, detail="Wallet address is required")
        
    if tier not in STRIPE_PRICE_IDS:
        raise HTTPException(status_code=400, detail="Invalid tier")
        
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': STRIPE_PRICE_IDS[tier],
                'quantity': 1
            }],
            mode='payment',
            success_url=os.getenv('SUCCESS_URL', 'https://ghiblify-it.vercel.app/success') + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=os.getenv('CANCEL_URL', 'https://ghiblify-it.vercel.app/cancel'),
            metadata={
                'tier': tier,
                'credits': str(PRICE_CREDITS[STRIPE_PRICE_IDS[tier]]),
                'wallet_address': wallet_address
            }
        )
        
        return JSONResponse(content={
            "url": checkout_session.url
        })
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 