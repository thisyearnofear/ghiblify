/**
 * Simplified Dark Mode Toggle
 * 
 * CLEAN: Single responsibility, focused API
 * DRY: Uses centralized theme hook
 * MODULAR: Variants extracted to separate files if needed
 * ORGANIZED: Clear separation of concerns
 * PERFORMANT: Minimal re-renders, efficient animations
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  Box,
  Icon,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useGhibliTheme } from '../../hooks/useGhibliTheme';
import { useFarcasterColorMode } from '../../hooks/useFarcasterColorMode';

// Clean, focused interface
interface DarkModeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'glass' | 'solid';
  showTooltip?: boolean;
}

// Extracted animation for reusability
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
`;

// Single responsibility: just the toggle functionality
export const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  size = 'md',
  variant = 'glass',
  showTooltip = true,
}) => {
  const { colorMode, toggleColorMode, isColorModeReady, isFrameEnvironment } = useFarcasterColorMode();
  const { colors, patterns } = useGhibliTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleColorMode();
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Loading state to prevent hydration issues
  if (!isColorModeReady) {
    return (
      <IconButton
        size={size}
        variant="ghost"
        aria-label="Loading theme toggle"
        icon={<Icon as={FiSun as any} />}
        opacity={0.5}
      />
    );
  }

  const isDark = colorMode === 'dark';
  const IconComponent = isDark ? FiMoon : FiSun;
  const baseLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const label = isFrameEnvironment ? `${baseLabel} (Mini App)` : baseLabel;

  // Variant styles - could be extracted to theme if needed
  const variantStyles = {
    glass: patterns.glassButton,
    solid: {
      bg: colors.bg.card,
      border: '1px solid',
      borderColor: colors.border.primary,
      _hover: {
        bg: colors.interactive.hover,
        borderColor: colors.border.accent,
      },
    },
  };

  const buttonStyles = {
    ...variantStyles[variant],
    borderRadius: 'full',
    transition: 'all 0.2s ease',
    animation: isAnimating ? `${floatAnimation} 0.3s ease-in-out` : undefined,
    _hover: {
      ...variantStyles[variant]._hover,
      transform: 'translateY(-1px) scale(1.05)',
    },
    _active: {
      transform: 'translateY(0px) scale(0.98)',
    },
  };

  const toggleButton = (
    <IconButton
      size={size}
      aria-label={label}
      icon={<Icon as={IconComponent as any} />}
      onClick={handleToggle}
      sx={buttonStyles}
    />
  );

  if (!showTooltip) {
    return toggleButton;
  }

  return (
    <Tooltip
      label={label}
      placement="bottom"
      hasArrow
      bg={colors.bg.overlay}
      color={colors.text.inverted}
      fontSize="sm"
      px={3}
      py={2}
      borderRadius="md"
      openDelay={300}
    >
      {toggleButton}
    </Tooltip>
  );
};
