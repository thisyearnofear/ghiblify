"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  VStack,
  Image,
  Button,
  Text,
  useToast,
  Spinner,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMarkLabel,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { ShareIcon } from "@chakra-ui/icons";
import FrameSDK from "@farcaster/frame-sdk";

export default function FramePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [promptStrength, setPromptStrength] = useState(5.5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        console.log("Frame context:", context);

        // Set up primary button
        await FrameSDK.actions.setPrimaryButton({
          text: "Transform Photo",
          disabled: !uploadedImage,
        });

        // Listen for button clicks
        FrameSDK.on("primaryButtonClicked", async () => {
          if (!uploadedImage) return;

          try {
            setIsLoading(true);
            // Call your backend API here
            const response = await fetch("/api/transform", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: uploadedImage,
                promptStrength: promptStrength,
              }),
            });

            const data = await response.json();
            setImage(data.imageUrl);

            toast({
              title: "Success!",
              description: "Your photo has been transformed",
              status: "success",
              duration: 3000,
            });
          } catch (error) {
            console.error("Error:", error);
            toast({
              title: "Error",
              description: "Failed to transform photo",
              status: "error",
              duration: 3000,
            });
          } finally {
            setIsLoading(false);
          }
        });

        // Tell the frame we're ready
        await FrameSDK.actions.ready();
      } catch (error) {
        console.error("Frame initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Cleanup
    return () => {
      FrameSDK.removeAllListeners();
    };
  }, [uploadedImage]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setImage(null);
        // Update primary button state
        FrameSDK.actions.setPrimaryButton({
          text: "Transform Photo",
          disabled: false,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async () => {
    if (!image) return;

    try {
      await FrameSDK.actions.openUrl({
        url: `https://warpcast.com/~/compose?text=Check out my Ghiblified photo!&embeds[]=${encodeURIComponent(
          image
        )}`,
        close: true,
      });
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Error",
        description: "Failed to share photo",
        status: "error",
        duration: 3000,
      });
    }
  };

  return (
    <Box p={4} maxW="424px" mx="auto" minH="695px" bg="white">
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
          Ghiblify
        </Text>

        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minH="400px"
          >
            <Spinner size="xl" />
          </Box>
        ) : image ? (
          <Box position="relative">
            <Image
              src={image}
              alt="Transformed photo"
              borderRadius="lg"
              objectFit="cover"
              maxH="400px"
            />
            <IconButton
              aria-label="Share"
              icon={<ShareIcon />}
              position="absolute"
              top={2}
              right={2}
              colorScheme="blue"
              onClick={handleShare}
              size="sm"
            />
          </Box>
        ) : (
          <Box
            borderWidth={2}
            borderStyle="dashed"
            borderColor="gray.300"
            borderRadius="lg"
            p={8}
            textAlign="center"
            minH="400px"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
              ref={fileInputRef}
            />
            <Button
              colorScheme="blue"
              onClick={() => fileInputRef.current?.click()}
              mb={4}
            >
              Upload Photo
            </Button>
            <Text fontSize="sm" color="gray.500">
              Your photo will be transformed into Studio Ghibli style art
            </Text>
          </Box>
        )}

        {uploadedImage && !image && (
          <Box>
            <Text mb={2}>Prompt Strength: {promptStrength.toFixed(2)}</Text>
            <Slider
              value={promptStrength}
              onChange={setPromptStrength}
              min={0}
              max={10}
              step={0.1}
              colorScheme="blue"
            >
              <SliderMarkLabel value={0}>Less Ghibli</SliderMarkLabel>
              <SliderMarkLabel value={10}>More Ghibli</SliderMarkLabel>
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
