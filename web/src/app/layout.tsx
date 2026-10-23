import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Revenge Protocol',
  robots: { index: false, follow: false },
};

const criticalThemeCss = `
  html, body {
    background-color: #0a0c10 !important;
    color: #e8eaed !important;
    min-height: 100%;
  }
  input, button, select, textarea {
    color: #e8eaed;
    background-color: #12151c;
    border-color: #2a3140;
  }
  input::placeholder { color: #9aa3b2; }
  a { color: #ff0040; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" style={{ backgroundColor: '#0a0c10', color: '#e8eaed' }}>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#0a0c10" />
        <style dangerouslySetInnerHTML={{ __html: criticalThemeCss }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-bg text-fg antialiased`}
        style={{ backgroundColor: '#0a0c10', color: '#e8eaed' }}
      >
        <div className="min-h-dvh bg-bg text-fg" style={{ backgroundColor: '#0a0c10', color: '#e8eaed' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
