/**
 * Standardized error handling utilities
 */

// Error types for consistent handling
export const ERROR_TYPES = {
  NETWORK: "network",
  VALIDATION: "validation",
  FILE_PROCESSING: "file_processing",
  AUTHENTICATION: "authentication",
  CREDITS: "credits",
  TRANSFORMATION: "transformation",
  PAYMENT: "payment",
  USER_REJECTION: "user_rejection",
  UNKNOWN: "unknown",
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

/**
 * Creates standardized error object
 */
export function createError(
  type,
  message,
  details = {},
  severity = ERROR_SEVERITY.MEDIUM
) {
  return {
    type,
    message,
    details,
    severity,
    timestamp: new Date().toISOString(),
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
}

/**
 * Standard toast configuration for different error types
 */
export function getToastConfig(error) {
  const baseConfig = {
    duration: 4000,
    isClosable: true,
    position: "top",
  };

  const configs = {
    [ERROR_TYPES.NETWORK]: {
      ...baseConfig,
      title: "Connection Issue",
      status: "warning",
      duration: 6000,
    },
    [ERROR_TYPES.VALIDATION]: {
      ...baseConfig,
      title: "Invalid Input",
      status: "error",
      duration: 5000,
    },
    [ERROR_TYPES.FILE_PROCESSING]: {
      ...baseConfig,
      title: "File Processing Error",
      status: "error",
      duration: 5000,
    },
    [ERROR_TYPES.AUTHENTICATION]: {
      ...baseConfig,
      title: "Authentication Failed",
      status: "error",
      duration: 6000,
    },
    [ERROR_TYPES.CREDITS]: {
      ...baseConfig,
      title: "Insufficient Credits",
      status: "warning",
      duration: 8000,
    },
    [ERROR_TYPES.TRANSFORMATION]: {
      ...baseConfig,
      title: "Transformation Failed",
      status: "error",
      duration: 6000,
    },
    [ERROR_TYPES.PAYMENT]: {
      ...baseConfig,
      title: "Payment Failed",
      status: "error",
      duration: 6000,
    },
    [ERROR_TYPES.USER_REJECTION]: {
      ...baseConfig,
      title: "Transaction Cancelled",
      status: "info",
      duration: 4000,
    },
  };

  const config = configs[error.type] || {
    ...baseConfig,
    title: "Error",
    status: "error",
  };

  return {
    ...config,
    description: error.message,
  };
}

/**
 * Network error handler with retry logic
 */
export async function handleNetworkError(error, retryFn, maxRetries = 3) {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await retryFn();
    } catch (err) {
      attempts++;

      if (attempts >= maxRetries) {
        throw createError(
          ERROR_TYPES.NETWORK,
          `Network request failed after ${maxRetries} attempts: ${err.message}`,
          { originalError: err, attempts },
          ERROR_SEVERITY.HIGH
        );
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempts) * 1000)
      );
    }
  }
}

/**
 * File validation error creator
 */
export function createFileValidationError(file, issues) {
  return createError(
    ERROR_TYPES.FILE_PROCESSING,
    `File validation failed: ${issues.join(", ")}`,
    { fileName: file?.name, fileSize: file?.size, issues },
    ERROR_SEVERITY.MEDIUM
  );
}

/**
 * Credits error creator
 */
export function createCreditsError(required, available) {
  return createError(
    ERROR_TYPES.CREDITS,
    `Not enough credits. Required: ${required}, Available: ${available}`,
    { required, available },
    ERROR_SEVERITY.HIGH
  );
}

/**
 * Parses payment errors and returns user-friendly messages
 */
export function parsePaymentError(error) {
  const errorMessage = error?.message || error?.toString() || "Unknown error";

  // User rejection patterns
  if (
    errorMessage.includes("User rejected") ||
    errorMessage.includes("user rejected") ||
    errorMessage.includes("User denied") ||
    errorMessage.includes("denied by the user") ||
    errorMessage.includes("Transaction was rejected")
  ) {
    return createError(
      ERROR_TYPES.USER_REJECTION,
      "You cancelled the transaction. No charges were made.",
      { originalError: errorMessage },
      ERROR_SEVERITY.LOW
    );
  }

  // Network/connection issues
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("fetch")
  ) {
    return createError(
      ERROR_TYPES.NETWORK,
      "Connection issue. Please check your internet and try again.",
      { originalError: errorMessage },
      ERROR_SEVERITY.MEDIUM
    );
  }

  // Insufficient funds
  if (
    errorMessage.includes("insufficient funds") ||
    errorMessage.includes("insufficient balance") ||
    errorMessage.includes("not enough")
  ) {
    return createError(
      ERROR_TYPES.PAYMENT,
      "Insufficient funds in your wallet. Please add funds and try again.",
      { originalError: errorMessage },
      ERROR_SEVERITY.MEDIUM
    );
  }

  // Gas/fee issues
  if (
    errorMessage.includes("gas") ||
    errorMessage.includes("fee") ||
    errorMessage.includes("priority fee")
  ) {
    return createError(
      ERROR_TYPES.PAYMENT,
      "Transaction fee issue. Please try again with a higher gas fee.",
      { originalError: errorMessage },
      ERROR_SEVERITY.MEDIUM
    );
  }

  // Contract/approval issues
  if (
    errorMessage.includes("approve") ||
    errorMessage.includes("allowance") ||
    errorMessage.includes("contract")
  ) {
    return createError(
      ERROR_TYPES.PAYMENT,
      "Token approval failed. Please try the transaction again.",
      { originalError: errorMessage },
      ERROR_SEVERITY.MEDIUM
    );
  }

  // Generic payment error
  return createError(
    ERROR_TYPES.PAYMENT,
    "Payment failed. Please try again or contact support if the issue persists.",
    { originalError: errorMessage },
    ERROR_SEVERITY.MEDIUM
  );
}

/**
 * Logs error for debugging (can be enhanced to send to analytics)
 */
export function logError(error, context = {}) {
  const logData = {
    ...error,
    context,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
  };

  console.error("[Error Handler]", logData);

  // TODO: Send to analytics service in production
  // analytics.track('error_occurred', logData);
}

/**
 * Generic error boundary error handler
 */
export function handleComponentError(error, errorInfo, componentName) {
  const standardError = createError(
    ERROR_TYPES.UNKNOWN,
    `Component ${componentName} crashed: ${error.message}`,
    {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      componentName,
    },
    ERROR_SEVERITY.CRITICAL
  );

  logError(standardError);
  return standardError;
}
