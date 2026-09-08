import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://kairo.bond';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/features',
          '/docs',
          '/blog',
          '/product',
          '/security',
          '/trust',
          '/responsible-disclosure',
          '/terms',
          '/privacy',
          '/login',
          '/register',
        ],
        disallow: [
          '/chat',
          '/settings',
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/chat',
          '/settings',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
