from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from .credits import create_session_token

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

stripe_router = APIRouter()

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
                # Create a session token with the credits
                token = create_session_token(int(credits))
                
                # Store the token with the payment intent for frontend retrieval
                payment_intent = session.get('payment_intent')
                if payment_intent:
                    stripe.PaymentIntent.modify(
                        payment_intent,
                        metadata={'session_token': token}
                    )
                
                logger.info(f"Payment completed for tier {tier} - granted {credits} credits")
                
        elif event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            metadata = payment_intent.get('metadata', {})
            
            # Extract tier and credits information
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            token = metadata.get('session_token')
            
            if tier and credits and not token:
                # Create a session token if not already created
                token = create_session_token(int(credits))
                stripe.PaymentIntent.modify(
                    payment_intent.id,
                    metadata={'session_token': token}
                )
                logger.info(f"Payment succeeded for tier {tier} - granted {credits} credits")
                
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
async def create_checkout_session(tier: str):
    """Create a Stripe checkout session"""
    from .payments import PRICING_TIERS
    
    if tier not in PRICING_TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
        
    tier_info = PRICING_TIERS[tier]
    
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"Ghiblify {tier.capitalize()} Package",
                        'description': tier_info['description'],
                    },
                    'unit_amount': int(float(tier_info['amount']) * 100),  # Convert to cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://ghiblify-it.vercel.app/success',
            cancel_url='https://ghiblify-it.vercel.app/cancel',
            metadata={
                'tier': tier,
                'credits': tier_info['credits']
            }
        )
        
        return JSONResponse(content={
            "session_id": checkout_session.id,
            "url": checkout_session.url
        })
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 