import { ChakraProvider } from "@chakra-ui/react";
import { FarcasterFrameProvider } from "./components/FarcasterFrameProvider";

export const metadata = {
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: [
      "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/ghibli-time.png",
    ],
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
