'use client';

import { 
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalBody, 
  ModalCloseButton,
  Text 
} from "@chakra-ui/react";
import { COLORS, PATTERNS } from "../../theme";

/**
 * Reusable magical modal component with Ghibli theming
 */
export default function MagicalModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  borderColor = COLORS.ghibli.green,
  ...props 
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered {...props}>
      <ModalOverlay {...PATTERNS.magicalOverlay} />
      <ModalContent
        {...PATTERNS.magicalModal}
        borderColor={borderColor}
      >
        <ModalCloseButton 
          color={COLORS.primary} 
          _hover={{ bg: "gray.100" }}
          borderRadius="full"
        />
        <ModalBody p={6}>
          {title && (
            <Text 
              fontSize="xl" 
              fontWeight="bold" 
              mb={title ? 6 : 4} 
              color={COLORS.primary}
              textAlign="center"
            >
              {title}
            </Text>
          )}
          {children}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}