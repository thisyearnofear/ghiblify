"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Skeleton,
  Text,
  Badge,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUnifiedWallet } from "../lib/hooks/useUnifiedWallet";
import { GLASSMORPHISM, INTERACTIONS, GRADIENTS } from "../theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.thisyearnofear.com";

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function CreationsPage() {
  const router = useRouter();
  const toast = useToast();

  const { isConnected, address } = useUnifiedWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [creations, setCreations] = useState([]);

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

  useEffect(() => {
    if (!isConnected || !address) {
      router.push("/");
    }
  }, [isConnected, address, router]);

  useEffect(() => {
    const run = async () => {
      if (!isConnected || !address) return;

      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/creations?address=${encodeURIComponent(address)}&limit=30&offset=0`,
          fetchOptions
        );
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to load creations");
        }
        const data = await res.json();
        setCreations(data.creations || []);
      } catch (e) {
        toast({
          title: "Couldn’t load creations",
          description: e?.message || "Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [isConnected, address, fetchOptions, toast]);

  return (
    <Container maxW="container.lg" py={10}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading
            size="lg"
            bgGradient={GRADIENTS.ghibliPrimary}
            bgClip="text"
            mb={2}
          >
            My Creations
          </Heading>
          <Text color="gray.600">
            Browse your past transformations and jump back in whenever inspiration
            strikes.
          </Text>
        </Box>

        {isLoading ? (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} borderRadius="xl" overflow="hidden" {...GLASSMORPHISM.medium}>
                <Skeleton h="210px" />
                <Box p={4}>
                  <Skeleton h="16px" mb={2} />
                  <Skeleton h="12px" w="60%" />
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        ) : creations.length === 0 ? (
          <Box
            p={10}
            borderRadius="2xl"
            textAlign="center"
            border="2px dashed"
            borderColor="gray.200"
          >
            <Text fontWeight="semibold" mb={2}>
              No creations yet
            </Text>
            <Text color="gray.600" mb={4}>
              Create your first Ghibli transformation and it will show up here.
            </Text>
            <Button
              bgGradient={GRADIENTS.ghibliPrimary}
              color="white"
              _hover={INTERACTIONS.buttonHover}
              onClick={() => router.push("/")}
            >
              Create now
            </Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={5}>
            {creations.map((c) => (
              <Box
                key={c.id}
                borderRadius="xl"
                overflow="hidden"
                {...GLASSMORPHISM.medium}
                transition="all 0.2s ease"
                _hover={INTERACTIONS.gentleHover}
              >
                <Box bg="blackAlpha.50">
                  <Image
                    src={c.thumbnail_url}
                    alt="creation thumbnail"
                    w="100%"
                    h="210px"
                    objectFit="cover"
                  />
                </Box>
                <Box p={4}>
                  <HStack justify="space-between" mb={2}>
                    <Badge colorScheme={c.provider === "comfyui" ? "purple" : "blue"}>
                      {(c.provider || "").toUpperCase()}
                    </Badge>
                    <Text fontSize="xs" color="gray.600">
                      {formatDate(c.created_at)}
                    </Text>
                  </HStack>

                  <Text fontSize="sm" color="gray.600" mb={4}>
                    {c.artifacts_count} artifacts
                  </Text>

                  <Button
                    size="sm"
                    width="100%"
                    bgGradient={GRADIENTS.ghibliPrimary}
                    color="white"
                    _hover={INTERACTIONS.buttonHover}
                    onClick={() => router.push(`/creations/${c.id}`)}
                  >
                    View & edit
                  </Button>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
}
