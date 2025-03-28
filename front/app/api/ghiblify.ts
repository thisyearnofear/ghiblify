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
    const response = await fetch("https://ghiblify.onrender.com/ghiblify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        apiChoice,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    return data.output;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
