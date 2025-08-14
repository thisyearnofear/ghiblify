"use client";

import {
  Box,
  Button,
  FormControl,
  Input,
  Image,
  Text,
  Flex,
  Progress,
  SimpleGrid,
  VStack,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { useState, useRef } from "react";
import CompareSlider from "./CompareSlider";
import SocialShare from "./SocialShare";
import dynamic from "next/dynamic";

const html2canvas = typeof window !== "undefined"
  ? require("html2canvas")
  : null;

const MAX_FILES = 6;
const MAX_FILE_SIZE_MB = 8;

export default function BatchGhiblify({ apiChoice, promptStrength, address, onCreditsUsed }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState([]);
  const [generatedURLs, setGeneratedURLs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [storyboardUrl, setStoryboardUrl] = useState("");
  const [showGrid, setShowGrid] = useState(false);
  const toast = useToast();
  const gridRef = useRef();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

  const fetchOptions = {
    credentials: "include",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Origin": typeof window !== "undefined" ? window.location.origin : "https://ghiblify-it.vercel.app",
    }
  };

  // File input handler
  const handleBatchFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, MAX_FILES);
    const tooLarge = files.find(f => f.size > MAX_FILE_SIZE_MB * 1024 * 1024);
    if (tooLarge) {
      setError(`Max file size is ${MAX_FILE_SIZE_MB} MB.`);
      setSelectedFiles([]);
      setPreviews([]);
      return;
    }
    setSelectedFiles(files);
    setPreviews([]);
    setProgress([]);
    setGeneratedURLs([]);
    setStoryboardUrl("");
    setShowGrid(false);
    setError("");
    files.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => {
          const arr = [...prev];
          arr[idx] = reader.result;
          return arr;
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Main batch handler
  const handleBatchGhiblify = async () => {
    if (!selectedFiles.length) return;
    setIsLoading(true);
    setError("");
    setProgress(Array(selectedFiles.length).fill(0));
    setGeneratedURLs(Array(selectedFiles.length).fill(null));

    // Deduct credits for all files up front
    const creditRes = await fetch(
      `${API_URL}/api/web3/credits/use?address=${address}&amount=${selectedFiles.length}`,
      { ...fetchOptions, method: "POST" }
    );
    if (!creditRes.ok) {
      if (creditRes.status === 400) {
        setError("Not enough credits for this batch. Please purchase more.");
        setIsLoading(false);
        return;
      }
      setError("Failed to use credits.");
      setIsLoading(false);
      return;
    }
    if (onCreditsUsed) onCreditsUsed();

    // Process all files in parallel
    const processFile = async (file, idx) => {
      // Compose form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt_strength", promptStrength.toString());
      const endpoint =
        apiChoice === "replicate" ? "/api/replicate" : "/api/comfyui";
      const formDataOptions = {
        method: "POST",
        credentials: "include",
        mode: "cors",
        headers: {
          "Accept": "application/json",
          "Origin": typeof window !== "undefined" ? window.location.origin : "https://ghiblify-it.vercel.app",
        },
        body: formData,
      };

      let original = null, result = null;

      try {
        const response = await fetch(`${API_URL}${endpoint}?address=${address}`, formDataOptions);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            Array.isArray(errorData.detail)
              ? errorData.detail[0]
              : errorData.detail || "Failed to process image"
          );
        }
        const data = await response.json();
        original = data.original;
        if (apiChoice === "replicate") {
          result = data.result;
        } else {
          // Start polling for ComfyUI
          const pollTaskStatus = async (taskId) => {
            let tries = 0;
            while (tries < 60) {
              const pollRes = await fetch(`${API_URL}/api/comfyui/status/${taskId}`, fetchOptions);
              if (!pollRes.ok) {
                tries++;
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
              const pollData = await pollRes.json();
              if (pollData.status === "COMPLETED" && (pollData.result || pollData.url)) {
                return pollData.result || pollData.url;
              } else if (pollData.status === "ERROR") {
                throw new Error(pollData.error || "Error processing image");
              }
              tries++;
              await new Promise(r => setTimeout(r, 3000));
            }
            throw new Error("Timeout waiting for image result.");
          };
          result = await pollTaskStatus(data.task_id);
        }
        setProgress(prev => {
          const arr = [...prev];
          arr[idx] = 100;
          return arr;
        });
        return { original, result };
      } catch (err) {
        setProgress(prev => {
          const arr = [...prev];
          arr[idx] = 100;
          return arr;
        });
        return { original: null, result: null, error: err.message };
      }
    };

    // Run all jobs in parallel
    const results = await Promise.allSettled(
      selectedFiles.map((file, idx) => processFile(file, idx))
    );
    // Update generateURLs
    const originals = [];
    const resultsArr = [];
    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value && res.value.result) {
        originals[idx] = res.value.original;
        resultsArr[idx] = res.value.result;
      } else {
        originals[idx] = null;
        resultsArr[idx] = null;
      }
    });
    setGeneratedURLs(resultsArr);
    setIsLoading(false);
    setShowGrid(true);
    setError("");

    // Scroll to grid
    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 400);
  };

  // Compose grid and allow download/share
  const handleDownloadStoryboard = async () => {
    if (!showGrid || !gridRef.current) return;
    if (!html2canvas) {
      toast({
        title: "Download not supported in this browser.",
        status: "error",
        duration: 4000,
        isClosable: true
      });
      return;
    }
    const canvas = await html2canvas(gridRef.current, { useCORS: true, backgroundColor: "#fff" });
    const dataUrl = canvas.toDataURL("image/png");
    setStoryboardUrl(dataUrl);

    // Download trigger
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "ghiblify-storyboard.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Download started!",
      status: "success",
      duration: 3000,
      isClosable: true
    });
  };

  // UI
  return (
    <Box w="100%">
      <FormControl>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleBatchFiles}
          disabled={isLoading}
        />
        <Text fontSize="sm" color="gray.600" mt={2}>
          Upload up to {MAX_FILES} images (JPEG/PNG, &lt;{MAX_FILE_SIZE_MB}MB each)
        </Text>
      </FormControl>

      {previews.length > 0 && (
        <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3} my={4}>
          {previews.map((src, idx) => (
            <VStack key={idx}>
              <Image
                src={src}
                maxH="120px"
                objectFit="contain"
                borderRadius="md"
                boxShadow="md"
                alt={`preview-${idx}`}
              />
              <Text fontSize="xs" color="gray.500">
                {selectedFiles[idx]?.name}
              </Text>
              {!!progress[idx] && progress[idx] < 100 && (
                <Progress value={progress[idx]} size="sm" w="90px" />
              )}
            </VStack>
          ))}
        </SimpleGrid>
      )}

      <Button
        mt={2}
        mb={4}
        colorScheme="blue"
        onClick={handleBatchGhiblify}
        isLoading={isLoading}
        disabled={
          isLoading ||
          selectedFiles.length < 2 ||
          selectedFiles.length > MAX_FILES
        }
        width="100%"
      >
        {isLoading
          ? "Ghiblifying batch..."
          : selectedFiles.length > MAX_FILES
          ? `Max ${MAX_FILES} files`
          : selectedFiles.length < 2
          ? "Select at least 2 images"
          : "Ghiblify Batch"}
      </Button>
      {selectedFiles.length > MAX_FILES && (
        <Text color="red.500" mb={2}>
          Please select no more than {MAX_FILES} files.
        </Text>
      )}
      {error && (
        <Text color="red.500" mt={2}>
          {error}
        </Text>
      )}

      {/* Grid preview and download/share */}
      {showGrid && generatedURLs.filter(Boolean).length === selectedFiles.length && (
        <Box mt={6}>
          <Box
            ref={gridRef}
            p={4}
            borderWidth="1px"
            borderRadius="lg"
            bg="#f9fafb"
            boxShadow="xl"
            maxW="900px"
            mx="auto"
          >
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {previews.map((orig, idx) =>
                generatedURLs[idx] ? (
                  <Box key={idx} p={0}>
                    <CompareSlider
                      originalUrl={orig}
                      resultUrl={generatedURLs[idx]}
                      height="210px"
                      width="100%"
                    />
                  </Box>
                ) : (
                  <VStack key={idx} align="center" justify="center" p={4}>
                    <Text color="red.400">Failed</Text>
                  </VStack>
                )
              )}
            </SimpleGrid>
          </Box>
          <Flex mt={4} gap={4} justify="center" align="center">
            <Button colorScheme="green" onClick={handleDownloadStoryboard}>
              Download Storyboard
            </Button>
            {storyboardUrl && (
              <SocialShare
                imageUrl={storyboardUrl}
                title="My Ghiblify storyboard!"
              />
            )}
          </Flex>
        </Box>
      )}
      {isLoading && (
        <Flex align="center" justify="center" mt={6} direction="column">
          <Spinner color="blue.500" size="xl" mb={2} />
          <Text>Transforming your batch... (This may take a while.)</Text>
        </Flex>
      )}
    </Box>
  );
}