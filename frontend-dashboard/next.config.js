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
            {
                protocol: 'https',
                hostname: 'n8n-apintegromat.r954jc.easypanel.host',
            },
            {
                protocol: 'https',
                hostname: '**.backblazeb2.com',
            },
        ],
    },
};

module.exports = nextConfig;
