"use client";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Image,
  Radio,
  RadioGroup,
  SimpleGrid,
  Spinner,
  Text,
  VStack,
  useToast,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Divider,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { useUnifiedWallet } from "../../lib/hooks/useUnifiedWallet";
import { imageUrlToFile } from "../../lib/utils/image-file";
import { GLASSMORPHISM, GRADIENTS, INTERACTIONS } from "../../theme";

const CompareSlider = dynamic(() => import("../../components/CompareSlider"), {
  loading: () => <Box h="320px" bg="gray.100" borderRadius="xl" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

function pickInputUrl(creation) {
  const artifacts = creation?.artifacts || [];
  const input = artifacts.find((a) => a.role === "input");
  return input?.url || creation?.source_url || "";
}

function pickLatestOutputArtifact(creation) {
  const artifacts = creation?.artifacts || [];
  for (let i = artifacts.length - 1; i >= 0; i--) {
    if (artifacts[i]?.role === "output") return artifacts[i];
  }
  return null;
}

export default function CreationDetailPage({ params }) {
  const creationId = params?.id;

  const router = useRouter();
  const toast = useToast();
  const { isConnected, address } = useUnifiedWallet();

  const [creation, setCreation] = useState(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [apiChoice, setApiChoice] = useState("comfyui");
  const [promptStrength, setPromptStrength] = useState(0.8);
  const [taskProgress, setTaskProgress] = useState(0);

  const selectedArtifact = useMemo(() => {
    if (!creation) return null;
    const artifacts = creation.artifacts || [];
    if (!selectedArtifactId) return pickLatestOutputArtifact(creation);
    return artifacts.find((a) => a.id === selectedArtifactId) || pickLatestOutputArtifact(creation);
  }, [creation, selectedArtifactId]);

  const inputUrl = useMemo(() => pickInputUrl(creation), [creation]);

  const fetchOptions = useMemo(
    () => ({
      credentials: "include",
      mode: "cors",
      headers: {
        Accept: "application/json",
        Origin:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://ghiblify-it.vercel.app",
      },
    }),
    []
  );

  const load = useCallback(async () => {
    if (!isConnected || !address || !creationId) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/creations/${encodeURIComponent(creationId)}?address=${encodeURIComponent(address)}`,
        fetchOptions
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to load creation");
      }
      const data = await res.json();
      setCreation(data);
      setSelectedArtifactId((prev) => prev || pickLatestOutputArtifact(data)?.id || null);
    } catch (e) {
      toast({
        title: "Couldn’t load this creation",
        description: e?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, creationId, fetchOptions, toast]);

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/");
    }
  }, [isConnected, address, router]);

  useEffect(() => {
    load();
  }, [load]);

  const pollComfyTask = useCallback(
    async (taskId) => {
      setTaskProgress(10);
      for (let i = 0; i < 60; i++) {
        const pollRes = await fetch(`${API_URL}/api/comfyui/status/${taskId}`, fetchOptions);
        if (!pollRes.ok) {
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }
        const pollData = await pollRes.json();
        if (pollData.status === "COMPLETED") {
          setTaskProgress(100);
          return pollData;
        }
        if (pollData.status === "ERROR") {
          throw new Error(pollData.error || "Error processing image");
        }
        if (pollData.milestone && typeof pollData.milestone === "number") {
          setTaskProgress(pollData.milestone);
        } else {
          setTaskProgress((p) => Math.min(95, p + 2));
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      throw new Error("Timeout waiting for result");
    },
    [fetchOptions]
  );

  const runVariant = useCallback(async () => {
    if (!creation || !selectedArtifact || !address) return;

    setIsRunning(true);
    setTaskProgress(0);

    try {
      const file = await imageUrlToFile(selectedArtifact.url, `ghiblify-${Date.now()}.png`);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt_strength", String(promptStrength));

      const endpoint = apiChoice === "replicate" ? "/api/replicate" : "/api/comfyui";
      const url = `${API_URL}${endpoint}?address=${encodeURIComponent(address)}&creation_id=${encodeURIComponent(
        creation.id
      )}&source_artifact_id=${encodeURIComponent(selectedArtifact.id)}`;

      const res = await fetch(url, {
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
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          Array.isArray(errorData.detail) ? errorData.detail[0] : errorData.detail || "Failed to process"
        );
      }

      const data = await res.json();

      if (apiChoice === "replicate") {
        toast({
          title: "Variant created",
          status: "success",
          duration: 2500,
          isClosable: true,
        });
        setSelectedArtifactId(null);
        await load();
      } else {
        const taskId = data.task_id;
        const completed = await pollComfyTask(taskId);

        toast({
          title: "Variant created",
          description: completed?.message || "Done",
          status: "success",
          duration: 2500,
          isClosable: true,
        });
        setSelectedArtifactId(null);
        await load();
      }
    } catch (e) {
      toast({
        title: "Couldn’t create variant",
        description: e?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRunning(false);
      setTaskProgress(0);
    }
  }, [creation, selectedArtifact, address, apiChoice, promptStrength, toast, load, pollComfyTask]);

  if (isLoading) {
    return (
      <Container maxW="container.lg" py={10}>
        <HStack>
          <Spinner />
          <Text>Loading…</Text>
        </HStack>
      </Container>
    );
  }

  if (!creation) {
    return (
      <Container maxW="container.lg" py={10}>
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Creation not found</AlertTitle>
            <AlertDescription>
              This creation doesn’t exist or isn’t associated with your wallet.
            </AlertDescription>
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.lg" py={10}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="start">
          <Box>
            <Heading size="lg" bgGradient={GRADIENTS.ghibliPrimary} bgClip="text">
              Creation
            </Heading>
            <Text fontSize="sm" color="gray.600" fontFamily="mono">
              {creation.id}
            </Text>
          </Box>
          <Button variant="outline" onClick={() => router.push("/creations")}
            _hover={INTERACTIONS.gentleHover}
          >
            Back
          </Button>
        </HStack>

        <Box borderRadius="2xl" overflow="hidden" {...GLASSMORPHISM.medium} p={4}>
          <HStack justify="space-between" mb={3}>
            <HStack>
              <Badge colorScheme="teal">History</Badge>
              <Text fontSize="sm" color="gray.600">
                {creation.artifacts?.length || 0} artifacts
              </Text>
            </HStack>
            <Badge colorScheme={creation.provider === "comfyui" ? "purple" : "blue"}>
              {(creation.provider || "").toUpperCase()}
            </Badge>
          </HStack>

          {inputUrl && selectedArtifact?.url ? (
            <CompareSlider
              originalUrl={inputUrl}
              resultUrl={selectedArtifact.url}
              height="320px"
              width="100%"
            />
          ) : (
            <Box h="320px" bg="gray.100" borderRadius="xl" />
          )}

          <Divider my={4} />

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            {(creation.artifacts || [])
              .filter((a) => a.type === "image")
              .map((a) => (
                <Box
                  key={a.id}
                  borderRadius="lg"
                  overflow="hidden"
                  borderWidth={selectedArtifactId === a.id ? "2px" : "1px"}
                  borderColor={selectedArtifactId === a.id ? "teal.400" : "whiteAlpha.300"}
                  cursor="pointer"
                  onClick={() => setSelectedArtifactId(a.id)}
                >
                  <Image src={a.url} alt="artifact" w="100%" h="90px" objectFit="cover" />
                  <Box p={2} bg="whiteAlpha.200">
                    <Text fontSize="xs" color="gray.700" noOfLines={1}>
                      {a.role}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={1}>
                      {(a.provider || "").toUpperCase()}
                    </Text>
                  </Box>
                </Box>
              ))}
          </SimpleGrid>
        </Box>

        <Box borderRadius="2xl" overflow="hidden" {...GLASSMORPHISM.medium} p={5}>
          <Heading size="md" mb={2}>
            Continue editing
          </Heading>
          <Text color="gray.600" mb={4}>
            Create a new variant from any artifact in this creation.
          </Text>

          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Provider
              </Text>
              <RadioGroup value={apiChoice} onChange={setApiChoice}>
                <HStack spacing={6}>
                  <Radio value="comfyui">ComfyUI</Radio>
                  <Radio value="replicate">Replicate</Radio>
                </HStack>
              </RadioGroup>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Prompt strength (Replicate)
              </Text>
              <Slider
                value={promptStrength}
                min={0.1}
                max={1.0}
                step={0.05}
                onChange={setPromptStrength}
              >
                <SliderMark value={0.8} mt="2" ml="-2" fontSize="xs">
                  default
                </SliderMark>
                <SliderTrack>
                  <SliderFilledTrack bgGradient={GRADIENTS.ghibliPrimary} />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <Text fontSize="xs" color="gray.600" mt={2}>
                {promptStrength.toFixed(2)}
              </Text>
            </Box>

            {isRunning && apiChoice === "comfyui" && (
              <Box>
                <HStack>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="gray.700">
                    Processing…
                  </Text>
                </HStack>
                {taskProgress > 0 && (
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    {taskProgress}%
                  </Text>
                )}
              </Box>
            )}

            <HStack spacing={3}>
              <Button
                bgGradient={GRADIENTS.ghibliPrimary}
                color="white"
                _hover={INTERACTIONS.buttonHover}
                onClick={runVariant}
                isLoading={isRunning}
                loadingText="Creating…"
              >
                Make a variant
              </Button>
              <Button variant="outline" isDisabled>
                Animate (coming soon)
              </Button>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
