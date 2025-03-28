import { ChakraProvider } from "@chakra-ui/react";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from "./components/WagmiConfig";
import Navigation from "./components/Navigation";

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
        title: "Ghibli Time",
        action: {
          type: "launch_frame",
          name: "Ghiblify",
          url: "https://ghiblify-it.vercel.app/frame",
          splashImageUrl: "https://ghiblify-it.vercel.app/ghibli.ico",
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
            <FarcasterFrameProvider>
              <Navigation />
              {children}
            </FarcasterFrameProvider>
          </ChakraProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
