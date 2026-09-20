import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { appConfig } from '@/lib/config';
import './globals.css';
export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s · ${appConfig.name}` },
  description:
    'Learn useful English words, practice them in real life, and remember them with spaced repetition.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: appConfig.name },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: appConfig.theme,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          id="lexiloop-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var theme=localStorage.getItem('lexiloop.theme');if(!theme){var demo=JSON.parse(localStorage.getItem('lexiloop-demo-v1')||'null');theme=demo&&demo.state&&demo.state.settings&&demo.state.settings.dark?'dark':'light'}document.documentElement.dataset.theme=theme==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
