import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Disable strict mode in production for better performance
  
  // Optimize for SPA-like behavior to make tab switching faster
  experimental: {
    // Enable optimizations
    optimizeCss: true,
    
    // More aggressive client-side caching
    workerThreads: true
  }
};

export default nextConfig;
