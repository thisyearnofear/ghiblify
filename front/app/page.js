"use client";

import {
  Container,
  Heading,
  Text,
  Input,
  Button,
  Stack,
  Image,
  Link,
  SkeletonCircle,
  SkeletonText,
  Box,
  FormControl,
  Center,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Wrap,
  WrapItem,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormLabel,
  Switch,
  VStack,
  Radio,
  RadioGroup,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useUnifiedWallet } from "./lib/hooks/useUnifiedWallet";
import dynamic from "next/dynamic";
import CreditsDisplay from "./components/CreditsDisplay";

// Dynamically import large components to improve initial load time
const Pricing = dynamic(() => import("./components/Pricing"), {
  loading: () => (
    <Box p={4} textAlign="center">
      Loading pricing...
    </Box>
  ),
});

const FAQ = dynamic(() => import("./components/FAQ"), {
  loading: () => (
    <Box p={4} textAlign="center">
      Loading FAQ...
    </Box>
  ),
});

const SocialShare = dynamic(() => import("./components/SocialShare"), {
  loading: () => <Box p={2}>Loading share options...</Box>,
});

const CompareSlider = dynamic(() => import("./components/CompareSlider"), {
  loading: () => <Box p={4} h="300px" bg="gray.100" borderRadius="md" />,
});

const BatchGhiblify = dynamic(() => import("./components/BatchGhiblify"), {
  loading: () => (
    <Box p={4} textAlign="center">
      Loading batch processor...
    </Box>
  ),
});

const MobileFileUpload = dynamic(
  () => import("./components/MobileFileUpload"),
  {
    ssr: false,
    loading: () => (
      <Box
        p={4}
        textAlign="center"
        borderRadius="xl"
        border="2px dashed"
        borderColor="gray.200"
      >
        <Text>Loading file upload...</Text>
      </Box>
    ),
  }
);
import MiniAppContainer from "./components/MiniAppContainer";
import SplashScreen from "./components/SplashScreen";
import { useFarcaster } from "./components/FarcasterFrameProvider";
import ImageErrorBoundary from "./components/ImageErrorBoundary";
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  HStack,
} from "@chakra-ui/react";

