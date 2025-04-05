"use client";

/**
 * Utility for uploading images to Grove storage directly from the frontend
 */
export async function uploadImageToGrove(imageUrl) {
  try {
    // Convert data URL or fetch remote URL to blob
    let imageBlob;
    if (imageUrl.startsWith('data:')) {
      // Handle data URL
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    } else {
      // Handle remote URL
      const response = await fetch(imageUrl);
      imageBlob = await response.blob();
    }

    // Use the simple one-step upload for immutable content
    // Using Celo Mainnet chain ID (42220) as per the project's configuration
    const uploadResponse = await fetch(`https://api.grove.storage/?chain_id=42220`, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': imageBlob.type,
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
 * Check if an image URL is a data URL or very long URL that needs to be uploaded to Grove
 */
export function needsExternalStorage(imageUrl) {
  // Check if it's a data URL
  if (imageUrl.startsWith('data:')) {
    return true;
  }
  
  // Check if URL is too long (over 2000 chars is problematic for most platforms)
  if (imageUrl.length > 2000) {
    return true;
  }
  
  return false;
}
