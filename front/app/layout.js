import { ChakraProvider } from "@chakra-ui/react";
import { Web3Provider } from "./providers/Web3Provider";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";
import Navigation from "./components/Navigation";

export const metadata = {
  metadataBase: new URL('https://ghiblify-it.vercel.app'),
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["/ghibli-time.png"],
    type: "website",
    locale: "en_US",
    url: "https://ghiblify-it.vercel.app",
    siteName: "Ghiblify"
  },
  twitter: {
    card: "summary_large_image",
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["/ghibli-time.png"],
    creator: "@ghiblify"
  },
  other: {
    "fc:miniapp": "https://ghiblify-it.vercel.app/api/farcaster",
    "fc:miniapp:image": "https://ghiblify-it.vercel.app/ghibli-time.png",
    "fc:miniapp:button:1": "Transform Photo",
    "fc:miniapp:button:1:action": "launch",
    "fc:miniapp:button:1:target": "https://ghiblify-it.vercel.app"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="theme-color" content="#4FD1C5" />
      </head>
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
