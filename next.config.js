/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
          return [
            {
                      source: '/api/hl',
                      destination: 'https://api.hyperliquid.xyz/info',
            },
                ];
    },
};

module.exports = nextConfig;
