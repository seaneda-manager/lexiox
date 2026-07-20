/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      { source: '/reading-2026',                       destination: '/updated-reading',                       permanent: true },
      { source: '/reading-2026/:path*',                destination: '/updated-reading/:path*',                permanent: true },
      { source: '/listening-2026',                     destination: '/updated-listening',                     permanent: true },
      { source: '/listening-2026/:path*',              destination: '/updated-listening/:path*',              permanent: true },
      { source: '/admin/content/reading-2026',         destination: '/admin/content/updated-reading',         permanent: true },
      { source: '/admin/content/reading-2026/:path*',  destination: '/admin/content/updated-reading/:path*',  permanent: true },
      { source: '/admin/content/listening-2026',       destination: '/admin/content/updated-listening',       permanent: true },
      { source: '/admin/content/listening-2026/:path*',destination: '/admin/content/updated-listening/:path*',permanent: true },
    ];
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
        protocol: "https",
        hostname: "efpghmqpitukeisugkmt.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
