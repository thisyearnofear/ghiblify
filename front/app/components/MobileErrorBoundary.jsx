'use client';

import React from 'react';
import { Box, Text, Button, VStack, Alert, AlertIcon } from '@chakra-ui/react';
import { useFarcaster } from './FarcasterFrameProvider';

class MobileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Enhanced mobile error logging
    console.error('[Mobile Error Boundary] Error caught:', error);
    console.error('[Mobile Error Boundary] Error info:', errorInfo);
    
    // Log mobile-specific context
    if (typeof window !== 'undefined') {
      console.error('[Mobile Error Boundary] Mobile context:', {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        },
        isInFrame: window.parent !== window,
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          p={6}
          maxW="400px"
          mx="auto"
          mt={8}
          textAlign="center"
        >
          <VStack spacing={4}>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <Text fontSize="sm">Something went wrong in the mobile app</Text>
            </Alert>
            
            <Text fontSize="sm" color="gray.600">
              The app encountered an error. This has been logged for debugging.
            </Text>
            
            <Button
              colorScheme="blue"
              size="sm"
              onClick={this.handleRetry}
              minH="44px" // Touch-friendly size
            >
              Try Again
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Box
                mt={4}
                p={3}
                bg="gray.50"
                borderRadius="md"
                fontSize="xs"
                textAlign="left"
                maxW="100%"
                overflow="auto"
              >
                <Text fontWeight="bold" mb={2}>Debug Info:</Text>
                <Text>{this.state.error?.toString()}</Text>
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

// HOC to wrap components with mobile error boundary
export function withMobileErrorBoundary(Component) {
  return function WrappedComponent(props) {
    return (
      <MobileErrorBoundary>
        <Component {...props} />
      </MobileErrorBoundary>
    );
  };
}

export default MobileErrorBoundary;
