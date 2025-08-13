// Base Account provider with error boundary and context
'use client';

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState,
  ReactNode,
  ErrorInfo
} from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  VStack,
  Box,
} from '@chakra-ui/react';
import { baseAccountAuth } from '../services/base-account-auth';
import { baseAccountPayments } from '../services/base-account-payments';
import { 
  BaseAccountUser, 
  AuthenticationStatus,
  BaseAccountError 
} from '../types/base-account';

interface BaseAccountContextType {
  // Authentication
  user: BaseAccountUser | null;
  authStatus: AuthenticationStatus;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  
  // Services
  authService: typeof baseAccountAuth;
  paymentService: typeof baseAccountPayments;
  
  // Global error state
  error: string | null;
  clearError: () => void;
}

const BaseAccountContext = createContext<BaseAccountContextType | undefined>(undefined);

interface BaseAccountProviderProps {
  children: ReactNode;
}

class BaseAccountErrorBoundary extends React.Component<
  { children: ReactNode; onError: (error: Error, errorInfo: ErrorInfo) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Base Account Error
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            {this.state.error?.message || 'An unexpected error occurred with Base Account services'}
          </AlertDescription>
          <Button
            mt={4}
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
            }}
          >
            Try Again
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export function BaseAccountProvider({ children }: BaseAccountProviderProps) {
  const [user, setUser] = useState<BaseAccountUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('idle');
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize state
    setUser(baseAccountAuth.getCurrentUser());
    setAuthStatus(baseAccountAuth.getStatus());

    // Subscribe to auth status changes
    const unsubscribe = baseAccountAuth.onStatusChange((status) => {
      setAuthStatus(status);
      
      if (status === 'authenticated') {
        setUser(baseAccountAuth.getCurrentUser());
        setGlobalError(null);
      } else if (status === 'idle') {
        setUser(null);
      } else if (status === 'error') {
        setGlobalError('Authentication failed');
      }
    });

    return unsubscribe;
  }, []);

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Base Account Error Boundary:', error, errorInfo);
    setGlobalError(`Base Account services encountered an error: ${error.message}`);
    
    // Here you could send error reports to your monitoring service
    // e.g., Sentry, LogRocket, etc.
  };

  const clearError = () => {
    setGlobalError(null);
  };

  const isAuthLoading = authStatus === 'connecting' || 
                       authStatus === 'signing' || 
                       authStatus === 'verifying';
  
  const isAuthenticated = authStatus === 'authenticated' && !!user;

  const contextValue: BaseAccountContextType = {
    user,
    authStatus,
    isAuthenticated,
    isAuthLoading,
    authService: baseAccountAuth,
    paymentService: baseAccountPayments,
    error: globalError,
    clearError,
  };

  return (
    <BaseAccountErrorBoundary onError={handleError}>
      <BaseAccountContext.Provider value={contextValue}>
        {globalError && (
          <Box p={4}>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <VStack align="start" spacing={2}>
                <AlertTitle>Base Account Error</AlertTitle>
                <AlertDescription>{globalError}</AlertDescription>
                <Button size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </VStack>
            </Alert>
          </Box>
        )}
        {children}
      </BaseAccountContext.Provider>
    </BaseAccountErrorBoundary>
  );
}

export function useBaseAccount(): BaseAccountContextType {
  const context = useContext(BaseAccountContext);
  if (context === undefined) {
    throw new Error('useBaseAccount must be used within a BaseAccountProvider');
  }
  return context;
}

export { BaseAccountContext };