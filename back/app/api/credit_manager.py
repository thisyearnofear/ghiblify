"""
Unified Credit Management System
Provides consistent credit handling across all image processing APIs (ComfyUI, Replicate, etc.)
"""

import logging
from typing import Tuple
from fastapi import HTTPException
from .web3_auth import get_credits, set_credits

logger = logging.getLogger(__name__)

class CreditManager:
    """Unified credit management for all image processing APIs"""
    
    @staticmethod
    def validate_and_spend_credit(address: str, api_name: str = "API") -> int:
        """
        Validates user has sufficient credits and spends 1 credit.
        Returns the new credit balance after spending.
        
        Args:
            address: User's wallet address (will be normalized to lowercase)
            api_name: Name of the API for logging purposes
            
        Returns:
            int: New credit balance after spending
            
        Raises:
            HTTPException: If user has insufficient credits
        """
        normalized_address = address.lower()
        
        # Check current credits
        current_credits = get_credits(normalized_address)
        logger.info(f"[{api_name}] Credit check for {normalized_address}: {current_credits} credits available")
        
        if current_credits < 1:
            logger.warning(f"[{api_name}] Insufficient credits for {normalized_address}: {current_credits} < 1")
            raise HTTPException(
                status_code=402, 
                detail="You need credits to create magical art ✨ Add credits to continue transforming your images!"
            )
        
        # Spend the credit
        new_balance = current_credits - 1
        set_credits(normalized_address, new_balance)
        logger.info(f"[{api_name}] Spent 1 credit for {normalized_address}. New balance: {new_balance}")
        
        return new_balance
    
    @staticmethod
    def refund_credit(address: str, api_name: str = "API") -> int:
        """
        Refunds 1 credit to the user (typically called when processing fails).
        
        Args:
            address: User's wallet address (will be normalized to lowercase)
            api_name: Name of the API for logging purposes
            
        Returns:
            int: New credit balance after refund
        """
        normalized_address = address.lower()
        
        try:
            current_credits = get_credits(normalized_address)
            new_balance = current_credits + 1
            set_credits(normalized_address, new_balance)
            logger.info(f"[{api_name}] Refunded 1 credit to {normalized_address} due to processing failure. New balance: {new_balance}")
            return new_balance
        except Exception as refund_error:
            logger.error(f"[{api_name}] Failed to refund credit to {normalized_address}: {str(refund_error)}")
            # Don't fail the main error response due to refund issues
            return get_credits(normalized_address)  # Return current balance as fallback
    
    @staticmethod
    def get_user_friendly_error_message(error_str: str, api_name: str = "API") -> str:
        """
        Converts technical error messages into user-friendly messages.
        
        Args:
            error_str: The technical error message
            api_name: Name of the API for context
            
        Returns:
            str: User-friendly error message
        """
        error_lower = error_str.lower()
        
        # Common error patterns across all APIs
        if "timeout" in error_lower or "timed out" in error_lower:
            return "The request took too long to process. Your credit has been refunded - please try again."
        elif "network" in error_lower or "connection" in error_lower:
            return "We're having connectivity issues. Your credit has been refunded - please try again shortly."
        elif "invalid" in error_lower and "image" in error_lower:
            return "There was an issue with your image format. Your credit has been refunded - please try uploading a different image."
        elif "api key" in error_lower or "unauthorized" in error_lower:
            return f"Our {api_name} service is temporarily unavailable. Your credit has been refunded - please try again later."
        
        # API-specific error patterns
        if api_name.lower() == "replicate":
            if "cuda out of memory" in error_lower or "out of memory" in error_lower:
                return "Our servers are currently at capacity. Your credit has been refunded - please try again in a few minutes."
            elif "rate limit" in error_lower or "quota" in error_lower:
                return "We've hit our processing limit. Your credit has been refunded - please try again in a few minutes."
            else:
                return "We're experiencing high demand right now. Your credit has been refunded and you can try again in a few moments."
        
        elif api_name.lower() == "comfyui":
            if "imgbb" in error_lower:
                return "There was an issue uploading your image. Your credit has been refunded - please try again."
            elif "workflow" in error_lower:
                return "Our processing pipeline is experiencing issues. Your credit has been refunded - please try again in a few minutes."
            else:
                return "We're experiencing technical difficulties. Your credit has been refunded and you can try again in a few moments."
        
        # Generic fallback
        return f"We're experiencing technical difficulties with {api_name}. Your credit has been refunded and you can try again in a few moments."

# Convenience instance for easy importing
credit_manager = CreditManager()