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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useWallet } from "./lib/hooks/useWallet";
import { useGhibliTheme } from "./hooks/useGhibliTheme";
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

// REMOVED: Memory API components relocated to account page for post-conversion enhancement
// Following AGGRESSIVE CONSOLIDATION principle - delete rather than deprecate

import MiniAppContainer from "./components/MiniAppContainer";
import SplashScreen from "./components/SplashScreen";
import { useFarcaster } from "./components/FarcasterMiniAppProvider";
import ImageReadyBoundary from "./components/ImageReadyBoundary";
import {
  retrySpendCredits,
  getContextOptimizedRetryOptions,
} from "./lib/utils/credit-retry-helper";
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

  // Use simplified wallet system
  const {
    address,
    isConnected,
    credits,
    useCredits,
    refreshCredits,
    isLoading: walletLoading,
  } = useWallet();

  // Use theme system for dark mode support
  const { colors } = useGhibliTheme();

  const {
    isInMiniApp,
    isLoading: frameLoading,
    isReady,
    user: farcasterUser,
  } = useFarcaster();
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
  const fetchOptions = useMemo(
    () => ({
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
    }),
    []
  );

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
  const ensureStringUrl = useCallback((val, depth = 0) => {
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
      if (
        val.$$typeof ||
        val._owner ||
        val.type ||
        val.key ||
        val.ref ||
        val.props
      ) {
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
  }, []);

  // Function to poll task status
  const pollTaskStatus = useCallback(
    async (taskId) => {
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
          let imageUrl = null;

          // More defensive extraction with extensive logging
          try {
            console.log("ComfyUI response data:", data);
            imageUrl = ensureStringUrl(data.result ?? data.url ?? null);
            console.log(
              "Extracted imageUrl:",
              typeof imageUrl,
              imageUrl ? imageUrl.substring(0, 100) + "..." : "null"
            );
          } catch (error) {
            console.error("Error in ensureStringUrl:", error);
            imageUrl = null;
          }

          if (typeof imageUrl === "string" && imageUrl.length > 0) {
            // Validate it's actually a proper URL string
            try {
              if (
                !imageUrl.startsWith("data:image/") &&
                !imageUrl.startsWith("http")
              ) {
                throw new Error("Invalid image URL format");
              }

              // Store the validated string URL
              setGeneratedImageURL(imageUrl);
              setIsLoading(false);
              return true;
            } catch (error) {
              console.error("Error validating image URL:", error);
              setError("Invalid image format received");
              setIsLoading(false);
              return true;
            }
          } else {
            // Handle case where we can't extract a valid image URL
            console.error(
              "Failed to extract valid image URL from ComfyUI response:",
              data
            );
            setError("Failed to process image: Invalid response format");
            setIsLoading(false);
            return true;
          }
        } else if (data.status === "ERROR") {
          const errorMessage =
            typeof data.error === "string"
              ? data.error
              : "An error occurred during processing";
          setError(errorMessage);
          setIsLoading(false);

          // Note: Credit refund functionality not implemented yet
          // Refresh credits display to show current state
          setCreditsRefreshKey((prev) => prev + 1);

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
    },
    [
      API_URL,
      fetchOptions,
      ensureStringUrl,
      setGeneratedImageURL,
      setError,
      setIsLoading,
      setCreditsRefreshKey,
    ]
  );

  // Auto-rotate Studio Ghibli facts while loading
  useEffect(() => {
    if (!isLoading) {
      setCurrentFact(0);
      return;
    }
    const factTimer = setInterval(() => {
      setCurrentFact((f) => (f + 1) % ghibliFacts.length);
    }, 30000);
    return () => clearInterval(factTimer);
  }, [isLoading, ghibliFacts.length]);

  // Auto-poll ComfyUI status while loading
  useEffect(() => {
    if (!isLoading || apiChoice !== "comfy" || !taskId) return;

    let cancelled = false;
    let timeoutId;

    const doPoll = async () => {
      if (cancelled) return;
      const done = await pollTaskStatus(taskId);
      if (!done && !cancelled) {
        timeoutId = setTimeout(doPoll, 10000);
      }
    };

    // Start polling after a short delay
    timeoutId = setTimeout(doPoll, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isLoading, apiChoice, taskId, pollTaskStatus]);

  const handleGhiblify = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    setTaskProgress(0);
    setCurrentFact(0);
    setGeneratedImageURL(""); // Clear any previous result

    try {
      // Check if wallet is connected
      if (!isConnected || !address) {
        setError("Connect your wallet to start creating ✨");
        setIsLoading(false);
        return;
      }

      // Use unified credit system
      try {
        // Check credits are available with retry logic - don't spend yet
        const retryOptions = getContextOptimizedRetryOptions();
        await retrySpendCredits(
          async () => {
            await refreshCredits();
            if (credits < 1) {
              throw new Error("You need credits to create magical art");
            }
            return credits;
          },
          refreshCredits,
          { ...retryOptions, amount: 0 }
        );
      } catch (creditError) {
        if (
          creditError.message.includes("need credits") ||
          creditError.message.includes("Insufficient credits")
        ) {
          setError(
            "You need credits to create magical art ✨ Add credits to continue transforming your images!"
          );
          document
            .getElementById("pricing")
            ?.scrollIntoView({ behavior: "smooth" });
        } else {
          setError("Connection issue. Please try again.");
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
        // Use the same helper so we never store an object/array
        const imageUrl = ensureStringUrl(data.result ?? data.url ?? data);
        if (imageUrl) {
          setGeneratedImageURL(imageUrl);
        } else {
          setError("Invalid image format received from Replicate");
        }
        setIsLoading(false);
      } else {
        // For ComfyUI, set task ID to trigger polling via useEffect
        setTaskId(data.task_id);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message);
      setIsLoading(false);

      // Credits will be handled by the ComfyUI handler
      // Refresh credits display to show current state
      setCreditsRefreshKey((prev) => prev + 1);
    }
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    onOpen();
  };

  return (
    <>
      <MiniAppContainer>
        {isConnected && (
          <Alert status="info" mb={6} borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Cross-Platform Identity Active</AlertTitle>
              <AlertDescription display="block">
                Your unified profile connects your wallet and social identities.
                <Link
                  href="#identity-dashboard"
                  color="blue.500"
                  fontWeight="bold"
                >
                  {" "}
                  View your dashboard
                </Link>
              </AlertDescription>
            </Box>
          </Alert>
        )}

        <Box borderWidth="0px" mx="0px" my="10px">
          <Text
            color={colors.text.accent}
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
          <Text
            fontSize="lg"
            mb={3}
            textAlign="center"
            color={colors.text.primary}
          >
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
              borderColor={colors.border.primary}
              borderRadius="lg"
              cursor="pointer"
              onClick={() => setApiChoice("comfy")}
              bg={
                apiChoice === "comfy" ? colors.interactive.hover : "transparent"
              }
              _hover={{ bg: colors.interactive.hover }}
            >
              <Radio value="comfy" size="lg">
                <Box ml={3}>
                  <Text fontWeight="bold" color={colors.text.primary}>
                    Slow Ghibli
                  </Text>
                  <Text fontSize="sm" color={colors.text.secondary}>
                    Best for closeups, higher quality
                  </Text>
                </Box>
              </Radio>
            </Box>

            <Box
              p={4}
              borderWidth="1px"
              borderColor={colors.border.primary}
              borderRadius="lg"
              cursor="pointer"
              onClick={() => setApiChoice("replicate")}
              bg={
                apiChoice === "replicate"
                  ? colors.interactive.hover
                  : "transparent"
              }
              _hover={{ bg: colors.interactive.hover }}
            >
              <Radio value="replicate" size="lg">
                <Box ml={3}>
                  <Text fontWeight="bold" color={colors.text.primary}>
                    Faster Ghibli
                  </Text>
                  <Text fontSize="sm" color={colors.text.secondary}>
                    Best for Medium/Long range
                  </Text>
                </Box>
              </Radio>
            </Box>
          </RadioGroup>
        </Box>
        <Box w="100%" maxW="400px" mx="auto" mb={8}>
          <FormLabel
            htmlFor="intensity-slider"
            mb={1}
            color={colors.text.primary}
          >
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
            <Box
              minW="48px"
              textAlign="right"
              fontSize="sm"
              color={colors.text.primary}
            >
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
                  <Text fontSize="xs" color={colors.text.secondary} mb={4}>
                    {apiChoice === "comfy"
                      ? "Estimated time: 1-2 minutes with low load, 2-5 minutes with medium load"
                      : "Estimated time: 30-60 seconds"}
                  </Text>
                  <Text
                    fontSize="sm"
                    color={colors.text.primary}
                    maxW="400px"
                    mx="auto"
                  >
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
                <ImageReadyBoundary
                  onRetry={() => {
                    setGeneratedImageURL("");
                    setSelectedImageURL("");
                  }}
                >
                  <Box w="100%">
                    {typeof selectedImageURL === "string" &&
                    typeof generatedImageURL === "string" &&
                    selectedImageURL.length > 0 &&
                    generatedImageURL.length > 0 ? (
                      (() => {
                        console.log("Rendering CompareSlider with:", {
                          selectedImageURL: typeof selectedImageURL,
                          generatedImageURL: typeof generatedImageURL,
                          selectedLength: selectedImageURL.length,
                          generatedLength: generatedImageURL.length,
                        });
                        return (
                          <CompareSlider
                            originalUrl={selectedImageURL}
                            resultUrl={generatedImageURL}
                            height="400px"
                          />
                        );
                      })()
                    ) : (
                      <Box textAlign="center" p={4}>
                        <Text color={colors.text.secondary}>
                          Loading comparison view...
                        </Text>
                      </Box>
                    )}
                    <Box mt={4} textAlign="center">
                      {typeof generatedImageURL === "string" &&
                        generatedImageURL.length > 0 && (
                          <SocialShare
                            imageUrl={generatedImageURL}
                            title="Ghiblified via https://ghiblify-it.vercel.app 🌱"
                          />
                        )}
                      <Button
                        mt={4}
                        colorScheme="blue"
                        variant="outline"
                        onClick={() => {
                          setGeneratedImageURL("");
                          setSelectedImageURL("");
                          setError("");
                        }}
                      >
                        ✨ Create Another
                      </Button>
                    </Box>
                  </Box>
                </ImageReadyBoundary>
              ) : (
                <>
                  {selectedImageURL && (
                    <Box
                      flex={{ base: "1", md: "1" }}
                      maxW={{ base: "100%", md: "50%" }}
                    >
                      <Text
                        textAlign="center"
                        mb={2}
                        color={colors.text.primary}
                      >
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
                    <ImageReadyBoundary
                      onRetry={() => setGeneratedImageURL("")}
                    >
                      <Box
                        flex={{ base: "1", md: "1" }}
                        maxW={{ base: "100%", md: "50%" }}
                      >
                        <Text
                          textAlign="center"
                          mb={2}
                          color={colors.text.primary}
                        >
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
                    </ImageReadyBoundary>
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
          <Text
            textAlign="center"
            fontSize="md"
            mb={6}
            color={colors.text.secondary}
          >
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

        {/* ENHANCEMENT FIRST: Memory API social features moved to post-conversion flow */}
        {/* Core user journey: Land → Transform → Connect → Discover Social */}

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