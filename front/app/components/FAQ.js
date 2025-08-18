import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
  Container,
  Link,
} from "@chakra-ui/react";
import { useGhibliTheme } from "../hooks/useGhibliTheme";

const faqs = [
  {
    question: "Ghiblify?",
    answer:
      "Ghiblify transforms your photos into the distinctive Studio Ghibli art style, bringing the magic of Ghibli's animation to your images.",
  },
  {
    question: "How do credits work?",
    answer:
      "Each image transformation requires 1 credit. Credits can be purchased using credit cards, cUSD stablecoin, Base Pay, or $GHIBLIFY tokens. Starter package gives 1 credit, Pro gives 12, and Unlimited gives 30 credits.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept four payment methods: (1) Credit/debit cards via Stripe, (2) cUSD stablecoin on Celo network (30% discount), (3) Base Pay with USDC (30% discount), and (4) $GHIBLIFY tokens (50% discount - our best deal!).",
  },
  {
    question: "What's the difference between Slow and Fast Ghibli?",
    answer:
      "Slow Ghibli (ComfyUI) offers higher quality, especially for close-ups, but takes 1-2 minutes. Fast Ghibli (Replicate) is quicker (30-60 seconds) and works pretty well for medium/long-range shots.",
  },
  {
    question: "What is a testnet and how do I get cUSD?",
    answer: (
      <>
        A testnet is a testing environment for blockchain applications where you
        can use test tokens for free. To get testnet cUSD:
        <br />
        1. Get testnet CELO from the{" "}
        <Link
          href="https://faucet.celo.org/"
          isExternal
          color="brand.500"
          textDecoration="underline"
          _hover={{ color: "brand.600" }}
        >
          Celo Faucet
        </Link>
        <br />
        2. Swap your CELO for cUSD on{" "}
        <Link
          href="https://app.mento.org/"
          isExternal
          color="brand.500"
          textDecoration="underline"
          _hover={{ color: "brand.600" }}
        >
          Mento
        </Link>
      </>
    ),
  },
  {
    question: "What is cUSD and why do I get a 30% discount?",
    answer:
      "cUSD is a stablecoin on the Celo network, meaning it's a digital currency that maintains a 1:1 value with the US Dollar. We offer a 30% discount for cUSD payments to encourage the adoption of decentralized payment methods. This means you can get the same credits for less money when paying with cUSD!",
  },
  {
    question: "What is Base Pay and how does it work?",
    answer:
      "Base Pay is a one-tap payment solution that allows you to pay with USDC on the Base network. You'll need a Base Account (free to create) to use this feature. Base Pay offers a 30% discount and provides fast, low-cost transactions with instant confirmation.",
  },
  {
    question: "What are $GHIBLIFY tokens and why the 50% discount?",
    answer:
      "$GHIBLIFY is our native project token on the Base network. By paying with $GHIBLIFY tokens, you get a massive 50% discount on all packages AND directly support the project's development. It's a win-win: you save money while helping us build more amazing features!",
  },
  {
    question: "How do I get $GHIBLIFY tokens?",
    answer:
      "You can purchase $GHIBLIFY tokens on decentralized exchanges like Uniswap (Base network). The token contract address is 0xc2B2EA7f6218CC37debBAFE71361C088329AE090. Always verify the contract address before trading!",
  },
  {
    question: "Not loading / slow?",
    answer:
      "Our servers take naps & need gentle prodding to awaken if no-one's used them for a little bit and/or lots of people do. Patience, reloading & good vibes appreciated.",
  },
];

export default function FAQ() {
  const { colors } = useGhibliTheme();

  return (
    <Container maxW="container.md" py={8}>
      <Text 
        fontSize="2xl" 
        fontWeight="bold" 
        mb={6} 
        textAlign="center"
        color={colors.text.primary}
      >
        Frequently Asked Questions
      </Text>
      <Accordion allowToggle>
        {faqs.map((faq, index) => (
          <AccordionItem key={index} border="none" mb={2}>
            <AccordionButton
              bg={colors.bg.secondary}
              _hover={{ bg: colors.interactive.hover }}
              borderRadius="md"
              border="1px solid"
              borderColor={colors.border.primary}
              transition="all 0.2s ease"
              color={colors.text.primary}
            >
              <Box flex="1" textAlign="left">
                <Text fontWeight="medium">{faq.question}</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} pt={4}>
              <Text color={colors.text.secondary}>{faq.answer}</Text>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  );
}
