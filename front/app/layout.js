import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "./theme/chakra-theme";
import themeConfig from "./theme/config";
import { Web3Provider } from "./providers/Web3Provider";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";
import Navigation from "./components/Navigation";

export const metadata = {
  metadataBase: new URL("https://ghiblify-it.vercel.app"),
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["/ghibli-time.png"],
    type: "website",
    locale: "en_US",
    url: "https://ghiblify-it.vercel.app",
    siteName: "Ghiblify",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["/ghibli-time.png"],
    creator: "@ghiblify",
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://ghiblify-it.vercel.app/ghibli-time-og.png",
      button: {
        title: "Ghiblify",
        action: {
          type: "launch_frame",
          name: "Ghiblify",
          url: "https://ghiblify-it.vercel.app",
          splashImageUrl: "https://ghiblify-it.vercel.app/ghibli-it-splash.png",
          splashBackgroundColor: "#4FD1C5",
        },
      },
    }),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="theme-color" content="#4FD1C5" />
      </head>
      <body>
        <ColorModeScript initialColorMode={themeConfig.initialColorMode} />
        <ChakraProvider theme={theme}>
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
