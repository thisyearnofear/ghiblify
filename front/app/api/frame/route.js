export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const image = searchParams.get("image");

  return new Response(
    JSON.stringify({
      version: "next",
      image: {
        url:
          image ||
          "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/ghibli-time.png",
        aspectRatio: "1.91:1",
      },
      buttons: [
        {
          label: "Transform Photo",
          action: "post_redirect",
        },
      ],
      postUrl: "https://ghiblify-it.vercel.app",
      ogImage:
        image ||
        "https://ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com/wowowify/ghibli-time.png",
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
