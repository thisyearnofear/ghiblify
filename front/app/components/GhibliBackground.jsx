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
import { Box } from '@chakra-ui/react';

// Lightweight particle system for Ghibli-style ambiance
export default function GhibliBackground({ isEnabled = true }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for user preferences that affect performance
  useEffect(() => {
    // Respect user's motion preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    // Check for low power mode or battery saving
    const powerPreference = navigator?.connection?.saveData || false;
    setPrefersReducedMotion(prev => prev || powerPreference);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Initialize particles with Ghibli-inspired colors and movements
  const initParticles = useCallback(() => {
    if (!canvasRef.current || prefersReducedMotion) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create particles with Studio Ghibli color palette
    const ghibliColors = [
      'rgba(129, 197, 122, 0.7)',  // Sage green
      'rgba(169, 217, 162, 0.6)',  // Light sage
      'rgba(253, 231, 183, 0.5)',  // Warm cream
      'rgba(255, 200, 124, 0.4)',  // Soft orange
      'rgba(159, 202, 147, 0.5)',  // Muted green
    ];
    
    // Create fewer particles on mobile or for performance
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 30 : 80;
    
    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      color: ghibliColors[Math.floor(Math.random() * ghibliColors.length)],
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [prefersReducedMotion]);

  // Draw Ghibli-inspired elements (floating clouds, leaves, etc.)
  const drawGhibliElements = useCallback((ctx, canvas) => {
    const time = Date.now() * 0.0005;
    
    // Draw subtle floating elements inspired by Ghibli scenes
    ctx.save();
    
    // Draw gentle cloud-like shapes
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

  // Animation loop for particles
  const animate = useCallback(() => {
    if (!canvasRef.current || prefersReducedMotion) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const particles = particlesRef.current;
    
    // Clear with subtle fade for trailing effect
    ctx.fillStyle = 'rgba(185, 220, 197, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw Ghibli-inspired background elements
    drawGhibliElements(ctx, canvas);
    
    // Update and draw particles
    const time = Date.now() * 0.001;
    
    particles.forEach((particle) => {
      // Gentle floating motion inspired by Ghibli's whimsical style
      particle.x += Math.sin(time * particle.speed + particle.phase) * particle.vx;
      particle.y += Math.cos(time * particle.speed + particle.phase) * particle.vy;
      
      // Wrap around edges
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.y > canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = canvas.height;
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [drawGhibliElements, prefersReducedMotion]);

  // Handle visibility changes to pause animation when not visible
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    } else if (isEnabled && isVisible && !prefersReducedMotion) {
      animate();
    }
  }, [animate, isEnabled, isVisible, prefersReducedMotion]);

  // Initialize and start animation
  useEffect(() => {
    if (!isEnabled || prefersReducedMotion) return;
    
    setIsVisible(true);
    const cleanup = initParticles();
    animate();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (cleanup) cleanup();
    };
  }, [initParticles, animate, handleVisibilityChange, isEnabled, prefersReducedMotion]);

  if (!isEnabled || prefersReducedMotion) {
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