/**
 * Cleanup utilities for maintaining DRY, CLEAN, MODULAR code
 */

// Common patterns to check for code cleanliness
export const CLEANUP_PATTERNS = {
  // Duplicated responsive breakpoints
  duplicatedBreakpoints: /\{\s*base:\s*['"]\w+['"],\s*md:\s*['"]\w+['"],?\s*\}/g,
  
  // Hardcoded colors that should use theme
  hardcodedColors: /#[0-9a-fA-F]{3,6}/g,
  
  // Inline styles that should be extracted
  inlineStyles: /style=\{\{[^}]+\}\}/g,
  
  // Large magic numbers that should be constants
  magicNumbers: /\b(?:400|500|600|700|800|900|1024|1200|1536)\b/g,
  
  // Console.log statements (should be removed in production)
  consoleLogs: /console\.(log|debug|info|warn|error)\s*\([^)]*\);?/g
};

// File organization suggestions
export const FILE_ORGANIZATION = {
  // Components that should be in separate files
  maxComponentLines: 200,
  
  // Functions that should be extracted to utils
  maxFunctionLines: 50,
  
  // Suggested folder structure
  structure: {
    'components/': 'React components',
    'hooks/': 'Custom React hooks', 
    'utils/': 'Pure utility functions',
    'config/': 'Configuration constants',
    'theme/': 'Theme and styling constants',
    'types/': 'TypeScript type definitions'
  }
};

// Performance optimization suggestions
export const PERFORMANCE_CHECKS = {
  // Components that should be lazy loaded
  heavyComponents: [
    'Pricing',
    'BatchGhiblify', 
    'FAQ',
    'CompareSlider'
  ],
  
  // Images that should be optimized
  imageOptimization: {
    maxSize: 1024 * 1024, // 1MB
    recommendedFormats: ['webp', 'avif', 'jpg'],
    responsiveSizes: [320, 640, 1024, 1920]
  },
  
  // Bundle size targets
  bundleTargets: {
    critical: '150KB', // Initial bundle
    total: '500KB'    // Total bundle
  }
};

/**
 * Analyzes code for cleanup opportunities
 */
export function analyzeCodeCleanup(fileContent, fileName) {
  const issues = [];
  
  // Check for duplicated patterns
  Object.entries(CLEANUP_PATTERNS).forEach(([pattern, regex]) => {
    const matches = fileContent.match(regex);
    if (matches && matches.length > 1) {
      issues.push({
        type: 'duplication',
        pattern,
        count: matches.length,
        suggestion: `Extract ${pattern} to shared constants`
      });
    }
  });
  
  // Check file size
  const lines = fileContent.split('\n').length;
  if (lines > FILE_ORGANIZATION.maxComponentLines) {
    issues.push({
      type: 'size',
      lines,
      suggestion: `Consider splitting ${fileName} into smaller components`
    });
  }
  
  // Check for console logs
  const consoleLogs = fileContent.match(CLEANUP_PATTERNS.consoleLogs);
  if (consoleLogs) {
    issues.push({
      type: 'debugging',
      count: consoleLogs.length,
      suggestion: 'Remove console.log statements before production'
    });
  }
  
  return issues;
}

/**
 * Suggests refactoring opportunities
 */
export function suggestRefactoring(codebase) {
  const suggestions = [];
  
  // Check for repeated responsive patterns
  const responsivePatterns = new Map();
  
  codebase.forEach(file => {
    const matches = file.content.match(CLEANUP_PATTERNS.duplicatedBreakpoints);
    if (matches) {
      matches.forEach(match => {
        responsivePatterns.set(match, (responsivePatterns.get(match) || 0) + 1);
      });
    }
  });
  
  // Suggest extracting repeated patterns
  responsivePatterns.forEach((count, pattern) => {
    if (count > 2) {
      suggestions.push({
        type: 'extract_constant',
        pattern,
        count,
        suggestion: `Extract responsive pattern used ${count} times to theme constants`
      });
    }
  });
  
  return suggestions;
}

/**
 * Bundle optimization recommendations
 */
export function optimizeBundleSize() {
  return {
    dynamicImports: PERFORMANCE_CHECKS.heavyComponents.map(component => ({
      component,
      suggestion: `Lazy load ${component} with dynamic import`
    })),
    
    treeShaking: [
      'Remove unused imports',
      'Use named imports instead of default imports where possible',
      'Split large utility files into smaller modules'
    ],
    
    codesplitting: [
      'Split routes into separate chunks',
      'Lazy load components below the fold',
      'Extract common dependencies into shared chunks'
    ]
  };
}

// Development helper to check code quality
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.codeCleanup = {
    analyzeCodeCleanup,
    suggestRefactoring,
    optimizeBundleSize,
    patterns: CLEANUP_PATTERNS
  };
}