export default function Home() {
  const DEFAULT_PROMPT_STRENGTH = 0.8;

  // Use unified wallet system instead of fragmented approaches
  const {
    address,
    isConnected,
    credits,
    spendCredits,
    refundCredits,
    refreshCredits,
    isLoading: walletLoading,
  } = useUnifiedWallet();

  const { isInFrame, isLoading: frameLoading, isReady } = useFarcaster();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImageURL, setSelectedImageURL] = useState("");
  const [generatedImageURL, setGeneratedImageURL] = useState("");
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [apiChoice, setApiChoice] = useState("comfy"); // Changed from "replicate" to "comfy"
  const [taskId, setTaskId] = useState(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [currentFact, setCurrentFact] = useState(0);
  const [pollInterval, setPollInterval] = useState(null);
  const [factInterval, setFactInterval] = useState(null);
  const [token, setToken] = useState(null);
  const [creditsRefreshKey, setCreditsRefreshKey] = useState(0);
  const [promptStrength, setPromptStrength] = useState(DEFAULT_PROMPT_STRENGTH);

  // Studio Ghibli facts to display during loading
  const ghibliFacts = [
    "Studio Ghibli was founded in 1985 by Hayao Miyazaki, Isao Takahata, and Toshio Suzuki.",
    "The name 'Ghibli' comes from an Italian aircraft, chosen because Miyazaki loved planes.",
    "Ghibli's distinct art style emphasizes hand-drawn animation and attention to detail.",
    "The studio's mascot Totoro has become one of the most recognizable characters in animation.",
    "Spirited Away (2001) is the first and only hand-drawn and non-English-language animated film to win an Academy Award.",
    "Many Ghibli films feature strong environmental themes and complex female protagonists.",
    "The studio's attention to detail extends to food animation, making even simple meals look incredibly appetizing.",
    "Miyazaki personally reviews each frame of animation in his films.",
    "The studio's work often blends Japanese and European artistic influences.",
    "Ghibli films often feature magical realism, where the extraordinary exists alongside the ordinary.",
  ];

  // Example images
  const exampleImages = {
    grow: "/examples/grow.png",
    grow2: "/examples/grow2.png",
    bridge: "/examples/bridge.png",
    bridge0: "/examples/0bridge.png",
  };

  // Use environment variable for API URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

  // Standard fetch options for all API calls to handle CORS properly
  const fetchOptions = {
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://ghiblify-it.vercel.app",
    },
  };

  // Load token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("ghiblify_token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const handlePurchaseComplete = (newToken) => {
    setToken(newToken);
    // Force a refresh of the credits display
    setCreditsRefreshKey((prev) => prev + 1);
  };

  // Helper to coerce various result shapes to a string URL
  const ensureStringUrl = (val, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 3 || !val) return null;

    // If it's already a string, validate it's a proper data URL or HTTP URL
    if (typeof val === "string") {
      if (val.startsWith("data:image/") || val.startsWith("http")) {
        return val;
      }
      return null;
    }

    if (typeof val === "object" && val !== null) {
      // Avoid processing circular references or React elements
      if (val.$$typeof || val._owner || val.constructor === Object.prototype.constructor) {
        return null;
      }
      
      // common shapes: { url }, { result: string }, arrays
      if (
        typeof val.url === "string" &&
        (val.url.startsWith("data:image/") || val.url.startsWith("http"))
      ) {
        return val.url;
      }
      if (
        typeof val.result === "string" &&
        (val.result.startsWith("data:image/") || val.result.startsWith("http"))
      ) {
        return val.result;
      }
      if (Array.isArray(val) && val.length > 0) {
        // return first string-like, limiting array processing to first 5 items
        for (let i = 0; i < Math.min(val.length, 5); i++) {
          const s = ensureStringUrl(val[i], depth + 1);
          if (s) return s;
        }
      }
    }
    return null;
  };

  // Function to poll task status
  const pollTaskStatus = async (taskId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/comfyui/status/${taskId}`,
        fetchOptions
      );
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      const data = await response.json();

      if (data.status === "COMPLETED") {
        const imageUrl = ensureStringUrl(data.result ?? data.url ?? null);

        if (typeof imageUrl === "string" && imageUrl.length > 0) {
          // Defer state update to next frame to avoid reconciliation edge cases
          // Also ensure the URL is ready for rendering
          const updateImage = async () => {
            try {
              // For data URLs or URLs that might need processing, do a basic validation
              if (imageUrl.startsWith("data:image/")) {
                // Validate the data URL is properly formatted
                const img = new Image();
                await new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  img.src = imageUrl;
                });
              }
              
              setGeneratedImageURL(imageUrl);
              setIsLoading(false);
              cleanupIntervals();
            } catch (error) {
              console.error("Error validating image URL:", error);
              // Set the URL anyway, let ImageErrorBoundary handle it
              setGeneratedImageURL(imageUrl);
              setIsLoading(false);
              cleanupIntervals();
            }
          };

          if (typeof window !== "undefined" && window.requestAnimationFrame) {
            window.requestAnimationFrame(updateImage);
          } else {
            setTimeout(updateImage, 0);
          }
          return true;
        } else {
          // Handle case where we can't extract a valid image URL
          console.error(
            "Failed to extract valid image URL from ComfyUI response:",
            data
          );
          setError("Failed to process image: Invalid response format");
          setIsLoading(false);
          cleanupIntervals();
          return true;
        }
      } else if (data.status === "ERROR") {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : "An error occurred during processing";
        setError(errorMessage);
        setIsLoading(false);
        cleanupIntervals(); // Ensure we clean up all intervals

        // Refund credit for failed processing
        try {
          await refundCredits(1);
          setCreditsRefreshKey((prev) => prev + 1); // Refresh credits display
        } catch (refundError) {
          // Don't show refund error to user, but silently handle it
        }

        return true;
      } else if (data.status === "PROCESSING") {
        // Only update progress for significant changes
        if (data.milestone && typeof data.milestone === "number") {
          setTaskProgress(data.milestone);
        }
        return false;
      }
    } catch (error) {
      console.error("Error polling status:", error);
      return false;
    }
  };

  // Cleanup function for intervals
  const cleanupIntervals = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    if (factInterval) {
      clearInterval(factInterval);
      setFactInterval(null);
    }
  }, [pollInterval, factInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupIntervals();
  }, [cleanupIntervals]);

  const handleGhiblify = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setTaskProgress(0);
    setCurrentFact(0);
    setGeneratedImageURL(""); // Clear any previous result

    // Clean up any existing intervals
    cleanupIntervals();

    try {
      // Check if wallet is connected
      if (!isConnected || !address) {
        setError("Please connect your wallet to continue.");
        setIsLoading(false);
        return;
      }

      // Use unified credit system
      try {
        await spendCredits(1);
      } catch (creditError) {
        if (creditError.message.includes("Insufficient credits")) {
          setError(
            "No credits available. Please purchase credits to continue."
          );
          document
            .getElementById("pricing")
            ?.scrollIntoView({ behavior: "smooth" });
        } else {
          setError("Failed to use credit. Please try again.");
        }
        setIsLoading(false);
        return;
      }
      setCreditsRefreshKey((prev) => prev + 1);

      // Proceed as before
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Add prompt_strength for backend API
      formData.append("prompt_strength", promptStrength.toString());

      const endpoint =
        apiChoice === "replicate" ? "/api/replicate" : "/api/comfyui";

      // Create a new options object for FormData (can't use Content-Type with FormData)
      const formDataOptions = {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          Accept: "application/json",
          Origin:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://ghiblify-it.vercel.app",
        },
        body: formData,
      };

      const response = await fetch(
        `${API_URL}${endpoint}?address=${address}`,
        formDataOptions
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          Array.isArray(errorData.detail)
            ? errorData.detail[0]
            : errorData.detail || "Failed to process image"
        );
      }

      const data = await response.json();
      if (data.original && typeof data.original === "string") {
        setSelectedImageURL(data.original);
      }

      if (apiChoice === "replicate") {
        if (data.result && typeof data.result === "string") {
          setGeneratedImageURL(data.result);
        }
        setIsLoading(false);
      } else {
        // For ComfyUI, start polling
        setTaskId(data.task_id);

        // Set up polling interval
        const newPollInterval = setInterval(async () => {
          const isDone = await pollTaskStatus(data.task_id);
          if (isDone) {
            cleanupIntervals();
          }
        }, 10000);
        setPollInterval(newPollInterval);

        // Set up fact rotation interval
        const newFactInterval = setInterval(() => {
          setCurrentFact((prev) => (prev + 1) % ghibliFacts.length);
        }, 30000);
        setFactInterval(newFactInterval);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
      setIsLoading(false);
      cleanupIntervals();

      // Refund credit if the API call failed after spending
      try {
        await refundCredits(1);
        setCreditsRefreshKey((prev) => prev + 1); // Refresh credits display
      } catch (refundError) {
        // Don't show refund error to user, but silently handle it
      }
    }
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    onOpen();
  };

  return (
    <>
      <SplashScreen isLoading={frameLoading} />
      <MiniAppContainer>
        <Box borderWidth="0px" mx="0px" my="10px">
          <Text
            color="#4682A9"
            mt="50px"
            fontSize="7xl"
            fontFamily="Arial"
            fontWeight="bold"
            textAlign="center"
          >
            ghiblify &#128444;
          </Text>
        </Box>

        <Box mb={4} display="flex" justifyContent="center" alignItems="center">
          <CreditsDisplay forceRefresh={creditsRefreshKey} />
        </Box>

        {/* Controls for style and API choice shared by both tabs */}
        <Box w="100%" maxW="400px" mb={6} mx="auto">
          <Text fontSize="lg" mb={3} textAlign="center">
            Choose Your Ghibli Style
          </Text>
          <RadioGroup
            onChange={setApiChoice}
            value={apiChoice}
            display="flex"
            flexDirection="column"
            gap={4}
          >
            <Box
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              cursor="pointer"
              onClick={() => setApiChoice("comfy")}
              bg={apiChoice === "comfy" ? "blue.50" : "transparent"}
              _hover={{ bg: "blue.50" }}
            >
              <Radio value="comfy" size="lg">
                <Box ml={3}>
                  <Text fontWeight="bold">Slow Ghibli</Text>
                  <Text fontSize="sm" color="gray.600">
                    Best for closeups, higher quality
                  </Text>
                </Box>
              </Radio>
            </Box>

            <Box
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              cursor="pointer"
              onClick={() => setApiChoice("replicate")}
              bg={apiChoice === "replicate" ? "blue.50" : "transparent"}
              _hover={{ bg: "blue.50" }}
            >
              <Radio value="replicate" size="lg">
                <Box ml={3}>
                  <Text fontWeight="bold">Faster Ghibli</Text>
                  <Text fontSize="sm" color="gray.600">
                    Best for Medium/Long range
                  </Text>
                </Box>
              </Radio>
            </Box>
          </RadioGroup>
        </Box>
        <Box w="100%" maxW="400px" mx="auto" mb={8}>
          <FormLabel htmlFor="intensity-slider" mb={1}>
            Ghibli Intensity
          </FormLabel>
          <HStack spacing={4}>
            <Slider
              id="intensity-slider"
              aria-label="Ghibli Intensity"
              min={50}
              max={100}
              step={1}
              value={Math.round(promptStrength * 100)}
              onChange={(val) => setPromptStrength(val / 100)}
              colorScheme="blue"
              flex="1"
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <Box minW="48px" textAlign="right" fontSize="sm">
              {Math.round(promptStrength * 100)}%
            </Box>
          </HStack>
        </Box>
        <Tabs isFitted variant="enclosed" mt={2}>
          <TabList mb="1em">
            <Tab>Single</Tab>
            <Tab>Batch</Tab>
          </TabList>
          <TabPanels>
            {/* Single image Tab */}
            <TabPanel>
              <Flex direction="column" align="center" gap={4}>
                <MobileFileUpload
                  onFileSelect={(file) => {
                    if (file) {
                      setSelectedFile(file);
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setSelectedImageURL(e.target.result);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setSelectedFile(null);
                      setSelectedImageURL("");
                    }
                  }}
                  isLoading={isLoading}
                />
                {selectedImageURL && (
                  <Button
                    onClick={handleGhiblify}
                    colorScheme="blue"
                    size={{ base: "lg", md: "md" }}
                    minH={{ base: "56px", md: "40px" }}
                    fontSize={{ base: "lg", md: "md" }}
                    w={{ base: "full", md: "auto" }}
                    px={8}
                    isDisabled={isLoading}
                    isLoading={isLoading}
                    loadingText="✨ Ghiblifying..."
                    borderRadius="xl"
                    fontWeight="semibold"
                  >
                    ✨ Ghiblify!
                  </Button>
                )}
              </Flex>
            </TabPanel>
            {/* Batch Tab */}
            <TabPanel>
              <BatchGhiblify
                apiChoice={apiChoice}
                promptStrength={promptStrength}
                address={address}
                onCreditsUsed={() => setCreditsRefreshKey((k) => k + 1)}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexDirection={{ base: "column", md: "row" }}
          gap={4}
          mb={8}
        >
          {isLoading ? (
            <Stack spacing={4} width="100%" maxW="600px">
              <Flex
                justifyContent="center"
                alignItems="center"
                direction="column"
              >
                <SkeletonCircle size="12" />
                <Box mt={4} textAlign="center">
                  <Text fontSize="sm" mb={2}>
                    Transforming your image into Ghibli style...
                    {apiChoice === "comfy" &&
                      typeof taskProgress === "number" &&
                      taskProgress > 0 &&
                      ` (${taskProgress}%)`}
                  </Text>
                  <Text fontSize="xs" color="gray.600" mb={4}>
                    {apiChoice === "comfy"
                      ? "Estimated time: 1-2 minutes with low load, 2-5 minutes with medium load"
                      : "Estimated time: 30-60 seconds"}
                  </Text>
                  <Text fontSize="sm" color="gray.700" maxW="400px" mx="auto">
                    Did you know?{" "}
                    {ghibliFacts[currentFact] ||
                      "Studio Ghibli creates magical animated films!"}
                  </Text>
                </Box>
              </Flex>
            </Stack>
          ) : (
            <>
              {selectedImageURL && generatedImageURL ? (
                <ImageErrorBoundary
                  onRetry={() => {
                    setGeneratedImageURL("");
                    setSelectedImageURL("");
                  }}
                >
                  <Box w="100%">
                    {typeof selectedImageURL === "string" &&
                    typeof generatedImageURL === "string" ? (
                      <CompareSlider
                        originalUrl={selectedImageURL}
                        resultUrl={generatedImageURL}
                        height="400px"
                      />
                    ) : null}
                    <Box mt={2}>
                      <SocialShare
                        imageUrl={generatedImageURL}
                        title="Ghiblified via https://ghiblify-it.vercel.app 🌱"
                      />
                    </Box>
                  </Box>
                </ImageErrorBoundary>
              ) : (
                <>
                  {selectedImageURL && (
                    <Box
                      flex={{ base: "1", md: "1" }}
                      maxW={{ base: "100%", md: "50%" }}
                    >
                      <Text textAlign="center" mb={2}>
                        Original Image
                      </Text>
                      <Image
                        src={selectedImageURL}
                        alt="Original uploaded image"
                        boxShadow="lg"
                        maxH="400px"
                        width="100%"
                        objectFit="contain"
                      />
                    </Box>
                  )}
                  {generatedImageURL && (
                    <ImageErrorBoundary
                      onRetry={() => setGeneratedImageURL("")}
                    >
                      <Box
                        flex={{ base: "1", md: "1" }}
                        maxW={{ base: "100%", md: "50%" }}
                      >
                        <Text textAlign="center" mb={2}>
                          Ghibli Style
                        </Text>
                        <Image
                          src={generatedImageURL}
                          alt="Generated Ghibli-style image"
                          boxShadow="lg"
                          maxH="400px"
                          width="100%"
                          objectFit="contain"
                        />
                        <Text fontSize="sm" color="green.500" mt={2}>
                          ✅ Image generated successfully!
                        </Text>
                        <SocialShare
                          imageUrl={generatedImageURL}
                          title="Ghiblified via https://ghiblify-it.vercel.app 🌱"
                        />
                      </Box>
                    </ImageErrorBoundary>
                  )}
                  {error && (
                    <Text color="red.500" mt={4}>
                      {error}
                    </Text>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        <Box mt={8} mb={12}>
          <Text textAlign="center" fontSize="md" mb={6} color="gray.600">
            Examples
          </Text>
          <Wrap justify="center" spacing={4}>
            <WrapItem>
              <Image
                src={exampleImages.grow}
                alt="Original peaceful scene"
                height="120px"
                width="120px"
                objectFit="cover"
                borderRadius="md"
                cursor="pointer"
                onClick={() => handleImageClick(exampleImages.grow)}
                _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
              />
            </WrapItem>
            <WrapItem>
              <Image
                src={exampleImages.grow2}
                alt="Ghibli style peaceful scene"
                height="120px"
                width="120px"
                objectFit="cover"
                borderRadius="md"
                cursor="pointer"
                onClick={() => handleImageClick(exampleImages.grow2)}
                _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
              />
            </WrapItem>
            <WrapItem>
              <Image
                src={exampleImages.bridge0}
                alt="Original Golden Gate Bridge"
                height="120px"
                width="120px"
                objectFit="cover"
                borderRadius="md"
                cursor="pointer"
                onClick={() => handleImageClick(exampleImages.bridge0)}
                _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
              />
            </WrapItem>
            <WrapItem>
              <Image
                src={exampleImages.bridge}
                alt="Ghibli style Golden Gate Bridge"
                height="120px"
                width="120px"
                objectFit="cover"
                borderRadius="md"
                cursor="pointer"
                onClick={() => handleImageClick(exampleImages.bridge)}
                _hover={{ transform: "scale(1.05)", transition: "0.2s" }}
              />
            </WrapItem>
          </Wrap>
        </Box>

        <FAQ />

        <Box id="pricing" mt={16}>
          <Pricing onPurchaseComplete={handlePurchaseComplete} />
        </Box>

        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalCloseButton />
            <ModalBody p={4}>
              <Image
                src={modalImage}
                alt="Enlarged view"
                width="100%"
                objectFit="contain"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </MiniAppContainer>
    </>
  );
}
