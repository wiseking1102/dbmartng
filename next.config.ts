import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (temporary — swap to R2 when keys are available)
      // NOTE: If Supabase project changes, update this hostname to match
      {
        protocol: "https",
        hostname: "wnkurxheoroadoviwuxn.supabase.co",
      },
      // Cloudflare R2 — uncomment when credentials are available
      // {
      //   protocol: "https",
      //   hostname: "**.r2.cloudflarestorage.com",
      // },
      // {
      //   protocol: "https",
      //   hostname: "pub-[a-z0-9]+.r2.dev",
      // },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
