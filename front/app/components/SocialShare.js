"use client";

import { 
  HStack, 
  IconButton, 
  Tooltip, 
  useToast,
  useClipboard,
  Spinner
} from "@chakra-ui/react";
import { 
  FaTwitter, 
  FaFacebook, 
  FaLink,
  FaDownload
} from "react-icons/fa";
import { SiLens, SiFarcaster } from "react-icons/si";
import { useState, useEffect } from "react";
import { uploadImageToGrove, needsExternalStorage } from "../utils/groveStorage";

export default function SocialShare({ imageUrl, title = "Ghiblified by https://ghiblify-it.vercel.app" }) {
  const toast = useToast();
  const [sharingUrl, setSharingUrl] = useState(imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const { onCopy } = useClipboard(sharingUrl);
  
  // Prepare for sharing when component mounts or imageUrl changes
  useEffect(() => {
    const prepareForSharing = async () => {
      // Check if we need to upload to Grove
      if (needsExternalStorage(imageUrl)) {
        setIsUploading(true);
        try {
          const result = await uploadImageToGrove(imageUrl);
          if (result.success) {
            setSharingUrl(result.gatewayUrl);
          } else {
            // If Grove upload fails, fallback to original URL
            console.warn("Grove upload failed, using original URL", result.error);
            setSharingUrl(imageUrl);
          }
        } catch (error) {
          console.error("Error preparing image for sharing:", error);
          setSharingUrl(imageUrl);
        } finally {
          setIsUploading(false);
        }
      } else {
        setSharingUrl(imageUrl);
      }
    };
    
    prepareForSharing();
  }, [imageUrl]);
  
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(sharingUrl);
  
  // Social media share URLs
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`;
  const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedTitle}&embeds[]=${encodedUrl}`;
  const lensUrl = `https://hey.xyz/?url=${encodedUrl}&text=${encodedTitle}`;

  const handleCopyLink = () => {
    onCopy();
    toast({
      title: "Link copied!",
      description: "Image URL has been copied to clipboard",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl; // Always download the original image
    link.download = 'ghiblified-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If still uploading to Grove, show a loading spinner
  if (isUploading) {
    return (
      <HStack spacing={1} justify="center" mt={1}>
        <Spinner size="sm" color="blue.500" mr={2} />
        <Tooltip label="Download image" hasArrow size="sm">
          <IconButton
            aria-label="Download image"
            icon={<FaDownload />}
            colorScheme="blue"
            onClick={handleDownload}
            size="sm"
            variant="ghost"
          />
        </Tooltip>
      </HStack>
    );
  }

  return (
    <HStack spacing={1} justify="center" mt={1}>
      <Tooltip label="Share on Twitter" hasArrow size="sm">
        <IconButton
          aria-label="Share on Twitter"
          icon={<FaTwitter />}
          colorScheme="twitter"
          onClick={() => window.open(twitterUrl, '_blank')}
          size="sm"
          variant="ghost"
        />
      </Tooltip>
      
      <Tooltip label="Share on Facebook" hasArrow size="sm">
        <IconButton
          aria-label="Share on Facebook"
          icon={<FaFacebook />}
          colorScheme="facebook"
          onClick={() => window.open(facebookUrl, '_blank')}
          size="sm"
          variant="ghost"
        />
      </Tooltip>
      
      <Tooltip label="Share on Farcaster" hasArrow size="sm">
        <IconButton
          aria-label="Share on Farcaster"
          icon={<SiFarcaster />}
          colorScheme="purple"
          onClick={() => window.open(farcasterUrl, '_blank')}
          size="sm"
          variant="ghost"
        />
      </Tooltip>
      
      <Tooltip label="Share on Lens" hasArrow size="sm">
        <IconButton
          aria-label="Share on Lens"
          icon={<SiLens />}
          colorScheme="green"
          onClick={() => window.open(lensUrl, '_blank')}
          size="sm"
          variant="ghost"
        />
      </Tooltip>
      
      <Tooltip label="Copy link" hasArrow size="sm">
        <IconButton
          aria-label="Copy link"
          icon={<FaLink />}
          colorScheme="gray"
          onClick={handleCopyLink}
          size="sm"
          variant="ghost"
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
        />
      </Tooltip>
    </HStack>
  );
}
