/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['claims.skyhealthtech.ca'] } },
};
export default nextConfig;
