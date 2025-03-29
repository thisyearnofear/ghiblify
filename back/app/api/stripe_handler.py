from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from .web3_auth import get_credits, set_credits, redis_client

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
            return_url=os.getenv('PORTAL_RETURN_URL', 'https://ghiblify-it.vercel.app/account'),
            # Add configuration for better UX
            configuration=stripe.billing_portal.Configuration.create(
                features={
                    'customer_update': {
                        'enabled': True,
                        'allowed_updates': ['email']
                    },
                    'invoice_history': {'enabled': True},
                    'payment_method_update': {'enabled': True}
                },
                business_profile={
                    'headline': 'Ghiblify Credits Management'
                }
            )
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
            logger.error("[Stripe] No signature provided in webhook")
            raise HTTPException(status_code=400, detail="No signature provided")
            
        # Get the raw request body
        body = await request.body()
        logger.info(f"[Stripe] Received webhook with signature: {signature[:10]}...")
        
        try:
            # Verify the event
            event = stripe.Webhook.construct_event(
                body,
                signature,
                STRIPE_WEBHOOK_SECRET
            )
            logger.info(f"[Stripe] Webhook event type: {event.type}")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"[Stripe] Invalid signature: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid signature")
            
        # Handle the event
        if event.type == 'checkout.session.completed':
            session = event.data.object
            metadata = session.metadata or {}
            
            # Extract tier and credits information
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            wallet_address = metadata.get('wallet_address')
            
            logger.info(f"[Stripe] Processing session {session.id} for wallet {wallet_address}")
            logger.info(f"[Stripe] Details: tier={tier}, credits={credits}")
            
            if not all([tier, credits, wallet_address]):
                logger.error(f"[Stripe] Missing metadata: tier={tier}, credits={credits}, wallet={wallet_address}")
                raise HTTPException(status_code=400, detail="Missing required metadata")
            
            try:
                # Use Redis transaction to ensure atomicity
                with redis_client.pipeline() as pipe:
                    while True:
                        try:
                            # Watch the credit key for changes
                            credit_key = f'credits:{wallet_address.lower()}'
                            pipe.watch(credit_key)
                            
                            # Check if credits were already added
                            session_key = f'credited:session:{session.id}'
                            if redis_client.get(session_key):
                                logger.info(f"[Stripe] Credits already added for session {session.id}")
                                return JSONResponse(content={"status": "already_credited"})
                            
                            # Get current credits atomically
                            current_credits = int(pipe.get(credit_key) or 0)
                            new_credits = current_credits + int(credits)
                            
                            # Start transaction
                            pipe.multi()
                            
                            # Update credits and mark session as processed
                            pipe.set(credit_key, new_credits)
                            pipe.set(session_key, '1', ex=86400)  # 24h expiry
                            
                            # Execute transaction
                            pipe.execute()
                            
                            # Verify the update
                            actual_credits = get_credits(wallet_address)
                            if actual_credits != new_credits:
                                raise Exception(f"Credit verification failed: expected {new_credits}, got {actual_credits}")
                            
                            logger.info(f"[Stripe] Successfully credited {credits} to {wallet_address}. New balance: {actual_credits}")
                            break
                            
                        except redis_client.WatchError:
                            logger.warning(f"[Stripe] Concurrent modification detected for {wallet_address}, retrying...")
                            continue
                
                # Store customer ID if needed
                if session.customer and not get_customer_id_from_address(wallet_address):
                    set_customer_id_for_address(wallet_address, session.customer)
                    logger.info(f"[Stripe] Stored customer ID {session.customer} for {wallet_address}")
                    
            except Exception as e:
                logger.error(f"[Stripe] Error processing credits for {wallet_address}: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
                
        elif event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            metadata = payment_intent.metadata or {}
            
            # Extract tier and credits information
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            wallet_address = metadata.get('wallet_address')
            
            logger.info(f"Payment succeeded: intent={payment_intent.id}, tier={tier}, credits={credits}, wallet={wallet_address}")
            
            if tier and credits and wallet_address:
                try:
                    # Verify credits haven't already been added from checkout.session.completed
                    credit_key = f'credited:{payment_intent.id}'
                    if not redis_client.get(credit_key):
                        current_credits = get_credits(wallet_address)
                        new_credits = current_credits + int(credits)
                        set_credits(wallet_address, new_credits)
                        
                        # Mark these credits as added
                        redis_client.set(credit_key, '1', ex=86400)  # Expire after 24 hours
                        
                        logger.info(f"Successfully credited wallet {wallet_address}: {current_credits} + {credits} = {new_credits}")
                    else:
                        logger.info(f"Credits already added for payment {payment_intent.id}")
                except Exception as e:
                    logger.error(f"Error crediting wallet {wallet_address}: {str(e)}")
                    raise
            else:
                logger.error(f"Missing required metadata: tier={tier}, credits={credits}, wallet={wallet_address}")
                
        elif event.type == 'payment_intent.payment_failed':
            payment_intent = event.data.object
            error_message = payment_intent.get('last_payment_error', {}).get('message')
            logger.error(f"Payment failed: {error_message}")
            
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@stripe_router.get("/session/{session_id}")
async def check_session_status(session_id: str, address: str):
    """Check session status and handle credit updates"""
    try:
        logger.info(f"[Stripe] Checking session {session_id} for {address}")
        
        # Check if credits were already added for this session
        credit_key = f'credited:session:{session_id}'
        if redis_client.get(credit_key):
            logger.info(f"[Stripe] Credits already added for session {session_id}")
            current_credits = get_credits(address)
            return JSONResponse(content={
                "status": "success",
                "credits": current_credits,
                "message": "Credits already added"
            })
        
        # Retrieve the session
        session = stripe.checkout.Session.retrieve(session_id)
        logger.info(f"[Stripe] Session status: {session.status}")
        
        if session.payment_status == 'paid':
            try:
                # Get metadata from the session
                metadata = session.metadata
                credits = metadata.get('credits')
                
                if not credits:
                    logger.error(f"[Stripe] No credits found in metadata for session {session_id}")
                    raise HTTPException(status_code=400, detail="No credits specified in session")
                
                # Add credits to the wallet
                current_credits = get_credits(address)
                new_credits = current_credits + int(credits)
                set_credits(address, new_credits)
                
                # Mark session as credited
                redis_client.set(credit_key, '1', ex=86400)  # 24h expiry
                
                logger.info(f"[Stripe] Added {credits} credits to {address}. New balance: {new_credits}")
                
                return JSONResponse(content={
                    "status": "success",
                    "credits": new_credits
                })
                
            except Exception as e:
                logger.error(f"[Stripe] Error processing credits: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))
        
        return JSONResponse(content={"status": session.payment_status})
        
    except stripe.error.StripeError as e:
        logger.error(f"[Stripe] API Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[Stripe] Unexpected error: {str(e)}")
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