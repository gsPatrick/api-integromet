/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.z-api.io',
            },
            {
                protocol: 'https',
                hostname: '**.whatsapp.net',
            },
        ],
    },
};

module.exports = nextConfig;
