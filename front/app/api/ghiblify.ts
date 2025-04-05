interface GhiblifyResponse {
  output: string;
}

interface GhiblifyRequest {
  imageUrl: string;
  apiChoice: "replicate" | "comfy";
}

interface ComfyGhiblifyResponse {
  output: string;
}

interface ComfyGhiblifyRequest {
  imageUrl: string;
}

export async function ghiblifyImage(
  imageUrl: string,
  apiChoice: "replicate" | "comfy" = "replicate"
): Promise<string> {
  try {
    // Use API_URL from environment or fallback to the render URL
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ghiblify.onrender.com";
    
    const response = await fetch(`${API_URL}/api/${apiChoice === "replicate" ? "replicate" : "comfyui"}/ghiblify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": typeof window !== "undefined" ? window.location.origin : "https://ghiblify-it.vercel.app",
      },
      credentials: "include",  // Include cookies for cross-origin requests
      mode: "cors",          // Explicitly set CORS mode
      body: JSON.stringify({
        imageUrl,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, just use the HTTP status
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error("Error during ghiblify API call:", error);
    throw error;
  }
}
