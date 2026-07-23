/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros estritos de verificação de tipos durante o build na Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora avisos do linter no build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
