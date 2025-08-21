"""
Admin Credit Management Extension
Extends the unified CreditManager with admin-specific operations
"""

import logging
from typing import List, Dict, Any
from .credit_manager import CreditManager
from .web3_auth import get_credits, set_credits

logger = logging.getLogger(__name__)

class AdminCreditManager(CreditManager):
    """Extended credit manager with admin operations"""
    
    @staticmethod
    def admin_add_credits(address: str, amount: int, admin_context: str = "Admin") -> Dict[str, Any]:
        """
        Admin operation to add credits to a user account.
        
        Args:
            address: User's wallet address
            amount: Number of credits to add
            admin_context: Context for logging (e.g., "Stripe Payment", "Manual Admin")
            
        Returns:
            Dict with old_balance, new_balance, amount_added
        """
        normalized_address = address.lower()
        
        old_balance = get_credits(normalized_address)
        new_balance = old_balance + amount
        set_credits(normalized_address, new_balance)
        
        logger.info(f"[{admin_context}] Added {amount} credits to {normalized_address}: {old_balance} → {new_balance}")
        
        return {
            "address": normalized_address,
            "old_balance": old_balance,
            "new_balance": new_balance,
            "amount_added": amount,
            "operation": "add_credits",
            "context": admin_context
        }
    
    @staticmethod
    def admin_set_credits(address: str, amount: int, admin_context: str = "Admin") -> Dict[str, Any]:
        """
        Admin operation to set exact credit amount for a user.
        
        Args:
            address: User's wallet address
            amount: Exact number of credits to set
            admin_context: Context for logging
            
        Returns:
            Dict with old_balance, new_balance, amount_changed
        """
        normalized_address = address.lower()
        
        old_balance = get_credits(normalized_address)
        set_credits(normalized_address, amount)
        amount_changed = amount - old_balance
        
        logger.info(f"[{admin_context}] Set credits for {normalized_address}: {old_balance} → {amount} (change: {amount_changed:+d})")
        
        return {
            "address": normalized_address,
            "old_balance": old_balance,
            "new_balance": amount,
            "amount_changed": amount_changed,
            "operation": "set_credits",
            "context": admin_context
        }
    
    @staticmethod
    def admin_get_credits(address: str) -> Dict[str, Any]:
        """
        Admin operation to get credit balance with metadata.
        
        Args:
            address: User's wallet address
            
        Returns:
            Dict with address, credits, and metadata
        """
        normalized_address = address.lower()
        credits = get_credits(normalized_address)
        
        return {
            "address": normalized_address,
            "credits": credits,
            "operation": "get_credits",
            "status": "active" if credits > 0 else "empty"
        }
    
    @staticmethod
    def bulk_credit_operation(operations: List[Dict[str, Any]], admin_context: str = "Bulk Admin") -> List[Dict[str, Any]]:
        """
        Perform bulk credit operations.
        
        Args:
            operations: List of operations, each with 'address', 'operation', 'amount'
            admin_context: Context for logging
            
        Returns:
            List of operation results
        """
        results = []
        
        for op in operations:
            try:
                address = op.get('address')
                operation = op.get('operation')
                amount = op.get('amount', 0)
                
                if operation == 'add':
                    result = AdminCreditManager.admin_add_credits(address, amount, admin_context)
                elif operation == 'set':
                    result = AdminCreditManager.admin_set_credits(address, amount, admin_context)
                elif operation == 'get':
                    result = AdminCreditManager.admin_get_credits(address)
                else:
                    result = {
                        "address": address,
                        "error": f"Unknown operation: {operation}",
                        "operation": operation
                    }
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"[{admin_context}] Bulk operation failed for {op}: {str(e)}")
                results.append({
                    "address": op.get('address', 'unknown'),
                    "error": str(e),
                    "operation": op.get('operation', 'unknown')
                })
        
        logger.info(f"[{admin_context}] Completed bulk operation: {len(results)} operations processed")
        return results

# Convenience instance for easy importing
admin_credit_manager = AdminCreditManager()