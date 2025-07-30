/**
 * Image processing utilities for mobile optimization
 */

/**
 * Validates file type and size
 */
export function validateImageFile(file, maxSize = 10 * 1024 * 1024) {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  if (!file.type.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates optimized preview for mobile devices
 */
export function createOptimizedPreview(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate optimal preview size for mobile
          const isMobile = window.innerWidth <= 768;
          const targetSize = isMobile ? Math.min(maxSize, 300) : maxSize;
          const scale = Math.min(targetSize / img.width, targetSize / img.height);
          
          if (scale < 1) {
            // Resize for better mobile performance
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            // High quality scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Compress for mobile networks
            const quality = isMobile ? 0.8 : 0.9;
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            // Use original if already small enough
            resolve(e.target.result);
          }
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Tracks file loading progress with mobile optimization
 */
export function createProgressTracker() {
  let startTime = Date.now();
  
  return {
    onStart: () => {
      startTime = Date.now();
    },
    
    onProgress: (loaded, total) => {
      const progress = (loaded / total) * 100;
      const elapsed = Date.now() - startTime;
      
      // Detect slow network for mobile optimization
      if (progress < 50 && elapsed > 3000) {
        console.log('Slow network detected, optimizing for mobile...');
        return { progress, isSlowNetwork: true };
      }
      
      return { progress, isSlowNetwork: false };
    },
    
    estimateTimeRemaining: (loaded, total) => {
      const progress = loaded / total;
      const elapsed = Date.now() - startTime;
      
      if (progress > 0.1) {
        const estimatedTotal = elapsed / progress;
        return Math.max(0, estimatedTotal - elapsed);
      }
      
      return null;
    }
  };
}

/**
 * Gets optimal dimensions for different screen sizes
 */
export function getOptimalImageDimensions(screenWidth) {
  if (screenWidth <= 480) {
    return { width: 280, height: 280 }; // Small mobile
  } else if (screenWidth <= 768) {
    return { width: 320, height: 320 }; // Large mobile
  } else {
    return { width: 400, height: 400 }; // Desktop
  }
}

/**
 * Detects if device supports native camera
 */
export function supportsCamera() {
  return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
}

/**
 * Gets appropriate file input accept types based on device
 */
export function getAcceptTypes() {
  // More restrictive on mobile for better performance
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    return {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    };
  } else {
    return {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.bmp']
    };
  }
}