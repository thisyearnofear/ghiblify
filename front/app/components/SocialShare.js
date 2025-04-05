"use client";

import { 
  HStack, 
  IconButton, 
  Tooltip, 
  useToast,
  useClipboard
} from "@chakra-ui/react";
import { 
  FaTwitter, 
  FaFacebook, 
  FaLink,
  FaDownload
} from "react-icons/fa";
import { SiLens, SiFarcaster } from "react-icons/si";

export default function SocialShare({ imageUrl, title = "Ghiblified by <a href='https://ghiblify-it.vercel.app'>ghiblify-it.vercel.app</a>" }) {
  const toast = useToast();
  const { onCopy } = useClipboard(imageUrl);
  
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(imageUrl);
  
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
    link.href = imageUrl;
    link.download = 'ghiblified-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
