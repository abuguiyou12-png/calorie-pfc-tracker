import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import BottomNav from '@/components/BottomNav';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CaloTrack AI',
  description: 'AIが食事を分析し、カロリーPFCをチェックできる食事管理アプリ',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col`}>
        {children}
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      </body>
    </html>
  );
}
