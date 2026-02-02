import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AWS Amplify handles Next.js SSR natively - no output config needed
  // Dynamic routes work automatically without generateStaticParams workarounds

  // Skip type checking during build (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build (run separately)
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    // Enable image optimization on Amplify
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
