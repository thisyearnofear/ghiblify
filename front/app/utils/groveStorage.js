"use client";

// Determine API URL based on environment
const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://ghiblify.onrender.com";

/**
 * Utility for uploading images to Grove storage via our backend API
 */
export async function uploadImageToGrove(imageUrl) {
  try {
    // Determine if the image is a data URL or a regular URL
    const isBase64 = imageUrl.startsWith('data:');
    let imageData;
    
    if (isBase64) {
      // For data URLs, just pass the full URL
      imageData = imageUrl;
    } else {
      // For regular URLs, pass the URL as is
      imageData = imageUrl;
    }

    // Call our backend API to handle the upload to Grove
    const uploadResponse = await fetch(`${API_URL}/api/grove/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_data: imageData,
        is_base64: isBase64
      }),
      credentials: 'include' // Include cookies for authentication
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Grove upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const data = await uploadResponse.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unknown error during upload');
    }
    
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
