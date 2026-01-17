/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is required to fix a Next.js issue with cross-origin requests in a dev environment.
  // The warning about this will become an error in a future version.
  allowedDevOrigins: [
      'https://6000-firebase-studio-1767846791168.cluster-j6d3cbsvdbe5uxnhqrfzzeyj7i.cloudworkstations.dev'
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      }
    ],
  },
};

export default nextConfig;
