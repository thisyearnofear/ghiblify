export async function imageUrlToFile(imageUrl, filename = "image.png") {
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Invalid image URL");
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to load image (${res.status})`);
  }

  const blob = await res.blob();
  const type = blob.type || "image/png";
  return new File([blob], filename, { type });
}
