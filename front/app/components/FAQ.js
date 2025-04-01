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

const faqs = [
  {
    question: "Ghiblify?",
    answer:
      "Ghiblify transforms your photos into the distinctive Studio Ghibli art style, bringing the magic of Ghibli's animation to your images.",
  },
  {
    question: "How do credits work?",
    answer:
      "Each image transformation requires 1 credit. Credits can be purchased using Stripe or Celo's cUSD stablecoin. Starter package gives 1 credit, Pro gives 12, and Unlimited gives 30 credits.",
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
          color="blue.500"
          textDecoration="underline"
        >
          Celo Faucet
        </Link>
        <br />
        2. Swap your CELO for cUSD on{" "}
        <Link
          href="https://app.mento.org/"
          isExternal
          color="blue.500"
          textDecoration="underline"
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
    question: "Not loading / slow?",
    answer:
      "Our servers take naps & need gentle prodding to awaken if no-one's used them for a little bit and/or lots of people do. Patience, reloading & good vibes appreciated.",
  },
];

export default function FAQ() {
  return (
    <Container maxW="container.md" py={8}>
      <Text fontSize="2xl" fontWeight="bold" mb={6} textAlign="center">
        Frequently Asked Questions
      </Text>
      <Accordion allowToggle>
        {faqs.map((faq, index) => (
          <AccordionItem key={index} border="none" mb={2}>
            <AccordionButton
              bg="blue.50"
              _hover={{ bg: "blue.100" }}
              borderRadius="md"
            >
              <Box flex="1" textAlign="left">
                <Text fontWeight="medium">{faq.question}</Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <Text color="gray.600">{faq.answer}</Text>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  );
}
