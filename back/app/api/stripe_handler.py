from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import stripe
import os
from dotenv import load_dotenv
import logging
from typing import Optional
from ..services.redis_service import redis_service
from .admin_credit_manager import admin_credit_manager

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
        address = request.headers.get('X-Wallet-Address')
        if not address:
            raise HTTPException(status_code=401, detail="Wallet address required")

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
        raise HTTPException(status_code=500, detail=str(e)) from e

@stripe_router.get("/purchase-history")
async def get_purchase_history(request: Request):
    """Get purchase history for a customer"""
    try:
        address = request.headers.get('X-Wallet-Address')
        if not address:
            raise HTTPException(status_code=401, detail="Wallet address required")

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
        customer_id = redis_service.get(f'stripe_customer:{address.lower()}')
        return customer_id
    except:
        return None

def set_customer_id_for_address(address: str, customer_id: str):
    """Store Stripe customer ID for web3 address"""
    redis_service.set(f'stripe_customer:{address.lower()}', customer_id)


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
            
            # Initialize variables for later use
            actual_credits = 0
            
            try:
                # Check if credits were already added (idempotency)
                session_key = f'credited:session:{session.id}'
                if redis_service.get(session_key):
                    logger.info(f"[Stripe] Credits already added for session {session.id}")
                    return JSONResponse(content={"status": "already_credited"})

                # Add credits using AdminCreditManager
                result = admin_credit_manager.admin_add_credits(
                    wallet_address,
                    int(credits),
                    "Stripe Payment"
                )

                # Mark session as processed
                redis_service.set(session_key, '1', ex=86400)  # 24h expiry

                # Use the result from AdminCreditManager
                actual_credits = result["new_balance"]
                logger.info(f"[Stripe] Successfully credited {credits} to {wallet_address}. New balance: {actual_credits}")
                
            except Exception as e:
                logger.error(f"[Stripe] Error processing credits: {str(e)}")
                return JSONResponse(status_code=500, content={"status": "error", "reason": "processing_error"})
            
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
            
            return JSONResponse(content={
                "status": "completed",
                "credits_added": int(credits),
                "new_total": actual_credits
            })
                
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
         if redis_service.get(credit_key):
             logger.info(f"[Stripe] Credits already added for session {session_id}")
             current_credits = admin_credit_manager.admin_get_credits(address)["credits"]
             return JSONResponse(content={
                 "status": "success",
                 "credits": current_credits,
                 "message": "Credits already added"
             })

         # Retrieve the session with improved error handling
         try:
             session = stripe.checkout.Session.retrieve(session_id)
         except stripe.error.InvalidRequestError as e:
             # Handle 404 for non-existent sessions
             if "resource_missing" in str(e):
                 logger.warning(f"[Stripe] Session not found: {session_id}")
                 raise HTTPException(status_code=404, detail="Payment session not found. Session may have expired or been deleted.")
             elif "No such checkout session" in str(e):
                 logger.warning(f"[Stripe] Invalid session ID: {session_id}")
                 raise HTTPException(status_code=404, detail="Invalid payment session ID.")
             else:
                 logger.error(f"[Stripe] Invalid request: {str(e)}")
                 raise HTTPException(status_code=400, detail=f"Invalid payment session: {str(e)}")
         
         logger.info(f"[Stripe] Session status: {session.status}")

         if session.payment_status == 'paid':
             try:
                 # Get metadata from the session
                 metadata = session.metadata
                 credits = metadata.get('credits')

                 if not credits:
                     logger.error(f"[Stripe] No credits found in metadata for session {session_id}")
                     raise HTTPException(status_code=400, detail="No credits specified in session")

                 # Add credits using AdminCreditManager
                 result = admin_credit_manager.admin_add_credits(
                     address,
                     int(credits),
                     "Stripe Payment"
                 )

                 # Mark session as credited
                 redis_service.set(credit_key, '1', ex=86400)  # 24h expiry

                 logger.info(f"[Stripe] Added {credits} credits to {address}. New balance: {result['new_balance']}")

                 return JSONResponse(content={
                     "status": "success",
                     "credits": result["new_balance"]
                 })

             except HTTPException:
                 raise
             except Exception as e:
                 logger.error(f"[Stripe] Error processing credits: {str(e)}")
                 raise HTTPException(status_code=500, detail=f"Failed to process payment credits: {str(e)}")

         return JSONResponse(content={"status": session.payment_status})

     except HTTPException:
         raise
     except stripe.error.CardError as e:
         logger.error(f"[Stripe] Card error: {str(e)}")
         raise HTTPException(status_code=402, detail="Card was declined. Please check your payment details and try again.")
     except stripe.error.RateLimitError as e:
         logger.error(f"[Stripe] Rate limit error: {str(e)}")
         raise HTTPException(status_code=429, detail="Too many requests. Please try again in a moment.")
     except stripe.error.AuthenticationError as e:
         logger.error(f"[Stripe] Authentication error: {str(e)}")
         raise HTTPException(status_code=401, detail="Stripe authentication failed. Please try again.")
     except stripe.error.APIConnectionError as e:
         logger.error(f"[Stripe] Connection error: {str(e)}")
         raise HTTPException(status_code=503, detail="Unable to reach payment provider. Please try again later.")
     except stripe.error.StripeError as e:
         logger.error(f"[Stripe] API Error: {str(e)}")
         raise HTTPException(status_code=400, detail=f"Payment processing error: {str(e)}")
     except Exception as e:
         logger.error(f"[Stripe] Unexpected error: {str(e)}")
         raise HTTPException(status_code=500, detail=f"Unexpected error checking payment status: {str(e)}")

