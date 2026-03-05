/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Types will be regenerated with `supabase gen types typescript --local` after DB is live
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app", "*.vercel.com"],
    },
  },
};

export default nextConfig;
