/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
  experimental: {
    allowedDevOrigins: ["https://6000-firebase-beachpal-mostra-1-1769019234060.cluster-j6d3cbsvdbe5uxnhqrfzzeyj7i.cloudworkstations.dev"],
  },
};

export default nextConfig;
