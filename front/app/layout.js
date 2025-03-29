import { ChakraProvider } from "@chakra-ui/react";
import { Web3Provider } from "./providers/Web3Provider";
import Navigation from "./components/Navigation";

export const metadata = {
  metadataBase: new URL('https://ghiblify-it.vercel.app'),
  title: "Ghiblify",
  description: "Transform your photos into Studio Ghibli style art",
  openGraph: {
    title: "Ghiblify",
    description: "Transform your photos into Studio Ghibli style art",
    images: ["/ghibli-time.png"],
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ChakraProvider>
          <Web3Provider>
            <Navigation />
            {children}
          </Web3Provider>
        </ChakraProvider>
      </body>
    </html>
  );
}
