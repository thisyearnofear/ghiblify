"use client";

/**
 * Utility for uploading images to Grove storage
 * Uses Grove's one-step upload for immutable content
 */
export async function uploadImageToGrove(imageUrl) {
  try {
    // Convert data URL or fetch remote URL to blob
    let imageBlob;
    let contentType = 'image/png'; // Default content type
    
    if (imageUrl.startsWith('data:')) {
      // Handle data URL
      // Extract content type if available
      if (imageUrl.includes(';')) {
        contentType = imageUrl.split(';')[0].split(':')[1];
      }
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    } else {
      // Handle remote URL
      const response = await fetch(imageUrl);
      contentType = response.headers.get('Content-Type') || contentType;
      imageBlob = await response.blob();
    }

    // Use the simple one-step upload for immutable content on Celo Mainnet
    const uploadResponse = await fetch(`https://api.grove.storage/?chain_id=42220`, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': contentType,
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Grove upload failed: ${uploadResponse.status}`);
    }

    const data = await uploadResponse.json();
    
    return {
      success: true,
      storageKey: data.storage_key,
      gatewayUrl: data.gateway_url,
      uri: data.uri
    };
  } catch (error) {
    console.error("Error uploading to Grove:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if an image URL needs to be uploaded to Grove
 * @param {string} imageUrl - The URL of the image
 * @returns {boolean} - Whether the image needs to be uploaded to Grove
 */
export function needsExternalStorage(imageUrl) {
  // Check if it's a data URL (starts with data:)
  if (imageUrl.startsWith('data:')) {
    return true;
  }
  
  // Check if the URL is too long (over 2000 characters is problematic for most platforms)
  if (imageUrl.length > 2000) {
    return true;
  }
  
  // Check if the URL is from a source that might not be permanent
  // or might have CORS issues for social sharing
  if (imageUrl.includes('replicate.delivery') || 
      imageUrl.includes('localhost') || 
      imageUrl.includes('127.0.0.1')) {
    return true;
  }
  
  return false;
}
