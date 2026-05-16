import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // unoptimized erlaubt beliebige externe URLs ohne Domain-Whitelist
    // (Cloudinary, IGDB, etc.) — für eine private App ausreichend
    unoptimized: true,
  },
};

export default nextConfig;
