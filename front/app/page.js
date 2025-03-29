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
  RadioGroupProps,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useAccount } from 'wagmi';
import Pricing from "./components/Pricing";
import CreditsDisplay from "./components/CreditsDisplay";

export default function Home() {
  const { address } = useAccount();
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

  // Determine API URL based on environment
  const API_URL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : "https://ghiblify.onrender.com";

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
    setCreditsRefreshKey(prev => prev + 1);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setSelectedImageURL(reader.result);
      setSelectedFile(file);
      setGeneratedImageURL(""); // Clear previous result
      setError(""); // Clear previous errors
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  // Function to poll task status
  const pollTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`${API_URL}/api/comfyui/status/${taskId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch status");
      }
      const data = await response.json();
      console.log("Poll response:", data); // Debug log

      if (data.status === "COMPLETED") {
        if (data.result || data.url) {
          setGeneratedImageURL(data.result || data.url);
          setIsLoading(false);
          cleanupIntervals(); // Ensure we clean up all intervals
          return true;
        }
      } else if (data.status === "ERROR") {
        setError(data.error || "An error occurred during processing");
        setIsLoading(false);
        cleanupIntervals(); // Ensure we clean up all intervals
        return true;
      } else if (data.status === "PROCESSING") {
        // Only update progress for significant changes
        if (data.milestone) {
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
  const cleanupIntervals = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
    if (factInterval) {
      clearInterval(factInterval);
      setFactInterval(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupIntervals();
  }, []);

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
      // First, use a credit
      const creditResponse = await fetch(`${API_URL}/api/web3/credits/use?address=${address}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!creditResponse.ok) {
        if (creditResponse.status === 402) {
          // No credits available
          setError(
            "No credits available. Please purchase credits to continue."
          );
          document
            .getElementById("pricing")
            ?.scrollIntoView({ behavior: "smooth" });
          return;
        }
        throw new Error("Failed to use credit");
      }

      const creditData = await creditResponse.json();
      // Credit used successfully

      const formData = new FormData();
      formData.append("file", selectedFile);

      const endpoint =
        apiChoice === "replicate" ? "/api/replicate" : "/api/comfyui";
      const response = await fetch(`${API_URL}${endpoint}?address=${address}`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          Array.isArray(errorData.detail)
            ? errorData.detail[0]
            : errorData.detail || "Failed to process image"
        );
      }

      const data = await response.json();
      setSelectedImageURL(data.original);

      if (apiChoice === "replicate") {
        setGeneratedImageURL(data.result);
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
    }
  };

  const handleImageClick = (image) => {
    setModalImage(image);
    onOpen();
  };

  return (
    <Container>
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

      <Tabs isFitted variant="enclosed" mt={8}>
        <TabList mb="1em">
          <Tab></Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Flex direction="column" align="center" gap={4}>
              <Box w="100%" maxW="400px" mb={6}>
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

              <FormControl>
                <Input
                  type="file"
                  id="fileInput"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                />
                <Button
                  mx="5px"
                  my="20px"
                  as="label"
                  htmlFor="fileInput"
                  color="#4682A9"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  width="100%"
                >
                  upload photo
                </Button>
              </FormControl>
              {selectedImageURL && (
                <Button
                  onClick={handleGhiblify}
                  color="#4682A9"
                  isDisabled={isLoading}
                >
                  {isLoading ? "Ghiblifying..." : "Ghiblify!"}
                </Button>
              )}
            </Flex>
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
                    taskProgress > 0 &&
                    ` (${taskProgress}%)`}
                </Text>
                <Text fontSize="xs" color="gray.600" mb={4}>
                  {apiChoice === "comfy"
                    ? "Estimated time: 1-2 minutes with low load, 2-5 minutes with medium load"
                    : "Estimated time: 30-60 seconds"}
                </Text>
                <Text fontSize="sm" color="gray.700" maxW="400px" mx="auto">
                  Did you know? {ghibliFacts[currentFact]}
                </Text>
              </Box>
            </Flex>
          </Stack>
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
                  boxShadow="lg"
                  maxH="400px"
                  width="100%"
                  objectFit="contain"
                />
              </Box>
            )}
            {generatedImageURL && (
              <Box
                flex={{ base: "1", md: "1" }}
                maxW={{ base: "100%", md: "50%" }}
              >
                <Text textAlign="center" mb={2}>
                  Ghibli Style
                </Text>
                <Image
                  src={generatedImageURL}
                  boxShadow="lg"
                  maxH="400px"
                  width="100%"
                  objectFit="contain"
                />
                <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                  Right-click to save your transformed image
                </Text>
              </Box>
            )}
            {error && (
              <Text color="red.500" mt={4}>
                {error}
              </Text>
            )}
          </>
        )}
      </Box>

      <Box id="pricing" mt={16}>
        <Pricing onPurchaseComplete={handlePurchaseComplete} />
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
    </Container>
  );
}
