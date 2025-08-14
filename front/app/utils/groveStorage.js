"use client";

/**
 * Utility for uploading images to Grove storage
 * Uses Grove's one-step upload for immutable content
 */
export async function uploadImageToGrove(imageUrl) {
  try {
    console.log("Starting Grove upload process");

    // Convert data URL or fetch remote URL to blob
    let imageBlob;
    let contentType = "image/png"; // Default content type

    if (imageUrl.startsWith("data:")) {
      // Handle data URL
      console.log("Processing data URL");
      // Extract content type if available
      if (imageUrl.includes(";")) {
        contentType = imageUrl.split(";")[0].split(":")[1];
        console.log("Detected content type:", contentType);
      }

      // Convert data URL to blob directly
      try {
        const byteString = atob(imageUrl.split(",")[1]);
        const mimeString = imageUrl.split(",")[0].split(":")[1].split(";")[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }

        imageBlob = new Blob([ab], { type: mimeString });
        console.log(
          "Successfully created blob from data URL, size:",
          imageBlob.size
        );
      } catch (e) {
        console.error("Error converting data URL to blob:", e);
        // Fallback to fetch API if direct conversion fails
        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
        console.log(
          "Used fetch API fallback for data URL, blob size:",
          imageBlob.size
        );
      }
    } else {
      // Handle remote URL
      console.log("Fetching remote URL:", imageUrl);
      try {
        const response = await fetch(imageUrl, {
          cache: "no-store", // Avoid caching issues
          mode: "cors", // Enable CORS
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        contentType = response.headers.get("Content-Type") || contentType;
        imageBlob = await response.blob();
        console.log(
          "Successfully fetched remote image, size:",
          imageBlob.size,
          "type:",
          contentType
        );
      } catch (e) {
        console.error("Error fetching remote URL:", e);
        throw new Error(`Failed to fetch image: ${e.message}`);
      }
    }

    // Verify we have a valid blob
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error("Invalid image blob: empty or null");
    }

    console.log(
      "Uploading to Grove, blob size:",
      imageBlob.size,
      "type:",
      contentType
    );

    // Use the simple one-step upload for immutable content on Celo Mainnet
    const uploadResponse = await fetch(
      `https://api.grove.storage/?chain_id=42220`,
      {
        method: "POST",
        body: imageBlob,
        headers: {
          "Content-Type": contentType,
        },
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Grove API error:", errorText);
      throw new Error(
        `Grove upload failed: ${uploadResponse.status} - ${errorText}`
      );
    }

    const data = await uploadResponse.json();
    console.log("Grove upload successful:", data);

    // Handle both array and object responses from Grove API
    const groveData = Array.isArray(data) ? data[0] : data;

    if (!groveData || !groveData.gateway_url) {
      throw new Error("Invalid response from Grove API - missing gateway_url");
    }

    return {
      success: true,
      storageKey: groveData.storage_key,
      gatewayUrl: groveData.gateway_url,
      uri: groveData.uri,
    };
  } catch (error) {
    console.error("Error uploading to Grove:", error);
    return {
      success: false,
      error: error.message,
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
  if (imageUrl.startsWith("data:")) {
    return true;
  }

  // Check if the URL is too long (over 2000 characters is problematic for most platforms)
  if (imageUrl.length > 2000) {
    return true;
  }

  // Check if the URL is from a source that might not be permanent
  // or might have CORS issues for social sharing
  if (
    imageUrl.includes("replicate.delivery") ||
    imageUrl.includes("localhost") ||
    imageUrl.includes("127.0.0.1")
  ) {
    return true;
  }

  return false;
}
