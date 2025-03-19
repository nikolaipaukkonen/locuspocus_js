/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",  // <=== enables server-side features like API routes
  reactStrictMode: true,
};

module.exports = nextConfig;
