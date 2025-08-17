import React from 'react';
import { Box, Text, Button, Alert, AlertIcon, AlertTitle, AlertDescription, keyframes } from '@chakra-ui/react';

const sparkle = keyframes`
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.1) rotate(180deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

class ImageReadyBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('ImageReadyBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          status="info"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          borderRadius="md"
          bg="blue.50"
          borderColor="blue.200"
          borderWidth="1px"
          animation={`${fadeIn} 0.5s ease-out`}
        >
          <Box 
            fontSize="40px" 
            mb={2}
            animation={`${sparkle} 2s ease-in-out infinite`}
          >
            ✨
          </Box>
          <AlertTitle mt={2} mb={1} fontSize="lg" color="blue.700">
            Your Ghibli is Ready!
          </AlertTitle>
          <AlertDescription maxWidth="sm" color="blue.600">
            Your magical transformation is complete. Sometimes images need a moment to fully render.
          </AlertDescription>
          <Button
            mt={4}
            size="md"
            colorScheme="blue"
            leftIcon={<span>🎨</span>}
            onClick={() => {
              this.setState({ hasError: false, error: null });
              // Optionally call a callback to retry the operation
              if (this.props.onRetry) {
                this.props.onRetry();
              }
            }}
          >
            View My Image
          </Button>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default ImageReadyBoundary;
