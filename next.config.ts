import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/primary-details", destination: "/details", permanent: true },
      { source: "/primary-output", destination: "/details", permanent: true },
      { source: "/reference", destination: "/intelligence", permanent: true },
      { source: "/category/:cat/valuation", destination: "/valuation", permanent: true },
      { source: "/category/:cat/payoff", destination: "/payoff", permanent: true },
      { source: "/category/:cat", destination: "/desk", permanent: true },
    ];
  },
};

export default nextConfig;
