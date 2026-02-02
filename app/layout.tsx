import type { Metadata } from 'next';
import { Inter, Koulen } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const koulen = Koulen({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-koulen',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SOW Generator - Cloudelligent',
  description: 'AI-powered Statement of Work generation platform',
  keywords: ['SOW', 'Statement of Work', 'AI', 'Automation'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${koulen.variable}`}>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
