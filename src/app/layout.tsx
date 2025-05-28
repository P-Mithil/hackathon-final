
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SupabaseAuthProvider } from '@/contexts/SupabaseAuthContext';
import I18nInitializer from '@/components/I18nInitializer'; // Import the I18nInitializer

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AgriVision Dashboard', // This title can also be translated if needed, usually in page.tsx
  description: 'Personalized crop advisory and market trends for farmers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        <I18nInitializer> {/* Wrap with I18nInitializer */}
          <SupabaseAuthProvider>
            {children}
          </SupabaseAuthProvider>
        </I18nInitializer>
        <Toaster />
      </body>
    </html>
  );
}
