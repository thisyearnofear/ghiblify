"use client";

import {
  HStack,
  IconButton,
  Tooltip,
  useToast,
  useClipboard,
  Spinner,
  Text,
  Box,
  Icon,
} from "@chakra-ui/react";
import {
  FaTwitter,
  FaFacebook,
  FaLink,
  FaDownload,
  FaCheck,
} from "react-icons/fa";
import { SiLens, SiFarcaster } from "react-icons/si";
import { useState, useEffect } from "react";
import { uploadImageToGrove } from "../utils/groveStorage";

export default function SocialShare({
  imageUrl,
  title = "Ghiblified via https://ghiblify-it.vercel.app 🌱",
}) {
  // Normalize imageUrl to a string to avoid conditional hooks
  const safeImageUrl = typeof imageUrl === "string" ? imageUrl : "";

  // Hooks must be declared unconditionally and in the same order
  const toast = useToast();
  const [sharingUrl, setSharingUrl] = useState(safeImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const { onCopy, hasCopied } = useClipboard(sharingUrl);

  // Prepare for sharing when component mounts or imageUrl changes
  useEffect(() => {
    let mounted = true;

    const prepareForSharing = async () => {
      // Reset states when image URL changes
      setIsOptimized(false);
      setSharingUrl(safeImageUrl);

      // If no URL, nothing to do
      if (!safeImageUrl) return;

      // Always try to upload to Grove for social sharing
      setIsUploading(true);
      try {
        const result = await uploadImageToGrove(safeImageUrl);

        if (!mounted) return;

        if (result && result.success && result.gatewayUrl) {
          setSharingUrl(result.gatewayUrl);
          setIsOptimized(true);
          toast({
            title: "Image optimized for sharing",
            description:
              "Using Grove storage for better social media compatibility",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
        } else {
          // If Grove upload fails, fallback to original URL
          if (safeImageUrl.startsWith("data:")) {
            toast({
              title: "Sharing may not work properly",
              description:
                "Unable to optimize image for sharing. Some platforms may not display the image.",
              status: "warning",
              duration: 5000,
              isClosable: true,
            });
          } else {
            setSharingUrl(safeImageUrl);
            toast({
              title: "Using original image URL",
              description:
                "Grove optimization failed, but sharing should still work",
              status: "info",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } catch (error) {
        if (mounted) {
          setSharingUrl(safeImageUrl);
        }
      } finally {
        if (mounted) {
          setIsUploading(false);
        }
      }
    };

    prepareForSharing();

    return () => {
      mounted = false;
    };
  }, [safeImageUrl, toast]);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(sharingUrl);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
  const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedTitle}&embeds[]=${encodedUrl}`;
  const lensUrl = `https://hey.xyz/?url=${encodedUrl}&text=${encodedTitle}`;

  const handleCopyLink = () => {
    onCopy();
    toast({
      title: "Link copied!",
      description: isOptimized
        ? "Optimized image URL has been copied to clipboard"
        : "Image URL has been copied to clipboard",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDownload = () => {
    if (!safeImageUrl) return;
    const link = document.createElement("a");
    link.href = safeImageUrl; // Always download the original image
    link.download = "ghiblified-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download started",
      description: "Your Ghiblified image is being downloaded",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Render consistently; if no URL, render disabled controls
  const isDisabled = !safeImageUrl;

  return (
    <Box>
      {isOptimized && !!safeImageUrl && (
        <HStack justify="center" spacing={1} mb={1}>
          <Icon as={FaCheck} color="green.500" boxSize={3} />
          <Text fontSize="xs" color="green.500">
            Optimized for social sharing
          </Text>
        </HStack>
      )}

      <HStack spacing={1} justify="center" mt={1}>
        {isUploading && (
          <>
            <Spinner size="sm" color="blue.500" mr={2} />
            <Text fontSize="sm" color="gray.500">
              Optimizing for sharing...
            </Text>
          </>
        )}

        <Tooltip label="Share on Twitter" hasArrow size="sm">
          <IconButton
            aria-label="Share on Twitter"
            icon={<FaTwitter />}
            colorScheme="twitter"
            onClick={() => window.open(twitterUrl, "_blank")}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>

        <Tooltip label="Share on Facebook" hasArrow size="sm">
          <IconButton
            aria-label="Share on Facebook"
            icon={<FaFacebook />}
            colorScheme="facebook"
            onClick={() => window.open(facebookUrl, "_blank")}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>

        <Tooltip label="Share on Farcaster" hasArrow size="sm">
          <IconButton
            aria-label="Share on Farcaster"
            icon={<SiFarcaster />}
            colorScheme="purple"
            onClick={() => window.open(farcasterUrl, "_blank")}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>

        <Tooltip label="Share on Lens" hasArrow size="sm">
          <IconButton
            aria-label="Share on Lens"
            icon={<SiLens />}
            colorScheme="green"
            onClick={() => window.open(lensUrl, "_blank")}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>

        <Tooltip label="Copy link" hasArrow size="sm">
          <IconButton
            aria-label="Copy link"
            icon={<FaLink />}
            colorScheme={hasCopied ? "green" : "gray"}
            onClick={handleCopyLink}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>

        <Tooltip label="Download image" hasArrow size="sm">
          <IconButton
            aria-label="Download image"
            icon={<FaDownload />}
            colorScheme="blue"
            onClick={handleDownload}
            size="sm"
            variant="ghost"
            isDisabled={isDisabled}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
