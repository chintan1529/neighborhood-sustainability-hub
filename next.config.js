/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // TypeScript errors must be fixed before build
    typescript: {
        ignoreBuildErrors: false,
    },

    // Image optimization configuration
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                port: '',
                pathname: '/storage/v1/object/**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
        ],
        // Optimize images
        formats: ['image/avif', 'image/webp'],
    },

    // Experimental features
    experimental: {
        // Enable server actions
        serverActions: {
            bodySizeLimit: '10mb', // For photo uploads
        },
    },

    // Environment variables exposed to the browser
    env: {
        NEXT_PUBLIC_APP_NAME: 'Neighborhood Sustainability Hub',
        NEXT_PUBLIC_APP_DESCRIPTION: 'Hyperlocal waste management for sustainable communities',
    },

    // Headers for security
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com",
                            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api-inference.huggingface.co https://generativelanguage.googleapis.com",
                            "frame-ancestors 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },

    // Redirects
    async redirects() {
        return [
            {
                source: '/dashboard',
                destination: '/resident',
                permanent: false,
            },
        ];
    },
};

module.exports = nextConfig;
