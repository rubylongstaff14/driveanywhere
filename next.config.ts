import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN access during `next dev` (phone / other machine / network URL).
  allowedDevOrigins: ["192.168.0.51"],
  images: {
    // Local SVG route previews are placeholders for Milestone 1.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/rapier"],
};

export default nextConfig;
