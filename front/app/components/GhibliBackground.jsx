/**
 * Ghibli Background Component
 * 
 * Lightweight, performant 3D background that enhances the Studio Ghibli experience
 * without sacrificing performance or user experience.
 * 
 * Follows Core Principles:
 * - ENHANCEMENT FIRST: Enhances existing UI rather than replacing it
 * - PREVENT BLOAT: Minimal implementation with adaptive loading
 * - MODULAR: Independent, composable component
 * - PERFORMANT: Adaptive loading, resource optimization
 */

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useGhibliTheme } from '../providers/GhibliThemeProvider';

// Lightweight particle system for Ghibli-style ambiance
export default function GhibliBackground() {
  const { isBackgroundEnabled } = useGhibliTheme();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Define theme-aware color palettes
  const ghibliLightColors = [
    'rgba(129, 197, 122, 0.7)', // Sage green
    'rgba(169, 217, 162, 0.6)', // Light sage
    'rgba(253, 231, 183, 0.5)', // Warm cream
    'rgba(255, 200, 124, 0.4)', // Soft orange
    'rgba(159, 202, 147, 0.5)', // Muted green
  ];

  const ghibliDarkColors = [
    'rgba(74, 110, 107, 0.7)',  // Muted teal
    'rgba(113, 158, 154, 0.6)', // Soft teal
    'rgba(213, 184, 138, 0.5)', // Pale gold
    'rgba(180, 130, 90, 0.4)',  // Faded brown
    'rgba(60, 90, 80, 0.5)',    // Deep green
  ];

  const particleColors = useColorModeValue(ghibliLightColors, ghibliDarkColors);
  const canvasBg = useColorModeValue('rgba(185, 220, 197, 0.05)', 'rgba(26, 32, 44, 0.1)');

  // Check for user preferences that affect performance
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    const powerPreference = navigator?.connection?.saveData || false;
    setPrefersReducedMotion(prev => prev || powerPreference);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Initialize particles
  const initParticles = useCallback(() => {
    if (!canvasRef.current || prefersReducedMotion) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 30 : 80;
    
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      color: particleColors[Math.floor(Math.random() * particleColors.length)],
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [prefersReducedMotion, particleColors]);

  // Draw Ghibli-inspired elements
  const drawGhibliElements = useCallback((ctx, canvas) => {
    const time = Date.now() * 0.0005;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 3; i++) {
      const x = (time * 20 + i * 100) % (canvas.width + 200) - 100;
      const y = 100 + Math.sin(time + i) * 30 + i * 150;
      
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 25, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();
    }
    ctx.restore();
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!canvasRef.current || prefersReducedMotion) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;
    
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGhibliElements(ctx, canvas);
    
    const time = Date.now() * 0.001;
    
    particles.forEach((particle) => {
      particle.x += Math.sin(time * particle.speed + particle.phase) * particle.vx;
      particle.y += Math.cos(time * particle.speed + particle.phase) * particle.vy;
      
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.y > canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = canvas.height;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [drawGhibliElements, prefersReducedMotion, canvasBg]);

  // Handle visibility changes
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else if (isBackgroundEnabled && isVisible && !prefersReducedMotion) {
      animate();
    }
  }, [animate, isBackgroundEnabled, isVisible, prefersReducedMotion]);

  // Initialize and start animation
  useEffect(() => {
    if (!isBackgroundEnabled || prefersReducedMotion) {
      // Clean up if disabled
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      setIsVisible(false);
      return;
    }
    
    setIsVisible(true);
    const cleanup = initParticles();
    animate();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (cleanup) cleanup();
    };
  }, [initParticles, animate, handleVisibilityChange, isBackgroundEnabled, prefersReducedMotion]);

  if (!isBackgroundEnabled || prefersReducedMotion) {
    return null;
  }

  return (
    <Box
      as="canvas"
      ref={canvasRef}
      position="fixed"
      top="0"
      left="0"
      zIndex="-1"
      width="100vw"
      height="100vh"
      style={{ pointerEvents: 'none' }}
    />
  );
}