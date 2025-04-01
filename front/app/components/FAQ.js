import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Text,
  Container,
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
    question: "Slow v fast - what's the difference?",
    answer:
      "Slow Ghibli (ComfyUI) offers higher quality, especially for close-ups, but takes 1-2 minutes. Fast Ghibli (Replicate) is quicker (30-60 seconds) and works pretty well for medium/long-range shots.",
  },
  {
    question: "How do I save it?",
    answer:
      "Simply right-click on the transformed image and select 'Save Image As' to download it to your device.",
  },
  {
    question: "Stablecoin? 30% off?",
    answer:
      "This stablecoin, cUSD, is a digital currency that maintains a 1:1 value with the US Dollar. Supported by Celo, this initiative facilitates the adoption of decentralized payment methods.",
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
