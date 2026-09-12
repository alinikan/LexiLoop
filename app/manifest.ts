import type { MetadataRoute } from 'next';
import { appConfig } from '@/lib/config';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: appConfig.name,
    short_name: appConfig.shortName,
    description: appConfig.tagline,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f8fc',
    theme_color: appConfig.theme,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
