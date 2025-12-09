/**
 * Ghibli Background Component - Premium Hybrid Edition
 * 
 * High-fidelity Studio Ghibli-inspired animated background using hybrid
 * Canvas + SVG approach for maximum visual quality while maintaining performance.
 * 
 * Architecture:
 * - Canvas: Animated gradient sky with subtle color shifts
 * - SVG Layers: Clouds, soot sprites, floating seeds, grass (CSS-animated)
 * - Atmospheric depth via blur filters and opacity gradients
 * 
 * Core Principles:
 * - ENHANCEMENT FIRST: Major quality upgrade from basic canvas
 * - AGGRESSIVE CONSOLIDATION: Single component, no separate files
 * - PREVENT BLOAT: Pure SVG + Canvas, no external libraries
 * - DRY: Shared color palettes and animation utilities
 * - CLEAN: Clear layer separation (sky → clouds → elements → grass)
 * - MODULAR: Each SVG element generator is independent
 * - PERFORMANT: CSS animations (GPU), visibility-aware, reduced motion support
 * - ORGANIZED: Logical code structure by visual layer
 */

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useGhibliTheme } from '../providers/GhibliThemeProvider';

// ============================================================================
// GHIBLI COLOR PALETTES - Film-accurate color grading
// ============================================================================

const PALETTES = {
  light: {
    sky: {
      top: '#7EC8E3',
      middle: '#B4D4E7',
      bottom: '#F5E6D3',
      accent: '#FFE4B5',
    },
    clouds: {
      main: '#FFFFFF',
      shadow: '#D4E5F7',
      highlight: '#FFFFFF',
      outline: 'rgba(180, 200, 220, 0.3)',
    },
    grass: {
      far: '#8FB573',
      mid: '#6B9B4E',
      near: '#4A7C31',
    },
    soot: {
      body: '#2D2D3A',
      eyes: '#FFFFFF',
      glow: 'rgba(255, 255, 255, 0.6)',
    },
    seeds: '#FFFFFF',
    atmosphere: 'rgba(255, 255, 255, 0.15)',
  },
  dark: {
    sky: {
      top: '#0F1419',
      middle: '#1A2332',
      bottom: '#2D3A4D',
      accent: '#3D4A5C',
    },
    clouds: {
      main: 'rgba(60, 75, 95, 0.7)',
      shadow: 'rgba(30, 40, 55, 0.5)',
      highlight: 'rgba(90, 105, 125, 0.8)',
      outline: 'rgba(100, 120, 150, 0.2)',
    },
    grass: {
      far: '#1E3328',
      mid: '#152821',
      near: '#0D1D18',
    },
    soot: {
      body: '#1A1A24',
      eyes: '#FFFDE7',
      glow: 'rgba(255, 253, 231, 0.4)',
    },
    seeds: 'rgba(200, 210, 230, 0.7)',
    atmosphere: 'rgba(30, 40, 60, 0.2)',
  }
};

// ============================================================================
// SVG GENERATORS - High-quality vector elements
// ============================================================================

// Generate a puffy Ghibli-style cloud path
const generateCloudPath = (baseX, baseY, scale = 1) => {
  const s = scale;
  // Organic, hand-drawn style cloud shape
  return `
    M ${baseX - 60 * s} ${baseY + 10 * s}
    C ${baseX - 70 * s} ${baseY - 10 * s}, ${baseX - 50 * s} ${baseY - 35 * s}, ${baseX - 25 * s} ${baseY - 30 * s}
    C ${baseX - 30 * s} ${baseY - 55 * s}, ${baseX - 5 * s} ${baseY - 60 * s}, ${baseX + 15 * s} ${baseY - 45 * s}
    C ${baseX + 25 * s} ${baseY - 65 * s}, ${baseX + 55 * s} ${baseY - 55 * s}, ${baseX + 55 * s} ${baseY - 35 * s}
    C ${baseX + 75 * s} ${baseY - 35 * s}, ${baseX + 85 * s} ${baseY - 15 * s}, ${baseX + 70 * s} ${baseY + 5 * s}
    C ${baseX + 80 * s} ${baseY + 20 * s}, ${baseX + 60 * s} ${baseY + 30 * s}, ${baseX + 40 * s} ${baseY + 25 * s}
    C ${baseX + 30 * s} ${baseY + 35 * s}, ${baseX + 5 * s} ${baseY + 35 * s}, ${baseX - 15 * s} ${baseY + 25 * s}
    C ${baseX - 35 * s} ${baseY + 35 * s}, ${baseX - 55 * s} ${baseY + 25 * s}, ${baseX - 60 * s} ${baseY + 10 * s}
    Z
  `;
};

