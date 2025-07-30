'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Image,
  useToast,
  Icon,
  Flex,
  Progress,
  useColorModeValue
} from '@chakra-ui/react';
import { FiCamera, FiUpload, FiX } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import { useMobile, TOUCH_TARGET_SIZE } from '../hooks/useMobile';
import { RESPONSIVE_PATTERNS } from '../theme/constants';
import { 
  validateImageFile, 
  createOptimizedPreview, 
  createProgressTracker,
  getAcceptTypes 
} from '../utils/imageProcessing';

export default function MobileFileUpload({ onFileSelect, isLoading = false, maxSize = 10 * 1024 * 1024 }) {
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const toast = useToast();
  const { isMobile } = useMobile();

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  const progressTracker = createProgressTracker();

  const processFile = useCallback(async (file) => {
    if (!file) return;

    // Use shared validation utility
    const validation = validateImageFile(file, maxSize);
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({
          title: 'File validation failed',
          description: error,
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      });
      return;
    }

    try {
      progressTracker.onStart();
      setUploadProgress(0);
      
      // Create optimized preview using shared utility
      const optimizedPreview = await createOptimizedPreview(file);
      
      setPreview(optimizedPreview);
      setFileName(file.name);
      setUploadProgress(100);
      onFileSelect(file);
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: 'Error processing file',
        description: 'Please try again with a different image',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setUploadProgress(0);
    }
  }, [maxSize, onFileSelect, toast, progressTracker]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptTypes(),
    multiple: false,
    maxSize,
    disabled: isLoading
  });

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearFile = () => {
    setPreview(null);
    setFileName('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    onFileSelect(null);
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  if (preview) {
    return (
      <Box
        w="full"
        maxW="400px"
        mx="auto"
        p={4}
        bg={bgColor}
        borderRadius="xl"
        border="2px solid"
        borderColor={borderColor}
      >
        <VStack spacing={4}>
          <Box position="relative" w="full">
            <Image
              src={preview}
              alt="Selected image"
              w="full"
              h="200px"
              objectFit="cover"
              borderRadius="lg"
              loading="lazy"
            />
            <Button
              position="absolute"
              top={2}
              right={2}
              size="sm"
              colorScheme="red"
              variant="solid"
              onClick={clearFile}
              disabled={isLoading}
              minH="40px"
              minW="40px"
            >
              <Icon as={FiX} boxSize={4} />
            </Button>
          </Box>
          
          <Text fontSize="sm" color="gray.600" textAlign="center" noOfLines={2}>
            {fileName}
          </Text>

          {uploadProgress < 100 && (
            <Box w="full">
              <Progress value={uploadProgress} colorScheme="blue" borderRadius="md" />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Loading... {Math.round(uploadProgress)}%
              </Text>
            </Box>
          )}

          <Button
            onClick={clearFile}
            variant="outline"
            size="sm"
            disabled={isLoading}
            w="full"
            minH="44px"
          >
            Choose Different Image
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box w="full" maxW="400px" mx="auto">
      <VStack spacing={4}>
        {/* Drag and Drop Area */}
        <Box
          {...getRootProps()}
          w="full"
          h="200px"
          p={6}
          bg={isDragActive ? hoverBg : bgColor}
          border="2px dashed"
          borderColor={isDragActive ? 'blue.400' : borderColor}
          borderRadius="xl"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ bg: hoverBg, borderColor: 'blue.400' }}
        >
          <input {...getInputProps()} />
          <Flex
            direction="column"
            align="center"
            justify="center"
            h="full"
            textAlign="center"
          >
            <Icon as={FiUpload} boxSize={8} color="gray.400" mb={3} />
            <Text fontSize="lg" fontWeight="medium" mb={2}>
              {isDragActive ? 'Drop image here' : 'Drag & drop an image'}
            </Text>
            <Text fontSize="sm" color="gray.500">
              or tap the buttons below
            </Text>
          </Flex>
        </Box>

        {/* Mobile-Optimized Button Row */}
        <HStack spacing={3} w="full">
          <Button
            leftIcon={<Icon as={FiCamera} />}
            onClick={openCamera}
            colorScheme="blue"
            size="lg"
            flex={1}
            minH={TOUCH_TARGET_SIZE.comfortable}
            fontSize="md"
            disabled={isLoading}
          >
            Camera
          </Button>
          
          <Button
            leftIcon={<Icon as={FiUpload} />}
            onClick={openFileSelector}
            variant="outline"
            colorScheme="blue"
            size="lg"
            flex={1}
            minH={TOUCH_TARGET_SIZE.comfortable}
            fontSize="md"
            disabled={isLoading}
          >
            Gallery
          </Button>
        </HStack>

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          style={{ display: 'none' }}
          disabled={isLoading}
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {/* Helper Text */}
        <Text fontSize="xs" color="gray.500" textAlign="center" px={2}>
          Supports JPEG, PNG, WebP up to {Math.round(maxSize / 1024 / 1024)}MB
        </Text>
      </VStack>
    </Box>
  );
}