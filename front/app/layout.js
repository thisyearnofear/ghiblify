import { ChakraProvider } from "@chakra-ui/react";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";
import { Web3Provider } from "./providers/Web3Provider";
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
        <ChakraProvider>
          <Web3Provider>
            <FarcasterFrameProvider>
              <Navigation />
              {children}
            </FarcasterFrameProvider>
          </Web3Provider>
        </ChakraProvider>
      </body>
    </html>
  );
}
