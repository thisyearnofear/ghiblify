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

        # Get checkout sessions for customer
        sessions = stripe.checkout.Session.list(
            customer=customer_id,
            limit=10,  # Limit to last 10 purchases
            expand=['data.payment_intent']  # Include payment intent data
        )

        purchases = []
        for session in sessions.data:
            if session.payment_status == 'paid':
                # Get metadata from the session
                metadata = session.metadata
                amount = session.amount_total if hasattr(session, 'amount_total') else 0

                purchases.append({
                    'id': session.id,
                    'amount': amount,
                    'created': session.created,
                    'package': metadata.get('tier', 'Unknown').capitalize(),
                    'credits': metadata.get('credits', '0')
                })

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
            return JSONResponse(status_code=400, content={"detail": "No signature provided"})
            
        # Get the raw request body
        body = await request.body()
        
        # Log webhook receipt (but not the full body for security)
        logger.info(f"[Stripe] Received webhook with signature prefix: {signature[:10]}...")
        
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
            return JSONResponse(status_code=401, content={"detail": "Invalid signature"})
        except Exception as e:
            logger.error(f"[Stripe] Error constructing event: {str(e)}")
            return JSONResponse(status_code=400, content={"detail": str(e)})
            
        # Handle the event
        if event.type == 'checkout.session.completed':
            session = event.data.object
            metadata = session.metadata or {}
            
            # Extract metadata
            tier = metadata.get('tier')
            credits = metadata.get('credits')
            wallet_address = metadata.get('wallet_address')
            
            logger.info(f"[Stripe] Processing session {session.id} for wallet {wallet_address}")
            logger.info(f"[Stripe] Details: tier={tier}, credits={credits}")
            
            if not all([tier, credits, wallet_address]):
                logger.error(f"[Stripe] Missing metadata: tier={tier}, credits={credits}, wallet={wallet_address}")
                return JSONResponse(status_code=200, content={"status": "skipped", "reason": "missing_metadata"})
            
            try:
                # Use Redis transaction to ensure atomicity
                with redis_client.pipeline() as pipe:
                    while True:
                        try:
                            # Watch the credit key for changes
                            credit_key = f'credits:{wallet_address.lower()}'
                            session_key = f'credited:session:{session.id}'
                            pipe.watch(credit_key, session_key)
                            
                            # Check if credits were already added
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
                                logger.error(f"[Stripe] Credit verification failed: expected {new_credits}, got {actual_credits}")
                                return JSONResponse(status_code=500, content={"status": "error", "reason": "verification_failed"})
                            
                            logger.info(f"[Stripe] Successfully credited {credits} to {wallet_address}. New balance: {actual_credits}")
                            break
                            
                        except redis_client.WatchError:
                            logger.warning(f"[Stripe] Concurrent modification detected for {wallet_address}, retrying...")
                            continue
                        except Exception as e:
                            logger.error(f"[Stripe] Redis error: {str(e)}")
                            return JSONResponse(status_code=500, content={"status": "error", "reason": "redis_error"})
                
                # Store customer ID if needed
                if session.customer:
                    try:
                        existing_customer = get_customer_id_from_address(wallet_address)
                        if not existing_customer:
                            set_customer_id_for_address(wallet_address, session.customer)
                            logger.info(f"[Stripe] Stored customer ID {session.customer} for {wallet_address}")
                        elif existing_customer != session.customer:
                            logger.warning(f"[Stripe] Different customer ID found for {wallet_address}: stored={existing_customer}, new={session.customer}")
                    except Exception as e:
                        logger.error(f"[Stripe] Error storing customer ID: {str(e)}")
                        # Don't fail the webhook for customer ID storage issues
                    
            except Exception as e:
                logger.error(f"[Stripe] Error processing credits for {wallet_address}: {str(e)}")
                return JSONResponse(status_code=500, content={"status": "error", "reason": "processing_error"})
                
        elif event.type == 'payment_intent.succeeded':
            payment_intent = event.data.object
            metadata = payment_intent.metadata or {}
            
            # Log the payment success but don't process credits (handled by checkout.session.completed)
            logger.info(f"[Stripe] Payment succeeded: intent={payment_intent.id}")
            return JSONResponse(content={"status": "success", "action": "logged"})
                
        elif event.type == 'payment_intent.payment_failed':
            payment_intent = event.data.object
            error_message = payment_intent.last_payment_error.message if payment_intent.last_payment_error else "Unknown error"
            logger.error(f"[Stripe] Payment failed: {error_message}")
            return JSONResponse(content={"status": "failed", "reason": error_message})
            
        elif event.type == 'customer.subscription.deleted':
            # Handle subscription cancellations if needed
            subscription = event.data.object
            logger.info(f"[Stripe] Subscription cancelled: {subscription.id}")
            return JSONResponse(content={"status": "success", "action": "logged"})
            
        else:
            # Log unknown event types but return success
            logger.info(f"[Stripe] Unhandled event type: {event.type}")
            return JSONResponse(content={"status": "success", "action": "ignored"})
        
        return JSONResponse(content={"status": "success"})
        
    except Exception as e:
        logger.error(f"[Stripe] Unexpected error in webhook: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "reason": "unexpected_error"})

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
        # First, try to get existing customer ID
        customer_id = get_customer_id_from_address(wallet_address)
        
        # If no customer exists, create one
        if not customer_id:
            logger.info(f"[Stripe] Creating new customer for wallet {wallet_address}")
            customer = stripe.Customer.create(
                metadata={
                    'wallet_address': wallet_address.lower()
                }
            )
            customer_id = customer.id
            # Store the new customer ID
            set_customer_id_for_address(wallet_address, customer_id)
            logger.info(f"[Stripe] Created and stored new customer {customer_id} for wallet {wallet_address}")
        else:
            logger.info(f"[Stripe] Using existing customer {customer_id} for wallet {wallet_address}")

        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,  # Use the customer ID
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

@stripe_router.post("/link-customer")
async def link_customer_to_wallet(wallet_address: str, customer_id: str):
    """Manually link a wallet address to a Stripe customer ID"""
    try:
        # Verify the customer exists in Stripe
        customer = stripe.Customer.retrieve(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in Stripe")
            
        # Store the customer ID in Redis
        redis_client.set(f'stripe_customer:{wallet_address.lower()}', customer_id)
        logger.info(f"[Stripe] Linked customer {customer_id} to wallet {wallet_address}")
        
        return JSONResponse(content={
            "status": "success",
            "wallet_address": wallet_address.lower(),
            "customer_id": customer_id
        })
    except Exception as e:
        logger.error(f"[Stripe] Error linking customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 