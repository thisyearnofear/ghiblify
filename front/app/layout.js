import { ChakraProvider } from "@chakra-ui/react";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";
import { WagmiConfig } from "./components/WagmiConfig";

export const metadata = {
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["https://ghiblify-it.vercel.app/ghibli-time.png"],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://ghiblify-it.vercel.app/ghibli-time.png",
      button: {
        title: "Transform Photo",
        action: {
          type: "launch_frame",
          name: "Ghiblify",
          url: "https://ghiblify-it.vercel.app",
          splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it.png",
          splashBackgroundColor: "#ffffff",
        },
      },
    }),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WagmiConfig>
          <ChakraProvider>
            <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
          </ChakraProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
