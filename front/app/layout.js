import { ChakraProvider } from "@chakra-ui/react";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";

export const metadata = {
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["https://ghiblify-it.vercel.app/ghibli-time.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
    "fc:frame:button:1": "Transform Photo",
    "fc:frame:button:1:action": "post",
    "fc:frame:button:1:target": "https://ghiblify-it.vercel.app/api/frame",
    "fc:frame:post_url": "https://ghiblify-it.vercel.app/api/frame",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
        </ChakraProvider>
      </body>
    </html>
  );
}