@stripe_router.post("/create-checkout-session/{tier}")
async def create_checkout_session(tier: str, request: Request):
     """Create a Stripe checkout session"""
     from .stripe_config import STRIPE_PRICE_IDS, PRICE_CREDITS
     
     try:
         # Get request body
         body = await request.json()
         wallet_address = body.get('wallet_address')
         
         if not wallet_address:
             raise HTTPException(status_code=400, detail="Wallet address is required")
             
         # Validate tier parameter
         if tier not in STRIPE_PRICE_IDS:
             available_tiers = ", ".join(STRIPE_PRICE_IDS.keys())
             raise HTTPException(status_code=400, detail=f"Invalid tier: {tier}. Available tiers: {available_tiers}")
             
         logger.info(f"[Stripe] Creating checkout session for {wallet_address}, tier={tier}")
         
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
             
             logger.info(f"[Stripe] Created checkout session {checkout_session.id}")
             
             return JSONResponse(content={
                 "url": checkout_session.url,
                 "session_id": checkout_session.id
             })
         
         except stripe.error.CardError as e:
             logger.error(f"[Stripe] Card error: {str(e)}")
             raise HTTPException(status_code=402, detail="Card error: Please verify your payment method.")
         except stripe.error.RateLimitError:
             logger.error("[Stripe] Rate limit reached")
             raise HTTPException(status_code=429, detail="Too many requests. Please try again in a moment.")
         except stripe.error.AuthenticationError:
             logger.error("[Stripe] Authentication error")
             raise HTTPException(status_code=401, detail="Stripe authentication failed.")
         except stripe.error.APIConnectionError:
             logger.error("[Stripe] Connection error")
             raise HTTPException(status_code=503, detail="Unable to reach payment provider. Please try again later.")
         except stripe.error.StripeError as e:
             logger.error(f"[Stripe] Stripe API error: {str(e)}")
             raise HTTPException(status_code=400, detail=f"Payment processing error: {str(e)}")
             
     except HTTPException:
         raise
     except ValueError as e:
         logger.error(f"[Stripe] Invalid request data: {str(e)}")
         raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
     except Exception as e:
         logger.error(f"[Stripe] Unexpected error creating checkout session: {str(e)}")
         raise HTTPException(status_code=500, detail=f"Failed to create payment session: {str(e)}")

@stripe_router.post("/link-customer")
async def link_customer_to_wallet(wallet_address: str, customer_id: str):
    """Manually link a wallet address to a Stripe customer ID"""
    try:
        # Verify the customer exists in Stripe
        customer = stripe.Customer.retrieve(customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found in Stripe")
            
        # Store the customer ID in Redis
        redis_service.set(f'stripe_customer:{wallet_address.lower()}', customer_id)
        logger.info(f"[Stripe] Linked customer {customer_id} to wallet {wallet_address}")
        
        return JSONResponse(content={
            "status": "success",
            "wallet_address": wallet_address.lower(),
            "customer_id": customer_id
        })
    except Exception as e:
        logger.error(f"[Stripe] Error linking customer: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
