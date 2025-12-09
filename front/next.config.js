/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ff315ddd5317cb560f09b5e51fe8252f.r2.cloudflarestorage.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination: "/api/farcaster",
      },
    ];
  },
};

export default nextConfig;
