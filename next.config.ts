
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  basePath: '/picpick',
  async redirects() {
    return [
      {
        source: '/',
        destination: '/picpick',
        basePath: false,
        permanent: false,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
