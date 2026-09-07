import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kairo — Autonomous AI Cybersecurity Copilot',
    short_name: 'Kairo',
    description: 'Autonomous AI copilot for penetration testing, vulnerability reconnaissance, and security research.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090909',
    theme_color: '#090909',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