// Soot Sprite (Susuwatari) SVG component
const SootSprite = ({ id, x, y, size, palette, delay }) => {
  const fuzzPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const variance = 0.15 + Math.random() * 0.2;
      points.push({
        angle,
        dist: size * (0.8 + variance),
      });
    }
    return points;
  }, [size]);

  const fuzzPath = useMemo(() => {
    let path = `M ${x + fuzzPoints[0].dist * Math.cos(fuzzPoints[0].angle)} ${y + fuzzPoints[0].dist * Math.sin(fuzzPoints[0].angle)}`;
    for (let i = 1; i <= fuzzPoints.length; i++) {
      const curr = fuzzPoints[i % fuzzPoints.length];
      const next = fuzzPoints[(i + 1) % fuzzPoints.length];
      const cp1x = x + curr.dist * 1.1 * Math.cos(curr.angle + 0.15);
      const cp1y = y + curr.dist * 1.1 * Math.sin(curr.angle + 0.15);
      path += ` Q ${cp1x} ${cp1y} ${x + next.dist * Math.cos(next.angle)} ${y + next.dist * Math.sin(next.angle)}`;
    }
    return path;
  }, [x, y, fuzzPoints]);

  return (
    <g
      style={{
        animation: `sootFloat 4s ease-in-out ${delay}s infinite, sootDrift 25s linear ${delay}s infinite`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      {/* Fuzzy body */}
      <path
        d={fuzzPath}
        fill={palette.body}
        filter="url(#sootBlur)"
      />

      {/* Core body */}
      <circle cx={x} cy={y} r={size * 0.6} fill={palette.body} />

      {/* Eye glow */}
      <ellipse
        cx={x - size * 0.18}
        cy={y - size * 0.1}
        rx={size * 0.2}
        ry={size * 0.22}
        fill={palette.glow}
        filter="url(#glow)"
      />
      <ellipse
        cx={x + size * 0.18}
        cy={y - size * 0.1}
        rx={size * 0.2}
        ry={size * 0.22}
        fill={palette.glow}
        filter="url(#glow)"
      />

      {/* Eyes */}
      <ellipse
        cx={x - size * 0.18}
        cy={y - size * 0.1}
        rx={size * 0.14}
        ry={size * 0.16}
        fill={palette.eyes}
      />
      <ellipse
        cx={x + size * 0.18}
        cy={y - size * 0.1}
        rx={size * 0.14}
        ry={size * 0.16}
        fill={palette.eyes}
      />

      {/* Pupils */}
      <circle cx={x - size * 0.15} cy={y - size * 0.08} r={size * 0.05} fill={palette.body} />
      <circle cx={x + size * 0.21} cy={y - size * 0.08} r={size * 0.05} fill={palette.body} />

      {/* Little legs */}
      {[...Array(5)].map((_, i) => (
        <line
          key={i}
          x1={x + (i - 2) * size * 0.2}
          y1={y + size * 0.5}
          x2={x + (i - 2) * size * 0.2 + (i % 2 ? 3 : -3)}
          y2={y + size * 0.75}
          stroke={palette.body}
          strokeWidth={2}
          strokeLinecap="round"
          style={{
            animation: `legWiggle 0.5s ease-in-out ${delay + i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </g>
  );
};

// Floating seed/spore SVG component  
const FloatingSeed = ({ id, startX, startY, palette, delay, duration }) => (
  <g
    style={{
      animation: `seedFloat ${duration}s linear ${delay}s infinite`,
      opacity: 0.8,
    }}
  >
    {/* Seed body */}
    <ellipse
      cx={startX}
      cy={startY}
      rx={2}
      ry={4}
      fill={palette}
      transform={`rotate(45 ${startX} ${startY})`}
    />
    {/* Fluffy filaments */}
    {[...Array(8)].map((_, i) => {
      const angle = (i / 8) * Math.PI + Math.PI / 2;
      const length = 8 + Math.random() * 4;
      return (
        <g key={i}>
          <line
            x1={startX}
            y1={startY - 3}
            x2={startX + Math.cos(angle) * length}
            y2={startY - 3 + Math.sin(angle) * length * 0.5 - length * 0.8}
            stroke={palette}
            strokeWidth={0.5}
            opacity={0.7}
          />
          <circle
            cx={startX + Math.cos(angle) * length}
            cy={startY - 3 + Math.sin(angle) * length * 0.5 - length * 0.8}
            r={1}
            fill={palette}
            opacity={0.6}
          />
        </g>
      );
    })}
  </g>
);

// Grass blade path generator
const generateGrassBlade = (x, height, width, curve) => {
  return `
    M ${x - width / 2} 100%
    Q ${x + curve * 0.3} ${100 - height * 0.6}%, ${x + curve} ${100 - height}%
    Q ${x + curve * 0.3} ${100 - height * 0.6}%, ${x + width / 2} 100%
    Z
  `;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GhibliBackground() {
  const { isBackgroundEnabled } = useGhibliTheme();
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Theme-aware palette
  const isDark = useColorModeValue(false, true);
  const palette = isDark ? PALETTES.dark : PALETTES.light;

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Canvas sky animation
  useEffect(() => {
    if (!canvasRef.current || prefersReducedMotion || !isBackgroundEnabled) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    let time = 0;
    const animate = () => {
      time += 0.002;

      // Subtle sky color animation
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      const shift = Math.sin(time) * 0.05;

      gradient.addColorStop(0, palette.sky.top);
      gradient.addColorStop(0.4 + shift, palette.sky.middle);
      gradient.addColorStop(0.75, palette.sky.bottom);
      gradient.addColorStop(1, palette.sky.accent);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dimensions, palette, prefersReducedMotion, isBackgroundEnabled]);

  // Generate elements with memoization
  const clouds = useMemo(() => {
    if (dimensions.width === 0) return [];
    const isMobile = dimensions.width < 768;
    return [
      // Far layer (blurred, slow)
      { x: '10%', y: 80, scale: 0.6, layer: 'far', delay: 0, duration: 120 },
      { x: '50%', y: 50, scale: 0.5, layer: 'far', delay: 40, duration: 100 },
      { x: '85%', y: 100, scale: 0.55, layer: 'far', delay: 20, duration: 110 },
      // Mid layer
      { x: '25%', y: 120, scale: 0.8, layer: 'mid', delay: 10, duration: 80 },
      { x: '70%', y: 90, scale: 0.9, layer: 'mid', delay: 30, duration: 70 },
      // Near layer (sharp, faster)
      ...(isMobile ? [] : [
        { x: '40%', y: 150, scale: 1.1, layer: 'near', delay: 5, duration: 50 },
      ]),
    ];
  }, [dimensions.width]);

  const sootSprites = useMemo(() => {
    if (dimensions.width === 0) return [];
    const isMobile = dimensions.width < 768;
    const count = isMobile ? 3 : 5;
    return [...Array(count)].map((_, i) => ({
      id: `soot-${i}`,
      x: 50 + (i * dimensions.width / count),
      y: dimensions.height * (0.5 + Math.random() * 0.3),
      size: 18 + Math.random() * 12,
      delay: i * 2,
    }));
  }, [dimensions]);

  const seeds = useMemo(() => {
    if (dimensions.width === 0) return [];
    const isMobile = dimensions.width < 768;
    const count = isMobile ? 10 : 25;
    return [...Array(count)].map((_, i) => ({
      id: `seed-${i}`,
      startX: Math.random() * dimensions.width,
      startY: Math.random() * dimensions.height * 0.7,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 10,
    }));
  }, [dimensions]);

  const grassBlades = useMemo(() => {
    if (dimensions.width === 0) return [];
    const isMobile = dimensions.width < 768;
    const blades = [];
    const density = isMobile ? 40 : 80;

    // Far, mid, near layers
    [
      { layer: 'far', count: density * 0.5, heightRange: [5, 12], color: palette.grass.far },
      { layer: 'mid', count: density * 0.7, heightRange: [8, 15], color: palette.grass.mid },
      { layer: 'near', count: density, heightRange: [10, 22], color: palette.grass.near },
    ].forEach(({ layer, count, heightRange, color }) => {
      for (let i = 0; i < count; i++) {
        blades.push({
          id: `grass-${layer}-${i}`,
          layer,
          x: (i / count) * 100 + Math.random() * 2,
          height: heightRange[0] + Math.random() * (heightRange[1] - heightRange[0]),
          width: 0.3 + Math.random() * 0.4,
          curve: (Math.random() - 0.5) * 3,
          color,
          delay: Math.random() * 2,
        });
      }
    });
    return blades;
  }, [dimensions, palette.grass]);

  if (!isBackgroundEnabled) return null;

  const animationStyles = prefersReducedMotion ? '' : `
    @keyframes cloudDrift {
      from { transform: translateX(-20%); }
      to { transform: translateX(120%); }
    }
    @keyframes sootFloat {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      25% { transform: translateY(-8px) rotate(-2deg); }
      75% { transform: translateY(5px) rotate(2deg); }
    }
    @keyframes sootDrift {
      from { transform: translateX(0); }
      to { transform: translateX(${dimensions.width + 100}px); }
    }
    @keyframes seedFloat {
      0% { 
        transform: translate(0, 0) rotate(0deg);
        opacity: 0;
      }
      5% { opacity: 0.8; }
      95% { opacity: 0.8; }
      100% { 
        transform: translate(${dimensions.width * 0.3}px, ${dimensions.height * 0.4}px) rotate(360deg);
        opacity: 0;
      }
    }
    @keyframes grassSway {
      0%, 100% { transform: skewX(0deg); }
      25% { transform: skewX(2deg); }
      75% { transform: skewX(-2deg); }
    }
    @keyframes legWiggle {
      from { transform: rotate(-5deg); }
      to { transform: rotate(5deg); }
    }
  `;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      zIndex="-1"
      overflow="hidden"
      pointerEvents="none"
    >
      {/* Inline animation styles */}
      <style>{animationStyles}</style>

      {/* Layer 1: Canvas Sky */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* Layer 2: SVG Elements */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
        viewBox={`0 0 ${dimensions.width || 1920} ${dimensions.height || 1080}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Filters for effects */}
        <defs>
          {/* Cloud gradients */}
          <linearGradient id="cloudGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.clouds.highlight} />
            <stop offset="50%" stopColor={palette.clouds.main} />
            <stop offset="100%" stopColor={palette.clouds.shadow} />
          </linearGradient>

          {/* Blur filters for depth */}
          <filter id="farBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="midBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1" />
          </filter>
          <filter id="sootBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Clouds - layered for depth */}
        <g className="clouds">
          {clouds.map((cloud, i) => (
            <g
              key={`cloud-${i}`}
              style={{
                animation: prefersReducedMotion ? 'none' : `cloudDrift ${cloud.duration}s linear ${cloud.delay}s infinite`,
              }}
              filter={cloud.layer === 'far' ? 'url(#farBlur)' : cloud.layer === 'mid' ? 'url(#midBlur)' : undefined}
              opacity={cloud.layer === 'far' ? 0.6 : cloud.layer === 'mid' ? 0.8 : 1}
            >
              {/* Cloud shadow */}
              <path
                d={generateCloudPath(parseFloat(cloud.x) * dimensions.width / 100, cloud.y + 8, cloud.scale)}
                fill={palette.clouds.shadow}
              />
              {/* Cloud body */}
              <path
                d={generateCloudPath(parseFloat(cloud.x) * dimensions.width / 100, cloud.y, cloud.scale)}
                fill="url(#cloudGradient)"
                stroke={palette.clouds.outline}
                strokeWidth={1}
              />
            </g>
          ))}
        </g>

        {/* Floating seeds */}
        <g className="seeds">
          {seeds.map((seed) => (
            <FloatingSeed
              key={seed.id}
              {...seed}
              palette={palette.seeds}
            />
          ))}
        </g>

        {/* Soot sprites */}
        <g className="soot-sprites">
          {sootSprites.map((sprite) => (
            <SootSprite
              key={sprite.id}
              {...sprite}
              palette={palette.soot}
            />
          ))}
        </g>

        {/* Grass layers */}
        <g className="grass">
          {['far', 'mid', 'near'].map((layer) => (
            <g
              key={`grass-layer-${layer}`}
              filter={layer === 'far' ? 'url(#farBlur)' : undefined}
              opacity={layer === 'far' ? 0.7 : layer === 'mid' ? 0.85 : 1}
              style={{
                animation: prefersReducedMotion ? 'none' : `grassSway ${layer === 'near' ? 3 : layer === 'mid' ? 4 : 5}s ease-in-out infinite`,
                transformOrigin: 'bottom center',
              }}
            >
              {grassBlades
                .filter((b) => b.layer === layer)
                .map((blade) => (
                  <path
                    key={blade.id}
                    d={`
                      M ${blade.x * dimensions.width / 100 - blade.width} ${dimensions.height}
                      Q ${blade.x * dimensions.width / 100 + blade.curve * 5} ${dimensions.height - blade.height * dimensions.height / 100 * 0.6}
                        ${blade.x * dimensions.width / 100 + blade.curve * 8} ${dimensions.height - blade.height * dimensions.height / 100}
                      Q ${blade.x * dimensions.width / 100 + blade.curve * 5} ${dimensions.height - blade.height * dimensions.height / 100 * 0.6}
                        ${blade.x * dimensions.width / 100 + blade.width} ${dimensions.height}
                      Z
                    `}
                    fill={blade.color}
                  />
                ))}
            </g>
          ))}
        </g>

        {/* Atmospheric haze overlay */}
        <rect
          x="0"
          y={dimensions.height * 0.7}
          width="100%"
          height={dimensions.height * 0.3}
          fill="url(#atmosphereGradient)"
        />
        <defs>
          <linearGradient id="atmosphereGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={palette.atmosphere} stopOpacity="0" />
            <stop offset="100%" stopColor={palette.atmosphere} stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
    </Box>
  );
}